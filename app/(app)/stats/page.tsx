import Link from 'next/link';
import { PageHeader } from '@/components/shell/page-header';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatUsd, formatNumber, relativeTime } from '@/lib/utils';
import { getBudgetStatus } from '@/lib/ai/budget';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const [usage, byFeature, byProvider, budget, totalBooks] = await Promise.all([
    prisma.apiUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.apiUsageLog.groupBy({
      by: ['feature'],
      _sum: { actualUsd: true, estimatedUsd: true, inputTokens: true, outputTokens: true },
      orderBy: { _sum: { actualUsd: 'desc' } },
    }),
    prisma.apiUsageLog.groupBy({
      by: ['provider'],
      _sum: { actualUsd: true, estimatedUsd: true },
    }),
    getBudgetStatus(),
    prisma.book.count(),
  ]);

  return (
    <div>
      <PageHeader
        title="Stats"
        description="API spend, library size, and reading habits. Reading habits arrive in Phase 6."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Books in library" value={formatNumber(totalBooks)} />
        <Stat label="API calls this month" value={formatNumber(usage.length)} />
        <Stat label="Spent this month" value={formatUsd(budget.monthSpendUsd)} />
        <Stat
          label="Budget left"
          value={formatUsd(budget.remainingUsd)}
          hint={`of ${formatUsd(budget.monthBudgetUsd)}`}
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by feature</CardTitle>
            <CardDescription>Lifetime, actual spend (demo runs excluded).</CardDescription>
          </CardHeader>
          <CardContent>
            {byFeature.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No API calls yet. Demo mode keeps all generation free.
              </p>
            ) : (
              <ul className="divide-y">
                {byFeature.map((row) => (
                  <li key={row.feature} className="flex items-center justify-between py-2 text-sm">
                    <span className="capitalize">{row.feature}</span>
                    <span>{formatUsd(row._sum.actualUsd ?? row._sum.estimatedUsd ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by provider</CardTitle>
          </CardHeader>
          <CardContent>
            {byProvider.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage recorded.</p>
            ) : (
              <ul className="divide-y">
                {byProvider.map((row) => (
                  <li key={row.provider} className="flex items-center justify-between py-2 text-sm">
                    <span className="capitalize">{row.provider}</span>
                    <span>{formatUsd(row._sum.actualUsd ?? row._sum.estimatedUsd ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-serif text-lg font-semibold">Recent API activity</h2>
        {usage.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No API calls have been recorded.{' '}
              <Link className="underline" href="/settings">
                Toggle demo mode off
              </Link>{' '}
              and run a generation in Phase 2 to see this populate.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Feature</th>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Model</th>
                  <th className="px-3 py-2 text-right">In tokens</th>
                  <th className="px-3 py-2 text-right">Out tokens</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usage.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-muted-foreground">
                      {relativeTime(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      {row.feature}
                      {row.demoMode ? (
                        <Badge variant="muted" className="ml-2 text-[10px]">
                          demo
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{row.provider}</td>
                    <td className="px-3 py-2 text-xs">{row.model}</td>
                    <td className="px-3 py-2 text-right">
                      {row.inputTokens != null ? formatNumber(row.inputTokens) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.outputTokens != null ? formatNumber(row.outputTokens) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.demoMode
                        ? '—'
                        : formatUsd(row.actualUsd ?? row.estimatedUsd ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-serif text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
