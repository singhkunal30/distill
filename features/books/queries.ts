import { prisma } from '@/lib/db';
import { parseAuthors } from '@/lib/utils';
import type { Book, BookGenre, Genre } from '@prisma/client';

export type BookWithGenres = Book & {
  genres: (BookGenre & { genre: Genre })[];
};

export type BookListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  status: string;
  rating: number | null;
  publishedYear: number | null;
  sourceType: string;
  contentChars: number | null;
  genres: string[];
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  hasContent: boolean;
};

export async function listBooks(): Promise<BookListItem[]> {
  const rows = await prisma.book.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: { genres: { include: { genre: true } } },
  });
  return rows.map(toListItem);
}

export async function getBook(id: string): Promise<BookWithGenres | null> {
  return prisma.book.findUnique({
    where: { id },
    include: { genres: { include: { genre: true } } },
  });
}

export async function listGenres() {
  return prisma.genre.findMany({ orderBy: { name: 'asc' } });
}

export function toListItem(book: BookWithGenres): BookListItem {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    authors: parseAuthors(book.authors),
    coverUrl: book.coverUrl,
    status: book.status,
    rating: book.rating,
    publishedYear: book.publishedYear,
    sourceType: book.sourceType,
    contentChars: book.contentChars,
    genres: book.genres.map((g) => g.genre.name),
    createdAt: book.createdAt,
    startedAt: book.startedAt,
    finishedAt: book.finishedAt,
    hasContent: (book.contentMd?.length ?? 0) > 0,
  };
}
