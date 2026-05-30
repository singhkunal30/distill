'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListChecks, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { startQuizJob } from './actions';

type Quiz = { id: string; title: string; questionCount: number; createdAt: Date };

export function QuizSection({
  bookId,
  quizzes,
  hasSummary,
}: {
  bookId: string;
  quizzes: Quiz[];
  hasSummary: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const startGen = async () => {
    if (!hasSummary) {
      toast.push({
        title: 'Distill a summary first',
        description: 'Quizzes draw from a summary. Run Distill on this book first.',
        variant: 'destructive',
      });
      return;
    }
    setPending(true);
    try {
      await startQuizJob({ bookId });
      toast.push({
        title: 'Composing quiz…',
        description: 'It will appear here in a moment.',
      });
      router.refresh();
    } catch (err) {
      toast.push({
        title: 'Could not start',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-accent" /> Knowledge check
        </CardTitle>
        <CardDescription className="text-xs">
          Multiple-choice questions drawn from your summary.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {quizzes.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card/40 p-4 text-center text-sm text-muted-foreground">
            No quizzes generated yet.
          </div>
        ) : (
          <ul className="space-y-1">
            {quizzes.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/book/${bookId}/quiz/${q.id}`}
                  className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">{q.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {q.questionCount} questions
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={startGen} disabled={pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : quizzes.length > 0 ? (
              <RefreshCcw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {quizzes.length > 0 ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
