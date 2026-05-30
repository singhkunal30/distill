'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const HIGHLIGHT_COLORS = ['yellow', 'blue', 'pink', 'green'] as const;

const CreateInput = z.object({
  bookId: z.string(),
  text: z.string().min(1).max(4000),
  locator: z.string().max(200).optional().nullable(),
  color: z.enum(HIGHLIGHT_COLORS).default('yellow'),
});

export async function createHighlight(input: unknown) {
  const parsed = CreateInput.parse(input);
  const trimmed = parsed.text.trim();
  if (!trimmed) throw new Error('Highlight text is empty.');
  const highlight = await prisma.highlight.create({
    data: {
      bookId: parsed.bookId,
      text: trimmed,
      locator: parsed.locator ?? null,
      color: parsed.color,
    },
  });
  revalidatePath(`/book/${parsed.bookId}`);
  // Log a reading event for streak/stats.
  await prisma.readingEvent.create({
    data: {
      bookId: parsed.bookId,
      kind: 'highlight',
      payload: JSON.stringify({ length: trimmed.length }),
    },
  });
  return { id: highlight.id };
}

const NoteInput = z.object({
  highlightId: z.string(),
  body: z.string().max(8000),
});

export async function saveHighlightNote(input: unknown) {
  const parsed = NoteInput.parse(input);
  const highlight = await prisma.highlight.findUniqueOrThrow({
    where: { id: parsed.highlightId },
  });
  // One note per highlight for now — upsert by the latest note.
  const existing = await prisma.note.findFirst({
    where: { highlightId: highlight.id },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    await prisma.note.update({
      where: { id: existing.id },
      data: { body: parsed.body },
    });
  } else {
    await prisma.note.create({
      data: {
        bookId: highlight.bookId,
        highlightId: highlight.id,
        body: parsed.body,
      },
    });
  }
  revalidatePath(`/book/${highlight.bookId}`);
}

export async function deleteHighlight(id: string) {
  const h = await prisma.highlight.findUniqueOrThrow({ where: { id } });
  await prisma.highlight.delete({ where: { id } });
  revalidatePath(`/book/${h.bookId}`);
}
