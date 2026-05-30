import { NextResponse } from 'next/server';
import { createHighlight } from '@/features/highlights/actions';
import { listHighlightsForBook } from '@/features/highlights/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId');
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 });
  const highlights = await listHighlightsForBook(bookId);
  return NextResponse.json({
    highlights: highlights.map((h) => ({
      id: h.id,
      text: h.text,
      color: h.color,
      locator: h.locator,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.bookId !== 'string' || typeof body.text !== 'string') {
    return NextResponse.json({ error: 'bookId + text required' }, { status: 400 });
  }
  try {
    const res = await createHighlight(body);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
