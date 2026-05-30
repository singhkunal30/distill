import { z } from 'zod';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getSettings } from '@/lib/settings';
import { parseAuthors } from '@/lib/utils';
import { loadFixture } from '@/lib/demo/fixtures';
import { logDemoUsage } from '@/lib/ai/cost-guard';
import { generate, parseJson } from '@/lib/ai/providers/anthropic';
import { initialState } from '@/lib/srs/sm2';
import type { JobContext } from '../types';

const Params = z.object({
  bookId: z.string(),
  // Optional: scope to a single summary instead of the whole book.
  summaryId: z.string().optional(),
  // Soft cap on cards. Default 12.
  count: z.number().int().min(1).max(40).optional(),
});

type Card = { front: string; back: string };

export async function runFlashcardsJob(ctx: JobContext): Promise<void> {
  const params = Params.parse(ctx.params);
  const settings = await getSettings();
  const count = params.count ?? 12;

  await ctx.setProgress({ progress: 1, progressNote: 'Gathering source material' });

  const book = await prisma.book.findUniqueOrThrow({ where: { id: params.bookId } });

  let cards: Card[];
  let source: 'demo' | 'summary' | 'manual' = 'manual';
  let sourceId: string | undefined;

  if (settings.demoMode) {
    const fixture = await loadFixture(book.id);
    if (!fixture) {
      throw new Error(
        'Demo mode: no fixture available for this book. Run `npm run seed` or switch off demo mode.',
      );
    }
    cards = fixture.flashcards.slice(0, count);
    source = 'demo';
    await logDemoUsage({
      provider: 'anthropic',
      model: env.models.chat,
      feature: 'flashcard',
      estimatedUsd: 0.025,
      bookId: book.id,
      jobId: ctx.jobId,
      metadata: { demo: true, count: cards.length },
    });
  } else {
    // Prefer a specific summary; otherwise grab the first available.
    const summary = await prisma.summary.findFirst({
      where: params.summaryId
        ? { id: params.summaryId }
        : { bookId: book.id },
      include: { sections: { orderBy: { position: 'asc' } } },
    });
    if (!summary) {
      throw new Error(
        'This book has no summary yet. Distill it first, then generate flashcards.',
      );
    }
    source = 'summary';
    sourceId = summary.id;

    const prompt = buildPrompt(book, summary.sections, count);
    const res = await generate({
      model: env.models.chat,
      system: prompt.system,
      user: prompt.user,
      feature: 'flashcard',
      bookId: book.id,
      jobId: ctx.jobId,
      maxTokens: 2500,
      confirmed: true,
      metadata: { kind: 'flashcards', count },
    });
    const parsed = parseJson<{ cards: Card[] }>(res.text);
    cards = parsed.cards
      .map((c) => ({
        front: String(c.front ?? '').trim(),
        back: String(c.back ?? '').trim(),
      }))
      .filter((c) => c.front && c.back)
      .slice(0, count);
  }

  await ctx.setProgress({ progress: 80, progressNote: `Saving ${cards.length} cards` });

  // Replace existing manual/demo cards from this same source. Don't
  // wipe cards the user has been reviewing for a while — only clear
  // cards that share our (book, source, sourceId) signature.
  await prisma.flashcard.deleteMany({
    where: { bookId: book.id, source, sourceId: sourceId ?? null },
  });

  const initial = initialState();
  await prisma.flashcard.createMany({
    data: cards.map((c) => ({
      bookId: book.id,
      front: c.front,
      back: c.back,
      source,
      sourceId: sourceId ?? null,
      ease: initial.ease,
      intervalDays: initial.intervalDays,
      repetitions: initial.repetitions,
      dueAt: new Date(),
    })),
  });
}

function buildPrompt(
  book: { title: string; authors: string; description: string | null },
  sections: { heading: string; body: string }[],
  count: number,
): { system: string; user: string } {
  const authors = parseAuthors(book.authors).join(', ');
  const corpus = sections
    .map((s) => `## ${s.heading}\n${s.body}`)
    .join('\n\n')
    .slice(0, 24_000);
  const system = [
    'You write spaced-repetition flashcards that test load-bearing ideas from a book.',
    'Front: a clear, specific question or prompt. Back: the precise answer in 1-3 sentences.',
    'Never write trivia. Test understanding, not vocabulary. Avoid yes/no questions.',
  ].join(' ');
  const user = [
    `Book: "${book.title}"${authors ? ` by ${authors}` : ''}`,
    book.description ? `Description: ${book.description}` : null,
    '',
    `Write ${count} flashcards drawn from the summary below.`,
    'Mix conceptual ("Why does X work?") and applied ("When would you use X?") prompts.',
    'Cover distinct ideas — don\'t paraphrase the same concept twice.',
    '',
    'Summary:',
    '---',
    corpus,
    '---',
    '',
    'Return strict JSON: { "cards": [ { "front": "string", "back": "string" } ] }.',
  ]
    .filter(Boolean)
    .join('\n');
  return { system, user };
}

export function estimateFlashcardsUsd(): number {
  // Sonnet 4.6: ~5k input + 2k output → roughly $0.05. Conservative.
  return 0.05;
}
