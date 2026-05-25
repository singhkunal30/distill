'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Job = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  progressNote: string | null;
  error: string | null;
};

export function JobProgress({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [job, setJob] = React.useState<Job | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let prevStatus: string | null = null;
    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs?bookId=${encodeURIComponent(bookId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { job: Job | null };
        if (cancelled) return;
        setJob(data.job);
        if (
          prevStatus &&
          prevStatus !== 'completed' &&
          (data.job === null || data.job.status === 'completed')
        ) {
          router.refresh();
        }
        prevStatus = data.job?.status ?? null;
      } catch {
        /* ignore transient fetch errors */
      }
    };
    void tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bookId, router]);

  if (!job) return null;

  const isFailed = job.status === 'failed';
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 text-sm',
        isFailed && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isFailed ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : job.status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-accent" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span className="font-medium">
            {labelFor(job.kind)} — {job.progressNote ?? job.status}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{job.progress}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', isFailed ? 'bg-destructive' : 'bg-accent')}
          style={{ width: `${job.progress}%` }}
        />
      </div>
      {isFailed && job.error ? (
        <p className="mt-2 text-xs text-destructive">{job.error}</p>
      ) : null}
    </div>
  );
}

function labelFor(kind: string): string {
  switch (kind) {
    case 'summary':
      return 'Distilling';
    case 'section_regenerate':
      return 'Regenerating section';
    case 'tts':
      return 'Narrating';
    case 'embedding':
      return 'Indexing';
    default:
      return kind;
  }
}
