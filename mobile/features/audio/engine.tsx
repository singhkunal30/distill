import * as React from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useAudioStore } from './store';
import { DISTILL_API_URL } from '@/lib/config';
import { api } from '@/lib/api';

// Invisible component. Drives expo-av for MP3 tracks and expo-speech for
// the text fallback (demo mode + any section that hasn't been narrated
// to MP3 yet). Mounted once, in the root layout.

export function AudioEngine() {
  const queue = useAudioStore((s) => s.queue);
  const index = useAudioStore((s) => s.index);
  const playing = useAudioStore((s) => s.playing);
  const speed = useAudioStore((s) => s.speed);
  const pause = useAudioStore((s) => s.pause);
  const next = useAudioStore((s) => s.next);

  const current = queue[index] ?? null;
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const speakingRef = React.useRef(false);
  const positionPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedMsRef = React.useRef<number>(0);

  // Configure audio session so playback continues with screen locked.
  React.useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
    }).catch(() => {});
  }, []);

  // Load/unload the source whenever the current track changes.
  React.useEffect(() => {
    let cancelled = false;
    teardown();
    if (!current) return;

    (async () => {
      if (current.url) {
        const fullUrl = current.url.startsWith('http')
          ? current.url
          : `${DISTILL_API_URL}${current.url}`;
        const { sound } = await Audio.Sound.createAsync(
          { uri: fullUrl },
          { shouldPlay: playing, rate: speed, shouldCorrectPitch: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              next();
            }
          },
        );
        if (cancelled) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
        // Resume from saved position.
        if (current.savedPositionMs > 0) {
          await sound.setPositionAsync(current.savedPositionMs).catch(() => {});
        }
        startPositionPoll();
      } else if (current.text) {
        speakingRef.current = false;
        if (playing) startSpeaking();
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Reflect play/pause into the active source.
  React.useEffect(() => {
    const sound = soundRef.current;
    if (sound) {
      if (playing) sound.playAsync().catch(() => {});
      else sound.pauseAsync().catch(() => {});
      return;
    }
    if (current?.text) {
      if (playing && !speakingRef.current) startSpeaking();
      else if (!playing && speakingRef.current) {
        Speech.stop();
        speakingRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Speed changes mid-playback.
  React.useEffect(() => {
    soundRef.current
      ?.setRateAsync(speed, true)
      .catch(() => {});
    if (current?.text && playing) {
      // expo-speech can't change rate on a live utterance; restart.
      Speech.stop();
      speakingRef.current = false;
      startSpeaking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  function startSpeaking() {
    if (!current?.text) return;
    speakingRef.current = true;
    Speech.speak(current.text, {
      rate: speed,
      onDone: () => {
        speakingRef.current = false;
        next();
      },
      onStopped: () => {
        speakingRef.current = false;
      },
      onError: () => {
        speakingRef.current = false;
        pause();
      },
    });
  }

  function startPositionPoll() {
    stopPositionPoll();
    positionPollRef.current = setInterval(async () => {
      const sound = soundRef.current;
      if (!sound || !current?.trackId) return;
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;
        const ms = status.positionMillis ?? 0;
        if (Math.abs(ms - lastSavedMsRef.current) >= 5000) {
          lastSavedMsRef.current = ms;
          void api(`/api/playback`, {
            method: 'POST',
            body: { bookId: current.bookId, trackId: current.trackId, positionMs: ms, speed },
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    }, 1000);
  }

  function stopPositionPoll() {
    if (positionPollRef.current) {
      clearInterval(positionPollRef.current);
      positionPollRef.current = null;
    }
  }

  function teardown() {
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (speakingRef.current) {
      Speech.stop();
      speakingRef.current = false;
    }
    stopPositionPoll();
  }

  React.useEffect(() => teardown, []);

  return null;
}
