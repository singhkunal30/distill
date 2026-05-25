'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CostConfirmDialog } from '@/components/ui/cost-confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  FORMAT_DESCRIPTION,
  FORMAT_LABEL,
  type SummaryAudience,
  type SummaryFormat,
  type SummaryLength,
  type SummaryTone,
} from './types';
import { estimateSummary, startSummaryJob } from './actions';

type Defaults = {
  format: SummaryFormat;
  tone: SummaryTone;
  length: SummaryLength;
  audience: SummaryAudience;
};

export function DistillDialog({
  bookId,
  defaults,
  trigger,
}: {
  bookId: string;
  defaults: Defaults;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [estimate, setEstimate] = React.useState<{
    estimatedUsd: number;
    demoMode: boolean;
    chars: number;
  } | null>(null);
  const [pending, setPending] = React.useState(false);
  const [format, setFormat] = React.useState<SummaryFormat>(defaults.format);
  const [tone, setTone] = React.useState<SummaryTone>(defaults.tone);
  const [length, setLength] = React.useState<SummaryLength>(defaults.length);
  const [audience, setAudience] = React.useState<SummaryAudience>(defaults.audience);

  const openPicker = () => {
    setOpen(true);
    setPickerOpen(true);
  };

  const proceed = async () => {
    setPending(true);
    try {
      const est = await estimateSummary({ bookId, format, tone, length, audience });
      setEstimate({
        estimatedUsd: est.estimatedUsd,
        demoMode: est.demoMode,
        chars: est.chars,
      });
      setPickerOpen(false);
      setConfirmOpen(true);
    } catch (err) {
      toast.push({
        title: 'Could not estimate cost',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  const run = async () => {
    setPending(true);
    try {
      const { jobId } = await startSummaryJob({ bookId, format, tone, length, audience });
      toast.push({
        title: 'Distilling in the background.',
        description: 'Progress shows up on the book page.',
        variant: 'success',
      });
      setConfirmOpen(false);
      setOpen(false);
      router.refresh();
      // Poll once a second on the book page anyway; navigate the user there.
      router.push(`/book/${bookId}?job=${jobId}`);
    } catch (err) {
      toast.push({
        title: 'Failed to start',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={openPicker}>{trigger}</span>
      ) : (
        <Button variant="accent" size="sm" onClick={openPicker}>
          <Sparkles className="h-3.5 w-3.5" /> Distill
        </Button>
      )}

      <Dialog open={open && pickerOpen} onOpenChange={(o) => { setOpen(o); setPickerOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Distill this book</DialogTitle>
            <DialogDescription>
              Choose a format and Distill will compose it in the background.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as SummaryFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['blink', 'insights', 'detailed', 'tldr', 'applications'] as const).map((f) => (
                    <SelectItem key={f} value={f}>{FORMAT_LABEL[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {FORMAT_DESCRIPTION[format]}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Length</Label>
                <Select value={length} onValueChange={(v) => setLength(v as SummaryLength)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as SummaryTone)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="conversational">Casual</SelectItem>
                    <SelectItem value="punchy">Punchy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as SummaryAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); setPickerOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={proceed} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {estimate ? (
        <CostConfirmDialog
          open={confirmOpen}
          onOpenChange={(o) => {
            setConfirmOpen(o);
            if (!o) setOpen(false);
          }}
          estimatedUsd={estimate.estimatedUsd}
          demoMode={estimate.demoMode}
          pending={pending}
          title={`Distill — ${FORMAT_LABEL[format]}`}
          description={`${length} · ${tone} · ${audience} reader`}
          detail={
            <p>
              {estimate.chars > 0
                ? `~${estimate.chars.toLocaleString()} characters of source.`
                : 'No source text — Distill will work from the book description.'}
            </p>
          }
          onConfirm={run}
        />
      ) : null}
    </>
  );
}
