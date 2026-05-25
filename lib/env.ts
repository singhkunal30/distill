// Centralized environment access. Never read process.env elsewhere.

const truthy = (v: string | undefined) =>
  v != null && ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'file:./distill.db',

  passcode: process.env.DISTILL_PASSCODE || null,
  sessionSecret: process.env.DISTILL_SESSION_SECRET || 'distill-dev-secret',

  anthropicKey: process.env.ANTHROPIC_API_KEY || null,
  openaiKey: process.env.OPENAI_API_KEY || null,
  elevenlabsKey: process.env.ELEVENLABS_API_KEY || null,

  models: {
    summary: process.env.DISTILL_MODEL_SUMMARY || 'claude-opus-4-7',
    chat: process.env.DISTILL_MODEL_CHAT || 'claude-sonnet-4-6',
    quick: process.env.DISTILL_MODEL_QUICK || 'claude-haiku-4-5-20251001',
  },

  embeddingsProvider:
    (process.env.DISTILL_EMBEDDINGS_PROVIDER as 'openai' | 'local') || 'local',
  ttsProvider:
    (process.env.DISTILL_TTS_PROVIDER as 'openai' | 'elevenlabs') || 'openai',

  monthlyBudgetUsd: Number(process.env.DISTILL_MONTHLY_BUDGET_USD ?? 25),
  forceDemoMode: truthy(process.env.DISTILL_FORCE_DEMO_MODE),
} as const;

export function hasAnthropicKey(): boolean {
  return env.anthropicKey != null && env.anthropicKey.length > 0;
}

export function hasOpenAIKey(): boolean {
  return env.openaiKey != null && env.openaiKey.length > 0;
}

export function hasElevenLabsKey(): boolean {
  return env.elevenlabsKey != null && env.elevenlabsKey.length > 0;
}
