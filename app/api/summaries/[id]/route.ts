import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const summary = await prisma.summary.findUnique({
    where: { id: params.id },
    include: {
      book: { select: { id: true, title: true, authors: true, coverUrl: true } },
      sections: { orderBy: { position: 'asc' } },
    },
  });
  if (!summary) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    summary: {
      id: summary.id,
      format: summary.format,
      tone: summary.tone,
      length: summary.length,
      audience: summary.audience,
      modelUsed: summary.modelUsed,
      generatedAt: summary.generatedAt?.toISOString() ?? null,
      book: {
        id: summary.book.id,
        title: summary.book.title,
        coverUrl: summary.book.coverUrl,
        authors: summary.book.authors, // mobile parses JSON itself
      },
      sections: summary.sections.map((s) => ({
        id: s.id,
        position: s.position,
        heading: s.heading,
        body: s.body,
      })),
    },
  });
}
