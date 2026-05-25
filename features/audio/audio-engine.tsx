'use client';

import * as React from 'react';
import { Howl } from 'howler';
import { useAudioStore } from './store';
import { savePlaybackPosition } from './actions';

// The engine is invisible. It listens to the store and drives the
// actual audio source — either a Howl MP3 or browser SpeechSynthesis.

export function AudioEngine() {
  const queue = useAudioStore((s) => s.queue);
  const index = useAudioStore((s) => s.index);
  const playing = useAudioStore((s) => s.playing);
  const speed = useAudioStore((s) => s.speed);
  const positionMs = useAudioStore((s) => s.positionMs);
  const sleepTimerMs = useAudioStore((s) => s.sleepTimerMs);
  const pause = useAudioStore((s) => s.pause);
  const next = useAudioStore((s) => s.next);
  const setPosition = useAudioStore((s) => s.setPosition);
  const setSleep = useAudioStore((s) => s.setSleepTimer);

  const current = queue[index] ?? null;
  const howlRef = React.useRef<Howl | null>(null);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const positionPollRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = React.useRef<{ trackId: string | null; ms: number }>({
    trackId: null,
    ms: 0,
  });

  // Load / unload the source whenever the current track changes.
  React.useEffect(() => {
    teardown();
    if (!current) return;

    if (current.url) {
      const howl = new Howl({
        src: [current.url],
        html5: true,
        rate: speed,
        onend: () => next(),
        onloaderror: (_id, err) => {
          console.error('[distill] audio load error', err);
          pause();
        },
      });
      howlRef.current = howl;
      if (positionMs > 0) howl.seek(positionMs / 1000);
      if (playing) howl.play();
    } else if (current.text) {
      // Demo/browser TTS — no Howl, drive SpeechSynthesis.
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('[distill] browser TTS unsupported; pausing');
        pause();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(current.text);
      u.rate = speed;
      u.onend = () => next();
      u.onerror = () => pause();
      utteranceRef.current = u;
      if (playing) window.speechSynthesis.speak(u);
    }

    return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Play / pause reflects into the active source.
  React.useEffect(() => {
    const howl = howlRef.current;
    if (howl) {
      if (playing) {
        if (!howl.playing()) howl.play();
      } else {
        howl.pause();
      }
    } else if (utteranceRef.current && typeof window !== 'undefined') {
      const synth = window.speechSynthesis;
      if (playing) {
        if (synth.paused) synth.resume();
        else if (!synth.speaking) synth.speak(utteranceRef.current);
      } else {
        if (synth.speaking) synth.pause();
      }
    }
  }, [playing]);

  // Apply speed changes mid-playback.
  React.useEffect(() => {
    howlRef.current?.rate(speed);
    if (utteranceRef.current) utteranceRef.current.rate = speed;
  }, [speed]);

  // External seek (user dragged the slider).
  React.useEffect(() => {
    const howl = howlRef.current;
    if (!howl) return;
    const currentSec = howl.seek() as number;
    const targetSec = positionMs / 1000;
    if (Math.abs(currentSec - targetSec) > 0.4) {
      howl.seek(targetSec);
    }
  }, [positionMs]);

  // Position polling + autosave at 5s intervals.
  React.useEffect(() => {
    if (!current?.trackId) {
      if (positionPollRef.current) clearInterval(positionPollRef.current);
      return;
    }
    positionPollRef.current = setInterval(() => {
      const howl = howlRef.current;
      if (!howl) return;
      const sec = howl.seek() as number;
      const ms = Math.round(sec * 1000);
      // Update store so the scrubber tracks.
      useAudioStore.setState({ positionMs: ms });
      if (
        current.trackId &&
        (lastSavedRef.current.trackId !== current.trackId ||
          Math.abs(ms - lastSavedRef.current.ms) >= 5000)
      ) {
        lastSavedRef.current = { trackId: current.trackId, ms };
        void savePlaybackPosition({
          bookId: current.bookId,
          trackId: current.trackId,
          positionMs: ms,
          speed,
        }).catch(() => {});
      }
    }, 1000);
    return () => {
      if (positionPollRef.current) clearInterval(positionPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Sleep timer.
  React.useEffect(() => {
    if (sleepTimerMs == null) return;
    const id = setTimeout(() => {
      pause();
      setSleep(null);
    }, sleepTimerMs);
    return () => clearTimeout(id);
  }, [sleepTimerMs, pause, setSleep]);

  function teardown() {
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (utteranceRef.current && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    if (positionPollRef.current) {
      clearInterval(positionPollRef.current);
      positionPollRef.current = null;
    }
  }

  // Stop everything when the component unmounts (route change away
  // from a layout that mounts it — we keep mounted across all routes).
  React.useEffect(() => teardown, []);

  // For Howl, manual seek on external update.
  void setPosition;
  return null;
}
