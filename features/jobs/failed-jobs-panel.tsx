'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { relativeTime } from '@/lib/utils';
import { retryFailedSummaryJob } from '@/features/summaries/actions';

type FailedJob = {
  id: string;
  kind: string;
  error: string;
  attempts: number;
  failedAt: Date;
  retriedJobId: string | null;
};

export function FailedJobsPanel({ jobs }: { jobs: FailedJob[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed jobs</CardTitle>
          <CardDescription>
            Any AI job that fails after 3 retries lands here, with a one-click retry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No failures recorded. Nice.</p>
        </CardContent>
      </Card>
    );
  }

  const retry = async (id: string) => {
    setPendingId(id);
    try {
      await retryFailedSummaryJob(id);
      toast.push({ title: 'Re-enqueued.', variant: 'success' });
      router.refresh();
    } catch (err) {
      toast.push({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failed jobs</CardTitle>
        <CardDescription>One-click retry. Errors below are the last message.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{j.kind}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground break-all">{j.error}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {relativeTime(j.failedAt)} · {j.attempts} attempts
                </p>
              </div>
              {j.retriedJobId ? (
                <span className="text-xs text-muted-foreground">Retried</span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId === j.id}
                  onClick={() => retry(j.id)}
                >
                  {pendingId === j.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-3.5 w-3.5" />
                  )}
                  Retry
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
