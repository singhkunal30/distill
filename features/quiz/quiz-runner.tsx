'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuizQuestionForUI } from './queries';

type Props = {
  bookId: string;
  quiz: { id: string; title: string; questions: QuizQuestionForUI[] };
};

export function QuizRunner({ bookId, quiz }: Props) {
  const [picks, setPicks] = React.useState<Record<string, number>>({});
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const total = quiz.questions.length;
  const correctCount = React.useMemo(() => {
    let n = 0;
    for (const q of quiz.questions) {
      const picked = picks[q.id];
      if (picked == null) continue;
      if (q.choices[picked]?.correct) n += 1;
    }
    return n;
  }, [picks, quiz.questions]);

  const allAnswered = quiz.questions.every((q) => picks[q.id] != null);

  const pick = (q: QuizQuestionForUI, choiceIdx: number) => {
    if (revealed[q.id] || submitted) return;
    setPicks((p) => ({ ...p, [q.id]: choiceIdx }));
    setRevealed((r) => ({ ...r, [q.id]: true }));
  };

  const reset = () => {
    setPicks({});
    setRevealed({});
    setSubmitted(false);
  };

  return (
    <div>
      <Link
        href={`/book/${bookId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to book
      </Link>

      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{quiz.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} questions · multiple choice
        </p>
      </header>

      <ol className="space-y-6">
        {quiz.questions.map((q, qi) => {
          const picked = picks[q.id];
          const shown = revealed[q.id] || submitted;
          return (
            <li
              key={q.id}
              className="rounded-2xl border bg-card p-5"
              id={`q-${qi + 1}`}
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Q{qi + 1}
              </p>
              <p className="mt-1 font-serif text-lg leading-snug text-balance">
                {q.prompt}
              </p>
              <ul className="mt-4 space-y-2">
                {q.choices.map((c, ci) => {
                  const isPicked = picked === ci;
                  const isCorrect = c.correct;
                  let cls = 'border-border hover:bg-muted/40';
                  if (shown && isCorrect) cls = 'border-accent bg-accent/10';
                  else if (shown && isPicked && !isCorrect)
                    cls = 'border-destructive/50 bg-destructive/5';
                  return (
                    <li key={ci}>
                      <button
                        type="button"
                        onClick={() => pick(q, ci)}
                        disabled={shown}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-default',
                          cls,
                        )}
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-background text-[11px] font-semibold">
                          {String.fromCharCode(65 + ci)}
                        </span>
                        <span className="flex-1">{c.text}</span>
                        {shown && isCorrect ? (
                          <Check className="mt-0.5 h-4 w-4 text-accent" />
                        ) : shown && isPicked ? (
                          <X className="mt-0.5 h-4 w-4 text-destructive" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {shown && q.explanation ? (
                <p className="mt-3 rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  {q.explanation}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" /> Retake
        </Button>
        {submitted || allAnswered ? (
          <div className="text-right">
            <p className="font-serif text-2xl">
              {correctCount} / {total}
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round((correctCount / Math.max(total, 1)) * 100)}%
            </p>
          </div>
        ) : (
          <Button onClick={() => setSubmitted(true)} variant="default">
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}
