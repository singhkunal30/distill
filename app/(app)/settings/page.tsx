import { PageHeader } from '@/components/shell/page-header';
import { getSettings } from '@/lib/settings';
import { getBudgetStatus } from '@/lib/ai/budget';
import { hasAnthropicKey, hasOpenAIKey, hasElevenLabsKey } from '@/lib/env';
import { SettingsForm } from '@/features/settings/settings-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatUsd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, budget] = await Promise.all([getSettings(), getBudgetStatus()]);

  const providers = {
    anthropic: hasAnthropicKey(),
    openai: hasOpenAIKey(),
    elevenlabs: hasElevenLabsKey(),
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Cost guardrails, providers, and reading preferences."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API providers</CardTitle>
            <CardDescription>
              Set keys in <code className="rounded bg-muted px-1">.env</code>. Distill never
              sends keys to the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <ProviderRow name="Anthropic" connected={providers.anthropic} hint="Summaries, chat" />
            <ProviderRow name="OpenAI" connected={providers.openai} hint="TTS, embeddings" />
            <ProviderRow name="ElevenLabs" connected={providers.elevenlabs} hint="Premium TTS" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>
              {formatUsd(budget.monthSpendUsd)} of {formatUsd(budget.monthBudgetUsd)} spent.
              Resets {budget.resetDate.toDateString()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent"
                style={{
                  width: `${Math.min(
                    100,
                    (budget.monthSpendUsd / Math.max(budget.monthBudgetUsd, 0.01)) * 100,
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}

function ProviderRow({
  name,
  connected,
  hint,
}: {
  name: string;
  connected: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-md border p-3">
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Badge variant={connected ? 'accent' : 'muted'} className="shrink-0">
        {connected ? 'Connected' : 'Not set'}
      </Badge>
    </div>
  );
}
