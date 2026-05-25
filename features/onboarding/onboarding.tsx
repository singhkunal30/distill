'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Headphones, Highlighter, Library, Sparkles } from 'lucide-react';
import { DistillMark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { saveSettings } from '@/features/settings/actions';
import { cn } from '@/lib/utils';

const SLIDES = [
  {
    title: 'Distill takes the essence of every book you read — and keeps it within reach.',
    body: 'Add a book once. Distill captures its summary, key insights, and quotable lines so you can revisit them anywhere — calmly, on your terms.',
    icon: DistillMark,
  },
  {
    title: 'Read, listen, retain.',
    body: 'Blink-style summaries, audio narration, highlights, and a spaced-repetition layer that quietly resurfaces what matters.',
    items: [
      { icon: Library, text: 'A library that searches itself.' },
      { icon: Headphones, text: 'Listen at the gym, in transit, anywhere.' },
      { icon: Highlighter, text: 'Highlight once, remember forever.' },
      { icon: Sparkles, text: 'Cross-book ideas, surfaced on cue.' },
    ],
  },
  {
    title: 'Start gently.',
    body: 'Distill defaults to demo mode using pre-cached fixtures — no AI spend until you choose. Add a monthly budget so you stay in control.',
  },
] as const;

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [keepDemo, setKeepDemo] = React.useState(true);
  const [budget, setBudget] = React.useState(25);
  const [pending, startTransition] = React.useTransition();

  const isLast = step === SLIDES.length - 1;

  const finish = () => {
    startTransition(async () => {
      await saveSettings({
        onboardingCompleted: true,
        demoMode: keepDemo,
        monthlyBudgetUsd: budget,
      });
      router.replace('/');
      router.refresh();
    });
  };

  const Slide = SLIDES[step]!;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DistillMark className="h-6 w-6 text-primary" />
            <span className="font-serif text-base font-semibold tracking-tight">Distill</span>
          </div>
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 w-6 rounded-full transition-colors',
                  i <= step ? 'bg-foreground' : 'bg-muted',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          {step === 0 ? (
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
              <DistillMark className="h-14 w-14 text-primary" />
            </div>
          ) : null}
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-balance md:text-4xl">
            {Slide.title}
          </h1>
          {'body' in Slide && Slide.body ? (
            <p className="mt-4 text-base text-muted-foreground text-balance">{Slide.body}</p>
          ) : null}

          {'items' in Slide && Slide.items ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {Slide.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-accent" />
                    <span>{item.text}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {isLast ? (
            <div className="mt-8 space-y-5 rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="keep-demo">Start in demo mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Toggle off in Settings whenever you're ready to make live API calls.
                  </p>
                </div>
                <Switch
                  id="keep-demo"
                  checked={keepDemo}
                  onCheckedChange={setKeepDemo}
                />
              </div>
              <div>
                <Label htmlFor="budget">Monthly budget (USD)</Label>
                <input
                  id="budget"
                  type="number"
                  min={0}
                  step={1}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="mt-1 block w-32 rounded-md border bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Distill will pause generation if you hit this cap.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            Back
          </button>
          {isLast ? (
            <Button onClick={finish} disabled={pending} size="lg" variant="accent">
              Enter Distill <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} size="lg">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
