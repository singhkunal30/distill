// Per-provider USD pricing. Update when providers move prices.
// All numbers are USD per 1M tokens (or as documented per unit).

export type LLMPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
};

export const ANTHROPIC_PRICING: Record<string, LLMPricing> = {
  // Indicative pricing; matches Anthropic's published rates for the
  // Claude 4 family as of the build date. Updated values can be set
  // in COSTS.md.
  'claude-opus-4-7': { inputPerMTok: 15, outputPerMTok: 75 },
  'claude-opus-4-6': { inputPerMTok: 15, outputPerMTok: 75 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5-20251001': { inputPerMTok: 1, outputPerMTok: 5 },
};

export const OPENAI_PRICING: Record<string, LLMPricing> = {
  'text-embedding-3-small': { inputPerMTok: 0.02, outputPerMTok: 0 },
  'text-embedding-3-large': { inputPerMTok: 0.13, outputPerMTok: 0 },
  'gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.6 },
};

// OpenAI TTS: $15 / 1M characters (tts-1) or $30 / 1M (tts-1-hd).
export const OPENAI_TTS_PER_MCHAR: Record<string, number> = {
  'tts-1': 15,
  'tts-1-hd': 30,
};

// ElevenLabs: roughly $0.30 / 1k characters on the Starter tier.
export const ELEVENLABS_PER_KCHAR = 0.3;

export function llmCost(
  provider: 'anthropic' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const table = provider === 'anthropic' ? ANTHROPIC_PRICING : OPENAI_PRICING;
  const p = table[model];
  if (!p) return 0;
  return (
    (inputTokens / 1_000_000) * p.inputPerMTok +
    (outputTokens / 1_000_000) * p.outputPerMTok
  );
}

export function ttsCost(
  provider: 'openai' | 'elevenlabs',
  model: string,
  characters: number,
): number {
  if (provider === 'openai') {
    const rate = OPENAI_TTS_PER_MCHAR[model] ?? 15;
    return (characters / 1_000_000) * rate;
  }
  return (characters / 1_000) * ELEVENLABS_PER_KCHAR;
}

// Rough token estimation. Anthropic and OpenAI both average ~4 chars/token
// for English; we round generously so estimates are pessimistic.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
