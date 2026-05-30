import { NextResponse } from 'next/server';
import { startTtsJob, estimateTts } from '@/features/audio/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.summaryId !== 'string') {
    return NextResponse.json({ error: 'summaryId required' }, { status: 400 });
  }
  try {
    if (body.estimate === true) {
      const res = await estimateTts({ summaryId: body.summaryId });
      return NextResponse.json(res);
    }
    const res = await startTtsJob(body);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
