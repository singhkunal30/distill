import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '@/lib/api';
import { setToken } from '@/lib/secure-store';
import { DISTILL_API_URL } from '@/lib/config';
import { Droplet } from '@/components/brand';
import type { LoginResponse } from '@/lib/types';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const [passcode, setPasscode] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { passcode },
        skipAuth: true,
      });
      if (!res.token) throw new Error('Server did not return a token.');
      await setToken(res.token);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Wrong passcode.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 px-8 pt-16">
          <View className="flex-row items-center gap-3">
            <Droplet size={32} color={dark ? '#f0a634' : '#11161f'} />
            <Text
              className={`font-serif text-2xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
            >
              Distill
            </Text>
          </View>

          <Text
            className={`mt-12 font-serif text-3xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
          >
            Welcome back.
          </Text>
          <Text
            className={`mt-2 text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
          >
            Enter your passcode to unlock.
          </Text>

          <View className="mt-8 gap-3">
            <TextInput
              value={passcode}
              onChangeText={setPasscode}
              placeholder="Passcode"
              placeholderTextColor={dark ? '#6b6a5f' : '#9da3b3'}
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              className={`h-12 rounded-lg border px-4 text-base ${dark ? 'border-border-dark bg-card-dark text-foreground-dark' : 'border-border bg-card text-foreground'}`}
              onSubmitEditing={submit}
            />
            {error ? (
              <Text className="text-sm text-destructive">{error}</Text>
            ) : null}
            <Pressable
              onPress={submit}
              disabled={pending}
              className="h-12 items-center justify-center rounded-lg bg-accent"
            >
              {pending ? (
                <ActivityIndicator color="#11161f" />
              ) : (
                <Text className="font-medium text-foreground">Unlock</Text>
              )}
            </Pressable>
          </View>

          <View className="mt-12">
            <Text
              className={`text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              Connecting to {DISTILL_API_URL}
            </Text>
            <Text
              className={`mt-1 text-xs ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
            >
              {`If your server has no passcode set, leave the field empty and tap Unlock.`}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
