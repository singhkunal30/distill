import { z } from 'zod';

export const SummaryFormat = z.enum(['blink', 'insights', 'detailed', 'tldr', 'applications']);
export type SummaryFormat = z.infer<typeof SummaryFormat>;

export const SummaryTone = z.enum(['neutral', 'academic', 'conversational', 'punchy']);
export type SummaryTone = z.infer<typeof SummaryTone>;

export const SummaryLength = z.enum(['short', 'medium', 'long']);
export type SummaryLength = z.infer<typeof SummaryLength>;

export const SummaryAudience = z.enum(['beginner', 'intermediate', 'expert']);
export type SummaryAudience = z.infer<typeof SummaryAudience>;

export const SummaryParams = z.object({
  bookId: z.string(),
  format: SummaryFormat,
  tone: SummaryTone.default('neutral'),
  length: SummaryLength.default('medium'),
  audience: SummaryAudience.default('intermediate'),
});
export type SummaryParams = z.infer<typeof SummaryParams>;

export const FORMAT_LABEL: Record<SummaryFormat, string> = {
  blink: 'Blink summary',
  insights: 'Key insights',
  detailed: 'Detailed breakdown',
  tldr: 'TL;DR',
  applications: 'Practical applications',
};

export const FORMAT_DESCRIPTION: Record<SummaryFormat, string> = {
  blink: '8–12 short sections, ~15-minute read.',
  insights: 'Bulleted takeaways that distill the core ideas.',
  detailed: 'Chapter-by-chapter (or section-by-section) breakdown.',
  tldr: 'One-page elevator summary.',
  applications: 'Actionable lessons you can apply this week.',
};

// Target section counts by length, used both for prompts and estimates.
export const TARGET_SECTIONS: Record<SummaryFormat, Record<SummaryLength, number>> = {
  blink: { short: 6, medium: 9, long: 12 },
  insights: { short: 5, medium: 8, long: 12 },
  detailed: { short: 5, medium: 8, long: 12 },
  tldr: { short: 1, medium: 1, long: 1 },
  applications: { short: 4, medium: 6, long: 8 },
};

// Target words per section, also used in estimates.
export const TARGET_WORDS_PER_SECTION: Record<SummaryFormat, Record<SummaryLength, number>> = {
  blink: { short: 90, medium: 140, long: 220 },
  insights: { short: 30, medium: 50, long: 80 },
  detailed: { short: 180, medium: 280, long: 420 },
  tldr: { short: 220, medium: 380, long: 600 },
  applications: { short: 80, medium: 120, long: 180 },
};
