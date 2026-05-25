import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId');
  const jobId = searchParams.get('jobId');

  if (jobId) {
    const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
    return NextResponse.json({ job });
  }
  if (bookId) {
    // Most recent in-flight or just-completed/failed job for this book.
    const job = await prisma.generationJob.findFirst({
      where: { bookId },
      orderBy: { updatedAt: 'desc' },
    });
    // Don't surface completed jobs older than a few seconds — they
    // become noise.
    if (job && job.status === 'completed' && job.finishedAt) {
      const ageMs = Date.now() - job.finishedAt.getTime();
      if (ageMs > 3000) return NextResponse.json({ job: null });
    }
    return NextResponse.json({ job });
  }
  return NextResponse.json({ error: 'Provide jobId or bookId' }, { status: 400 });
}
