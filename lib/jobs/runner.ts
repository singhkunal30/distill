import { prisma } from '@/lib/db';
import type { JobContext, JobHandler, JobKind } from './types';
import { runSummaryJob } from './handlers/summary';
import { runSectionRegenerateJob } from './handlers/section-regenerate';
import { runTtsJob } from './handlers/tts';
import { runFlashcardsJob } from './handlers/flashcards';
import { runQuizJob } from './handlers/quiz';

const HANDLERS: Partial<Record<JobKind, JobHandler>> = {
  summary: runSummaryJob,
  section_regenerate: runSectionRegenerateJob,
  tts: runTtsJob,
  flashcards: runFlashcardsJob,
  quiz: runQuizJob,
  // Other kinds (embedding, recommendation_index) arrive in later
  // phases. The dispatcher errors loudly if asked for one.
};

const LEASE_MS = 60_000; // 60s lease; stale leases are reclaimed.
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [2_000, 8_000, 30_000];

let running = false;
let stopRequested = false;

export function isRunning(): boolean {
  return running;
}

export function requestStop() {
  stopRequested = true;
}

/**
 * Reclaim leases on stale `generating` rows so a crashed run restarts
 * from the last completed sub-step.
 */
async function reclaimStaleLeases(): Promise<number> {
  const cutoff = new Date(Date.now() - LEASE_MS);
  const { count } = await prisma.generationJob.updateMany({
    where: {
      status: 'generating',
      OR: [{ leasedAt: null }, { leasedAt: { lt: cutoff } }],
    },
    data: {
      status: 'pending',
      leasedAt: null,
      progressNote: 'Resuming after restart',
    },
  });
  return count;
}

/**
 * Lease one pending job to this worker. Race-safe via updateMany with a
 * leasedAt=null guard: only one worker wins.
 */
async function leaseOne(): Promise<string | null> {
  const candidate = await prisma.generationJob.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
  });
  if (!candidate) return null;
  const now = new Date();
  const { count } = await prisma.generationJob.updateMany({
    where: { id: candidate.id, leasedAt: null, status: 'pending' },
    data: {
      status: 'generating',
      leasedAt: now,
      startedAt: candidate.startedAt ?? now,
    },
  });
  return count > 0 ? candidate.id : null;
}

async function makeCtx(jobId: string): Promise<JobContext> {
  const row = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  const params = JSON.parse(row.params);
  const completed: string[] = row.completedSteps ? JSON.parse(row.completedSteps) : [];
  return {
    jobId,
    bookId: row.bookId,
    params,
    completedSteps: completed,
    async setProgress(u) {
      const data: Record<string, unknown> = { leasedAt: new Date() };
      if (u.progress != null) data.progress = u.progress;
      if (u.progressNote != null) data.progressNote = u.progressNote;
      if (u.completedSteps) data.completedSteps = JSON.stringify(u.completedSteps);
      await prisma.generationJob.update({ where: { id: jobId }, data });
    },
  };
}

async function recordFailure(jobId: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const row = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  const nextAttempts = row.attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          attempts: nextAttempts,
          error: message,
          finishedAt: new Date(),
          leasedAt: null,
        },
      }),
      prisma.failedJob.create({
        data: {
          originalJobId: jobId,
          kind: row.kind,
          params: row.params,
          error: message,
          attempts: nextAttempts,
        },
      }),
    ]);
  } else {
    // Reset to pending and stamp leasedAt in the future to act as a backoff delay.
    const delay = BACKOFF_MS[Math.min(nextAttempts - 1, BACKOFF_MS.length - 1)]!;
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'pending',
        attempts: nextAttempts,
        error: message,
        leasedAt: new Date(Date.now() + delay - LEASE_MS),
        progressNote: `Retry ${nextAttempts} of ${MAX_ATTEMPTS} after error`,
      },
    });
  }
}

export async function processOne(): Promise<boolean> {
  const jobId = await leaseOne();
  if (!jobId) return false;
  const row = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  const handler = HANDLERS[row.kind as JobKind];
  if (!handler) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: `No handler registered for job kind "${row.kind}"`,
        finishedAt: new Date(),
        leasedAt: null,
      },
    });
    return true;
  }

  try {
    const ctx = await makeCtx(jobId);
    await handler(ctx);
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        progress: 100,
        finishedAt: new Date(),
        leasedAt: null,
      },
    });
  } catch (err) {
    await recordFailure(jobId, err);
  }
  return true;
}

/**
 * Polling worker loop. Runs in-process. One instance per Next.js
 * server process — guarded by the `running` flag.
 */
export async function startWorker(opts: { pollMs?: number } = {}) {
  if (running) return;
  running = true;
  stopRequested = false;
  const pollMs = opts.pollMs ?? 2000;
  console.log('[distill] job worker started');
  try {
    const reclaimed = await reclaimStaleLeases();
    if (reclaimed > 0) console.log(`[distill] reclaimed ${reclaimed} stale jobs`);
  } catch (err) {
    console.warn('[distill] reclaim failed', err);
  }
  // Drain pending jobs without delay; then idle-poll.
  (async () => {
    while (!stopRequested) {
      try {
        const did = await processOne();
        if (!did) await sleep(pollMs);
      } catch (err) {
        console.error('[distill] worker loop error', err);
        await sleep(pollMs);
      }
    }
    running = false;
    console.log('[distill] job worker stopped');
  })();
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
