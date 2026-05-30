// Shapes mirror the server's JSON payloads (kept in sync by hand for now;
// could be generated later via zod inference if it gets noisy).

export type BookListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  status: 'to_read' | 'reading' | 'finished' | 'archived';
  rating: number | null;
  publishedYear: number | null;
  genres: string[];
  sourceType: string;
  hasContent: boolean;
  createdAt: string; // ISO
};

export type LibraryResponse = {
  books: BookListItem[];
  dueCount: number;
  budget: {
    monthSpendUsd: number;
    monthBudgetUsd: number;
    remainingUsd: number;
    demoMode: boolean;
  };
};

export type BookDetailResponse = {
  book: BookListItem & {
    description: string | null;
    pageCount: number | null;
    isbn: string | null;
    contentChars: number | null;
    startedAt: string | null;
    finishedAt: string | null;
  };
  summaries: {
    id: string;
    format: 'blink' | 'insights' | 'detailed' | 'tldr' | 'applications';
    tone: string | null;
    length: string | null;
    audience: string | null;
    sectionCount: number;
    generatedAt: string | null;
  }[];
  flashcardCount: number;
  flashcardsDue: number;
  quizCount: number;
  highlightCount: number;
};

export type SummaryResponse = {
  summary: {
    id: string;
    format: string;
    tone: string | null;
    length: string | null;
    audience: string | null;
    modelUsed: string | null;
    generatedAt: string | null;
    book: { id: string; title: string; coverUrl: string | null; authors: string };
    sections: { id: string; position: number; heading: string; body: string }[];
  };
};

export type LoginResponse = { ok: boolean; token?: string; error?: string };
