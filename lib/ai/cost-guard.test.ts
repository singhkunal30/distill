import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks so vi.mock's evaluation order is correct.
const mocks = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  settingsMock: vi.fn(),
  budgetMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    apiUsageLog: {
      create: mocks.createMock,
      update: mocks.updateMock,
    },
  },
}));

vi.mock('@/lib/settings', () => ({
  getSettings: () => mocks.settingsMock(),
}));

vi.mock('./budget', () => ({
  getBudgetStatus: () => mocks.budgetMock(),
}));

const { createMock, updateMock, settingsMock, budgetMock } = mocks;

import { withCostGuard, CostGuardError, logDemoUsage } from './cost-guard';

describe('withCostGuard', () => {
  beforeEach(() => {
    updateMock.mockReset();
    createMock.mockReset().mockResolvedValue({ id: 'log_1' });
    settingsMock.mockReset();
    budgetMock.mockReset();
  });

  const baseCtx = {
    provider: 'anthropic' as const,
    model: 'claude-sonnet-4-6',
    feature: 'summary' as const,
    estimatedUsd: 0.1,
    inputTokens: 500,
    outputTokens: 250,
  };

  it('short-circuits when demo mode is on', async () => {
    settingsMock.mockResolvedValue({
      demoMode: true,
      monthlyBudgetUsd: 25,
      confirmAboveUsd: 0.5,
    });
    const run = vi.fn();
    await expect(
      withCostGuard(baseCtx, run),
    ).rejects.toBeInstanceOf(CostGuardError);
    expect(run).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('refuses when the monthly budget is exhausted', async () => {
    settingsMock.mockResolvedValue({
      demoMode: false,
      monthlyBudgetUsd: 25,
      confirmAboveUsd: 0.5,
    });
    budgetMock.mockResolvedValue({
      monthSpendUsd: 30,
      monthBudgetUsd: 25,
      remainingUsd: 0,
      exceeded: true,
      resetDate: new Date(),
    });
    await expect(
      withCostGuard(baseCtx, vi.fn()),
    ).rejects.toMatchObject({ reason: 'budget_exceeded' });
  });

  it('refuses when the job estimate exceeds remaining budget', async () => {
    settingsMock.mockResolvedValue({
      demoMode: false,
      monthlyBudgetUsd: 25,
      confirmAboveUsd: 5,
    });
    budgetMock.mockResolvedValue({
      monthSpendUsd: 24.95,
      monthBudgetUsd: 25,
      remainingUsd: 0.05,
      exceeded: false,
      resetDate: new Date(),
    });
    await expect(
      withCostGuard({ ...baseCtx, estimatedUsd: 0.1 }, vi.fn()),
    ).rejects.toMatchObject({ reason: 'budget_exceeded' });
  });

  it('requires confirmation when estimate is above threshold', async () => {
    settingsMock.mockResolvedValue({
      demoMode: false,
      monthlyBudgetUsd: 25,
      confirmAboveUsd: 0.5,
    });
    budgetMock.mockResolvedValue({
      monthSpendUsd: 0,
      monthBudgetUsd: 25,
      remainingUsd: 25,
      exceeded: false,
      resetDate: new Date(),
    });
    await expect(
      withCostGuard({ ...baseCtx, estimatedUsd: 1.2 }, vi.fn()),
    ).rejects.toMatchObject({ reason: 'requires_confirmation' });
  });

  it('runs the call when confirmed and logs before/after', async () => {
    settingsMock.mockResolvedValue({
      demoMode: false,
      monthlyBudgetUsd: 25,
      confirmAboveUsd: 0.5,
    });
    budgetMock.mockResolvedValue({
      monthSpendUsd: 0,
      monthBudgetUsd: 25,
      remainingUsd: 25,
      exceeded: false,
      resetDate: new Date(),
    });
    const run = vi.fn().mockResolvedValue({ result: 'ok', actualUsd: 0.12 });
    const { result, logId } = await withCostGuard(
      { ...baseCtx, estimatedUsd: 1.0, confirmed: true },
      run,
    );
    expect(result).toBe('ok');
    expect(logId).toBe('log_1');
    expect(createMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'log_1' },
      data: { actualUsd: 0.12, units: null },
    });
  });

  it('writes a zero-cost row on failure and rethrows', async () => {
    settingsMock.mockResolvedValue({
      demoMode: false,
      monthlyBudgetUsd: 25,
      confirmAboveUsd: 0.5,
    });
    budgetMock.mockResolvedValue({
      monthSpendUsd: 0,
      monthBudgetUsd: 25,
      remainingUsd: 25,
      exceeded: false,
      resetDate: new Date(),
    });
    const run = vi.fn().mockRejectedValue(new Error('upstream 500'));
    await expect(withCostGuard(baseCtx, run)).rejects.toThrow('upstream 500');
    expect(updateMock).toHaveBeenCalled();
    const updateArgs = updateMock.mock.calls[0]![0];
    expect(updateArgs.data.actualUsd).toBe(0);
  });

  it('skips budget checks for local provider', async () => {
    settingsMock.mockResolvedValue({
      demoMode: false,
      monthlyBudgetUsd: 25,
      confirmAboveUsd: 0.0,
    });
    const run = vi.fn().mockResolvedValue({ result: 42 });
    const { result } = await withCostGuard(
      { ...baseCtx, provider: 'local', estimatedUsd: 99 },
      run,
    );
    expect(result).toBe(42);
    expect(budgetMock).not.toHaveBeenCalled();
  });
});

describe('logDemoUsage', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: 'demo_log_1' });
  });
  it('writes a demoMode row and returns its id', async () => {
    const id = await logDemoUsage({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      feature: 'summary',
      estimatedUsd: 0.1,
    });
    expect(id).toBe('demo_log_1');
    expect(createMock).toHaveBeenCalledOnce();
    const args = createMock.mock.calls[0]![0];
    expect(args.data.demoMode).toBe(true);
    expect(args.data.actualUsd).toBe(0);
  });
});
