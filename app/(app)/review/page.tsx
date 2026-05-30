import Link from 'next/link';
import { Brain } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { listDueFlashcards, countDueFlashcards } from '@/features/flashcards/queries';
import { ReviewDeck } from '@/features/flashcards/review-deck';
import { recentHighlights } from '@/features/highlights/queries';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const [due, totalDue, recent] = await Promise.all([
    listDueFlashcards(),
    countDueFlashcards(),
    recentHighlights(5),
  ]);

  return (
    <div>
      <PageHeader
        title="Daily review"
        description={`${totalDue} card${totalDue === 1 ? '' : 's'} due. Read them quietly — the schedule does the rest.`}
        icon={Brain}
      />

      <ReviewDeck
        initialCards={due.map((d) => ({
          id: d.id,
          front: d.front,
          back: d.back,
          bookId: d.bookId,
          bookTitle: d.book.title,
          ease: d.ease,
          intervalDays: d.intervalDays,
          repetitions: d.repetitions,
          dueAt: d.dueAt,
        }))}
      />

      {recent.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-3 font-serif text-lg font-semibold">Recent highlights</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {recent.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/book/${h.bookId}`}
                  className="block rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
                >
                  <p className="line-clamp-3 text-sm">{h.text}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="muted" className="text-[10px]">
                      {h.book.title}
                    </Badge>
                    {h.color ? (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: colorFor(h.color) }}
                      />
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Card className="mt-12">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Highlight a section while reading and it will surface here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function colorFor(name: string): string {
  switch (name) {
    case 'yellow':
      return 'hsl(48 96% 60%)';
    case 'blue':
      return 'hsl(199 89% 60%)';
    case 'pink':
      return 'hsl(330 80% 70%)';
    case 'green':
      return 'hsl(150 60% 55%)';
    default:
      return 'hsl(var(--accent))';
  }
}
