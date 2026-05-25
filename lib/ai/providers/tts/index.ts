import { getSettings } from '@/lib/settings';
import { openaiTTS } from './openai';
import { elevenlabsTTS } from './elevenlabs';
import type { TTSProvider } from './types';

export async function selectTTSProvider(): Promise<TTSProvider> {
  const settings = await getSettings();
  return settings.ttsProvider === 'elevenlabs' ? elevenlabsTTS : openaiTTS;
}

export { openaiTTS, elevenlabsTTS };
export type { TTSProvider, TTSResult, TTSSynthesizeOpts, TTSTiming } from './types';
