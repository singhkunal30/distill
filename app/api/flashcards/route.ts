import { NextResponse } from 'next/server';
import { startFlashcardsJob } from '@/features/flashcards/actions';
import {
  listDueFlashcards,
  countDueFlashcards,
  listFlashcardsForBook,
} from '@/features/flashcards/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId');
  const due = searchParams.get('due');

  if (due === '1') {
    const [cards, count] = await Promise.all([listDueFlashcards(), countDueFlashcards()]);
    return NextResponse.json({
      count,
      cards: cards.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        bookId: c.bookId,
        bookTitle: c.book.title,
        ease: c.ease,
        intervalDays: c.intervalDays,
        repetitions: c.repetitions,
        dueAt: c.dueAt.toISOString(),
      })),
    });
  }

  if (bookId) {
    const cards = await listFlashcardsForBook(bookId);
    return NextResponse.json({
      cards: cards.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        dueAt: c.dueAt.toISOString(),
      })),
    });
  }

  return NextResponse.json({ error: 'bookId or due=1 required' }, { status: 400 });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.bookId !== 'string') {
    return NextResponse.json({ error: 'bookId required' }, { status: 400 });
  }
  try {
    const res = await startFlashcardsJob(body);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
