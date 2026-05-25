import { notFound } from 'next/navigation';
import { getBook } from '@/features/books/queries';
import { getSummary, listVersions } from '@/features/summaries/queries';
import { SummaryReader } from '@/features/summaries/summary-reader';
import { SummaryFormat } from '@/features/summaries/types';

export const dynamic = 'force-dynamic';

// Standalone reader: no AppShell. Owns its own header.
export const metadata = {
  title: 'Reading',
};

export default async function ReaderPage({
  params,
}: {
  params: { id: string; format: string };
}) {
  const formatParsed = SummaryFormat.safeParse(params.format);
  if (!formatParsed.success) notFound();
  const [book, summary] = await Promise.all([
    getBook(params.id),
    getSummary(params.id, formatParsed.data),
  ]);
  if (!book) notFound();
  if (!summary) notFound();
  const versions = await listVersions(summary.id);

  return (
    <SummaryReader
      book={{
        id: book.id,
        title: book.title,
        authors: book.authors,
        description: book.description,
      }}
      summary={{
        id: summary.id,
        format: summary.format,
        length: summary.length,
        tone: summary.tone,
        audience: summary.audience,
        modelUsed: summary.modelUsed,
        generatedAt: summary.generatedAt,
        sections: summary.sections.map((s) => ({
          id: s.id,
          position: s.position,
          heading: s.heading,
          body: s.body,
        })),
      }}
      versions={versions.map((v) => ({
        id: v.id,
        reason: v.reason,
        createdAt: v.createdAt,
      }))}
    />
  );
}
