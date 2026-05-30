import * as React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ListenButton } from '@/features/audio/listen-button';
import type { SummaryResponse } from '@/lib/types';

const THEME_LIGHT = { bg: '#f7f2e8', text: '#1a2236', muted: '#6b6a5f', border: '#d8cdb7' };
const THEME_DARK = { bg: '#11161f', text: '#efe5d2', muted: '#9da3b3', border: '#2a3245' };
const THEME_SEPIA = { bg: '#efe5d2', text: '#3a2c20', muted: '#7a6651', border: '#cdbf9e' };

type Theme = 'light' | 'dark' | 'sepia';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const scheme = useColorScheme();
  const [theme, setTheme] = React.useState<Theme>(scheme === 'dark' ? 'dark' : 'sepia');
  const [scale, setScale] = React.useState(1);

  const palette = theme === 'dark' ? THEME_DARK : theme === 'sepia' ? THEME_SEPIA : THEME_LIGHT;

  const query = useQuery<SummaryResponse>({
    queryKey: ['summary', id],
    queryFn: () => api<SummaryResponse>(`/api/summaries/${id}`),
    enabled: Boolean(id),
  });

  const highlight = useMutation({
    mutationFn: (input: { bookId: string; text: string; locator: string }) =>
      api('/api/highlights', { method: 'POST', body: input }),
    onSuccess: () => {
      if (query.data) {
        qc.invalidateQueries({ queryKey: ['book', query.data.summary.book.id] });
        qc.invalidateQueries({ queryKey: ['highlights', query.data.summary.book.id] });
      }
    },
  });

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.muted} />
      </View>
    );
  }
  if (query.error || !query.data) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: palette.text }}>Could not load summary.</Text>
      </View>
    );
  }

  const { summary } = query.data;
  const authors = parseAuthors(summary.book.authors);

  const cycleTheme = () => {
    setTheme((t) => (t === 'light' ? 'sepia' : t === 'sepia' ? 'dark' : 'light'));
  };

  const longPressSection = (heading: string, body: string) => {
    Alert.alert(
      'Save as highlight?',
      `“${heading}: ${body.slice(0, 120)}…”`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            highlight.mutate({
              bookId: summary.book.id,
              text: `${heading}. ${stripMarkdown(body)}`.trim(),
              locator: `summary:${summary.id}`,
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: palette.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={palette.muted} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <ListenButton summaryId={summary.id} small />
          <Pressable onPress={() => setScale((s) => Math.max(0.85, +(s - 0.05).toFixed(2)))} hitSlop={10}>
            <Ionicons name="remove-circle-outline" size={22} color={palette.muted} />
          </Pressable>
          <Pressable onPress={() => setScale((s) => Math.min(1.5, +(s + 0.05).toFixed(2)))} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={22} color={palette.muted} />
          </Pressable>
          <Pressable onPress={cycleTheme} hitSlop={10}>
            <Ionicons
              name={theme === 'dark' ? 'moon' : theme === 'sepia' ? 'book' : 'sunny'}
              size={22}
              color={palette.muted}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 }}
      >
        <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {summary.format}
        </Text>
        <Text
          style={{
            color: palette.text,
            fontFamily: 'Georgia',
            fontSize: 28 * scale,
            fontWeight: '600',
            marginTop: 8,
            lineHeight: 32 * scale,
          }}
        >
          {summary.book.title}
        </Text>
        {authors.length > 0 ? (
          <Text style={{ color: palette.muted, fontSize: 14, marginTop: 4 }}>
            {authors.join(', ')}
          </Text>
        ) : null}

        <Text
          style={{
            color: palette.muted,
            fontSize: 11,
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          Long-press a section to save it as a highlight.
        </Text>

        {summary.sections.map((s) => (
          <Pressable
            key={s.id}
            onLongPress={() => longPressSection(s.heading, s.body)}
            delayLongPress={400}
            style={({ pressed }) => ({
              marginTop: 32,
              paddingTop: 24,
              borderTopWidth: 1,
              borderColor: palette.border,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: palette.muted,
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {String(s.position + 1).padStart(2, '0')}
            </Text>
            <Text
              style={{
                color: palette.text,
                fontFamily: 'Georgia',
                fontSize: 22 * scale,
                fontWeight: '600',
                lineHeight: 28 * scale,
              }}
            >
              {s.heading}
            </Text>
            <Text
              style={{
                color: palette.text,
                fontFamily: 'Georgia',
                fontSize: 17 * scale,
                lineHeight: 28 * scale,
                marginTop: 12,
              }}
              selectable
            >
              {stripMarkdown(s.body)}
            </Text>
          </Pressable>
        ))}

        <Text style={{ color: palette.muted, fontSize: 12, textAlign: 'center', marginTop: 40 }}>
          End of {summary.format}.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function parseAuthors(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}
