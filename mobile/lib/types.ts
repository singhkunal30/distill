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

export type OLHit = {
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  isbn: string | null;
  openLibraryId: string;
  subjects: string[];
};

export type JobStatus = {
  job: {
    id: string;
    kind: string;
    status: 'pending' | 'generating' | 'completed' | 'failed' | 'paused';
    progress: number;
    progressNote: string | null;
    error: string | null;
  } | null;
};

export type AudioQueueItem = {
  id: string;
  sectionId: string;
  trackId: string | null;
  url: string | null;
  text: string | null;
  bookId: string;
  summaryId: string;
  title: string;
  subtitle: string;
  durationMs: number;
  timings: { word: string; startMs: number; endMs: number }[] | null;
  savedPositionMs: number;
  savedSpeed: number;
};

export type AudioQueueResponse = { queue: AudioQueueItem[] };

export type DueCard = {
  id: string;
  front: string;
  back: string;
  bookId: string;
  bookTitle: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
};

export type QuizPayload = {
  quiz: {
    id: string;
    bookId: string;
    title: string;
    questions: {
      id: string;
      prompt: string;
      kind: string;
      choices: { text: string; correct: boolean }[];
      explanation: string | null;
      position: number;
    }[];
  };
};

export type Highlight = {
  id: string;
  text: string;
  color: string | null;
  locator: string | null;
  createdAt: string;
};
