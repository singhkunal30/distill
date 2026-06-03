import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Format = 'blink' | 'insights' | 'detailed' | 'tldr' | 'applications';
type Tone = 'neutral' | 'academic' | 'conversational' | 'punchy';
type Length = 'short' | 'medium' | 'long';
type Audience = 'beginner' | 'intermediate' | 'expert';

const FORMATS: { value: Format; label: string; hint: string }[] = [
  { value: 'blink', label: 'Blink', hint: '8–12 short sections' },
  { value: 'insights', label: 'Key insights', hint: 'Bulleted takeaways' },
  { value: 'detailed', label: 'Detailed', hint: 'Chapter-style breakdown' },
  { value: 'tldr', label: 'TL;DR', hint: 'One page' },
  { value: 'applications', label: 'Applications', hint: 'Actionable lessons' },
];

export function DistillButton({
  bookId,
  hasSummary,
}: {
  bookId: string;
  hasSummary: boolean;
}) {
  const qc = useQueryClient();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const [open, setOpen] = React.useState(false);
  const [format, setFormat] = React.useState<Format>('blink');
  const [tone, setTone] = React.useState<Tone>('neutral');
  const [length, setLength] = React.useState<Length>('medium');
  const [audience, setAudience] = React.useState<Audience>('intermediate');

  const enqueue = useMutation({
    mutationFn: () =>
      api<{ jobId: string }>('/api/summaries', {
        method: 'POST',
        body: { bookId, format, tone, length, audience },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['book', bookId] });
      setOpen(false);
    },
  });

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 rounded-full bg-accent px-4 py-2"
      >
        <Ionicons name="sparkles" size={16} color="#1a1816" />
        <Text className="text-sm font-medium text-foreground">
          {hasSummary ? 'Distill again' : 'Distill'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="formSheet">
        <View className={`flex-1 px-6 pt-4 ${dark ? 'bg-background-dark' : 'bg-background'}`}>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={dark ? '#efeae0' : '#1f1c18'} />
            </Pressable>
            <Text
              className={`font-serif text-lg font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
            >
              Distill this book
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <Label dark={dark}>Format</Label>
          <View className="mb-4 gap-2">
            {FORMATS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFormat(f.value)}
                className={`flex-row items-center justify-between rounded-lg border p-3 ${
                  format === f.value
                    ? 'border-accent'
                    : dark
                      ? 'border-border-dark bg-card-dark'
                      : 'border-border bg-card'
                }`}
              >
                <View className="flex-1">
                  <Text
                    className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
                  >
                    {f.label}
                  </Text>
                  <Text
                    className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                  >
                    {f.hint}
                  </Text>
                </View>
                {format === f.value ? (
                  <Ionicons name="checkmark-circle" size={20} color="#c2693d" />
                ) : null}
              </Pressable>
            ))}
          </View>

          <View className="mb-4 flex-row gap-3">
            <SegmentControl
              dark={dark}
              label="Length"
              value={length}
              options={['short', 'medium', 'long']}
              onChange={(v) => setLength(v as Length)}
            />
          </View>
          <View className="mb-4 flex-row gap-3">
            <SegmentControl
              dark={dark}
              label="Tone"
              value={tone}
              options={['neutral', 'academic', 'conversational', 'punchy']}
              onChange={(v) => setTone(v as Tone)}
            />
          </View>
          <View className="mb-6 flex-row gap-3">
            <SegmentControl
              dark={dark}
              label="Level"
              value={audience}
              options={['beginner', 'intermediate', 'expert']}
              onChange={(v) => setAudience(v as Audience)}
            />
          </View>

          <Pressable
            onPress={() => enqueue.mutate()}
            disabled={enqueue.isPending}
            className="h-12 items-center justify-center rounded-lg bg-accent"
          >
            {enqueue.isPending ? (
              <ActivityIndicator color="#1a1816" />
            ) : (
              <Text className="font-medium text-foreground">Start</Text>
            )}
          </Pressable>
          {enqueue.error ? (
            <Text className="mt-2 text-center text-xs text-destructive">
              {enqueue.error instanceof Error ? enqueue.error.message : 'Failed'}
            </Text>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

function Label({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return (
    <Text
      className={`mb-2 text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
    >
      {children}
    </Text>
  );
}

function SegmentControl({
  dark,
  label,
  value,
  options,
  onChange,
}: {
  dark: boolean;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-1">
      <Label dark={dark}>{label}</Label>
      <View className="flex-row flex-wrap gap-1">
        {options.map((o) => (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            className={`rounded-full px-3 py-1.5 ${value === o ? 'bg-accent' : dark ? 'bg-card-dark' : 'bg-card'}`}
          >
            <Text
              className={`text-xs ${value === o ? 'text-foreground' : dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              {o}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
