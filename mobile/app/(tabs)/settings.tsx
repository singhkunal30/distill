import * as React from 'react';
import { View, Text, Pressable, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clearToken } from '@/lib/secure-store';
import { DISTILL_API_URL } from '@/lib/config';

export default function SettingsTab() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const router = useRouter();

  const signOut = async () => {
    Alert.alert('Sign out?', 'You will need to enter your passcode again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <View className="px-5 pt-3">
        <Text
          className={`font-serif text-3xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          Settings
        </Text>

        <View className="mt-8 gap-2">
          <Row
            dark={dark}
            label="Server"
            value={DISTILL_API_URL}
            icon="cloud-outline"
          />
          <Row
            dark={dark}
            label="Demo mode"
            value="Toggle in the web Settings page for now"
            icon="flask-outline"
          />
        </View>

        <Pressable
          onPress={signOut}
          className="mt-10 h-12 items-center justify-center rounded-lg border border-destructive/40 active:opacity-70"
        >
          <Text className="text-destructive">Sign out</Text>
        </Pressable>

        <Text
          className={`mt-10 text-center text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
        >
          Distill — the essence of every book.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function Row({
  dark,
  label,
  value,
  icon,
}: {
  dark: boolean;
  label: string;
  value: string;
  icon: keyof typeof import('@expo/vector-icons/build/Ionicons').glyphMap;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-lg border p-3 ${dark ? 'border-border-dark bg-card-dark' : 'border-border bg-card'}`}
    >
      <Ionicons name={icon} size={18} color={dark ? '#9da3b3' : '#6b6a5f'} />
      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
