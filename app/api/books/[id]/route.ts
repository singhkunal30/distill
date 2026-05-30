import { NextResponse } from 'next/server';
import { getBook } from '@/features/books/queries';
import { listSummaries } from '@/features/summaries/queries';
import { listFlashcardsForBook } from '@/features/flashcards/queries';
import { listQuizzesForBook } from '@/features/quiz/queries';
import { listHighlightsForBook } from '@/features/highlights/queries';
import { parseAuthors } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const book = await getBook(params.id);
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [summaries, flashcards, quizzes, highlights] = await Promise.all([
    listSummaries(book.id),
    listFlashcardsForBook(book.id),
    listQuizzesForBook(book.id),
    listHighlightsForBook(book.id),
  ]);
  return NextResponse.json({
    book: {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      authors: parseAuthors(book.authors),
      coverUrl: book.coverUrl,
      description: book.description,
      publishedYear: book.publishedYear,
      pageCount: book.pageCount,
      isbn: book.isbn,
      status: book.status,
      rating: book.rating,
      sourceType: book.sourceType,
      contentChars: book.contentChars,
      hasContent: (book.contentMd?.length ?? 0) > 0,
      genres: book.genres.map((g) => g.genre.name),
      createdAt: book.createdAt.toISOString(),
      startedAt: book.startedAt?.toISOString() ?? null,
      finishedAt: book.finishedAt?.toISOString() ?? null,
    },
    summaries: summaries.map((s) => ({
      id: s.id,
      format: s.format,
      tone: s.tone,
      length: s.length,
      audience: s.audience,
      sectionCount: s._count.sections,
      generatedAt: s.generatedAt?.toISOString() ?? null,
    })),
    flashcardCount: flashcards.length,
    flashcardsDue: flashcards.filter((c) => c.dueAt.getTime() <= Date.now()).length,
    quizCount: quizzes.length,
    highlightCount: highlights.length,
  });
}
