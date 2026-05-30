import { NextResponse } from 'next/server';
import { startQuizJob } from '@/features/quiz/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.bookId !== 'string') {
    return NextResponse.json({ error: 'bookId required' }, { status: 400 });
  }
  try {
    const res = await startQuizJob(body);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
