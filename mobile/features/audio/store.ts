import { create } from 'zustand';
import type { AudioQueueItem } from '@/lib/types';

type Store = {
  queue: AudioQueueItem[];
  index: number;
  playing: boolean;
  speed: number;
  expanded: boolean;

  setQueue: (items: AudioQueueItem[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setIndex: (i: number) => void;
  setSpeed: (s: number) => void;
  setExpanded: (v: boolean) => void;
  clear: () => void;
};

export const useAudioStore = create<Store>((set, get) => ({
  queue: [],
  index: 0,
  playing: false,
  speed: 1,
  expanded: false,

  setQueue(items, startIndex = 0) {
    set({
      queue: items,
      index: Math.min(Math.max(0, startIndex), Math.max(0, items.length - 1)),
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
    set({ index: index + 1, playing: true });
  },
  prev() {
    const { index } = get();
    if (index === 0) return;
    set({ index: index - 1, playing: true });
  },
  setIndex(i) {
    const { queue } = get();
    if (i < 0 || i >= queue.length) return;
    set({ index: i, playing: true });
  },
  setSpeed(s) {
    set({ speed: Math.min(3, Math.max(0.5, s)) });
  },
  setExpanded(v) {
    set({ expanded: v });
  },
  clear() {
    set({ queue: [], index: 0, playing: false, expanded: false });
  },
}));
