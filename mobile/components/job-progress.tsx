import * as React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { JobStatus } from '@/lib/types';

// Polls /api/jobs?bookId=… every 1.5s while the screen is visible. When
// a job flips to completed/failed, invalidates the book query so the
// UI re-fetches.
export function JobProgress({ bookId, invalidateKey }: { bookId: string; invalidateKey: unknown[] }) {
  const qc = useQueryClient();
  const [job, setJob] = React.useState<JobStatus['job']>(null);
  const lastStatus = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const res = await api<JobStatus>(`/api/jobs?bookId=${encodeURIComponent(bookId)}`);
        if (cancelled) return;
        setJob(res.job);
        if (
          lastStatus.current &&
          lastStatus.current !== 'completed' &&
          (!res.job || res.job.status === 'completed')
        ) {
          qc.invalidateQueries({ queryKey: invalidateKey });
        }
        lastStatus.current = res.job?.status ?? null;
      } catch {
        /* keep polling */
      }
    };
    tick();
    timer = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [bookId, qc, invalidateKey]);

  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  if (!job) return null;

  const isFailed = job.status === 'failed';
  return (
    <View
      className={`mt-3 flex-row items-center gap-3 rounded-lg border px-3 py-2 ${
        isFailed
          ? 'border-destructive/40 bg-destructive/5'
          : dark
            ? 'border-border-dark bg-card-dark'
            : 'border-border bg-card'
      }`}
    >
      {isFailed ? null : <ActivityIndicator size="small" />}
      <View className="flex-1">
        <Text className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {labelFor(job.kind)} — {job.progressNote ?? job.status}
        </Text>
        {isFailed && job.error ? (
          <Text className="text-xs text-destructive" numberOfLines={2}>
            {job.error}
          </Text>
        ) : null}
      </View>
      <Text className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}>
        {job.progress}%
      </Text>
    </View>
  );
}

function labelFor(kind: string): string {
  switch (kind) {
    case 'summary':
      return 'Distilling';
    case 'section_regenerate':
      return 'Regenerating';
    case 'tts':
      return 'Narrating';
    case 'flashcards':
      return 'Generating cards';
    case 'quiz':
      return 'Composing quiz';
    default:
      return kind;
  }
}
