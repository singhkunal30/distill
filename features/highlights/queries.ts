import { prisma } from '@/lib/db';

export async function listHighlightsForBook(bookId: string) {
  return prisma.highlight.findMany({
    where: { bookId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function recentHighlights(limit = 10) {
  return prisma.highlight.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      book: { select: { id: true, title: true, coverUrl: true } },
    },
  });
}

export async function randomHighlight() {
  const count = await prisma.highlight.count();
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  return prisma.highlight.findFirst({
    skip,
    include: { book: { select: { id: true, title: true, coverUrl: true } } },
  });
}
