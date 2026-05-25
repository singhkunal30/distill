import { prisma } from '@/lib/db';

export async function getSummary(bookId: string, format: string) {
  return prisma.summary.findUnique({
    where: { bookId_format: { bookId, format } },
    include: { sections: { orderBy: { position: 'asc' } } },
  });
}

export async function listSummaries(bookId: string) {
  return prisma.summary.findMany({
    where: { bookId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      format: true,
      tone: true,
      length: true,
      audience: true,
      generatedAt: true,
      _count: { select: { sections: true } },
    },
  });
}

export async function listVersions(summaryId: string) {
  return prisma.summaryVersion.findMany({
    where: { summaryId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActiveSummaryJob(bookId: string) {
  return prisma.generationJob.findFirst({
    where: {
      bookId,
      kind: { in: ['summary', 'section_regenerate'] },
      status: { in: ['pending', 'generating'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}
