import * as React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { BookCover } from '@/components/book-cover';
import type { BookListItem, LibraryResponse } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  to_read: 'To read',
  reading: 'Reading',
  finished: 'Finished',
  archived: 'Archived',
};

export default function LibraryScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const query = useQuery<LibraryResponse>({
    queryKey: ['library'],
    queryFn: () => api<LibraryResponse>('/api/library'),
  });

  React.useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      router.replace('/login');
    }
  }, [query.error, router]);

  if (query.isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${dark ? 'bg-background-dark' : 'bg-background'}`}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (query.error) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center px-6 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      >
        <Text
          className={`font-serif text-lg ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          Could not reach Distill.
        </Text>
        <Text
          className={`mt-2 text-center text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
        >
          {query.error instanceof Error ? query.error.message : 'Unknown error.'}
        </Text>
        <Pressable onPress={() => query.refetch()} className="mt-6 rounded-full bg-accent px-5 py-2">
          <Text>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const data = query.data!;
  const reading = data.books.filter((b) => b.status === 'reading').slice(0, 5);

  return (
    <SafeAreaView className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`} edges={['top']}>
      <Pressable
        onPress={() => router.push('/add-book' as never)}
        className="absolute right-5 bottom-5 z-10 h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg"
        style={{ elevation: 6 }}
      >
        <Ionicons name="add" size={28} color="#11161f" />
      </Pressable>
      <FlatList
        data={data.books}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
        }
        ListHeaderComponent={
          <View>
            <View className="px-5 pt-3">
              <Text
                className={`font-serif text-3xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
              >
                Library
              </Text>
              <Text
                className={`mt-1 text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
              >
                {data.books.length} book{data.books.length === 1 ? '' : 's'}
                {data.dueCount > 0 ? ` · ${data.dueCount} cards due` : ''}
                {data.budget.demoMode ? ' · demo mode' : ''}
              </Text>
            </View>

            {reading.length > 0 ? (
              <View className="mt-6">
                <Text
                  className={`mb-2 px-5 text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
                >
                  Currently reading
                </Text>
                <FlatList
                  data={reading}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(b) => b.id}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => router.push(`/book/${item.id}` as never)}
                      style={{ width: 96 }}
                    >
                      <BookCover url={item.coverUrl} title={item.title} width={96} />
                      <Text
                        numberOfLines={2}
                        className={`mt-2 text-xs font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
                      >
                        {item.title}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            ) : null}

            <Text
              className={`mb-2 mt-8 px-5 text-xs uppercase tracking-wide ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              All books
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookRow item={item} dark={dark} onPress={() => router.push(`/book/${item.id}` as never)} />
        )}
        ItemSeparatorComponent={() => (
          <View className={`mx-5 h-px ${dark ? 'bg-border-dark' : 'bg-border'}`} />
        )}
        ListEmptyComponent={
          <View className="items-center px-8 py-16">
            <Text
              className={`font-serif text-lg ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
            >
              Your library is empty.
            </Text>
            <Text
              className={`mt-2 text-center text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              Add books from the web app for now. Mobile import lands soon.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function BookRow({
  item,
  dark,
  onPress,
}: {
  item: BookListItem;
  dark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-4 px-5 py-3 active:opacity-70">
      <BookCover url={item.coverUrl} title={item.title} width={48} />
      <View className="flex-1">
        <Text
          numberOfLines={2}
          className={`text-base font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          {item.title}
        </Text>
        <Text
          numberOfLines={1}
          className={`mt-0.5 text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
        >
          {item.authors.length > 0 ? item.authors.join(', ') : 'Unknown author'}
          {item.publishedYear ? ` · ${item.publishedYear}` : ''}
          {' · '}
          {STATUS_LABEL[item.status] ?? item.status}
        </Text>
      </View>
    </Pressable>
  );
}
