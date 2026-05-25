import OpenAI from 'openai';
import { env, hasOpenAIKey } from '@/lib/env';
import { withCostGuard, CostGuardError } from '@/lib/ai/cost-guard';
import { ttsCost } from '@/lib/ai/pricing';
import type { TTSProvider, TTSResult, TTSSynthesizeOpts } from './types';

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!hasOpenAIKey()) {
    throw new CostGuardError('missing_key', 'Add OPENAI_API_KEY to .env to use OpenAI TTS.');
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiKey! });
  }
  return client;
}

// English: ~14 chars/sec for tts-1 normal speed. Used as a duration
// fallback because OpenAI doesn't return word-level timings.
const CHARS_PER_SEC = 14;

export const openaiTTS: TTSProvider = {
  name: 'openai',
  defaultModel: 'tts-1',
  defaultVoice: 'alloy',
  estimateUsd(chars, model = 'tts-1') {
    return ttsCost('openai', model, chars);
  },
  async synthesize(opts: TTSSynthesizeOpts): Promise<TTSResult> {
    const model = opts.model ?? this.defaultModel;
    const voice = opts.voice;
    const estimatedUsd = ttsCost('openai', model, opts.text.length);

    const { result, logId } = await withCostGuard(
      {
        provider: 'openai',
        model,
        feature: 'tts',
        estimatedUsd,
        units: opts.text.length,
        unitKind: 'characters',
        bookId: opts.bookId,
        jobId: opts.jobId,
        confirmed: opts.confirmed,
        metadata: { voice, kind: 'tts' },
      },
      async () => {
        const c = getClient();
        const res = await c.audio.speech.create({
          model: model as 'tts-1' | 'tts-1-hd',
          voice: voice as 'alloy',
          input: opts.text,
          response_format: 'mp3',
        });
        const buf = Buffer.from(await res.arrayBuffer());
        return {
          result: { mp3: buf, inputChars: opts.text.length },
          actualUsd: estimatedUsd,
          actualUnits: opts.text.length,
        };
      },
    );

    const durationMs = Math.round((opts.text.length / CHARS_PER_SEC) * 1000);

    return {
      mp3: result.mp3,
      durationMs,
      timings: null,
      inputChars: result.inputChars,
      actualUsd: estimatedUsd,
      logId,
      model,
      voice,
      provider: 'openai',
    };
  },
};
