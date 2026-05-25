'use client';

import * as React from 'react';
import {
  ChevronDown,
  Headphones,
  ListMusic,
  Moon,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { useAudioStore, useCurrentTrack } from './store';
import { AudioEngine } from './audio-engine';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const SLEEP_OPTIONS = [
  { label: 'Off', ms: null as number | null },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '15 min', ms: 15 * 60_000 },
  { label: '30 min', ms: 30 * 60_000 },
  { label: '60 min', ms: 60 * 60_000 },
];

function fmtMs(ms: number): string {
  if (!Number.isFinite(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioBar() {
  const current = useCurrentTrack();
  const queue = useAudioStore((s) => s.queue);
  const index = useAudioStore((s) => s.index);
  const playing = useAudioStore((s) => s.playing);
  const positionMs = useAudioStore((s) => s.positionMs);
  const speed = useAudioStore((s) => s.speed);
  const sleepTimerMs = useAudioStore((s) => s.sleepTimerMs);
  const expanded = useAudioStore((s) => s.expanded);
  const setExpanded = useAudioStore((s) => s.setExpanded);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const next = useAudioStore((s) => s.next);
  const prev = useAudioStore((s) => s.prev);
  const setIndex = useAudioStore((s) => s.setIndex);
  const setPosition = useAudioStore((s) => s.setPosition);
  const setSpeed = useAudioStore((s) => s.setSpeed);
  const setSleep = useAudioStore((s) => s.setSleepTimer);
  const clear = useAudioStore((s) => s.clear);

  if (!current) return null;

  return (
    <>
      <AudioEngine />

      {/* Mini bar — sits above the mobile bottom-nav (h-16) and the
          desktop sidebar bottom. */}
      <div
        className={cn(
          'fixed inset-x-0 z-30 border-t bg-background/95 backdrop-blur-md transition-transform',
          'bottom-16 md:bottom-0',
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 px-3 py-2 text-left md:px-6"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {current.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => prev()}
              aria-label="Previous section"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="default"
              onClick={() => togglePlay()}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => next()}
              aria-label="Next section"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </button>
        <div className="px-3 pb-1 md:px-6">
          <ProgressBar
            positionMs={positionMs}
            durationMs={current.durationMs || 1}
            onSeek={setPosition}
          />
        </div>
      </div>

      {expanded ? (
        <ExpandedSheet
          current={current}
          queue={queue}
          index={index}
          positionMs={positionMs}
          speed={speed}
          playing={playing}
          sleepTimerMs={sleepTimerMs}
          onClose={() => setExpanded(false)}
          onTogglePlay={togglePlay}
          onNext={next}
          onPrev={prev}
          onSeek={setPosition}
          onSpeed={setSpeed}
          onSleep={setSleep}
          onPickIndex={setIndex}
          onClear={() => {
            clear();
            setExpanded(false);
          }}
        />
      ) : null}
    </>
  );
}

function ProgressBar({
  positionMs,
  durationMs,
  onSeek,
}: {
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
}) {
  const pct = Math.min(100, (positionMs / Math.max(durationMs, 1)) * 100);
  return (
    <input
      type="range"
      min={0}
      max={durationMs}
      value={positionMs}
      onChange={(e) => onSeek(Number(e.target.value))}
      step={250}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-accent"
      style={{
        background: `linear-gradient(to right, hsl(var(--accent)) ${pct}%, hsl(var(--muted)) ${pct}%)`,
      }}
      aria-label="Seek"
    />
  );
}

function ExpandedSheet(props: {
  current: ReturnType<typeof useCurrentTrack>;
  queue: ReturnType<typeof useAudioStore.getState>['queue'];
  index: number;
  positionMs: number;
  speed: number;
  playing: boolean;
  sleepTimerMs: number | null;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (ms: number) => void;
  onSpeed: (s: number) => void;
  onSleep: (ms: number | null) => void;
  onPickIndex: (i: number) => void;
  onClear: () => void;
}) {
  const {
    current,
    queue,
    index,
    positionMs,
    speed,
    playing,
    sleepTimerMs,
    onClose,
    onTogglePlay,
    onNext,
    onPrev,
    onSeek,
    onSpeed,
    onSleep,
    onPickIndex,
    onClear,
  } = props;
  if (!current) return null;

  const totalDuration = queue.reduce((acc, t) => acc + t.durationMs, 0);
  const elapsed =
    queue.slice(0, index).reduce((acc, t) => acc + t.durationMs, 0) + positionMs;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      <header className="flex items-center justify-between px-4 py-3 md:px-6">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Collapse">
          <ChevronDown className="h-5 w-5" />
        </Button>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Now playing
        </span>
        <Button variant="ghost" size="icon" onClick={onClear} aria-label="Stop">
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-44 w-44 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15">
            <Headphones className="h-16 w-16 text-accent" />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-semibold tracking-tight">
            {current.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
          {current.timings ? (
            <KaraokeLine timings={current.timings} positionMs={positionMs} />
          ) : null}
        </div>

        <div>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmtMs(positionMs)}</span>
            <span>{fmtMs(current.durationMs)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={current.durationMs}
            value={positionMs}
            step={250}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="mt-1 h-1.5 w-full appearance-none rounded-full bg-muted accent-accent"
            style={{
              background: `linear-gradient(to right, hsl(var(--accent)) ${
                (positionMs / Math.max(current.durationMs, 1)) * 100
              }%, hsl(var(--muted)) 0%)`,
            }}
            aria-label="Seek within track"
          />
          <div className="mt-1 text-center text-[11px] text-muted-foreground">
            Total {fmtMs(elapsed)} / {fmtMs(totalDuration)} · section {index + 1} of {queue.length}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => useAudioStore.getState().seekRelative(-15_000)} aria-label="Back 15 seconds">
            <Rewind className="h-5 w-5" />
            <span className="ml-1 text-xs font-semibold">15</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous section">
            <SkipBack className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14"
            variant="accent"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next section">
            <SkipForward className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => useAudioStore.getState().seekRelative(15_000)}
            aria-label="Forward 15 seconds"
          >
            <span className="mr-1 text-xs font-semibold">15</span>
            <Rewind className="h-5 w-5 -scale-x-100" />
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SpeedControl speed={speed} onChange={onSpeed} />
          <SleepControl current={sleepTimerMs} onChange={onSleep} />
        </div>

        <details className="mt-6">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
            <ListMusic className="h-4 w-4" /> Queue ({queue.length})
          </summary>
          <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {queue.map((t, i) => (
              <li key={t.id}>
                <button
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                    i === index ? 'bg-secondary' : 'hover:bg-muted/50',
                  )}
                  onClick={() => onPickIndex(i)}
                >
                  <span className="line-clamp-1 flex-1">{t.title}</span>
                  <span className="ml-3 text-[11px] text-muted-foreground">
                    {fmtMs(t.durationMs)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </div>
  );
}

function SpeedControl({
  speed,
  onChange,
}: {
  speed: number;
  onChange: (s: number) => void;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Speed</p>
      <div className="flex flex-wrap gap-1">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              'rounded px-2 py-1 text-xs',
              speed === s
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

function SleepControl({
  current,
  onChange,
}: {
  current: number | null;
  onChange: (ms: number | null) => void;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="mb-2 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Moon className="h-3 w-3" /> Sleep timer
      </p>
      <div className="flex flex-wrap gap-1">
        {SLEEP_OPTIONS.map((o) => (
          <button
            key={o.label}
            onClick={() => onChange(o.ms)}
            className={cn(
              'rounded px-2 py-1 text-xs',
              current === o.ms
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KaraokeLine({
  timings,
  positionMs,
}: {
  timings: { word: string; startMs: number; endMs: number }[];
  positionMs: number;
}) {
  const activeIdx = React.useMemo(() => {
    // Binary search would be overkill — sentences are ~50 words.
    for (let i = timings.length - 1; i >= 0; i--) {
      if (positionMs >= timings[i]!.startMs) return i;
    }
    return -1;
  }, [timings, positionMs]);

  // Show a 7-word window centered on the current word.
  const start = Math.max(0, activeIdx - 3);
  const end = Math.min(timings.length, activeIdx + 5);
  const slice = timings.slice(start, end);

  return (
    <p className="mt-6 text-balance text-base text-muted-foreground">
      {slice.map((t, i) => (
        <span
          key={start + i}
          className={cn(
            'transition-opacity',
            start + i === activeIdx ? 'font-semibold text-foreground' : 'opacity-70',
          )}
        >
          {t.word}{' '}
        </span>
      ))}
    </p>
  );
}
