import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';

export type BudgetStatus = {
  monthSpendUsd: number;
  monthBudgetUsd: number;
  remainingUsd: number;
  exceeded: boolean;
  resetDate: Date;
};

function startOfMonthUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfNextMonthUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const settings = await getSettings();
  const since = startOfMonthUtc();
  const agg = await prisma.apiUsageLog.aggregate({
    _sum: { actualUsd: true, estimatedUsd: true },
    where: { createdAt: { gte: since }, demoMode: false },
  });
  const monthSpendUsd = agg._sum.actualUsd ?? agg._sum.estimatedUsd ?? 0;
  const monthBudgetUsd = settings.monthlyBudgetUsd;
  return {
    monthSpendUsd,
    monthBudgetUsd,
    remainingUsd: Math.max(0, monthBudgetUsd - monthSpendUsd),
    exceeded: monthSpendUsd >= monthBudgetUsd,
    resetDate: startOfNextMonthUtc(),
  };
}
