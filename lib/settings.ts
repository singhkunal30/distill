import { prisma } from './db';
import { env } from './env';

// Settings live as JSON-encoded values in the Setting table so we can
// extend the shape without migrations.
export type SettingsShape = {
  demoMode: boolean;
  monthlyBudgetUsd: number;
  embeddingsProvider: 'openai' | 'local';
  ttsProvider: 'openai' | 'elevenlabs';
  ttsVoice: string;
  defaultSummaryFormat: 'blink' | 'insights' | 'detailed' | 'tldr' | 'applications';
  defaultSummaryTone: 'neutral' | 'academic' | 'conversational' | 'punchy';
  defaultSummaryLength: 'short' | 'medium' | 'long';
  defaultSummaryAudience: 'beginner' | 'intermediate' | 'expert';
  theme: 'light' | 'dark' | 'sepia' | 'system';
  fontScale: number;
  readingFont: 'serif' | 'sans';
  onboardingCompleted: boolean;
  // Per-job confirmation threshold (USD). 0 = always confirm.
  confirmAboveUsd: number;
};

const DEFAULTS: SettingsShape = {
  demoMode: true,
  monthlyBudgetUsd: env.monthlyBudgetUsd,
  embeddingsProvider: env.embeddingsProvider,
  ttsProvider: env.ttsProvider,
  ttsVoice: 'alloy',
  defaultSummaryFormat: 'blink',
  defaultSummaryTone: 'neutral',
  defaultSummaryLength: 'medium',
  defaultSummaryAudience: 'intermediate',
  theme: 'system',
  fontScale: 1,
  readingFont: 'serif',
  onboardingCompleted: false,
  confirmAboveUsd: 0.5,
};

export async function getSettings(): Promise<SettingsShape> {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const result = { ...DEFAULTS } as SettingsShape;
  for (const key of Object.keys(DEFAULTS) as (keyof SettingsShape)[]) {
    const raw = map.get(key);
    if (raw == null) continue;
    try {
      // @ts-expect-error - safe: keys come from a fixed shape.
      result[key] = JSON.parse(raw);
    } catch {
      // ignore malformed value and keep default
    }
  }
  if (env.forceDemoMode) result.demoMode = true;
  return result;
}

export async function updateSettings(partial: Partial<SettingsShape>) {
  const entries = Object.entries(partial) as [keyof SettingsShape, unknown][];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      }),
    ),
  );
}

export async function getSetting<K extends keyof SettingsShape>(key: K): Promise<SettingsShape[K]> {
  const settings = await getSettings();
  return settings[key];
}
