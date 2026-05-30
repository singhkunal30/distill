'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Brain, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CostConfirmDialog } from '@/components/ui/cost-confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { startFlashcardsJob } from './actions';

type Card = { id: string; front: string; back: string; dueAt: Date };

export function FlashcardsSection({
  bookId,
  cards,
  hasSummary,
}: {
  bookId: string;
  cards: Card[];
  hasSummary: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    estimatedUsd: number;
    demoMode: boolean;
  } | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const now = Date.now();
  const due = cards.filter((c) => new Date(c.dueAt).getTime() <= now).length;

  const startGen = async () => {
    if (!hasSummary) {
      toast.push({
        title: 'Distill a summary first',
        description: 'Flashcards build on top of a summary. Run Distill on this book before generating cards.',
        variant: 'destructive',
      });
      return;
    }
    setPending(true);
    try {
      const res = await startFlashcardsJob({ bookId });
      // Hop straight to confirmation only if not demo (demo is 0 USD anyway).
      setConfirm({ open: true, estimatedUsd: res.estimatedUsd, demoMode: res.demoMode });
    } catch (err) {
      toast.push({
        title: 'Could not start',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  const confirmRun = async () => {
    // The job was already enqueued by startFlashcardsJob (demo mode runs
    // through the same path). Just close and refresh.
    setConfirm(null);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" /> Flashcards
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {cards.length} card{cards.length === 1 ? '' : 's'}
            {due > 0 ? ` · ${due} due` : ''}
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          SM-2 spaced repetition. Quietly resurfaces what you read.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {cards.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card/40 p-4 text-center text-sm text-muted-foreground">
            No flashcards yet.
          </div>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {cards.slice(0, 12).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setExpanded((id) => (id === c.id ? null : c.id))}
                  className="flex w-full items-start gap-3 rounded-md p-2 text-left text-sm hover:bg-muted/40"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.front}</p>
                    {expanded === c.id ? (
                      <p className="mt-1 text-xs text-muted-foreground">{c.back}</p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={startGen} disabled={pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : cards.length > 0 ? (
              <RefreshCcw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {cards.length > 0 ? 'Regenerate' : 'Generate'}
          </Button>
          {due > 0 ? (
            <Button asChild size="sm">
              <Link href="/review">
                Review {due} <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
      {confirm ? (
        <CostConfirmDialog
          open={confirm.open}
          onOpenChange={(o) => setConfirm(o ? confirm : null)}
          estimatedUsd={confirm.estimatedUsd}
          demoMode={confirm.demoMode}
          title="Generating flashcards"
          description="Distill is composing cards in the background. You'll see them shortly."
          confirmLabel="OK"
          onConfirm={confirmRun}
        />
      ) : null}
    </Card>
  );
}
