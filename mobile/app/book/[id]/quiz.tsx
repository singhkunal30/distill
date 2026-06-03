import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type QuizList = {
  quizzes: { id: string; title: string; questionCount: number; createdAt: string }[];
};

export default function QuizListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const query = useQuery<QuizList>({
    queryKey: ['quizzes', id],
    queryFn: () => api(`/api/quizzes/${encodeURIComponent(`by-book:${id}`)}`),
    enabled: Boolean(id),
  });

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 px-5 pt-3">
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center gap-1 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={18} color={dark ? '#a8a39a' : '#6b6760'} />
          <Text className={dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}>
            Book
          </Text>
        </Pressable>
        <Text
          className={`mb-4 font-serif text-2xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          Quizzes
        </Text>
        {query.isLoading ? (
          <ActivityIndicator />
        ) : (query.data?.quizzes ?? []).length === 0 ? (
          <Text className={dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}>
            No quiz yet. Tap "Generate" on the book page.
          </Text>
        ) : (
          <View className="gap-2">
            {query.data!.quizzes.map((q) => (
              <Pressable
                key={q.id}
                onPress={() => router.push(`/book/${id}/quiz/${q.id}` as never)}
                className={`flex-row items-center justify-between rounded-lg border p-3 active:opacity-70 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
              >
                <View>
                  <Text
                    className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
                  >
                    {q.title}
                  </Text>
                  <Text
                    className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                  >
                    {q.questionCount} questions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={dark ? '#a8a39a' : '#6b6760'} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
