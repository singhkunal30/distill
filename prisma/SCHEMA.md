# Distill — database schema

Every table that Distill will ever use lives in `schema.prisma`. Tables
for Phase 4+ are present from day one but inactive. This page documents
each table, its purpose, and the phase that activates it.

Single SQLite file at `prisma/distill.db`. Backup is a file copy.

## Phase 1 — library

### `Book`
The canonical row. One per book/article/note in the library.
- `sourceType`: `manual | txt | md | epub | pdf | url | metadata-only`.
- `contentMd`: cleaned Markdown body when we have one; null for
  metadata-only imports.
- `status`: workflow state — `to_read | reading | finished | archived`.
- Soft references to summaries, highlights, flashcards, etc.

### `Genre`, `BookGenre`
Many-to-many. Genres are upserted by name; lower-case display preserved.

### `Tag`, `BookTag`, `HighlightTag`
General-purpose user-defined tags.

### `Collection`, `CollectionBook`
Ordered playlists/collections (e.g. "Books that changed my mind").

## Phase 2 — summaries

### `Summary`
One row per `(book, format)` pair. Format is one of:
`blink | insights | detailed | tldr | applications`.
Stores model used, prompt version, generation timestamp.

### `SummarySection`
The 8–12 sections of a Blink-style summary, or chapter sections in a
Detailed Breakdown. Each has its own `contentHash` so per-section
regeneration only touches what changed.

### `SummaryVersion`
Snapshot of all sections at a moment in time. Used for "show history /
revert".

## Phase 3 — audio

### `AudioTrack`
One row per (scope, scopeId, voice, provider). Stores duration, the
local file URL, and optional word-level timings for karaoke-style sync.
Unique constraint prevents duplicates — re-narrating the same content
with the same voice returns the existing row.

### `PlaybackPosition`
Saved position per (book, track). Updated by the audio player.

## Phase 4 — knowledge

### `Highlight`, `Note`
Highlights belong to a book; notes can hang off a highlight or stand
alone. Tag via `HighlightTag`.

### `Flashcard`, `Review`
SM-2 spaced repetition. `Flashcard` keeps the current ease/interval/due.
`Review` is the immutable history.

### `Quiz`, `QuizQuestion`
Auto-generated quizzes per book. `QuizQuestion.kind` is one of
`multiple_choice | open_ended | matching`. The shape of `payload`
depends on `kind`.

## Phase 5 — intelligence

### `ChatSession`, `ChatMessage`
Per-book or library-wide chat with RAG citations. `citations` is a JSON
array of `{ kind, refId, snippet }` so links back to the source resolve
correctly.

Embeddings live on the rows they describe (`Summary.embedding`,
`SummarySection.embedding`, `Highlight.embedding`, `Flashcard.embedding`)
as JSON-encoded float arrays.

## Phase 6 — habits

### `ReadingEvent`
Append-only stream — open/read/listen/highlight/review/finish.
The streak calendar and stats dashboard read from here.

### `Achievement`
Defined in seed; `unlockedAt` set when earned.

### `Goal`
One row per goal kind (`minutes_per_day`, `books_per_month`, …).

## Always-on infrastructure

### `Setting`
JSON-encoded values keyed by a fixed enum. `lib/settings.ts` is the only
typed accessor.

### `ApiUsageLog`
Every paid call. Includes `demoMode` flag so demo runs are visible but
don't count against the budget. Indexed by `(provider, feature)` and
`createdAt`.

### `GenerationJob`
The resumable-job table. The cost-guard creates the `ApiUsageLog` row;
the job orchestrator owns the `GenerationJob` row. `leasedAt` is the
worker's lease (stale leases get re-queued).

### `FailedJob`
A snapshot at failure for the Settings → Failed jobs panel.
`retriedJobId` is set after a retry has been enqueued.

## Indexes

Created indexes (see schema):

- `Book(status)`, `Book(createdAt)`, `Book(title)` — library views.
- `Summary(bookId)`, `SummarySection(summaryId, position)` — reader.
- `Flashcard(dueAt)` — daily review query.
- `ApiUsageLog(createdAt)`, `ApiUsageLog(provider, feature)` — stats.
- `GenerationJob(status, kind)`, `GenerationJob(leasedAt)` — worker.
