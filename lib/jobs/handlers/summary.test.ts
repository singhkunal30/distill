import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  // Mocked Prisma surface — only the calls the handler makes.
  prisma: {
    book: { findUniqueOrThrow: vi.fn() },
    summary: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    summarySection: { createMany: vi.fn(), deleteMany: vi.fn() },
    summaryVersion: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  getSettings: vi.fn(),
  loadFixture: vi.fn(),
  logDemoUsage: vi.fn(),
  generate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/settings', () => ({ getSettings: () => mocks.getSettings() }));
vi.mock('@/lib/demo/fixtures', () => ({ loadFixture: (id: string) => mocks.loadFixture(id) }));
vi.mock('@/lib/ai/cost-guard', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/cost-guard')>(
    '@/lib/ai/cost-guard',
  );
  return {
    ...actual,
    logDemoUsage: (...args: unknown[]) => mocks.logDemoUsage(...args),
  };
});
vi.mock('@/lib/ai/providers/anthropic', () => ({
  generate: (...args: unknown[]) => mocks.generate(...args),
  parseJson: (text: string) => JSON.parse(text),
}));

import { runSummaryJob } from './summary';

describe('runSummaryJob', () => {
  const baseBook = {
    id: 'book_1',
    title: 'Atomic Habits',
    authors: JSON.stringify(['James Clear']),
    description: 'A book about habits.',
    contentMd: null as string | null,
  };

  const makeCtx = (overrides: Partial<{ params: unknown; completedSteps: string[] }> = {}) => ({
    jobId: 'job_1',
    bookId: 'book_1',
    params: overrides.params ?? {
      bookId: 'book_1',
      format: 'blink',
      tone: 'neutral',
      length: 'medium',
      audience: 'intermediate',
    },
    completedSteps: overrides.completedSteps ?? [],
    setProgress: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    Object.values(mocks.prisma).forEach((m) =>
      typeof m === 'object'
        ? Object.values(m).forEach((fn) => 'mockReset' in fn && fn.mockReset())
        : (m as { mockReset?: () => void }).mockReset?.(),
    );
    mocks.getSettings.mockReset();
    mocks.loadFixture.mockReset();
    mocks.logDemoUsage.mockReset().mockResolvedValue('demo_log_1');
    mocks.generate.mockReset();
    mocks.prisma.book.findUniqueOrThrow.mockResolvedValue(baseBook);
    // $transaction is called both as an array and as a function; handle both.
    mocks.prisma.$transaction.mockImplementation(async (arg) => {
      if (typeof arg === 'function') return arg(mocks.prisma);
      return Promise.all(arg);
    });
    mocks.prisma.summary.findUnique.mockResolvedValue(null);
    mocks.prisma.summary.create.mockResolvedValue({ id: 'sum_1' });
  });

  it('demo mode: reads fixture and persists sections without calling generate', async () => {
    mocks.getSettings.mockResolvedValue({ demoMode: true });
    mocks.loadFixture.mockResolvedValue({
      bookId: 'book_1',
      title: baseBook.title,
      blink: [
        { heading: 'The 1% mindset', body: '...' },
        { heading: 'Identity over outcomes', body: '...' },
      ],
      insights: [],
      applications: [],
      highlights: [],
      flashcards: [],
    });

    const ctx = makeCtx();
    await runSummaryJob(ctx);

    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.logDemoUsage).toHaveBeenCalledOnce();
    expect(mocks.prisma.summary.create).toHaveBeenCalledOnce();
    const createArgs = mocks.prisma.summary.create.mock.calls[0]![0];
    expect(createArgs.data.format).toBe('blink');
    expect(createArgs.data.sections.create).toHaveLength(2);
  });

  it('demo mode without a fixture throws a clear error', async () => {
    mocks.getSettings.mockResolvedValue({ demoMode: true });
    mocks.loadFixture.mockResolvedValue(null);
    await expect(runSummaryJob(makeCtx())).rejects.toThrow(/fixture was found/);
  });

  it('live mode: reduces source to final sections via generate', async () => {
    mocks.getSettings.mockResolvedValue({ demoMode: false });
    mocks.prisma.book.findUniqueOrThrow.mockResolvedValue({
      ...baseBook,
      contentMd: 'A short source body, far below the chunking threshold.',
    });
    mocks.generate.mockResolvedValue({
      text: JSON.stringify({
        sections: [
          { heading: 'Heading A', body: 'Body A' },
          { heading: 'Heading B', body: 'Body B' },
        ],
      }),
      inputTokens: 500,
      outputTokens: 200,
      logId: 'log_1',
    });

    const ctx = makeCtx();
    await runSummaryJob(ctx);

    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.logDemoUsage).not.toHaveBeenCalled();
    const createArgs = mocks.prisma.summary.create.mock.calls[0]![0];
    expect(createArgs.data.sections.create).toHaveLength(2);
    expect(createArgs.data.modelUsed).toBeDefined();
  });

  it('live mode: chunks large source via the map/reduce loop and uses completedSteps for resume', async () => {
    mocks.getSettings.mockResolvedValue({ demoMode: false });
    const longSource = 'paragraph.\n\n'.repeat(2500); // ~30k chars, will chunk.
    mocks.prisma.book.findUniqueOrThrow.mockResolvedValue({
      ...baseBook,
      contentMd: longSource,
    });
    // Map steps return bullet arrays; reduce step returns sections.
    let call = 0;
    mocks.generate.mockImplementation(async () => {
      call++;
      // First N calls are map (chunk outline), last is reduce.
      if (call === 1) {
        return {
          text: JSON.stringify({ bullets: ['chunk-0 bullet 1', 'chunk-0 bullet 2'] }),
          inputTokens: 6000,
          outputTokens: 200,
          logId: 'l1',
        };
      }
      if (call === 2) {
        return {
          text: JSON.stringify({ bullets: ['chunk-1 bullet'] }),
          inputTokens: 6000,
          outputTokens: 100,
          logId: 'l2',
        };
      }
      return {
        text: JSON.stringify({
          sections: [{ heading: 'Reduced', body: 'Final body' }],
        }),
        inputTokens: 1500,
        outputTokens: 800,
        logId: 'l3',
      };
    });

    const ctx = makeCtx();
    await runSummaryJob(ctx);

    // At least 2 map calls + 1 reduce.
    expect(mocks.generate.mock.calls.length).toBeGreaterThanOrEqual(3);
    // setProgress should be called with completedSteps after map steps.
    const completedCalls = ctx.setProgress.mock.calls.filter(
      (c) => 'completedSteps' in (c[0] as object),
    );
    expect(completedCalls.length).toBeGreaterThan(0);
  });

  it('live mode: snapshots the prior version when replacing an existing summary', async () => {
    mocks.getSettings.mockResolvedValue({ demoMode: false });
    mocks.prisma.book.findUniqueOrThrow.mockResolvedValue({
      ...baseBook,
      contentMd: 'short',
    });
    mocks.prisma.summary.findUnique.mockResolvedValue({
      id: 'sum_existing',
      sections: [
        { heading: 'Old A', body: 'Old body A' },
        { heading: 'Old B', body: 'Old body B' },
      ],
    });
    mocks.generate.mockResolvedValue({
      text: JSON.stringify({ sections: [{ heading: 'New', body: 'New body' }] }),
      inputTokens: 500,
      outputTokens: 200,
      logId: 'log',
    });

    await runSummaryJob(makeCtx());

    expect(mocks.prisma.summaryVersion.create).toHaveBeenCalledOnce();
    const versionArgs = mocks.prisma.summaryVersion.create.mock.calls[0]![0];
    expect(versionArgs.data.summaryId).toBe('sum_existing');
    expect(JSON.parse(versionArgs.data.snapshot)).toHaveLength(2);
  });
});
