import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getSettings } from '@/lib/settings';
import { parseAuthors } from '@/lib/utils';
import { loadFixture } from '@/lib/demo/fixtures';
import { logDemoUsage } from '@/lib/ai/cost-guard';
import { generate, parseJson } from '@/lib/ai/providers/anthropic';
import { chunkContent } from '@/lib/ai/summaries/chunk';
import { chunkOutlinePrompt, summaryPrompt, PROMPT_VERSION } from '@/lib/ai/summaries/prompts';
import {
  SummaryParams,
  type SummaryFormat,
  type SummaryLength,
  type SummaryTone,
  type SummaryAudience,
} from '@/features/summaries/types';
import type { JobContext } from '../types';

type Section = { heading: string; body: string };

export async function runSummaryJob(ctx: JobContext): Promise<void> {
  const params = SummaryParams.parse(ctx.params);

  const book = await prisma.book.findUniqueOrThrow({ where: { id: params.bookId } });
  const settings = await getSettings();
  const completedSteps = new Set(ctx.completedSteps);

  await ctx.setProgress({ progress: 1, progressNote: 'Preparing source' });

  // Resolve sections — either from demo fixture or from the live pipeline.
  let sections: Section[];
  let modelUsed: string | null;

  if (settings.demoMode || env.forceDemoMode) {
    const result = await runDemoPath(book.id, params.format);
    sections = result.sections;
    modelUsed = null;
    // Log to ApiUsageLog so the Stats page reflects "what this would've cost".
    await logDemoUsage({
      provider: 'anthropic',
      model: env.models.summary,
      feature: 'summary',
      estimatedUsd: estimateLiveCost(book, params),
      bookId: book.id,
      jobId: ctx.jobId,
      metadata: { format: params.format, demo: true },
    });
    await ctx.setProgress({ progress: 80, progressNote: 'Saving from fixture' });
  } else {
    const result = await runLivePath({
      book,
      params,
      ctx,
      completedSteps,
    });
    sections = result.sections;
    modelUsed = result.modelUsed;
  }

  // Persist Summary + SummarySection, replacing any prior version for
  // this (bookId, format). The prior version is snapshotted first.
  await persistSummary({
    bookId: book.id,
    format: params.format,
    tone: params.tone,
    length: params.length,
    audience: params.audience,
    modelUsed,
    sections,
  });

  await ctx.setProgress({ progress: 100, progressNote: 'Done' });
}

