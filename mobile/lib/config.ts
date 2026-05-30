import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Priority for the API base URL:
//   1. EXPO_PUBLIC_DISTILL_API_URL  (set in .env or shell)
//   2. expo.extra.distillApiUrl     (app.json fallback)
//   3. Platform-specific localhost  (Android emulator can't reach host's
//      localhost; we map to 10.0.2.2 there)
function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_DISTILL_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const extra =
    (Constants.expoConfig?.extra?.distillApiUrl as string | undefined) ?? null;
  if (extra && !extra.includes('localhost')) return extra.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const DISTILL_API_URL = resolveBaseUrl();
