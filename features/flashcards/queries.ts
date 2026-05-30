import { prisma } from '@/lib/db';

export async function listDueFlashcards(now: Date = new Date(), limit = 100) {
  return prisma.flashcard.findMany({
    where: { dueAt: { lte: now } },
    orderBy: [{ dueAt: 'asc' }],
    take: limit,
    include: {
      book: {
        select: { id: true, title: true, coverUrl: true },
      },
    },
  });
}

export async function countDueFlashcards(now: Date = new Date()) {
  return prisma.flashcard.count({ where: { dueAt: { lte: now } } });
}

export async function listFlashcardsForBook(bookId: string) {
  return prisma.flashcard.findMany({
    where: { bookId },
    orderBy: [{ dueAt: 'asc' }],
  });
}
