import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getSettings } from '@/lib/settings';
import { parseAuthors } from '@/lib/utils';
import { loadFixture } from '@/lib/demo/fixtures';
import { logDemoUsage } from '@/lib/ai/cost-guard';
import { generate, parseJson } from '@/lib/ai/providers/anthropic';
import { regenerateSectionPrompt, PROMPT_VERSION } from '@/lib/ai/summaries/prompts';
import { z } from 'zod';
import { SummaryFormat, SummaryTone, SummaryAudience } from '@/features/summaries/types';
import type { JobContext } from '../types';

const Params = z.object({
  sectionId: z.string(),
  userInstruction: z.string().optional(),
});

export async function runSectionRegenerateJob(ctx: JobContext): Promise<void> {
  const { sectionId, userInstruction } = Params.parse(ctx.params);
  const section = await prisma.summarySection.findUniqueOrThrow({
    where: { id: sectionId },
    include: {
      summary: {
        include: {
          book: true,
          sections: { orderBy: { position: 'asc' } },
        },
      },
    },
  });
  const summary = section.summary;
  const book = summary.book;
  const settings = await getSettings();

  await ctx.setProgress({ progress: 10, progressNote: 'Loading context' });

  let next: { heading: string; body: string };

  if (settings.demoMode || env.forceDemoMode) {
    // Demo: tweak the heading prefix and shuffle a sentence.
    next = {
      heading: section.heading.endsWith(' ✦')
        ? section.heading
        : `${section.heading} ✦`,
      body: `${section.body}\n\n*(Regenerated in demo mode — switch to live mode in Settings for a real rewrite.)*`,
    };
    await logDemoUsage({
      provider: 'anthropic',
      model: env.models.chat,
      feature: 'summary',
      estimatedUsd: 0.02,
      bookId: book.id,
      jobId: ctx.jobId,
      metadata: { sectionId, demo: true },
    });
    // Fall through; also touch the fixture to source a clean replacement
    // when possible.
    const fixture = await loadFixture(book.id);
    if (fixture && summary.format === 'blink') {
      const alt = fixture.blink[section.position];
      if (alt) next = { heading: alt.heading, body: alt.body };
    }
  } else {
    const prompt = regenerateSectionPrompt({
      ctx: {
        title: book.title,
        authors: parseAuthors(book.authors),
        description: book.description,
        source: book.contentMd ?? book.description ?? '',
      },
      format: summary.format as never,
      tone: (summary.tone ?? 'neutral') as never,
      audience: (summary.audience ?? 'intermediate') as never,
      sectionHeading: section.heading,
      sectionBody: section.body,
      neighbourHeadings: summary.sections
        .filter((s) => s.id !== section.id)
        .map((s) => s.heading),
      userInstruction,
    });
    const res = await generate({
      model: env.models.chat,
      system: prompt.system,
      user: prompt.user,
      feature: 'summary',
      bookId: book.id,
      jobId: ctx.jobId,
      maxTokens: 1200,
      confirmed: true,
      metadata: { sectionId, kind: 'section_regenerate' },
    });
    const parsed = parseJson<{ heading: string; body: string }>(res.text);
    next = {
      heading: String(parsed.heading ?? section.heading).trim(),
      body: String(parsed.body ?? section.body).trim(),
    };
  }

  await ctx.setProgress({ progress: 80, progressNote: 'Saving section' });

  // Snapshot the prior version of the whole summary so version history
  // captures section-level changes too.
  const snapshot = summary.sections.map((s) => ({
    heading: s.heading,
    body: s.body,
  }));
  await prisma.$transaction([
    prisma.summaryVersion.create({
      data: {
        summaryId: summary.id,
        snapshot: JSON.stringify(snapshot),
        reason: `Regenerated section "${section.heading}"`,
      },
    }),
    prisma.summarySection.update({
      where: { id: section.id },
      data: { heading: next.heading, body: next.body },
    }),
    prisma.summary.update({
      where: { id: summary.id },
      data: { promptVersion: PROMPT_VERSION, generatedAt: new Date() },
    }),
  ]);
  // Suppress unused PROMPT_VERSION import warning (still used above).
  void SummaryFormat;
  void SummaryTone;
  void SummaryAudience;
}
