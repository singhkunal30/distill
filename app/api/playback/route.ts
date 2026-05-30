import { NextResponse } from 'next/server';
import { savePlaybackPosition } from '@/features/audio/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.bookId !== 'string' ||
    typeof body.trackId !== 'string' ||
    typeof body.positionMs !== 'number'
  ) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
  try {
    await savePlaybackPosition(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
