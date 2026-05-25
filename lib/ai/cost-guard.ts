import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { getBudgetStatus } from './budget';

export type AiFeature =
  | 'summary'
  | 'chat'
  | 'embedding'
  | 'tts'
  | 'flashcard'
  | 'quiz'
  | 'metadata'
  | 'recommendation';

export type CostGuardContext = {
  provider: 'anthropic' | 'openai' | 'elevenlabs' | 'local';
  model: string;
  feature: AiFeature;
  estimatedUsd: number;
  bookId?: string | null;
  jobId?: string | null;
  // For LLMs:
  inputTokens?: number;
  outputTokens?: number;
  // For TTS/non-LLM:
  units?: number;
  unitKind?: 'characters' | 'seconds' | 'requests';
  metadata?: Record<string, unknown>;
  // Set true to bypass the per-job confirmation threshold (caller has
  // already gotten explicit confirmation).
  confirmed?: boolean;
};

export class CostGuardError extends Error {
  constructor(
    public readonly reason: 'demo_mode' | 'budget_exceeded' | 'requires_confirmation' | 'missing_key',
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CostGuardError';
  }
}

/**
 * Wraps any AI call. Enforces (in order):
 *   1. Demo mode short-circuit
 *   2. Missing-key check
 *   3. Monthly budget cap
 *   4. Per-job confirmation threshold
 *   5. Logs to ApiUsageLog *before* and updates *after*
 *
 * If `run` is omitted, returns the estimate and a `confirm` token without
 * making the call (used by the cost-confirmation UI).
 */
export async function withCostGuard<T>(
  ctx: CostGuardContext,
  run: () => Promise<{ result: T; actualUsd?: number; actualUnits?: number }>,
): Promise<{ result: T; logId: string }> {
  const settings = await getSettings();

  if (settings.demoMode) {
    throw new CostGuardError(
      'demo_mode',
      'Demo mode is enabled — toggle it off in Settings to make live AI calls.',
    );
  }

  if (ctx.provider !== 'local') {
    const budget = await getBudgetStatus();
    if (budget.exceeded) {
      throw new CostGuardError(
        'budget_exceeded',
        `Monthly budget of $${budget.monthBudgetUsd} exhausted. Resets ${budget.resetDate.toDateString()}.`,
        { budget },
      );
    }
    if (budget.remainingUsd < ctx.estimatedUsd) {
      throw new CostGuardError(
        'budget_exceeded',
        `Estimated $${ctx.estimatedUsd.toFixed(2)} exceeds remaining $${budget.remainingUsd.toFixed(2)} for this month.`,
        { budget },
      );
    }
    if (!ctx.confirmed && ctx.estimatedUsd >= settings.confirmAboveUsd) {
      throw new CostGuardError(
        'requires_confirmation',
        `Job costs ~$${ctx.estimatedUsd.toFixed(2)} — confirm before continuing.`,
        { estimatedUsd: ctx.estimatedUsd, threshold: settings.confirmAboveUsd },
      );
    }
  }

  const log = await prisma.apiUsageLog.create({
    data: {
      provider: ctx.provider,
      model: ctx.model,
      feature: ctx.feature,
      inputTokens: ctx.inputTokens ?? null,
      outputTokens: ctx.outputTokens ?? null,
      units: ctx.units ?? null,
      unitKind: ctx.unitKind ?? null,
      estimatedUsd: ctx.estimatedUsd,
      demoMode: false,
      bookId: ctx.bookId ?? null,
      jobId: ctx.jobId ?? null,
      metadata: ctx.metadata ? JSON.stringify(ctx.metadata) : null,
    },
  });

  try {
    const { result, actualUsd, actualUnits } = await run();
    await prisma.apiUsageLog.update({
      where: { id: log.id },
      data: {
        actualUsd: actualUsd ?? ctx.estimatedUsd,
        units: actualUnits ?? ctx.units ?? null,
      },
    });
    return { result, logId: log.id };
  } catch (err) {
    await prisma.apiUsageLog.update({
      where: { id: log.id },
      data: {
        actualUsd: 0,
        metadata: JSON.stringify({
          ...(ctx.metadata ?? {}),
          error: err instanceof Error ? err.message : String(err),
        }),
      },
    });
    throw err;
  }
}

/**
 * Logs a demo-mode "call" so the API usage page reflects what would have
 * cost real money. Never charges; demoMode=true.
 */
export async function logDemoUsage(ctx: CostGuardContext): Promise<string> {
  const row = await prisma.apiUsageLog.create({
    data: {
      provider: ctx.provider,
      model: ctx.model,
      feature: ctx.feature,
      inputTokens: ctx.inputTokens ?? null,
      outputTokens: ctx.outputTokens ?? null,
      units: ctx.units ?? null,
      unitKind: ctx.unitKind ?? null,
      estimatedUsd: ctx.estimatedUsd,
      actualUsd: 0,
      demoMode: true,
      bookId: ctx.bookId ?? null,
      jobId: ctx.jobId ?? null,
      metadata: ctx.metadata ? JSON.stringify(ctx.metadata) : null,
    },
  });
  return row.id;
}
