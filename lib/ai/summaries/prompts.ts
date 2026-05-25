import {
  FORMAT_DESCRIPTION,
  type SummaryAudience,
  type SummaryFormat,
  type SummaryLength,
  type SummaryTone,
  TARGET_SECTIONS,
  TARGET_WORDS_PER_SECTION,
} from '@/features/summaries/types';

// Bump this every time prompt wording materially changes so the
// Summary.promptVersion field reflects what generated the row.
export const PROMPT_VERSION = '2025-01-distill-v1';

export type BookContext = {
  title: string;
  authors: string[];
  description: string | null;
  // The chunk of source content being summarized in this pass.
  // For the map step, this is one chunk; for the reduce step, this is
  // the concatenated bullet points from every chunk.
  source: string;
};

const TONE_LINE: Record<SummaryTone, string> = {
  neutral: 'Write in a calm, even-handed tone. No hype.',
  academic:
    'Write with academic precision; cite ideas by their proper name where possible. Avoid casual language.',
  conversational:
    'Write as if explaining to a thoughtful friend over coffee. Use second person sparingly.',
  punchy: 'Write with snap. Short sentences. Strong verbs. No throat-clearing.',
};

const AUDIENCE_LINE: Record<SummaryAudience, string> = {
  beginner: 'Assume the reader is new to the topic. Define terms when they first appear.',
  intermediate: 'Assume an educated, curious reader who knows the basics but not the specifics.',
  expert:
    'Assume the reader is fluent in the field; skip basics and lean into the load-bearing arguments.',
};

const FORMAT_INSTRUCTIONS: Record<SummaryFormat, (n: number, words: number) => string> = {
  blink: (n, words) =>
    `Write a ${n}-section "blink"-style summary. Each section has a short, punchy heading and a body of roughly ${words} words. Sections should flow like a clear narrative arc, not a list. Avoid repeating the book's title in every heading.`,
  insights: (n, words) =>
    `Write ${n} key insights as standalone "headings" with a short ${words}-word elaboration each. Each insight should be a load-bearing idea the reader could mention to someone else.`,
  detailed: (n, words) =>
    `Write a ${n}-section detailed breakdown. Treat each section as a chapter (if chapters are clear) or a logical thematic unit. Each section: a heading and roughly ${words} words explaining the arc, key claims, and important examples.`,
  tldr: (_n, words) =>
    `Write a single ~${words}-word TL;DR. Use one heading: the book's core claim, in your own words. Then prose. No bullet lists.`,
  applications: (n, words) =>
    `Write ${n} practical applications. Each is a heading that names a specific action, followed by a ~${words}-word body explaining how to do it this week, what to watch for, and how to know it's working.`,
};

const RESPONSE_SHAPE = `Return strict JSON of the form:
{
  "sections": [
    { "heading": "string", "body": "markdown string" }
  ]
}

Do not include any prose outside the JSON. Do not include trailing commentary.`;

export function summaryPrompt(opts: {
  ctx: BookContext;
  format: SummaryFormat;
  tone: SummaryTone;
  length: SummaryLength;
  audience: SummaryAudience;
}): { system: string; user: string } {
  const n = TARGET_SECTIONS[opts.format][opts.length];
  const words = TARGET_WORDS_PER_SECTION[opts.format][opts.length];
  const system = [
    'You are an exceptional reader. Your job is to distill books into faithful, vivid summaries that preserve the original argument.',
    TONE_LINE[opts.tone],
    AUDIENCE_LINE[opts.audience],
    'Never invent facts the source does not support. If the source is thin, say so plainly inside the sections rather than padding.',
    'Avoid filler phrases like "in this section we will" or "the author argues that".',
  ].join(' ');

  const formatInstructions = FORMAT_INSTRUCTIONS[opts.format](n, words);

  const user = [
    `Book: "${opts.ctx.title}"`,
    opts.ctx.authors.length > 0 ? `Author(s): ${opts.ctx.authors.join(', ')}` : null,
    opts.ctx.description ? `Description: ${opts.ctx.description}` : null,
    '',
    `Format: ${opts.format} — ${FORMAT_DESCRIPTION[opts.format]}`,
    formatInstructions,
    '',
    'Source material (extract from the book):',
    '---',
    opts.ctx.source,
    '---',
    '',
    RESPONSE_SHAPE,
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

// Map step: extract bullet outline from a single chunk. Used only when
// the book source is large enough to need chunking.
export function chunkOutlinePrompt(opts: {
  ctx: BookContext;
  chunkIndex: number;
  chunkCount: number;
}): { system: string; user: string } {
  const system =
    'You are a careful reader. Extract the load-bearing ideas from a chunk of a book. No summary yet — just bullets.';
  const user = [
    `Book: "${opts.ctx.title}"`,
    `This is chunk ${opts.chunkIndex + 1} of ${opts.chunkCount}.`,
    '',
    'Extract 5-12 bullet points capturing the main claims, distinctive examples, and any memorable phrasing in this chunk. Do not summarize the whole book. Be specific.',
    '',
    'Return strict JSON: { "bullets": ["string", ...] }',
    '',
    'Chunk:',
    '---',
    opts.ctx.source,
    '---',
  ].join('\n');
  return { system, user };
}

// Per-section regeneration: rewrite a single section in place, with the
// rest of the summary as context so the new version stays coherent.
export function regenerateSectionPrompt(opts: {
  ctx: BookContext;
  format: SummaryFormat;
  tone: SummaryTone;
  audience: SummaryAudience;
  sectionHeading: string;
  sectionBody: string;
  neighbourHeadings: string[];
  userInstruction?: string;
}): { system: string; user: string } {
  const system = [
    'You are rewriting a single section of an existing book summary.',
    TONE_LINE[opts.tone],
    AUDIENCE_LINE[opts.audience],
    'Preserve the spirit of the section unless the user instruction asks otherwise. Improve clarity and faithfulness; do not invent.',
  ].join(' ');
  const user = [
    `Book: "${opts.ctx.title}"`,
    `Summary format: ${opts.format}`,
    `Surrounding section headings:`,
    ...opts.neighbourHeadings.map((h, i) => `  ${i + 1}. ${h}`),
    '',
    `Current heading: ${opts.sectionHeading}`,
    'Current body:',
    '---',
    opts.sectionBody,
    '---',
    opts.userInstruction
      ? `\nUser instruction for this rewrite: ${opts.userInstruction}\n`
      : '',
    'Source material:',
    '---',
    opts.ctx.source,
    '---',
    '',
    'Return strict JSON: { "heading": "string", "body": "markdown string" }',
  ].join('\n');
  return { system, user };
}
