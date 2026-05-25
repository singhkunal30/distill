import { prisma } from '@/lib/db';
import type { JobKind } from './types';

export type EnqueueInput = {
  kind: JobKind;
  bookId?: string | null;
  params: Record<string, unknown>;
  estimatedUsd?: number;
};

export async function enqueueJob(input: EnqueueInput): Promise<string> {
  const job = await prisma.generationJob.create({
    data: {
      kind: input.kind,
      status: 'pending',
      bookId: input.bookId ?? null,
      params: JSON.stringify(input.params),
      estimatedUsd: input.estimatedUsd ?? null,
      progress: 0,
    },
  });
  return job.id;
}

export async function getJob(id: string) {
  return prisma.generationJob.findUnique({ where: { id } });
}

export async function cancelJob(id: string) {
  await prisma.generationJob.update({
    where: { id },
    data: { status: 'paused' },
  });
}

export async function retryFailedJob(failedId: string): Promise<string | null> {
  const row = await prisma.failedJob.findUnique({ where: { id: failedId } });
  if (!row) return null;
  const job = await prisma.generationJob.create({
    data: {
      kind: row.kind,
      status: 'pending',
      params: row.params,
      progress: 0,
    },
  });
  await prisma.failedJob.update({
    where: { id: failedId },
    data: { retriedJobId: job.id },
  });
  return job.id;
}

export async function pendingJobs(limit = 20) {
  return prisma.generationJob.findMany({
    where: { status: { in: ['pending', 'generating'] } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
