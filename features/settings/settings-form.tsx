'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { saveSettings } from './actions';
import type { SettingsShape } from '@/lib/settings';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function SettingsForm({ settings }: { settings: SettingsShape }) {
  const [state, setState] = React.useState(settings);
  const [pending, startTransition] = React.useTransition();
  const toast = useToast();

  const update = <K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
    startTransition(async () => {
      try {
        await saveSettings({ [key]: value } as Partial<SettingsShape>);
      } catch (err) {
        toast.push({
          title: 'Failed to save',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cost guardrails</CardTitle>
          <CardDescription>
            Demo mode uses pre-cached fixtures so generation costs nothing. Toggle off only
            when you have keys set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="demo">Demo mode</Label>
              <p className="text-xs text-muted-foreground">
                Routes all generation through seed fixtures.
              </p>
            </div>
            <Switch
              id="demo"
              checked={state.demoMode}
              onCheckedChange={(v) => update('demoMode', v)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="budget">Monthly budget (USD)</Label>
              <Input
                id="budget"
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={state.monthlyBudgetUsd}
                onChange={(e) => setState((p) => ({ ...p, monthlyBudgetUsd: Number(e.target.value) }))}
                onBlur={() => update('monthlyBudgetUsd', state.monthlyBudgetUsd)}
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm above (USD)</Label>
              <Input
                id="confirm"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={state.confirmAboveUsd}
                onChange={(e) => setState((p) => ({ ...p, confirmAboveUsd: Number(e.target.value) }))}
                onBlur={() => update('confirmAboveUsd', state.confirmAboveUsd)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Jobs estimated above this require a one-click confirmation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
          <CardDescription>Swap between providers — set keys in .env first.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Embeddings provider</Label>
            <Select
              value={state.embeddingsProvider}
              onValueChange={(v) => update('embeddingsProvider', v as 'openai' | 'local')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local (Transformers.js)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>TTS provider</Label>
            <Select
              value={state.ttsProvider}
              onValueChange={(v) => update('ttsProvider', v as 'openai' | 'elevenlabs')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI TTS</SelectItem>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>TTS voice</Label>
            <Input
              value={state.ttsVoice}
              onChange={(e) => setState((p) => ({ ...p, ttsVoice: e.target.value }))}
              onBlur={() => update('ttsVoice', state.ttsVoice)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary defaults</CardTitle>
          <CardDescription>Pre-fill the “distill” dialog for new books.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Default format"
            value={state.defaultSummaryFormat}
            onChange={(v) => update('defaultSummaryFormat', v as SettingsShape['defaultSummaryFormat'])}
            options={[
              ['blink', 'Blink (8-12 sections)'],
              ['insights', 'Key insights'],
              ['detailed', 'Chapter breakdown'],
              ['tldr', 'TL;DR'],
              ['applications', 'Practical applications'],
            ]}
          />
          <SelectField
            label="Tone"
            value={state.defaultSummaryTone}
            onChange={(v) => update('defaultSummaryTone', v as SettingsShape['defaultSummaryTone'])}
            options={[
              ['neutral', 'Neutral'],
              ['academic', 'Academic'],
              ['conversational', 'Conversational'],
              ['punchy', 'Punchy'],
            ]}
          />
          <SelectField
            label="Length"
            value={state.defaultSummaryLength}
            onChange={(v) => update('defaultSummaryLength', v as SettingsShape['defaultSummaryLength'])}
            options={[
              ['short', 'Short'],
              ['medium', 'Medium'],
              ['long', 'Long'],
            ]}
          />
          <SelectField
            label="Audience"
            value={state.defaultSummaryAudience}
            onChange={(v) =>
              update('defaultSummaryAudience', v as SettingsShape['defaultSummaryAudience'])
            }
            options={[
              ['beginner', 'Beginner'],
              ['intermediate', 'Intermediate'],
              ['expert', 'Expert'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme applies app-wide; reader page adds sepia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Theme</Label>
            <ThemeToggle />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Reading font"
              value={state.readingFont}
              onChange={(v) => update('readingFont', v as 'serif' | 'sans')}
              options={[
                ['serif', 'Serif (Source Serif)'],
                ['sans', 'Sans (Inter)'],
              ]}
            />
            <div>
              <Label>Font scale</Label>
              <Input
                type="number"
                min={0.75}
                max={1.5}
                step={0.05}
                value={state.fontScale}
                onChange={(e) => setState((p) => ({ ...p, fontScale: Number(e.target.value) }))}
                onBlur={() => update('fontScale', state.fontScale)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Show the welcome screens again next time you open Distill.
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => update('onboardingCompleted', false)}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Replay onboarding'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
