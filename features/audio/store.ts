'use client';

import { create } from 'zustand';

export type AudioQueueItem = {
  id: string;
  // For MP3 tracks: trackId references AudioTrack.id and url is the MP3.
  // For demo/browser TTS: url is null and `text` carries what to speak.
  trackId: string | null;
  url: string | null;
  text: string | null;
  bookId: string;
  summaryId: string;
  sectionId: string;
  title: string;
  subtitle: string;
  durationMs: number;
  // ElevenLabs word timings, used by the karaoke-style highlighter.
  timings: { word: string; startMs: number; endMs: number }[] | null;
};

export type AudioStore = {
  queue: AudioQueueItem[];
  index: number;
  // Playback flags
  playing: boolean;
  positionMs: number;
  speed: number;
  // Sleep timer (ms remaining). null = off.
  sleepTimerMs: number | null;
  expanded: boolean;

  setQueue: (items: AudioQueueItem[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setIndex: (i: number) => void;
  setPosition: (ms: number) => void;
  setSpeed: (s: number) => void;
  setSleepTimer: (ms: number | null) => void;
  setExpanded: (v: boolean) => void;
  clear: () => void;
  seekRelative: (deltaMs: number) => void;
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  queue: [],
  index: 0,
  playing: false,
  positionMs: 0,
  speed: 1,
  sleepTimerMs: null,
  expanded: false,

  setQueue(items, startIndex = 0) {
    set({
      queue: items,
      index: Math.min(Math.max(0, startIndex), Math.max(0, items.length - 1)),
      positionMs: 0,
      playing: items.length > 0,
    });
  },
  play() {
    if (get().queue.length === 0) return;
    set({ playing: true });
  },
  pause() {
    set({ playing: false });
  },
  togglePlay() {
    if (get().queue.length === 0) return;
    set((s) => ({ playing: !s.playing }));
  },
  next() {
    const { queue, index } = get();
    if (index + 1 >= queue.length) {
      set({ playing: false });
      return;
    }
    set({ index: index + 1, positionMs: 0, playing: true });
  },
  prev() {
    const { index, positionMs } = get();
    // Mimic a typical player: <3s into the track jumps backward; otherwise restart.
    if (positionMs > 3000) {
      set({ positionMs: 0 });
      return;
    }
    if (index === 0) {
      set({ positionMs: 0 });
      return;
    }
    set({ index: index - 1, positionMs: 0, playing: true });
  },
  setIndex(i) {
    const { queue } = get();
    if (i < 0 || i >= queue.length) return;
    set({ index: i, positionMs: 0, playing: true });
  },
  setPosition(ms) {
    set({ positionMs: Math.max(0, ms) });
  },
  setSpeed(s) {
    set({ speed: Math.min(4, Math.max(0.25, s)) });
  },
  setSleepTimer(ms) {
    set({ sleepTimerMs: ms });
  },
  setExpanded(v) {
    set({ expanded: v });
  },
  clear() {
    set({ queue: [], index: 0, playing: false, positionMs: 0, expanded: false });
  },
  seekRelative(delta) {
    const { positionMs, queue, index } = get();
    const cur = queue[index];
    if (!cur) return;
    const next = Math.max(0, Math.min(cur.durationMs, positionMs + delta));
    set({ positionMs: next });
  },
}));

export function useCurrentTrack(): AudioQueueItem | null {
  return useAudioStore((s) => s.queue[s.index] ?? null);
}
