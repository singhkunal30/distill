'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { enqueueJob } from '@/lib/jobs/queue';
import { schedule, type ReviewQuality } from '@/lib/srs/sm2';
import { estimateFlashcardsUsd } from '@/lib/jobs/handlers/flashcards';

const StartGenInput = z.object({
  bookId: z.string(),
  summaryId: z.string().optional(),
  count: z.number().int().min(3).max(30).optional(),
});

export async function startFlashcardsJob(input: unknown) {
  const parsed = StartGenInput.parse(input);
  const settings = await getSettings();
  const estimatedUsd = settings.demoMode ? 0 : estimateFlashcardsUsd();
  const jobId = await enqueueJob({
    kind: 'flashcards',
    bookId: parsed.bookId,
    params: parsed,
    estimatedUsd,
  });
  revalidatePath(`/book/${parsed.bookId}`);
  return { jobId, estimatedUsd, demoMode: settings.demoMode };
}

const ReviewInput = z.object({
  flashcardId: z.string(),
  quality: z.number().int().min(0).max(5),
});

export async function reviewFlashcard(input: unknown) {
  const parsed = ReviewInput.parse(input);
  const card = await prisma.flashcard.findUniqueOrThrow({
    where: { id: parsed.flashcardId },
  });
  const result = schedule(
    {
      ease: card.ease,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
    },
    parsed.quality as ReviewQuality,
  );
  await prisma.$transaction([
    prisma.flashcard.update({
      where: { id: card.id },
      data: {
        ease: result.ease,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        dueAt: result.dueAt,
        lastReviewedAt: new Date(),
      },
    }),
    prisma.review.create({
      data: {
        flashcardId: card.id,
        quality: parsed.quality,
        intervalDays: result.intervalDays,
        easeAfter: result.ease,
      },
    }),
    // Light-weight reading event for the streak calculator (Phase 6).
    prisma.readingEvent.create({
      data: {
        bookId: card.bookId,
        kind: 'review',
        payload: JSON.stringify({ quality: parsed.quality }),
      },
    }),
  ]);
  revalidatePath('/review');
  revalidatePath(`/book/${card.bookId}`);
  return { dueAt: result.dueAt, intervalDays: result.intervalDays };
}

export async function deleteFlashcard(id: string) {
  const card = await prisma.flashcard.findUniqueOrThrow({ where: { id } });
  await prisma.flashcard.delete({ where: { id } });
  revalidatePath(`/book/${card.bookId}`);
}
