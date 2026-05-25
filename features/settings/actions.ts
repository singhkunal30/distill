'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateSettings, type SettingsShape } from '@/lib/settings';

const SettingsInput = z.object({
  demoMode: z.boolean().optional(),
  monthlyBudgetUsd: z.number().min(0).max(10_000).optional(),
  confirmAboveUsd: z.number().min(0).max(1000).optional(),
  embeddingsProvider: z.enum(['openai', 'local']).optional(),
  ttsProvider: z.enum(['openai', 'elevenlabs']).optional(),
  ttsVoice: z.string().optional(),
  defaultSummaryFormat: z
    .enum(['blink', 'insights', 'detailed', 'tldr', 'applications'])
    .optional(),
  defaultSummaryTone: z
    .enum(['neutral', 'academic', 'conversational', 'punchy'])
    .optional(),
  defaultSummaryLength: z.enum(['short', 'medium', 'long']).optional(),
  defaultSummaryAudience: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  theme: z.enum(['light', 'dark', 'sepia', 'system']).optional(),
  fontScale: z.number().min(0.75).max(1.5).optional(),
  readingFont: z.enum(['serif', 'sans']).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export async function saveSettings(partial: Partial<SettingsShape>) {
  const parsed = SettingsInput.parse(partial);
  await updateSettings(parsed);
  revalidatePath('/settings');
  revalidatePath('/');
  return { ok: true };
}
