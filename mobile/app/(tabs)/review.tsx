import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DueCard } from '@/lib/types';

const QUALITY: { label: string; quality: number; hint: string; color: string }[] = [
  { label: 'Again', quality: 0, hint: 'I forgot it', color: '#b91c1c' },
  { label: 'Hard', quality: 3, hint: 'With effort', color: '#6b6760' },
  { label: 'Good', quality: 4, hint: 'Got it', color: '#1f1c18' },
  { label: 'Easy', quality: 5, hint: 'Trivial', color: '#c2693d' },
];

export default function ReviewScreen() {
  const qc = useQueryClient();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const query = useQuery<{ count: number; cards: DueCard[] }>({
    queryKey: ['due-cards'],
    queryFn: () => api('/api/flashcards?due=1'),
  });

  const [index, setIndex] = React.useState(0);
  const [showBack, setShowBack] = React.useState(false);
  const [reviewed, setReviewed] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
    setShowBack(false);
    setReviewed(0);
  }, [query.data?.cards?.length]);

  const grade = useMutation({
    mutationFn: ({ id, quality }: { id: string; quality: number }) =>
      api(`/api/flashcards/${id}/review`, { method: 'POST', body: { quality } }),
    onSuccess: () => {
      setShowBack(false);
      setReviewed((r) => r + 1);
      const cur = query.data?.cards.length ?? 0;
      if (index + 1 >= cur) {
        qc.invalidateQueries({ queryKey: ['due-cards'] });
        qc.invalidateQueries({ queryKey: ['library'] });
      } else {
        setIndex((i) => i + 1);
      }
    },
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

  const cards = query.data?.cards ?? [];
  const current = cards[index] ?? null;

  if (!current) {
    return (
      <SafeAreaView
        className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
        edges={['top']}
      >
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/20">
            <Ionicons name="checkmark" size={28} color="#c2693d" />
          </View>
          <Text
            className={`mt-4 font-serif text-2xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
          >
            All caught up.
          </Text>
          <Text
            className={`mt-2 text-center text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
          >
            {reviewed > 0
              ? `Reviewed ${reviewed} card${reviewed === 1 ? '' : 's'} this session.`
              : 'No cards are due. Generate flashcards from a book to add some.'}
          </Text>
          <Pressable
            onPress={() => qc.invalidateQueries({ queryKey: ['due-cards'] })}
            className="mt-6 rounded-full bg-accent px-5 py-2"
          >
            <Text className="text-sm font-medium text-foreground">Refresh</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <View className="flex-1 px-5 pt-3">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
          >
            {index + 1} of {cards.length} due
          </Text>
          <Text
            numberOfLines={1}
            className={`max-w-[60%] text-right text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
          >
            {current.bookTitle}
          </Text>
        </View>

        <Pressable
          onPress={() => setShowBack((v) => !v)}
          className={`mt-4 flex-1 rounded-2xl border p-6 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
        >
          <Text
            className={`text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
          >
            {showBack ? 'Answer' : 'Question'}
          </Text>
          <Text
            className={`mt-3 font-serif text-xl leading-relaxed ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
          >
            {showBack ? current.back : current.front}
          </Text>
          {!showBack ? (
            <Text
              className={`mt-6 text-center text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              Tap to reveal
            </Text>
          ) : null}
        </Pressable>

        {showBack ? (
          <View className="mt-4 flex-row gap-2">
            {QUALITY.map((q) => (
              <Pressable
                key={q.label}
                onPress={() => grade.mutate({ id: current.id, quality: q.quality })}
                disabled={grade.isPending}
                className={`flex-1 items-center rounded-lg border-2 py-3`}
                style={{ borderColor: q.color }}
              >
                <Text className={`text-sm font-medium`} style={{ color: q.color }}>
                  {q.label}
                </Text>
                <Text
                  className={`mt-0.5 text-[10px] ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                >
                  {q.hint}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text
          className={`mt-3 mb-2 text-center text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
        >
          {reviewed} reviewed this session
        </Text>
      </View>
    </SafeAreaView>
  );
}
