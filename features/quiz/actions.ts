'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSettings } from '@/lib/settings';
import { enqueueJob } from '@/lib/jobs/queue';
import { estimateQuizUsd } from '@/lib/jobs/handlers/quiz';

const StartInput = z.object({
  bookId: z.string(),
  summaryId: z.string().optional(),
  count: z.number().int().min(3).max(20).optional(),
});

export async function startQuizJob(input: unknown) {
  const parsed = StartInput.parse(input);
  const settings = await getSettings();
  const estimatedUsd = settings.demoMode ? 0 : estimateQuizUsd();
  const jobId = await enqueueJob({
    kind: 'quiz',
    bookId: parsed.bookId,
    params: parsed,
    estimatedUsd,
  });
  revalidatePath(`/book/${parsed.bookId}`);
  return { jobId, estimatedUsd, demoMode: settings.demoMode };
}
