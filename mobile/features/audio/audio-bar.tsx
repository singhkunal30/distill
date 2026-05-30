import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioStore } from './store';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function AudioBar() {
  const current = useAudioStore((s) => s.queue[s.index] ?? null);
  const queue = useAudioStore((s) => s.queue);
  const index = useAudioStore((s) => s.index);
  const playing = useAudioStore((s) => s.playing);
  const speed = useAudioStore((s) => s.speed);
  const expanded = useAudioStore((s) => s.expanded);
  const setExpanded = useAudioStore((s) => s.setExpanded);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const next = useAudioStore((s) => s.next);
  const prev = useAudioStore((s) => s.prev);
  const setIndex = useAudioStore((s) => s.setIndex);
  const setSpeed = useAudioStore((s) => s.setSpeed);
  const clear = useAudioStore((s) => s.clear);
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  if (!current) return null;

  return (
    <>
      {/* Mini-bar — sits above the bottom tab bar (64px tall). */}
      <Pressable
        onPress={() => setExpanded(true)}
        className={`absolute left-0 right-0 z-20 border-t px-3 py-2 ${
          dark ? 'border-border-dark bg-background-dark/95' : 'border-border bg-background/95'
        }`}
        style={{ bottom: 64 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-md bg-accent/20">
            <Ionicons name="headset-outline" size={18} color="#f4a72c" />
          </View>
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
            >
              {current.title}
            </Text>
            <Text
              numberOfLines={1}
              className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              {current.subtitle} · {index + 1} / {queue.length}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              prev();
            }}
            hitSlop={10}
          >
            <Ionicons name="play-skip-back" size={20} color={dark ? '#efe5d2' : '#1a2236'} />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-full bg-accent"
          >
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#11161f" />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              next();
            }}
            hitSlop={10}
          >
            <Ionicons name="play-skip-forward" size={20} color={dark ? '#efe5d2' : '#1a2236'} />
          </Pressable>
        </View>
      </Pressable>

      {/* Expanded sheet */}
      <Modal visible={expanded} animationType="slide" presentationStyle="pageSheet">
        <View className={`flex-1 px-6 pt-4 ${dark ? 'bg-background-dark' : 'bg-background'}`}>
          <View className="mb-2 flex-row items-center justify-between">
            <Pressable onPress={() => setExpanded(false)} hitSlop={10}>
              <Ionicons name="chevron-down" size={24} color={dark ? '#efe5d2' : '#1a2236'} />
            </Pressable>
            <Text
              className={`text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              Now playing
            </Text>
            <Pressable onPress={clear} hitSlop={10}>
              <Ionicons name="close" size={24} color={dark ? '#efe5d2' : '#1a2236'} />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center">
            <View className="h-40 w-40 items-center justify-center rounded-2xl bg-accent/20">
              <Ionicons name="headset" size={64} color="#f4a72c" />
            </View>
            <Text
              className={`mt-6 text-center font-serif text-2xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
            >
              {current.title}
            </Text>
            <Text
              className={`mt-1 text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              {current.subtitle}
            </Text>
          </View>

          <View className="my-4 flex-row items-center justify-center gap-6">
            <Pressable onPress={prev} hitSlop={10}>
              <Ionicons name="play-skip-back" size={32} color={dark ? '#efe5d2' : '#1a2236'} />
            </Pressable>
            <Pressable
              onPress={togglePlay}
              className="h-16 w-16 items-center justify-center rounded-full bg-accent"
            >
              <Ionicons name={playing ? 'pause' : 'play'} size={32} color="#11161f" />
            </Pressable>
            <Pressable onPress={next} hitSlop={10}>
              <Ionicons name="play-skip-forward" size={32} color={dark ? '#efe5d2' : '#1a2236'} />
            </Pressable>
          </View>

          <View
            className={`mb-4 rounded-lg border p-3 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
          >
            <Text
              className={`mb-2 text-[11px] uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              Speed
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SPEEDS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSpeed(s)}
                  className={`rounded px-3 py-1 ${speed === s ? 'bg-foreground' : ''}`}
                >
                  <Text
                    className={`text-xs ${speed === s ? 'text-background' : dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                  >
                    {s}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text
            className={`mb-2 text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
          >
            Queue ({queue.length})
          </Text>
          <ScrollView className="mb-6" style={{ maxHeight: 200 }}>
            {queue.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => setIndex(i)}
                className={`flex-row items-center justify-between rounded-md px-2 py-2 ${i === index ? (dark ? 'bg-card-dark' : 'bg-card') : ''}`}
              >
                <Text
                  numberOfLines={1}
                  className={`flex-1 text-sm ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
                >
                  {i + 1}. {t.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
