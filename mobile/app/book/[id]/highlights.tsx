import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Highlight } from '@/lib/types';

const COLOR_DOT: Record<string, string> = {
  yellow: '#fcd34d',
  blue: '#7dd3fc',
  pink: '#f9a8d4',
  green: '#6ee7b7',
};

export default function HighlightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const query = useQuery<{ highlights: Highlight[] }>({
    queryKey: ['highlights', id],
    queryFn: () => api(`/api/highlights?bookId=${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
  });

  const remove = useMutation({
    mutationFn: (hid: string) => api(`/api/highlights/${hid}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['highlights', id] });
      qc.invalidateQueries({ queryKey: ['book', id] });
    },
  });

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-5 pt-3">
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center gap-1 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={18} color={dark ? '#9da3b3' : '#6b6a5f'} />
          <Text className={dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}>
            Back
          </Text>
        </Pressable>
        <Text
          className={`font-serif text-2xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          Highlights
        </Text>
      </View>
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={query.data?.highlights ?? []}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListEmptyComponent={
            <Text
              className={`mt-12 text-center text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              No highlights yet. Long-press in the reader to add one.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              className={`flex-row items-start gap-3 rounded-lg border p-3 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
            >
              <View
                style={{
                  width: 4,
                  alignSelf: 'stretch',
                  borderRadius: 2,
                  backgroundColor: COLOR_DOT[item.color ?? 'yellow'] ?? COLOR_DOT.yellow,
                }}
              />
              <Text
                className={`flex-1 text-sm leading-snug ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
              >
                {item.text}
              </Text>
              <Pressable
                onPress={() =>
                  Alert.alert('Delete highlight?', '', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => remove.mutate(item.id),
                    },
                  ])
                }
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={18} color={dark ? '#9da3b3' : '#6b6a5f'} />
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
