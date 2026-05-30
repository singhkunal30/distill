import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OLHit } from '@/lib/types';

type Mode = 'search' | 'paste';

export default function AddBookScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const [mode, setMode] = React.useState<Mode>('search');

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={dark ? '#efe5d2' : '#1a2236'} />
        </Pressable>
        <Text className={`font-serif text-lg font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}>
          Add book
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View className="flex-row gap-2 px-4 pb-2">
        <Tab dark={dark} active={mode === 'search'} label="Search" onPress={() => setMode('search')} />
        <Tab dark={dark} active={mode === 'paste'} label="Paste text" onPress={() => setMode('paste')} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {mode === 'search' ? <SearchPanel dark={dark} /> : <PastePanel dark={dark} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tab({
  dark,
  active,
  label,
  onPress,
}: {
  dark: boolean;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-1.5 ${active ? 'bg-accent' : dark ? 'bg-card-dark' : 'bg-card'}`}
    >
      <Text
        className={`text-sm font-medium ${active ? 'text-foreground' : dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SearchPanel({ dark }: { dark: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [query, setQuery] = React.useState('');
  const [hits, setHits] = React.useState<OLHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [addingKey, setAddingKey] = React.useState<string | null>(null);

  const run = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api<{ hits: OLHit[] }>(`/api/books/openlibrary?q=${encodeURIComponent(query)}`);
      setHits(res.hits);
    } finally {
      setSearching(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: (hit: OLHit) =>
      api<{ id: string }>('/api/books', {
        method: 'POST',
        body: { mode: 'openlibrary', payload: hit },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['library'] });
      router.replace(`/book/${res.id}` as never);
    },
  });

  return (
    <View className="flex-1 px-4 pt-3">
      <View
        className={`flex-row items-center gap-2 rounded-lg border px-3 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
      >
        <Ionicons name="search" size={16} color={dark ? '#9da3b3' : '#6b6a5f'} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={run}
          placeholder="Title, author, ISBN…"
          placeholderTextColor={dark ? '#6b6a5f' : '#9da3b3'}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          className={`h-11 flex-1 text-base ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        />
        {searching ? <ActivityIndicator size="small" /> : null}
      </View>

      <FlatList
        data={hits}
        keyExtractor={(h) => h.openLibraryId}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-px bg-border my-2" />}
        ListEmptyComponent={
          <Text
            className={`mt-12 text-center text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
          >
            {searching ? '' : query ? 'No results yet — tap search.' : 'Type a title above.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-3">
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={{ width: 44, height: 64, borderRadius: 4 }} />
            ) : (
              <View style={{ width: 44, height: 64, borderRadius: 4, backgroundColor: '#d8cdb7' }} />
            )}
            <View className="flex-1">
              <Text
                numberOfLines={2}
                className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
              >
                {item.title}
              </Text>
              <Text
                numberOfLines={1}
                className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
              >
                {item.authors.join(', ') || 'Unknown'}
                {item.publishedYear ? ` · ${item.publishedYear}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setAddingKey(item.openLibraryId);
                addMutation.mutate(item);
              }}
              disabled={addMutation.isPending && addingKey === item.openLibraryId}
              className="rounded-full bg-accent px-4 py-1.5"
            >
              {addMutation.isPending && addingKey === item.openLibraryId ? (
                <ActivityIndicator size="small" color="#11161f" />
              ) : (
                <Text className="text-sm font-medium text-foreground">Add</Text>
              )}
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

function PastePanel({ dark }: { dark: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = React.useState('');
  const [authors, setAuthors] = React.useState('');
  const [body, setBody] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    setPending(true);
    try {
      const res = await api<{ id: string }>('/api/books', {
        method: 'POST',
        body: {
          mode: 'text',
          title,
          authors,
          body,
          kind: 'md',
        },
      });
      qc.invalidateQueries({ queryKey: ['library'] });
      router.replace(`/book/${res.id}` as never);
    } finally {
      setPending(false);
    }
  };

  return (
    <View className="flex-1 px-4 pt-3">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={dark ? '#6b6a5f' : '#9da3b3'}
        className={`mb-2 h-11 rounded-lg border px-3 text-base ${dark ? 'border-border-dark bg-card-dark text-foreground-dark' : 'border-border bg-card text-foreground'}`}
      />
      <TextInput
        value={authors}
        onChangeText={setAuthors}
        placeholder="Authors (comma-separated)"
        placeholderTextColor={dark ? '#6b6a5f' : '#9da3b3'}
        className={`mb-2 h-11 rounded-lg border px-3 text-base ${dark ? 'border-border-dark bg-card-dark text-foreground-dark' : 'border-border bg-card text-foreground'}`}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Paste markdown or plain text…"
        placeholderTextColor={dark ? '#6b6a5f' : '#9da3b3'}
        multiline
        textAlignVertical="top"
        className={`mb-3 flex-1 rounded-lg border p-3 text-base ${dark ? 'border-border-dark bg-card-dark text-foreground-dark' : 'border-border bg-card text-foreground'}`}
      />
      <Pressable
        onPress={submit}
        disabled={pending || !title.trim() || !body.trim()}
        className="mb-4 h-12 items-center justify-center rounded-lg bg-accent disabled:opacity-50"
      >
        {pending ? (
          <ActivityIndicator color="#11161f" />
        ) : (
          <Text className="font-medium text-foreground">Add to library</Text>
        )}
      </Pressable>
    </View>
  );
}
