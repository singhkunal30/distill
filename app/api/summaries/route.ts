import { NextResponse } from 'next/server';
import { estimateSummary, startSummaryJob } from '@/features/summaries/actions';

export const dynamic = 'force-dynamic';

// POST /api/summaries
//   estimate-only: { estimate: true, ...summaryParams }
//   enqueue:       { ...summaryParams }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.bookId !== 'string') {
    return NextResponse.json({ error: 'bookId required' }, { status: 400 });
  }
  try {
    if (body.estimate === true) {
      const res = await estimateSummary(body);
      return NextResponse.json(res);
    }
    const res = await startSummaryJob(body);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