async function runDemoPath(
  bookId: string,
  format: SummaryFormat,
): Promise<{ sections: Section[] }> {
  const fixture = await loadFixture(bookId);
  if (!fixture) {
    throw new Error(
      'Demo mode is enabled but no fixture was found for this book. Switch off demo mode in Settings, or run `npm run seed` to regenerate fixtures.',
    );
  }
  switch (format) {
    case 'blink':
      return { sections: fixture.blink };
    case 'insights':
      return {
        sections: fixture.insights.map((text, i) => ({
          heading: `Insight ${i + 1}`,
          body: text,
        })),
      };
    case 'applications':
      return {
        sections: fixture.applications.map((text, i) => ({
          heading: `Action ${i + 1}`,
          body: text,
        })),
      };
    case 'tldr':
      return {
        sections: [
          {
            heading: fixture.title,
            body: [
              ...fixture.blink.map((b) => `**${b.heading}.** ${b.body}`),
              '',
              fixture.insights.length > 0
                ? `Core insights: ${fixture.insights.join(' · ')}`
                : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ],
      };
    case 'detailed':
      return {
        sections: fixture.blink.map((b) => ({
          heading: b.heading,
          body: [
            b.body,
            '',
            ...fixture.insights
              .filter((_, i) => i % 2 === 0)
              .map((s) => `- ${s}`),
          ].join('\n'),
        })),
      };
  }
}

async function runLivePath(opts: {
  book: { id: string; title: string; authors: string; description: string | null; contentMd: string | null };
  params: { format: SummaryFormat; tone: SummaryTone; length: SummaryLength; audience: SummaryAudience };
  ctx: JobContext;
  completedSteps: Set<string>;
}): Promise<{ sections: Section[]; modelUsed: string }> {
  const { book, params, ctx, completedSteps } = opts;
  const authors = parseAuthors(book.authors);

  const source = book.contentMd?.trim() ?? '';
  const useSource = source.length > 0 ? source : book.description ?? `Book titled "${book.title}" by ${authors.join(', ')}`;
  const chunks = chunkContent(useSource);
  const newCompleted = new Set(completedSteps);

  // Map step (only needed if multiple chunks).
  let mergedSource: string;
  if (chunks.length === 1) {
    mergedSource = chunks[0]!;
  } else {
    const bullets: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const stepId = `chunk_${i}`;
      if (newCompleted.has(stepId)) continue;
      await ctx.setProgress({
        progress: Math.round((i / chunks.length) * 50),
        progressNote: `Reading chunk ${i + 1} of ${chunks.length}`,
      });
      const prompt = chunkOutlinePrompt({
        ctx: {
          title: book.title,
          authors,
          description: book.description,
          source: chunks[i]!,
        },
        chunkIndex: i,
        chunkCount: chunks.length,
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
        metadata: { step: 'map', chunkIndex: i, chunkCount: chunks.length },
      });
      const parsed = parseJson<{ bullets: string[] }>(res.text);
      bullets.push(...parsed.bullets.map((b) => `- ${b}`));
      newCompleted.add(stepId);
      await ctx.setProgress({ completedSteps: Array.from(newCompleted) });
    }
    mergedSource = bullets.join('\n');
  }

  // Reduce step → final sections via Opus.
  await ctx.setProgress({ progress: 60, progressNote: 'Composing summary' });
  const reducePrompt = summaryPrompt({
    ctx: {
      title: book.title,
      authors,
      description: book.description,
      source: mergedSource,
    },
    format: params.format,
    tone: params.tone,
    length: params.length,
    audience: params.audience,
  });
  const reduceMaxTokens = reduceMaxTokensFor(params.format, params.length);
  const reduceRes = await generate({
    model: env.models.summary,
    system: reducePrompt.system,
    user: reducePrompt.user,
    feature: 'summary',
    bookId: book.id,
    jobId: ctx.jobId,
    maxTokens: reduceMaxTokens,
    confirmed: true,
    metadata: { step: 'reduce', format: params.format },
  });
  const parsed = parseJson<{ sections: Section[] }>(reduceRes.text);
  newCompleted.add('reduce');
  await ctx.setProgress({ completedSteps: Array.from(newCompleted), progress: 90 });

  return {
    sections: parsed.sections.map((s) => ({
      heading: String(s.heading ?? '').trim(),
      body: String(s.body ?? '').trim(),
    })),
    modelUsed: env.models.summary,
  };
}

function reduceMaxTokensFor(format: SummaryFormat, length: SummaryLength): number {
  const base = { blink: 3500, insights: 2500, detailed: 5000, tldr: 1500, applications: 2500 };
  const mult = { short: 0.7, medium: 1, long: 1.5 } as const;
  return Math.round(base[format] * mult[length]);
}

async function persistSummary(opts: {
  bookId: string;
  format: SummaryFormat;
  tone: SummaryTone;
  length: SummaryLength;
  audience: SummaryAudience;
  modelUsed: string | null;
  sections: Section[];
}) {
  // Snapshot the prior version (if any) before replacing sections.
  const existing = await prisma.summary.findUnique({
    where: { bookId_format: { bookId: opts.bookId, format: opts.format } },
    include: { sections: { orderBy: { position: 'asc' } } },
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.summaryVersion.create({
        data: {
          summaryId: existing.id,
          snapshot: JSON.stringify(
            existing.sections.map((s) => ({ heading: s.heading, body: s.body })),
          ),
          reason: 'Replaced by full regeneration',
        },
      });
      await tx.summarySection.deleteMany({ where: { summaryId: existing.id } });
      await tx.summary.update({
        where: { id: existing.id },
        data: {
          tone: opts.tone,
          length: opts.length,
          audience: opts.audience,
          modelUsed: opts.modelUsed,
          promptVersion: PROMPT_VERSION,
          generatedAt: new Date(),
        },
      });
      await tx.summarySection.createMany({
        data: opts.sections.map((s, i) => ({
          summaryId: existing.id,
          position: i,
          heading: s.heading,
          body: s.body,
        })),
      });
    } else {
      await tx.summary.create({
        data: {
          bookId: opts.bookId,
          format: opts.format,
          tone: opts.tone,
          length: opts.length,
          audience: opts.audience,
          modelUsed: opts.modelUsed,
          promptVersion: PROMPT_VERSION,
          generatedAt: new Date(),
          sections: {
            create: opts.sections.map((s, i) => ({
              position: i,
              heading: s.heading,
              body: s.body,
            })),
          },
        },
      });
    }
  });
}

/**
 * Returns the conservative estimate used by the Distill dialog. Live
 * mode multiplies by the chunking ratio.
 */
export function estimateLiveCost(
  book: { contentMd: string | null; description: string | null; title: string },
  params: { format: SummaryFormat; length: SummaryLength },
): number {
  const source = book.contentMd ?? book.description ?? book.title;
  const chunks = chunkContent(source).length;
  // Sonnet input: ~chunks * 6000 tokens, output: ~chunks * 600 tokens.
  const sonnetIn = chunks * 6000;
  const sonnetOut = chunks * 600;
  // Opus reduce: input merged bullets (~chunks * 600 tokens), output ~ reduce target.
  const opusIn = Math.max(1500, chunks * 600);
  const reduceTokens = reduceMaxTokensFor(params.format, params.length);
  const sonnetCost = (sonnetIn / 1_000_000) * 3 + (sonnetOut / 1_000_000) * 15;
  const opusCost = (opusIn / 1_000_000) * 15 + (reduceTokens / 1_000_000) * 75;
  return sonnetCost + opusCost;
}
