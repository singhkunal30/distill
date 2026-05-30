'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { reviewFlashcard } from './actions';
import { previewIntervals } from '@/lib/srs/sm2';

type Card = {
  id: string;
  front: string;
  back: string;
  bookId: string;
  bookTitle: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
};

const QUALITY = [
  { label: 'Again', quality: 0, hint: 'I forgot it.', className: 'border-destructive/40 text-destructive' },
  { label: 'Hard', quality: 3, hint: 'I got it, with effort.', className: 'border-muted-foreground/40' },
  { label: 'Good', quality: 4, hint: 'I got it.', className: 'border-primary/40' },
  { label: 'Easy', quality: 5, hint: 'Trivial recall.', className: 'border-accent/60 text-accent-foreground bg-accent/10' },
] as const;

export function ReviewDeck({ initialCards }: { initialCards: Card[] }) {
  const router = useRouter();
  const toast = useToast();
  const [queue, setQueue] = React.useState(initialCards);
  const [index, setIndex] = React.useState(0);
  const [showBack, setShowBack] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [stats, setStats] = React.useState({ reviewed: 0, again: 0 });

  const current = queue[index] ?? null;

  // Reveal the back with the space bar; quality with 1–4.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input,textarea')) return;
      if (!current) return;
      if (!showBack) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setShowBack(true);
        }
        return;
      }
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) {
        e.preventDefault();
        const q = QUALITY[idx];
        if (q) void grade(q.quality);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, showBack]);

  if (!current) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-card p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-serif text-2xl">All caught up.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {stats.reviewed > 0
            ? `Reviewed ${stats.reviewed} card${stats.reviewed === 1 ? '' : 's'} this session${stats.again > 0 ? ` — ${stats.again} marked for relearn` : ''}.`
            : 'No cards are due right now. Generate flashcards from a book’s page to add some.'}
        </p>
      </div>
    );
  }

  async function grade(quality: number) {
    if (!current) return;
    setPending(true);
    try {
      await reviewFlashcard({ flashcardId: current.id, quality });
      setStats((s) => ({
        reviewed: s.reviewed + 1,
        again: s.again + (quality < 3 ? 1 : 0),
      }));
      // Advance.
      setShowBack(false);
      if (index + 1 < queue.length) {
        setIndex((i) => i + 1);
      } else {
        // Refresh to pull in any newly-due cards.
        router.refresh();
        setIndex((i) => i + 1);
      }
    } catch (err) {
      toast.push({
        title: 'Could not save review',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  }

  const intervals = previewIntervals({
    ease: current.ease,
    intervalDays: current.intervalDays,
    repetitions: current.repetitions,
  });
  const intervalFor: Record<number, number> = {
    0: intervals.again,
    3: intervals.hard,
    4: intervals.good,
    5: intervals.easy,
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span className="truncate">{current.bookTitle}</span>
      </div>

      <div
        className={cn(
          'min-h-[18rem] rounded-2xl border bg-card p-6 shadow-sm transition-colors',
          showBack && 'bg-card',
        )}
      >
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {showBack ? 'Answer' : 'Question'}
        </p>
        <p
          className="mt-3 font-serif text-xl leading-relaxed text-balance md:text-2xl"
        >
          {showBack ? current.back : current.front}
        </p>
        {showBack && current.repetitions === 0 ? (
          <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> first review
          </p>
        ) : null}
      </div>

      {!showBack ? (
        <div className="mt-4 flex justify-center">
          <Button onClick={() => setShowBack(true)} size="lg" variant="default">
            Show answer <span className="ml-2 hidden text-xs opacity-70 md:inline">space</span>
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {QUALITY.map((q, i) => (
            <button
              key={q.label}
              type="button"
              onClick={() => void grade(q.quality)}
              disabled={pending}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border-2 bg-card px-3 py-3 text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-50',
                q.className,
              )}
            >
              <span>{q.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                +{formatInterval(intervalFor[q.quality]!)}
              </span>
              <span className="hidden text-[10px] text-muted-foreground md:inline">
                press {i + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setShowBack(false);
            if (index > 0) setIndex((i) => i - 1);
          }}
          className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-30"
          disabled={index === 0}
        >
          <RotateCcw className="h-3 w-3" /> Back
        </button>
        <span>
          {stats.reviewed} reviewed · {stats.again} relearning
        </span>
      </div>
    </div>
  );
}

function formatInterval(days: number): string {
  if (days < 1) return '<1d';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.round(days / 7)} wk`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${Math.round(days / 365)} yr`;
}
