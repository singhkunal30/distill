import Link from 'next/link';
import { ArrowRight, BookMarked, Brain, Library, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/db';
import { listBooks } from '@/features/books/queries';
import { BookCard } from '@/features/books/book-card';
import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddBookButton } from '@/features/books/add-book-dialog';
import { getBudgetStatus } from '@/lib/ai/budget';
import { formatUsd } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import { countDueFlashcards } from '@/features/flashcards/queries';

export default async function HomePage() {
  const [books, settings, budget, jobs, dueCount] = await Promise.all([
    listBooks(),
    getSettings(),
    getBudgetStatus(),
    prisma.generationJob.findMany({
      where: { status: { in: ['pending', 'generating'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    countDueFlashcards(),
  ]);

  const reading = books.filter((b) => b.status === 'reading').slice(0, 6);
  const recent = books.slice(0, 8);
  const finishedCount = books.filter((b) => b.status === 'finished').length;

  return (
    <div>
      <PageHeader
        title="Welcome back."
        description="Pick up where you left off, or distill something new."
        actions={<AddBookButton />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Library}
          label="In library"
          value={books.length.toString()}
          hint={`${reading.length} reading`}
        />
        <StatCard
          icon={BookMarked}
          label="Finished"
          value={finishedCount.toString()}
          hint="lifetime"
        />
        <StatCard
          icon={Brain}
          label="Due to review"
          value={dueCount.toString()}
          hint={dueCount > 0 ? 'go to Review' : 'caught up'}
        />
        <StatCard
          icon={Sparkles}
          label="Mode"
          value={settings.demoMode ? 'Demo' : 'Live'}
          hint={settings.demoMode ? 'No API spend' : formatUsd(budget.remainingUsd) + ' left'}
        />
      </div>

      {reading.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center justify-between font-serif text-lg font-semibold">
            Currently reading
            <Link
              href="/library"
              className="text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              See all <ArrowRight className="inline h-3 w-3" />
            </Link>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {reading.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 font-serif text-lg font-semibold">Recently added</h2>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Library className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-serif text-lg">Your library is empty.</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Add a book to start distilling. Search the Open Library, paste a URL,
                or upload an EPUB.
              </p>
              <div className="mt-4">
                <AddBookButton />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {recent.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {jobs.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 font-serif text-lg font-semibold">In progress</h2>
          <ul className="divide-y rounded-lg border bg-card">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{job.kind}</p>
                  <p className="text-xs text-muted-foreground">{job.progressNote ?? job.status}</p>
                </div>
                <span className="text-xs text-muted-foreground">{job.progress}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookMarked;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <p className="font-serif text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
