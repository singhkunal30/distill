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
import type { QuizPayload } from '@/lib/types';

export default function QuizRunnerScreen() {
  const { id, quizId } = useLocalSearchParams<{ id: string; quizId: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const [picks, setPicks] = React.useState<Record<string, number>>({});

  const query = useQuery<QuizPayload>({
    queryKey: ['quiz', quizId],
    queryFn: () => api(`/api/quizzes/${quizId}`),
    enabled: Boolean(quizId),
  });

  if (query.isLoading || !query.data) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${dark ? 'bg-background-dark' : 'bg-background'}`}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const quiz = query.data.quiz;
  const total = quiz.questions.length;
  const correct = quiz.questions.reduce((acc, q) => {
    const idx = picks[q.id];
    if (idx == null) return acc;
    return acc + (q.choices[idx]?.correct ? 1 : 0);
  }, 0);

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 px-5 pt-3" contentContainerStyle={{ paddingBottom: 32 }}>
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center gap-1 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={18} color={dark ? '#a8a39a' : '#6b6760'} />
          <Text className={dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}>
            Back
          </Text>
        </Pressable>

        <Text
          className={`font-serif text-2xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          {quiz.title}
        </Text>
        <Text
          className={`mt-1 text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
        >
          {total} questions · {correct}/{total} so far
        </Text>

        <View className="mt-5 gap-4">
          {quiz.questions.map((q, qi) => {
            const picked = picks[q.id];
            const shown = picked != null;
            return (
              <View
                key={q.id}
                className={`rounded-2xl border p-4 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
              >
                <Text
                  className={`text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                >
                  Q{qi + 1}
                </Text>
                <Text
                  className={`mt-1 font-serif text-base leading-snug ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
                >
                  {q.prompt}
                </Text>

                <View className="mt-3 gap-2">
                  {q.choices.map((c, ci) => {
                    const isPicked = picked === ci;
                    let color: string | null = null;
                    if (shown && c.correct) color = '#c2693d';
                    else if (shown && isPicked && !c.correct) color = '#b91c1c';
                    return (
                      <Pressable
                        key={ci}
                        onPress={() =>
                          !shown && setPicks((p) => ({ ...p, [q.id]: ci }))
                        }
                        disabled={shown}
                        className={`flex-row items-start gap-3 rounded-lg border-2 px-3 py-2`}
                        style={{
                          borderColor: color ?? (dark ? '#3a342f' : '#ddd5c4'),
                          backgroundColor: color ? `${color}20` : 'transparent',
                        }}
                      >
                        <Text
                          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border text-center text-[11px] font-semibold ${dark ? 'border-border-dark text-foreground-dark' : 'border-border text-foreground'}`}
                          style={{ lineHeight: 18 }}
                        >
                          {String.fromCharCode(65 + ci)}
                        </Text>
                        <Text
                          className={`flex-1 text-sm ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
                        >
                          {c.text}
                        </Text>
                        {shown && c.correct ? (
                          <Ionicons name="checkmark" size={16} color="#c2693d" />
                        ) : shown && isPicked ? (
                          <Ionicons name="close" size={16} color="#b91c1c" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {shown && q.explanation ? (
                  <Text
                    className={`mt-3 rounded-md p-3 text-xs leading-relaxed ${dark ? 'bg-background-dark text-mutedForeground-dark' : 'bg-background text-mutedForeground'}`}
                  >
                    {q.explanation}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => setPicks({})}
          className="mt-6 h-12 items-center justify-center rounded-lg border border-border"
        >
          <Text className={dark ? 'text-foreground-dark' : 'text-foreground'}>Retake</Text>
        </Pressable>
        {/* Suppress unused id warning */}
        {id ? null : null}
      </ScrollView>
    </SafeAreaView>
  );
}
