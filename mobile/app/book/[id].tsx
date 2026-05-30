import * as React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BookCover } from '@/components/book-cover';
import type { BookDetailResponse } from '@/lib/types';

const FORMAT_LABEL: Record<string, string> = {
  blink: 'Blink summary',
  insights: 'Key insights',
  detailed: 'Detailed breakdown',
  tldr: 'TL;DR',
  applications: 'Practical applications',
};

export default function BookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const query = useQuery<BookDetailResponse>({
    queryKey: ['book', id],
    queryFn: () => api<BookDetailResponse>(`/api/books/${id}`),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${dark ? 'bg-background-dark' : 'bg-background'}`}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (query.error || !query.data) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center px-6 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      >
        <Text className={dark ? 'text-foreground-dark' : 'text-foreground'}>
          Could not load this book.
        </Text>
      </SafeAreaView>
    );
  }

  const { book, summaries, flashcardCount, flashcardsDue, quizCount, highlightCount } =
    query.data;

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-3">
          <Pressable
            onPress={() => router.back()}
            className="mb-4 flex-row items-center gap-1 active:opacity-70"
          >
            <Ionicons name="chevron-back" size={18} color={dark ? '#9da3b3' : '#6b6a5f'} />
            <Text className={dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}>
              Library
            </Text>
          </Pressable>

          <View className="flex-row items-start gap-4">
            <BookCover url={book.coverUrl} title={book.title} width={104} />
            <View className="flex-1 pt-1">
              <Text
                className={`font-serif text-2xl font-semibold leading-snug ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
              >
                {book.title}
              </Text>
              {book.subtitle ? (
                <Text
                  className={`mt-1 text-sm italic ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                >
                  {book.subtitle}
                </Text>
              ) : null}
              <Text
                className={`mt-2 text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
              >
                {book.authors.length > 0 ? book.authors.join(', ') : 'Unknown author'}
                {book.publishedYear ? ` · ${book.publishedYear}` : ''}
              </Text>
            </View>
          </View>

          {book.description ? (
            <Text
              className={`mt-5 text-sm leading-relaxed ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
            >
              {book.description}
            </Text>
          ) : null}

          <View className="mt-6">
            <Text
              className={`mb-2 text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              Distillations
            </Text>
            {summaries.length === 0 ? (
              <Text
                className={`rounded-lg border border-dashed p-4 text-center text-sm ${dark ? 'border-border-dark text-mutedForeground-dark' : 'border-border text-mutedForeground'}`}
              >
                No summary yet. Generate one from the web for now.
              </Text>
            ) : (
              <View className="gap-2">
                {summaries.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => router.push(`/read/${s.id}` as never)}
                    className={`flex-row items-center justify-between rounded-lg border p-3 active:opacity-70 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
                  >
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
                      >
                        {FORMAT_LABEL[s.format] ?? s.format}
                      </Text>
                      <Text
                        className={`mt-0.5 text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                      >
                        {s.sectionCount} section{s.sectionCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={dark ? '#9da3b3' : '#6b6a5f'}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View className="mt-6 flex-row flex-wrap gap-2">
            <Pill dark={dark} icon="brain-outline" label={`${flashcardsDue}/${flashcardCount} flashcards due`} />
            <Pill dark={dark} icon="list-outline" label={`${quizCount} quiz${quizCount === 1 ? '' : 'zes'}`} />
            <Pill dark={dark} icon="bookmark-outline" label={`${highlightCount} highlight${highlightCount === 1 ? '' : 's'}`} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({
  dark,
  icon,
  label,
}: {
  dark: boolean;
  icon: keyof typeof import('@expo/vector-icons/build/Ionicons').glyphMap;
  label: string;
}) {
  return (
    <View
      className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
    >
      <Ionicons name={icon} size={14} color={dark ? '#9da3b3' : '#6b6a5f'} />
      <Text
        className={`text-xs ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
      >
        {label}
      </Text>
    </View>
  );
}
