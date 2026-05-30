'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Highlighter, Loader2, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn, relativeTime } from '@/lib/utils';
import { deleteHighlight } from './actions';

type Item = {
  id: string;
  text: string;
  color: string | null;
  createdAt: Date;
};

const COLOR_DOT: Record<string, string> = {
  yellow: 'bg-yellow-300',
  blue: 'bg-sky-300',
  pink: 'bg-pink-300',
  green: 'bg-emerald-300',
};

export function HighlightsSection({ highlights }: { highlights: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const remove = async (id: string) => {
    setPendingId(id);
    try {
      await deleteHighlight(id);
      router.refresh();
    } catch (err) {
      toast.push({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Highlighter className="h-4 w-4 text-accent" /> Highlights
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {highlights.length}
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Select text in the reader and press <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">h</kbd>.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {highlights.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card/40 p-4 text-center text-sm text-muted-foreground">
            None yet. Highlight something while reading.
          </div>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
            {highlights.map((h) => (
              <li key={h.id} className="group flex items-start gap-2 rounded-md p-2 hover:bg-muted/40">
                <span
                  className={cn(
                    'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                    COLOR_DOT[h.color ?? 'yellow'] ?? 'bg-yellow-300',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{h.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {relativeTime(h.createdAt)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => remove(h.id)}
                  disabled={pendingId === h.id}
                  aria-label="Delete highlight"
                >
                  {pendingId === h.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
