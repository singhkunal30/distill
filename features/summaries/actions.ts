'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { enqueueJob, retryFailedJob } from '@/lib/jobs/queue';
import { estimateLiveCost } from '@/lib/jobs/handlers/summary';
import { SummaryParams } from './types';

export async function estimateSummary(input: unknown) {
  const parsed = SummaryParams.parse(input);
  const book = await prisma.book.findUniqueOrThrow({ where: { id: parsed.bookId } });
  const settings = await getSettings();
  const estimatedUsd = settings.demoMode ? 0 : estimateLiveCost(book, parsed);
  return {
    estimatedUsd,
    demoMode: settings.demoMode,
    confirmAboveUsd: settings.confirmAboveUsd,
    chars: book.contentMd?.length ?? 0,
  };
}

export async function startSummaryJob(input: unknown) {
  const parsed = SummaryParams.parse(input);
  const book = await prisma.book.findUniqueOrThrow({ where: { id: parsed.bookId } });
  const settings = await getSettings();

  const estimatedUsd = settings.demoMode ? 0 : estimateLiveCost(book, parsed);

  const jobId = await enqueueJob({
    kind: 'summary',
    bookId: book.id,
    params: parsed,
    estimatedUsd,
  });
  revalidatePath(`/book/${book.id}`);
  return { jobId };
}

const RegenSchema = z.object({
  sectionId: z.string(),
  userInstruction: z.string().optional(),
});

export async function regenerateSection(input: unknown) {
  const parsed = RegenSchema.parse(input);
  const section = await prisma.summarySection.findUniqueOrThrow({
    where: { id: parsed.sectionId },
    include: { summary: true },
  });
  const jobId = await enqueueJob({
    kind: 'section_regenerate',
    bookId: section.summary.bookId,
    params: parsed,
    estimatedUsd: 0.02,
  });
  revalidatePath(`/book/${section.summary.bookId}`);
  return { jobId };
}

const SaveSchema = z.object({
  sectionId: z.string(),
  heading: z.string().min(1).max(300),
  body: z.string().min(1),
});

export async function saveSectionEdit(input: unknown) {
  const parsed = SaveSchema.parse(input);
  const section = await prisma.summarySection.findUniqueOrThrow({
    where: { id: parsed.sectionId },
    include: {
      summary: {
        include: { sections: { orderBy: { position: 'asc' } } },
      },
    },
  });
  const summary = section.summary;
  await prisma.$transaction([
    prisma.summaryVersion.create({
      data: {
        summaryId: summary.id,
        snapshot: JSON.stringify(
          summary.sections.map((s) => ({ heading: s.heading, body: s.body })),
        ),
        reason: `Manual edit of "${section.heading}"`,
      },
    }),
    prisma.summarySection.update({
      where: { id: section.id },
      data: { heading: parsed.heading, body: parsed.body },
    }),
  ]);
  revalidatePath(`/book/${summary.bookId}/read`);
}

const RestoreSchema = z.object({ versionId: z.string() });

export async function restoreVersion(input: unknown) {
  const { versionId } = RestoreSchema.parse(input);
  const version = await prisma.summaryVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: {
      summary: {
        include: { sections: { orderBy: { position: 'asc' } } },
      },
    },
  });
  const summary = version.summary;
  const snapshot = JSON.parse(version.snapshot) as { heading: string; body: string }[];

  await prisma.$transaction([
    prisma.summaryVersion.create({
      data: {
        summaryId: summary.id,
        snapshot: JSON.stringify(
          summary.sections.map((s) => ({ heading: s.heading, body: s.body })),
        ),
        reason: `Snapshot before restoring version ${version.createdAt.toISOString()}`,
      },
    }),
    prisma.summarySection.deleteMany({ where: { summaryId: summary.id } }),
    prisma.summarySection.createMany({
      data: snapshot.map((s, i) => ({
        summaryId: summary.id,
        position: i,
        heading: s.heading,
        body: s.body,
      })),
    }),
  ]);
  revalidatePath(`/book/${summary.bookId}/read`);
}

export async function retryFailedSummaryJob(failedId: string) {
  const newId = await retryFailedJob(failedId);
  return { jobId: newId };
}
