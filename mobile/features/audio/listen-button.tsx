import * as React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAudioStore } from './store';
import type { AudioQueueResponse } from '@/lib/types';

export function ListenButton({
  summaryId,
  small,
}: {
  summaryId: string;
  small?: boolean;
}) {
  const setQueue = useAudioStore((s) => s.setQueue);
  const [pending, setPending] = React.useState(false);

  const start = async () => {
    setPending(true);
    try {
      // First check whether we have a ready queue (demo text or cached MP3s).
      const data = await api<AudioQueueResponse>(
        `/api/audio/queue?summaryId=${encodeURIComponent(summaryId)}`,
      );
      const ready = data.queue.every((q) => q.url || q.text);
      if (ready) {
        setQueue(data.queue);
        return;
      }
      // Otherwise kick off the TTS job and poll.
      await api('/api/tts', { method: 'POST', body: { summaryId } });
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const refreshed = await api<AudioQueueResponse>(
            `/api/audio/queue?summaryId=${encodeURIComponent(summaryId)}`,
          );
          if (refreshed.queue.some((q) => q.url || q.text)) {
            setQueue(refreshed.queue);
            return;
          }
        } catch {
          /* keep polling */
        }
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Pressable
      onPress={start}
      disabled={pending}
      className={`flex-row items-center gap-2 rounded-full border border-border bg-card px-${small ? '3' : '4'} py-${small ? '1.5' : '2'}`}
    >
      {pending ? (
        <ActivityIndicator size="small" />
      ) : (
        <Ionicons name="headset-outline" size={small ? 14 : 16} color="#1f1c18" />
      )}
      <Text className={`${small ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
        Listen
      </Text>
    </Pressable>
  );
}
