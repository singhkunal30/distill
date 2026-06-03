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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BookCover } from '@/components/book-cover';
import { JobProgress } from '@/components/job-progress';
import { DistillButton } from '@/features/summaries/distill-button';
import { ListenButton } from '@/features/audio/listen-button';
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
  const qc = useQueryClient();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const query = useQuery<BookDetailResponse>({
    queryKey: ['book', id],
    queryFn: () => api<BookDetailResponse>(`/api/books/${id}`),
    enabled: Boolean(id),
  });

  const genCards = useMutation({
    mutationFn: () =>
      api<{ jobId: string }>('/api/flashcards', { method: 'POST', body: { bookId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['book', id] }),
  });
  const genQuiz = useMutation({
    mutationFn: () =>
      api<{ jobId: string }>('/api/quizzes', { method: 'POST', body: { bookId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['book', id] }),
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
  const hasSummary = summaries.length > 0;
  const firstSummary = summaries[0] ?? null;

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
        <View className="px-5 pt-3">
          <Pressable
            onPress={() => router.back()}
            className="mb-4 flex-row items-center gap-1 active:opacity-70"
          >
            <Ionicons name="chevron-back" size={18} color={dark ? '#a8a39a' : '#6b6760'} />
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

          {/* Primary actions */}
          <View className="mt-5 flex-row flex-wrap gap-2">
            <DistillButton bookId={book.id} hasSummary={hasSummary} />
            {firstSummary ? <ListenButton summaryId={firstSummary.id} /> : null}
          </View>

          <JobProgress bookId={book.id} invalidateKey={['book', id]} />

          {/* Distillations */}
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
                Tap Distill to generate one.
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
                      color={dark ? '#a8a39a' : '#6b6760'}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Knowledge */}
          <View className="mt-6">
            <Text
              className={`mb-2 text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              Knowledge
            </Text>
            <View className="gap-2">
              <KnowledgeRow
                dark={dark}
                icon="flash-outline"
                title="Flashcards"
                subtitle={
                  flashcardCount === 0
                    ? 'None yet'
                    : `${flashcardCount} card${flashcardCount === 1 ? '' : 's'}${flashcardsDue > 0 ? ` · ${flashcardsDue} due` : ''}`
                }
                action={
                  flashcardCount > 0 ? (
                    <Pressable onPress={() => router.push('/(tabs)/review' as never)}>
                      <Text className="text-sm text-accent">Review</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        if (!hasSummary) {
                          Alert.alert('Distill first', 'Generate a summary before flashcards.');
                          return;
                        }
                        genCards.mutate();
                      }}
                      disabled={genCards.isPending}
                    >
                      {genCards.isPending ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Text className="text-sm text-accent">Generate</Text>
                      )}
                    </Pressable>
                  )
                }
              />
              <KnowledgeRow
                dark={dark}
                icon="list-outline"
                title="Quiz"
                subtitle={quizCount === 0 ? 'None yet' : `${quizCount} quiz${quizCount === 1 ? '' : 'zes'}`}
                action={
                  quizCount > 0 ? (
                    <Pressable onPress={() => router.push(`/book/${book.id}/quiz` as never)}>
                      <Text className="text-sm text-accent">Take</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        if (!hasSummary) {
                          Alert.alert('Distill first', 'Generate a summary before a quiz.');
                          return;
                        }
                        genQuiz.mutate();
                      }}
                      disabled={genQuiz.isPending}
                    >
                      {genQuiz.isPending ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Text className="text-sm text-accent">Generate</Text>
                      )}
                    </Pressable>
                  )
                }
              />
              <KnowledgeRow
                dark={dark}
                icon="bookmark-outline"
                title="Highlights"
                subtitle={highlightCount === 0 ? 'None yet' : `${highlightCount}`}
                action={
                  <Pressable onPress={() => router.push(`/book/${book.id}/highlights` as never)}>
                    <Text className="text-sm text-accent">
                      {highlightCount > 0 ? 'View' : 'Read to add'}
                    </Text>
                  </Pressable>
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KnowledgeRow({
  dark,
  icon,
  title,
  subtitle,
  action,
}: {
  dark: boolean;
  icon: keyof typeof import('@expo/vector-icons/build/Ionicons').glyphMap;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-lg border p-3 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
    >
      <Ionicons name={icon} size={20} color={dark ? '#a8a39a' : '#6b6760'} />
      <View className="flex-1">
        <Text className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {title}
        </Text>
        <Text className={`mt-0.5 text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}>
          {subtitle}
        </Text>
      </View>
      {action}
    </View>
  );
}
