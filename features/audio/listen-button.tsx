'use client';

import * as React from 'react';
import { Headphones, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { CostConfirmDialog } from '@/components/ui/cost-confirm-dialog';
import { useAudioStore } from './store';
import { estimateTts, startTtsJob } from './actions';

type Props = {
  summaryId: string;
  // Buttons on the book card vs. the reader page differ in styling.
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
  label?: string;
};

export function ListenButton({ summaryId, variant = 'outline', size = 'sm', label }: Props) {
  const toast = useToast();
  const setQueue = useAudioStore((s) => s.setQueue);
  const setPosition = useAudioStore((s) => s.setPosition);
  const setSpeed = useAudioStore((s) => s.setSpeed);
  const [pending, setPending] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [estimate, setEstimate] = React.useState<{
    estimatedUsd: number;
    demoMode: boolean;
    totalChars: number;
    sectionCount: number;
    provider: string;
  } | null>(null);

  const start = async () => {
    setPending(true);
    try {
      // First, ask the server for the queue. If every section already has
      // a track, we can skip the job entirely and queue directly.
      const queueRes = await fetch(`/api/audio/queue?summaryId=${encodeURIComponent(summaryId)}`);
      const data = (await queueRes.json()) as {
        queue: {
          id: string;
          trackId: string | null;
          url: string | null;
          bookId: string;
          summaryId: string;
          sectionId: string;
          title: string;
          subtitle: string;
          durationMs: number;
          text: string | null;
          timings: { word: string; startMs: number; endMs: number }[] | null;
          savedPositionMs: number;
          savedSpeed: number;
        }[];
      };

      // If demo mode OR every section has either a track or text
      // (browser-TTS fallback), queue immediately.
      const ready = data.queue.every((q) => q.url || q.text);
      if (ready) {
        setQueue(data.queue);
        // Resume from the first track that has a saved position; else start at 0.
        const resumeIdx = data.queue.findIndex((q) => q.savedPositionMs > 0);
        if (resumeIdx >= 0) {
          useAudioStore.setState({
            index: resumeIdx,
            positionMs: data.queue[resumeIdx]!.savedPositionMs,
          });
          setSpeed(data.queue[resumeIdx]!.savedSpeed);
        } else {
          setPosition(0);
        }
        return;
      }

      // Otherwise, show cost confirmation and enqueue a TTS job.
      const est = await estimateTts({ summaryId });
      setEstimate(est);
      setConfirmOpen(true);
    } catch (err) {
      toast.push({
        title: 'Could not start audio',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  const confirm = async () => {
    setPending(true);
    try {
      const { jobId } = await startTtsJob({ summaryId });
      toast.push({
        title: 'Narrating in the background.',
        description: 'The mini-player will pick up as sections become available.',
      });
      setConfirmOpen(false);
      // Poll until at least one track lands, then queue.
      void pollAndQueue(jobId, summaryId, setQueue, setPosition, setSpeed);
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
      <Button variant={variant} size={size} onClick={start} disabled={pending}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Headphones className="h-3.5 w-3.5" />
        )}
        {label ?? 'Listen'}
      </Button>
      {estimate ? (
        <CostConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          estimatedUsd={estimate.estimatedUsd}
          demoMode={estimate.demoMode}
          title="Narrate this summary"
          description={`${estimate.sectionCount} sections, ${estimate.totalChars.toLocaleString()} characters via ${estimate.provider}.`}
          pending={pending}
          onConfirm={confirm}
        />
      ) : null}
    </>
  );
}

async function pollAndQueue(
  jobId: string,
  summaryId: string,
  setQueue: (q: Parameters<ReturnType<typeof useAudioStore.getState>['setQueue']>[0]) => void,
  setPosition: (ms: number) => void,
  setSpeed: (s: number) => void,
) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const res = await fetch(`/api/audio/queue?summaryId=${encodeURIComponent(summaryId)}`);
      const data = (await res.json()) as {
        queue: {
          id: string;
          trackId: string | null;
          url: string | null;
          text: string | null;
          durationMs: number;
          bookId: string;
          summaryId: string;
          sectionId: string;
          title: string;
          subtitle: string;
          timings: { word: string; startMs: number; endMs: number }[] | null;
          savedPositionMs: number;
          savedSpeed: number;
        }[];
      };
      if (data.queue.some((t) => t.url || t.text)) {
        setQueue(data.queue);
        setPosition(0);
        setSpeed(1);
        return;
      }
    } catch {
      /* keep polling */
    }
    // Stop polling if the job failed.
    try {
      const j = await fetch(`/api/jobs?jobId=${encodeURIComponent(jobId)}`);
      const body = (await j.json()) as { job: { status: string } | null };
      if (body.job?.status === 'failed') return;
    } catch {
      /* ignore */
    }
  }
}
