import { NextResponse } from 'next/server';
import { reviewFlashcard } from '@/features/flashcards/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => null)) as { quality?: number } | null;
  if (!body || typeof body.quality !== 'number') {
    return NextResponse.json({ error: 'quality required' }, { status: 400 });
  }
  try {
    const res = await reviewFlashcard({
      flashcardId: params.id,
      quality: body.quality,
    });
    return NextResponse.json({
      ...res,
      dueAt: res.dueAt.toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
