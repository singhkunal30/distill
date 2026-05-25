import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Hash, Headphones, Star } from 'lucide-react';
import { getBook } from '@/features/books/queries';
import { listSummaries } from '@/features/summaries/queries';
import { getSettings } from '@/lib/settings';
import { BookCover } from '@/features/books/book-cover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseAuthors } from '@/lib/utils';
import { STATUS_LABEL, SOURCE_LABEL } from '@/features/books/types';
import { BookStatusControl } from '@/features/books/book-status-control';
import { DistillDialog } from '@/features/summaries/distill-dialog';
import { JobProgress } from '@/features/summaries/job-progress';
import { FORMAT_LABEL, FORMAT_DESCRIPTION, type SummaryFormat } from '@/features/summaries/types';

export const dynamic = 'force-dynamic';

export default async function BookPage({ params }: { params: { id: string } }) {
  const [book, settings] = await Promise.all([getBook(params.id), getSettings()]);
  if (!book) notFound();
  const summaries = await listSummaries(book.id);

  const authors = parseAuthors(book.authors);
  const sourceLabel =
    SOURCE_LABEL[book.sourceType as keyof typeof SOURCE_LABEL] ?? book.sourceType;
  const statusLabel = STATUS_LABEL[book.status as keyof typeof STATUS_LABEL] ?? book.status;

  const haveFormats = new Set(summaries.map((s) => s.format));
  const allFormats: SummaryFormat[] = ['blink', 'insights', 'detailed', 'tldr', 'applications'];

  return (
    <div>
      <Link
        href="/library"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Library
      </Link>

      <div className="grid gap-6 md:grid-cols-[200px,1fr]">
        <div className="mx-auto w-40 sm:w-48 md:mx-0 md:w-full">
          <BookCover url={book.coverUrl} title={book.title} sizes="200px" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Badge variant="muted">{statusLabel}</Badge>
            <Badge variant="outline">{sourceLabel}</Badge>
            {book.genres.map((g) => (
              <Badge key={g.genreId} variant="secondary">
                {g.genre.name}
              </Badge>
            ))}
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {book.title}
          </h1>
          {book.subtitle ? (
            <p className="mt-1 font-serif text-lg text-muted-foreground">{book.subtitle}</p>
          ) : null}
          <p className="mt-2 text-sm">
            {authors.length > 0 ? authors.join(', ') : 'Unknown author'}
            {book.publishedYear ? ` · ${book.publishedYear}` : ''}
            {book.pageCount ? ` · ${book.pageCount} pages` : ''}
          </p>

          {book.description ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80">
              {book.description}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <BookStatusControl id={book.id} status={book.status as never} />
            <DistillDialog
              bookId={book.id}
              defaults={{
                format: settings.defaultSummaryFormat,
                tone: settings.defaultSummaryTone,
                length: settings.defaultSummaryLength,
                audience: settings.defaultSummaryAudience,
              }}
            />
            <Button variant="outline" size="sm" disabled>
              <Headphones className="h-3.5 w-3.5" />
              Listen (Phase 3)
            </Button>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <JobProgress bookId={book.id} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-lg font-semibold">Distillations</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allFormats.map((f) => {
            const existing = summaries.find((s) => s.format === f);
            return (
              <Card key={f} className={existing ? '' : 'border-dashed bg-card/50'}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{FORMAT_LABEL[f]}</CardTitle>
                  <CardDescription className="text-xs">
                    {FORMAT_DESCRIPTION[f]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-end justify-between pt-0">
                  {existing ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {existing._count.sections} sections
                        {existing.generatedAt
                          ? ` · ${new Date(existing.generatedAt).toLocaleDateString()}`
                          : ''}
                      </p>
                      <Button asChild size="sm" variant="default">
                        <Link href={`/read/${book.id}/${f}`}>Read</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">Not generated yet</p>
                      <DistillDialog
                        bookId={book.id}
                        defaults={{
                          format: f,
                          tone: settings.defaultSummaryTone,
                          length: settings.defaultSummaryLength,
                          audience: settings.defaultSummaryAudience,
                        }}
                        trigger={
                          <Button size="sm" variant="outline">
                            Distill
                          </Button>
                        }
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {haveFormats.size === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: in demo mode, every format is free and uses pre-cached fixtures.
          </p>
        ) : null}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Source content
            </CardTitle>
            <CardDescription>
              {book.contentMd
                ? `${book.contentChars?.toLocaleString() ?? book.contentMd.length.toLocaleString()} characters captured`
                : 'No source text yet. Re-import to add full content.'}
            </CardDescription>
          </CardHeader>
          {book.contentMd ? (
            <CardContent>
              <div className="max-h-72 overflow-y-auto rounded-md border bg-background/60 p-3 text-sm whitespace-pre-wrap scrollbar-thin">
                {book.contentMd.slice(0, 4000)}
                {book.contentMd.length > 4000 ? '\n\n…' : ''}
              </div>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4" /> Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="grid grid-cols-[6.5rem,1fr] gap-y-2">
              <dt className="text-muted-foreground">ISBN</dt>
              <dd>{book.isbn ?? '—'}</dd>
              <dt className="text-muted-foreground">OL ID</dt>
              <dd className="break-all">{book.openLibraryId ?? '—'}</dd>
              <dt className="text-muted-foreground">Rating</dt>
              <dd className="flex items-center gap-1">
                {book.rating ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < (book.rating ?? 0)
                          ? 'h-3.5 w-3.5 fill-accent text-accent'
                          : 'h-3.5 w-3.5 text-muted-foreground/50'
                      }
                    />
                  ))
                ) : (
                  <span className="text-muted-foreground">Not rated</span>
                )}
              </dd>
              <dt className="text-muted-foreground">Added</dt>
              <dd>{book.createdAt.toLocaleDateString()}</dd>
              {book.startedAt ? (
                <>
                  <dt className="text-muted-foreground">Started</dt>
                  <dd>{book.startedAt.toLocaleDateString()}</dd>
                </>
              ) : null}
              {book.finishedAt ? (
                <>
                  <dt className="text-muted-foreground">Finished</dt>
                  <dd>{book.finishedAt.toLocaleDateString()}</dd>
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
