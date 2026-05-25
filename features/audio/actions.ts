'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { enqueueJob } from '@/lib/jobs/queue';
import { estimateTtsUsd } from '@/lib/jobs/handlers/tts';

const StartTtsInput = z.object({
  summaryId: z.string(),
  voice: z.string().optional(),
});

export async function startTtsJob(input: unknown) {
  const { summaryId, voice } = StartTtsInput.parse(input);
  const summary = await prisma.summary.findUniqueOrThrow({
    where: { id: summaryId },
    include: { sections: true },
  });
  const settings = await getSettings();
  const totalChars = summary.sections.reduce(
    (acc, s) => acc + s.heading.length + s.body.length + 2,
    0,
  );
  const estimatedUsd = settings.demoMode
    ? 0
    : estimateTtsUsd({
        textCharCount: totalChars,
        provider: settings.ttsProvider,
        model: settings.ttsProvider === 'openai' ? 'tts-1' : 'eleven_turbo_v2_5',
      });
  const jobId = await enqueueJob({
    kind: 'tts',
    bookId: summary.bookId,
    params: { summaryId, voice: voice ?? settings.ttsVoice },
    estimatedUsd,
  });
  revalidatePath(`/book/${summary.bookId}`);
  return { jobId, estimatedUsd, demoMode: settings.demoMode, totalChars };
}

const EstimateInput = z.object({ summaryId: z.string() });

export async function estimateTts(input: unknown) {
  const { summaryId } = EstimateInput.parse(input);
  const summary = await prisma.summary.findUniqueOrThrow({
    where: { id: summaryId },
    include: { sections: true },
  });
  const settings = await getSettings();
  const totalChars = summary.sections.reduce(
    (acc, s) => acc + s.heading.length + s.body.length + 2,
    0,
  );
  return {
    estimatedUsd: settings.demoMode
      ? 0
      : estimateTtsUsd({
          textCharCount: totalChars,
          provider: settings.ttsProvider,
          model: settings.ttsProvider === 'openai' ? 'tts-1' : 'eleven_turbo_v2_5',
        }),
    demoMode: settings.demoMode,
    totalChars,
    sectionCount: summary.sections.length,
    provider: settings.ttsProvider,
  };
}

const PositionInput = z.object({
  bookId: z.string(),
  trackId: z.string(),
  positionMs: z.number().int().min(0),
  speed: z.number().min(0.25).max(4).optional(),
});

export async function savePlaybackPosition(input: unknown) {
  const parsed = PositionInput.parse(input);
  await prisma.playbackPosition.upsert({
    where: {
      bookId_trackId: { bookId: parsed.bookId, trackId: parsed.trackId },
    },
    create: {
      bookId: parsed.bookId,
      trackId: parsed.trackId,
      positionMs: parsed.positionMs,
      speed: parsed.speed ?? 1,
    },
    update: {
      positionMs: parsed.positionMs,
      speed: parsed.speed ?? 1,
    },
  });
}
