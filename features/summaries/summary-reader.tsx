'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, History } from 'lucide-react';
import { ReaderProvider, ReaderControls, useReader } from './reader-controls';
import { SummarySectionBlock } from './summary-section';
import { Button } from '@/components/ui/button';
import { cn, parseAuthors } from '@/lib/utils';
import { JobProgress } from './job-progress';
import { VersionHistorySheet } from './version-history';
import { FORMAT_LABEL } from './types';
import { ListenButton } from '@/features/audio/listen-button';
import { HighlightOverlay } from '@/features/highlights/highlight-overlay';

type Section = { id: string; position: number; heading: string; body: string };

type Props = {
  book: {
    id: string;
    title: string;
    authors: string;
    description: string | null;
  };
  summary: {
    id: string;
    format: string;
    length: string | null;
    tone: string | null;
    audience: string | null;
    modelUsed: string | null;
    generatedAt: Date | null;
    sections: Section[];
  };
  versions: { id: string; reason: string | null; createdAt: Date }[];
};

export function SummaryReader(props: Props) {
  return (
    <ReaderProvider>
      <Inner {...props} />
    </ReaderProvider>
  );
}

function Inner({ book, summary, versions }: Props) {
  const { state } = useReader();
  const authors = parseAuthors(book.authors);
  const fmt = FORMAT_LABEL[summary.format as keyof typeof FORMAT_LABEL] ?? summary.format;

  return (
    <div className="min-h-dvh">
      <header
        className={cn(
          'sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur transition-opacity md:px-6',
          state.zen && 'opacity-0 hover:opacity-100',
        )}
      >
        <Link
          href={`/book/${book.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to book
        </Link>
        <div className="flex items-center gap-1">
          <VersionHistorySheet versions={versions} bookId={book.id}>
            <Button variant="ghost" size="icon" aria-label="Version history">
              <History className="h-4 w-4" />
            </Button>
          </VersionHistorySheet>
          <ListenButton summaryId={summary.id} variant="ghost" label="" />
          <ReaderControls />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-8 md:px-0">
        <JobProgress bookId={book.id} />

        <header className="mb-10 mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{fmt}</p>
          <h1
            className="mt-2 font-serif font-semibold leading-tight tracking-tight text-balance"
            style={{ fontSize: `${2.4 * state.fontScale}rem` }}
          >
            {book.title}
          </h1>
          {authors.length > 0 ? (
            <p className="mt-2 text-base text-muted-foreground">{authors.join(', ')}</p>
          ) : null}
          {summary.generatedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Distilled {new Date(summary.generatedAt).toLocaleDateString()}{' '}
              {summary.modelUsed ? `· ${summary.modelUsed}` : '· demo mode'}
            </p>
          ) : null}
        </header>

        <article className="space-y-10">
          {summary.sections.map((s) => (
            <SummarySectionBlock
              key={s.id}
              section={s}
              total={summary.sections.length}
              fontScale={state.fontScale}
              fontFamily={state.fontFamily}
            />
          ))}
        </article>

        <footer className="mt-14 border-t pt-6 text-center text-sm text-muted-foreground">
          End of {fmt.toLowerCase()}.
        </footer>
      </main>

      <HighlightOverlay bookId={book.id} />
    </div>
  );
}
