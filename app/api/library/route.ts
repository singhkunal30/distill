import { NextResponse } from 'next/server';
import { listBooks } from '@/features/books/queries';
import { countDueFlashcards } from '@/features/flashcards/queries';
import { getBudgetStatus } from '@/lib/ai/budget';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * Aggregated library endpoint for the mobile client. Returns enough
 * to render Library + Home in one round-trip.
 */
export async function GET() {
  const [books, dueCount, budget, settings] = await Promise.all([
    listBooks(),
    countDueFlashcards(),
    getBudgetStatus(),
    getSettings(),
  ]);
  return NextResponse.json({
    books: books.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      authors: b.authors,
      coverUrl: b.coverUrl,
      status: b.status,
      rating: b.rating,
      publishedYear: b.publishedYear,
      genres: b.genres,
      sourceType: b.sourceType,
      hasContent: b.hasContent,
      createdAt: b.createdAt.toISOString(),
    })),
    dueCount,
    budget: {
      monthSpendUsd: budget.monthSpendUsd,
      monthBudgetUsd: budget.monthBudgetUsd,
      remainingUsd: budget.remainingUsd,
      demoMode: settings.demoMode,
    },
  });
}
