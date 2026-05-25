'use client';

import * as React from 'react';
import { Check, Loader2, Pencil, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { renderMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import { regenerateSection, saveSectionEdit } from './actions';

type Props = {
  section: {
    id: string;
    heading: string;
    body: string;
    position: number;
  };
  total: number;
  fontScale: number;
  fontFamily: 'serif' | 'sans';
};

export function SummarySectionBlock({ section, total, fontScale, fontFamily }: Props) {
  const toast = useToast();
  const [mode, setMode] = React.useState<'view' | 'edit'>('view');
  const [heading, setHeading] = React.useState(section.heading);
  const [body, setBody] = React.useState(section.body);
  const [savePending, startSave] = React.useTransition();
  const [regenPending, startRegen] = React.useTransition();
  const [regenInstruction, setRegenInstruction] = React.useState('');
  const [regenOpen, setRegenOpen] = React.useState(false);

  // Sync local state if parent re-renders with new content (e.g. after job).
  React.useEffect(() => {
    setHeading(section.heading);
    setBody(section.body);
  }, [section.heading, section.body]);

  const onSave = () => {
    startSave(async () => {
      try {
        await saveSectionEdit({ sectionId: section.id, heading, body });
        toast.push({ title: 'Saved.', variant: 'success' });
        setMode('view');
      } catch (err) {
        toast.push({
          title: 'Could not save',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    });
  };

  const onCancel = () => {
    setHeading(section.heading);
    setBody(section.body);
    setMode('view');
  };

  const onRegen = () => {
    startRegen(async () => {
      try {
        await regenerateSection({
          sectionId: section.id,
          userInstruction: regenInstruction || undefined,
        });
        setRegenOpen(false);
        setRegenInstruction('');
        toast.push({
          title: 'Regenerating section…',
          description: 'You’ll see the new version when the job completes.',
        });
      } catch (err) {
        toast.push({
          title: 'Could not enqueue',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    });
  };

  const fontClass = fontFamily === 'serif' ? 'font-serif' : 'font-sans';

  return (
    <section
      id={`s-${section.id}`}
      className="group scroll-mt-24 border-t pt-8 first:border-t-0 first:pt-0"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        {mode === 'view' ? (
          <h2
            className={cn('font-serif text-2xl font-semibold tracking-tight md:text-3xl text-balance')}
            style={{ fontSize: `${1.5 * fontScale}rem` }}
          >
            <span className="mr-2 text-sm font-normal text-muted-foreground">
              {String(section.position + 1).padStart(2, '0')}
            </span>
            {section.heading}
          </h2>
        ) : (
          <Input
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            className="text-base"
            placeholder="Section heading"
          />
        )}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {mode === 'view' ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('edit')}
                aria-label="Edit section"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRegenOpen((v) => !v)}
                aria-label="Regenerate section"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={savePending}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button variant="default" size="sm" onClick={onSave} disabled={savePending}>
                {savePending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {mode === 'view' ? (
        <div
          className={cn('prose-distill', fontClass)}
          style={{ fontSize: `${1.05 * fontScale}rem` }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body) }}
        />
      ) : (
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={Math.max(6, Math.min(20, body.split('\n').length + 2))}
          className="font-mono text-sm"
        />
      )}

      {regenOpen ? (
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Regenerate {total > 1 ? `section ${section.position + 1}` : 'this section'}
          </p>
          <Input
            value={regenInstruction}
            onChange={(e) => setRegenInstruction(e.target.value)}
            placeholder="Optional: how should the rewrite differ?"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRegenOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={onRegen} disabled={regenPending} variant="accent">
              {regenPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Regenerate
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
