'use client';

import * as React from 'react';
import { Highlighter, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { createHighlight } from './actions';

type Props = {
  bookId: string;
  // Container element to listen for selection inside; defaults to document.body.
  scopeRef?: React.RefObject<HTMLElement>;
};

const COLORS = [
  { name: 'yellow', cls: 'bg-yellow-300 text-yellow-950' },
  { name: 'blue', cls: 'bg-sky-300 text-sky-950' },
  { name: 'pink', cls: 'bg-pink-300 text-pink-950' },
  { name: 'green', cls: 'bg-emerald-300 text-emerald-950' },
] as const;

/**
 * Floating button that appears next to a text selection inside the
 * scope. Clicking it (or pressing `h`) saves the selection as a
 * Highlight. Stays clear of textarea/input selections.
 */
export function HighlightOverlay({ bookId, scopeRef }: Props) {
  const toast = useToast();
  const [selection, setSelection] = React.useState<{
    text: string;
    x: number;
    y: number;
    sectionId: string | null;
  } | null>(null);
  const [pending, setPending] = React.useState(false);
  const [showPalette, setShowPalette] = React.useState(false);

  React.useEffect(() => {
    const scope = scopeRef?.current ?? document.body;

    const onSelect = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      // Ignore if the selection isn't inside the scope.
      if (!scope.contains(range.commonAncestorContainer)) return;
      // Ignore selection inside form inputs.
      const ancestor = range.commonAncestorContainer as HTMLElement;
      const node = ancestor.nodeType === 1
        ? ancestor
        : ancestor.parentElement;
      if (node?.closest('input, textarea, [contenteditable]')) return;

      const text = sel.toString().trim();
      if (text.length < 3) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      // Section id, if the selection lands inside an SR section block.
      const sectionEl = node?.closest('[data-section-id]') as HTMLElement | null;
      setSelection({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top,
        sectionId: sectionEl?.dataset.sectionId ?? null,
      });
    };

    document.addEventListener('selectionchange', onSelect);
    return () => document.removeEventListener('selectionchange', onSelect);
  }, [scopeRef]);

  const save = React.useCallback(
    async (color: (typeof COLORS)[number]['name'] = 'yellow') => {
      if (!selection) return;
      setPending(true);
      try {
        await createHighlight({
          bookId,
          text: selection.text,
          locator: selection.sectionId ?? null,
          color,
        });
        toast.push({ title: 'Highlight saved.', variant: 'success' });
        window.getSelection()?.removeAllRanges();
        setSelection(null);
        setShowPalette(false);
      } catch (err) {
        toast.push({
          title: 'Could not save highlight',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setPending(false);
      }
    },
    [bookId, selection, toast],
  );

  // Keyboard shortcut: `h` while text is selected.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'h') return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable]')) return;
      if (selection) {
        e.preventDefault();
        void save('yellow');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save, selection]);

  if (!selection) return null;

  // Clamp position to keep the button on screen.
  const left = Math.max(80, Math.min(window.innerWidth - 80, selection.x));
  const top = Math.max(64, selection.y - 56);

  return (
    <div
      className="pointer-events-none fixed z-40 flex -translate-x-1/2 flex-col items-center"
      style={{ left, top }}
    >
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-1 rounded-full border bg-popover px-2 py-1 shadow-lg animate-fade-in',
        )}
      >
        <button
          type="button"
          onClick={() => void save('yellow')}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium hover:bg-muted"
          aria-label="Save highlight"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Highlighter className="h-3.5 w-3.5" />
          )}
          Highlight
        </button>
        <span className="h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => setShowPalette((v) => !v)}
          className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          aria-label="Choose color"
        >
          •••
        </button>
        {showPalette ? (
          <div className="pointer-events-auto ml-1 flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c.name}
                aria-label={`Save as ${c.name}`}
                className={cn(
                  'h-5 w-5 rounded-full border border-border/40 transition-transform hover:scale-110',
                  c.cls.split(' ')[0],
                )}
                onClick={() => void save(c.name)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
