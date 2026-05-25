import { env, hasElevenLabsKey } from '@/lib/env';
import { withCostGuard, CostGuardError } from '@/lib/ai/cost-guard';
import { ttsCost } from '@/lib/ai/pricing';
import type { TTSProvider, TTSResult, TTSSynthesizeOpts, TTSTiming } from './types';

// ElevenLabs public REST API. Their /text-to-speech-with-timestamps
// endpoint returns character-level alignments; we coalesce to words.
const API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // "Rachel"
const DEFAULT_MODEL = 'eleven_turbo_v2_5';

function bytesFromBase64(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

export const elevenlabsTTS: TTSProvider = {
  name: 'elevenlabs',
  defaultModel: DEFAULT_MODEL,
  defaultVoice: DEFAULT_VOICE,
  estimateUsd(chars) {
    return ttsCost('elevenlabs', DEFAULT_MODEL, chars);
  },
  async synthesize(opts: TTSSynthesizeOpts): Promise<TTSResult> {
    if (!hasElevenLabsKey()) {
      throw new CostGuardError('missing_key', 'Add ELEVENLABS_API_KEY to .env.');
    }
    const model = opts.model ?? DEFAULT_MODEL;
    const voice = opts.voice || DEFAULT_VOICE;
    const estimatedUsd = ttsCost('elevenlabs', model, opts.text.length);

    const { result, logId } = await withCostGuard(
      {
        provider: 'elevenlabs',
        model,
        feature: 'tts',
        estimatedUsd,
        units: opts.text.length,
        unitKind: 'characters',
        bookId: opts.bookId,
        jobId: opts.jobId,
        confirmed: opts.confirmed,
        metadata: { voice },
      },
      async () => {
        const res = await fetch(
          `${API_BASE}/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': env.elevenlabsKey!,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              text: opts.text,
              model_id: model,
            }),
          },
        );
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`ElevenLabs error ${res.status}: ${body}`);
        }
        const data = (await res.json()) as {
          audio_base64: string;
          alignment?: {
            characters: string[];
            character_start_times_seconds: number[];
            character_end_times_seconds: number[];
          };
        };
        const mp3 = bytesFromBase64(data.audio_base64);
        const timings = data.alignment ? coalesceToWords(data.alignment) : null;
        const durationMs = timings && timings.length > 0
          ? timings[timings.length - 1]!.endMs
          : Math.round((opts.text.length / 14) * 1000);
        return {
          result: { mp3, timings, durationMs },
          actualUsd: estimatedUsd,
          actualUnits: opts.text.length,
        };
      },
    );

    return {
      mp3: result.mp3,
      durationMs: result.durationMs,
      timings: result.timings,
      inputChars: opts.text.length,
      actualUsd: estimatedUsd,
      logId,
      model,
      voice,
      provider: 'elevenlabs',
    };
  },
};

// Group consecutive non-whitespace characters into word-level timings.
function coalesceToWords(alignment: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): TTSTiming[] {
  const out: TTSTiming[] = [];
  let buf = '';
  let startMs = 0;
  const flush = (endMs: number) => {
    if (buf.length === 0) return;
    out.push({ word: buf, startMs, endMs });
    buf = '';
  };
  for (let i = 0; i < alignment.characters.length; i++) {
    const ch = alignment.characters[i]!;
    const start = (alignment.character_start_times_seconds[i] ?? 0) * 1000;
    const end = (alignment.character_end_times_seconds[i] ?? 0) * 1000;
    if (/\s/.test(ch)) {
      flush(end);
      continue;
    }
    if (buf.length === 0) startMs = start;
    buf += ch;
    if (i === alignment.characters.length - 1) flush(end);
  }
  return out;
}
