'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { stringifyAuthors } from '@/lib/utils';
import { searchBooks, getWork } from '@/lib/openlibrary';
import { extractArticle } from '@/lib/importers/url';
import { extractText } from '@/lib/importers/text';
import { extractPdf } from '@/lib/importers/pdf';
import { extractEpub } from '@/lib/importers/epub';
import { CreateBookInput, UpdateBookInput, type BookStatus } from './types';

async function upsertGenres(names: string[]): Promise<string[]> {
  const cleaned = Array.from(
    new Set(
      names
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => n.replace(/\s+/g, ' ')),
    ),
  );
  if (cleaned.length === 0) return [];
  const existing = await prisma.genre.findMany({
    where: { name: { in: cleaned } },
  });
  const have = new Map(existing.map((g) => [g.name, g.id]));
  const missing = cleaned.filter((n) => !have.has(n));
  for (const n of missing) {
    const g = await prisma.genre.upsert({
      where: { name: n },
      create: { name: n },
      update: {},
    });
    have.set(n, g.id);
  }
  return cleaned.map((n) => have.get(n)!).filter(Boolean);
}

export async function createBook(input: unknown) {
  const parsed = CreateBookInput.parse(input);
  const genreIds = await upsertGenres(parsed.genres);
  const book = await prisma.book.create({
    data: {
      title: parsed.title,
      subtitle: parsed.subtitle ?? null,
      authors: stringifyAuthors(parsed.authors),
      coverUrl: parsed.coverUrl ?? null,
      description: parsed.description ?? null,
      publishedYear: parsed.publishedYear ?? null,
      pageCount: parsed.pageCount ?? null,
      isbn: parsed.isbn ?? null,
      openLibraryId: parsed.openLibraryId ?? null,
      status: parsed.status,
      sourceType: parsed.sourceType,
      contentMd: parsed.contentMd ?? null,
      contentChars: parsed.contentMd?.length ?? null,
      genres: {
        create: genreIds.map((id) => ({ genreId: id })),
      },
    },
  });
  revalidatePath('/library');
  revalidatePath('/');
  return { id: book.id };
}

export async function updateBook(input: unknown) {
  const parsed = UpdateBookInput.parse(input);
  const data: Record<string, unknown> = {};
  if (parsed.title !== undefined) data.title = parsed.title;
  if (parsed.subtitle !== undefined) data.subtitle = parsed.subtitle;
  if (parsed.authors !== undefined) data.authors = stringifyAuthors(parsed.authors);
  if (parsed.coverUrl !== undefined) data.coverUrl = parsed.coverUrl;
  if (parsed.description !== undefined) data.description = parsed.description;
  if (parsed.publishedYear !== undefined) data.publishedYear = parsed.publishedYear;
  if (parsed.pageCount !== undefined) data.pageCount = parsed.pageCount;
  if (parsed.isbn !== undefined) data.isbn = parsed.isbn;
  if (parsed.status !== undefined) {
    data.status = parsed.status;
    if (parsed.status === 'reading') data.startedAt = new Date();
    if (parsed.status === 'finished') data.finishedAt = new Date();
  }
  if (parsed.rating !== undefined) data.rating = parsed.rating;

  await prisma.$transaction(async (tx) => {
    await tx.book.update({ where: { id: parsed.id }, data });
    if (parsed.genres) {
      const genreIds = await upsertGenres(parsed.genres);
      await tx.bookGenre.deleteMany({ where: { bookId: parsed.id } });
      if (genreIds.length > 0) {
        await tx.bookGenre.createMany({
          data: genreIds.map((g) => ({ bookId: parsed.id, genreId: g })),
        });
      }
    }
  });
  revalidatePath('/library');
  revalidatePath(`/book/${parsed.id}`);
}

export async function deleteBook(id: string) {
  await prisma.book.delete({ where: { id } });
  revalidatePath('/library');
}

export async function setBookStatus(id: string, status: BookStatus) {
  const data: Record<string, unknown> = { status };
  if (status === 'reading') data.startedAt = new Date();
  if (status === 'finished') data.finishedAt = new Date();
  await prisma.book.update({ where: { id }, data });
  revalidatePath('/library');
  revalidatePath(`/book/${id}`);
}

export async function searchOpenLibrary(query: string) {
  if (!query.trim()) return [];
  return searchBooks(query, 12);
}

// ── Importers (server actions; called from the Add Book UI) ──────

export async function importFromOpenLibrary(formData: FormData) {
  const payload = formData.get('payload');
  if (typeof payload !== 'string') throw new Error('Missing payload');
  const data = JSON.parse(payload) as {
    title: string;
    subtitle?: string | null;
    authors: string[];
    coverUrl: string | null;
    publishedYear: number | null;
    pageCount: number | null;
    isbn: string | null;
    openLibraryId: string;
    subjects: string[];
  };
  // Pull description in the same call so the new book is immediately rich.
  let description: string | null = null;
  try {
    const work = await getWork(data.openLibraryId);
    description = work?.description ?? null;
  } catch {
    /* ignore */
  }
  return createBook({
    title: data.title,
    subtitle: data.subtitle ?? null,
    authors: data.authors,
    coverUrl: data.coverUrl,
    description,
    publishedYear: data.publishedYear,
    pageCount: data.pageCount,
    isbn: data.isbn,
    openLibraryId: data.openLibraryId,
    genres: data.subjects.slice(0, 5),
    sourceType: 'metadata-only',
  });
}

export async function importFromUrl(formData: FormData) {
  const url = String(formData.get('url') ?? '').trim();
  if (!url) throw new Error('URL required');
  const article = await extractArticle(url);
  return createBook({
    title: article.title,
    subtitle: article.siteName,
    authors: article.byline ? [article.byline] : [],
    description: article.excerpt,
    sourceType: 'url',
    contentMd: article.contentMd,
    genres: ['Article'],
  });
}

export async function importFromText(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim() || 'Untitled note';
  const authorsRaw = String(formData.get('authors') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'md');
  if (!body) throw new Error('Body required');
  const extracted = extractText(body, kind === 'md');
  return createBook({
    title,
    authors: authorsRaw ? authorsRaw.split(/,;|/).map((s) => s.trim()).filter(Boolean) : [],
    sourceType: kind === 'md' ? 'md' : 'txt',
    contentMd: extracted.markdown,
    genres: ['Notes'],
  });
}

export async function importFromPdf(formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('PDF file required');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await extractPdf(bytes);
  return createBook({
    title: pdf.title || file.name.replace(/\.pdf$/i, ''),
    authors: pdf.authors,
    pageCount: pdf.pageCount,
    sourceType: 'pdf',
    contentMd: pdf.text,
    genres: ['PDF'],
  });
}

export async function importFromEpub(formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('EPUB file required');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const epub = await extractEpub(bytes);
  return createBook({
    title: epub.title || file.name.replace(/\.epub$/i, ''),
    authors: epub.authors,
    publishedYear: epub.publishedYear,
    sourceType: 'epub',
    contentMd: epub.text,
    genres: ['EPUB'],
  });
}
