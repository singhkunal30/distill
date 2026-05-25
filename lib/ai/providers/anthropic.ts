import Anthropic from '@anthropic-ai/sdk';
import { env, hasAnthropicKey } from '@/lib/env';
import { withCostGuard, type AiFeature, CostGuardError } from '@/lib/ai/cost-guard';
import { estimateTokens, llmCost } from '@/lib/ai/pricing';

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!hasAnthropicKey()) {
    throw new CostGuardError(
      'missing_key',
      'Add ANTHROPIC_API_KEY to .env to make live calls.',
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicKey! });
  }
  return client;
}

type GenerateOpts = {
  model: string;
  system: string;
  user: string;
  feature: AiFeature;
  bookId?: string;
  jobId?: string;
  maxTokens?: number;
  confirmed?: boolean;
  metadata?: Record<string, unknown>;
};

export type GenerateResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  logId: string;
};

export async function generate(opts: GenerateOpts): Promise<GenerateResult> {
  const estInputTokens = estimateTokens(`${opts.system}\n${opts.user}`);
  const estOutputTokens = opts.maxTokens ?? 1500;
  const estimatedUsd = llmCost('anthropic', opts.model, estInputTokens, estOutputTokens);

  const { result, logId } = await withCostGuard(
    {
      provider: 'anthropic',
      model: opts.model,
      feature: opts.feature,
      estimatedUsd,
      inputTokens: estInputTokens,
      outputTokens: estOutputTokens,
      bookId: opts.bookId,
      jobId: opts.jobId,
      confirmed: opts.confirmed,
      metadata: opts.metadata,
    },
    async () => {
      const c = getClient();
      const res = await c.messages.create({
        model: opts.model,
        system: opts.system,
        max_tokens: estOutputTokens,
        messages: [{ role: 'user', content: opts.user }],
      });
      const text = res.content
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join('')
        .trim();
      const inputTokens = res.usage.input_tokens;
      const outputTokens = res.usage.output_tokens;
      const actualUsd = llmCost('anthropic', opts.model, inputTokens, outputTokens);
      return {
        result: { text, inputTokens, outputTokens },
        actualUsd,
      };
    },
  );

  return { ...result, logId };
}

/**
 * Parses a Claude response that should be JSON. Tolerates the model
 * accidentally wrapping in ```json fences (a common failure mode).
 */
export function parseJson<T = unknown>(text: string): T {
  let body = text.trim();
  // Strip leading/trailing fences.
  if (body.startsWith('```')) {
    body = body.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  // Some responses prefix with prose; carve out the first {...} block.
  const firstBrace = body.indexOf('{');
  const lastBrace = body.lastIndexOf('}');
  if (firstBrace > 0 && lastBrace > firstBrace) {
    body = body.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(body) as T;
}
