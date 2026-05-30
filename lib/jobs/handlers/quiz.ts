import { z } from 'zod';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getSettings } from '@/lib/settings';
import { parseAuthors } from '@/lib/utils';
import { loadFixture } from '@/lib/demo/fixtures';
import { logDemoUsage } from '@/lib/ai/cost-guard';
import { generate, parseJson } from '@/lib/ai/providers/anthropic';
import type { JobContext } from '../types';

const Params = z.object({
  bookId: z.string(),
  summaryId: z.string().optional(),
  count: z.number().int().min(3).max(20).optional(),
});

type Choice = { text: string; correct: boolean };
type GeneratedQuestion = {
  prompt: string;
  choices: Choice[];
  explanation?: string;
};

export async function runQuizJob(ctx: JobContext): Promise<void> {
  const params = Params.parse(ctx.params);
  const settings = await getSettings();
  const count = params.count ?? 6;

  await ctx.setProgress({ progress: 1, progressNote: 'Gathering source material' });

  const book = await prisma.book.findUniqueOrThrow({ where: { id: params.bookId } });

  let questions: GeneratedQuestion[];

  if (settings.demoMode) {
    questions = await buildDemoQuiz(book.id, count);
    await logDemoUsage({
      provider: 'anthropic',
      model: env.models.chat,
      feature: 'quiz',
      estimatedUsd: 0.03,
      bookId: book.id,
      jobId: ctx.jobId,
      metadata: { demo: true, count },
    });
  } else {
    const summary = await prisma.summary.findFirst({
      where: params.summaryId ? { id: params.summaryId } : { bookId: book.id },
      include: { sections: { orderBy: { position: 'asc' } } },
    });
    if (!summary) {
      throw new Error('This book has no summary yet. Distill it before generating a quiz.');
    }
    const prompt = buildPrompt(book, summary.sections, count);
    const res = await generate({
      model: env.models.chat,
      system: prompt.system,
      user: prompt.user,
      feature: 'quiz',
      bookId: book.id,
      jobId: ctx.jobId,
      maxTokens: 2500,
      confirmed: true,
      metadata: { kind: 'quiz', count },
    });
    const parsed = parseJson<{ questions: GeneratedQuestion[] }>(res.text);
    questions = parsed.questions
      .map((q) => ({
        prompt: String(q.prompt ?? '').trim(),
        explanation: q.explanation ? String(q.explanation).trim() : undefined,
        choices: (q.choices ?? [])
          .map((c) => ({
            text: String(c.text ?? '').trim(),
            correct: Boolean(c.correct),
          }))
          .filter((c) => c.text.length > 0),
      }))
      .filter((q) => q.prompt && q.choices.some((c) => c.correct))
      .slice(0, count);
  }

  await ctx.setProgress({ progress: 80, progressNote: `Saving ${questions.length} questions` });

  // Replace any existing quiz with the same title (e.g. "Knowledge check").
  const TITLE = 'Knowledge check';
  await prisma.quiz.deleteMany({ where: { bookId: book.id, title: TITLE } });

  await prisma.quiz.create({
    data: {
      bookId: book.id,
      title: TITLE,
      questions: {
        create: questions.map((q, i) => ({
          kind: 'multiple_choice',
          position: i,
          prompt: q.prompt,
          payload: JSON.stringify({ choices: q.choices }),
          explanation: q.explanation ?? null,
        })),
      },
    },
  });
}

function buildPrompt(
  book: { title: string; authors: string },
  sections: { heading: string; body: string }[],
  count: number,
): { system: string; user: string } {
  const authors = parseAuthors(book.authors).join(', ');
  const corpus = sections
    .map((s) => `## ${s.heading}\n${s.body}`)
    .join('\n\n')
    .slice(0, 24_000);
  const system = [
    'You write multiple-choice questions that test real comprehension.',
    'Each question has exactly 4 choices. Exactly one is correct. The other 3 are plausible distractors that someone who only half-read the source might pick.',
    'Avoid trick questions. Avoid "all of the above" / "none of the above".',
  ].join(' ');
  const user = [
    `Book: "${book.title}"${authors ? ` by ${authors}` : ''}`,
    `Write ${count} multiple-choice questions drawn from the summary below.`,
    'Each question should test a different idea.',
    '',
    'Summary:',
    '---',
    corpus,
    '---',
    '',
    'Return strict JSON:',
    '{',
    '  "questions": [',
    '    {',
    '      "prompt": "string",',
    '      "choices": [ { "text": "string", "correct": true|false }, ... 4 items ],',
    '      "explanation": "1-sentence explanation of the correct answer"',
    '    }',
    '  ]',
    '}',
  ].join('\n');
  return { system, user };
}

async function buildDemoQuiz(bookId: string, count: number): Promise<GeneratedQuestion[]> {
  const fixture = await loadFixture(bookId);
  if (!fixture) {
    throw new Error(
      'Demo mode: no fixture available for this book. Run `npm run seed` or switch off demo mode.',
    );
  }
  // Build MCQs by mining the fixture: heading → prompt, body's first
  // sentence → correct choice, other headings' first sentences →
  // distractors. Synthetic but coherent for demo purposes.
  const blinks = fixture.blink;
  const all = blinks.map((b) => firstSentence(b.body));

  const out: GeneratedQuestion[] = [];
  for (let i = 0; i < Math.min(count, blinks.length); i++) {
    const b = blinks[i]!;
    const correct = firstSentence(b.body);
    const distractors = all
      .filter((_, idx) => idx !== i)
      .slice(0, 3);
    while (distractors.length < 3) {
      // Pad with fixture insights, if any.
      const fallback = fixture.insights[(i + distractors.length) % fixture.insights.length];
      distractors.push(fallback ?? 'Not the right answer here.');
    }
    const choices: Choice[] = [
      { text: correct, correct: true },
      ...distractors.slice(0, 3).map((d) => ({ text: d, correct: false })),
    ];
    // Shuffle deterministically so the correct answer isn't always [0].
    const shuffled = shuffleDeterministic(choices, `${bookId}:${i}`);
    out.push({
      prompt: `Which best captures the idea in “${b.heading}”?`,
      choices: shuffled,
      explanation: b.body.length > 240 ? b.body.slice(0, 240) + '…' : b.body,
    });
  }
  // If we ran out of blinks, top up from insights as straight-recall prompts.
  for (let i = out.length; i < count; i++) {
    const insight = fixture.insights[i % Math.max(fixture.insights.length, 1)];
    if (!insight) break;
    const distractors = fixture.insights
      .filter((_, idx) => idx !== i)
      .slice(0, 3)
      .map((d) => ({ text: d, correct: false }));
    while (distractors.length < 3) {
      distractors.push({ text: 'Not from this book.', correct: false });
    }
    const choices: Choice[] = [
      { text: insight, correct: true },
      ...distractors.slice(0, 3),
    ];
    out.push({
      prompt: `Which of these is a key insight from this book?`,
      choices: shuffleDeterministic(choices, `${bookId}:i:${i}`),
    });
  }
  return out;
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : text).trim();
}

function shuffleDeterministic<T>(arr: T[], seed: string): T[] {
  const order = [...arr];
  // Simple seeded shuffle via FNV-1a hash → index.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  for (let i = order.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export function estimateQuizUsd(): number {
  return 0.05;
}
