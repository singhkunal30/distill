# Distill — TODO

Live punch list, organised by phase. Each entry includes the **exact
next step** so future-me (or future-Claude) can pick it up cold.

---

## ✅ Phase 1 — Foundation (DONE)

Library, importers, settings, cost guardrails, mobile shell, PWA scaffold,
onboarding. See README for what shipped.

Known gaps still to clean up in Phase 1 polish (do before declaring done):

- [ ] Failed-jobs UI panel under Settings (table exists, no UI yet).
- [ ] Cost-confirmation dialog primitive — used by Phase 2.
  - Next step: `components/ui/cost-confirm-dialog.tsx`. Show estimate,
    breakdown of tokens/chars, monthly budget bar, Confirm/Cancel.
- [ ] Goodreads CSV importer (was on the spec, deferred from Phase 1).
  - Next step: add `lib/importers/goodreads.ts`, parse standard export
    columns (`Title, Author, ISBN, My Rating, Date Read, Bookshelves`),
    map each row to a `createBook` call. Add a "Goodreads CSV" tab to
    `AddBookButton`.

---

## ⏳ Phase 2 — Summaries (build fully)

- [ ] **Job runner**: `server/jobs/worker.ts` polling
  `GenerationJob` every 2s. Lease via `leasedAt` row update. On boot,
  pick up rows with stale leases. Spawn from `instrumentation.ts` so it
  starts with the Next.js server.
- [ ] **Anthropic provider**: `lib/ai/providers/anthropic.ts` wrapping
  the SDK behind `withCostGuard`. Streams chunks back via SSE.
- [ ] **Summary generation pipeline** (`features/summaries/generate.ts`):
  1. Chunk `Book.contentMd` into ~6k-token segments.
  2. Map each chunk → bullet outline (Sonnet).
  3. Reduce outlines → final sections (Opus, gated by budget + format).
  4. Save `Summary` + `SummarySection` rows; embed in Phase 5.
  - Use `GenerationJob.completedSteps` to make this resumable per-chunk.
- [ ] **Demo-mode summary path**: if `settings.demoMode`, read
  `lib/demo/fixtures/<bookId>.json` and persist sections from there.
- [ ] **Distill dialog**: pick format, length, tone, audience. Show
  estimate. Wires to the cost-confirmation primitive.
- [ ] **Reader UI** (`app/(app)/book/[id]/read/page.tsx`): typography,
  sepia theme, font-scale, keyboard shortcuts (j/k/h, ?, [, ]).
- [ ] **Section editor + regenerate-one**: TipTap on each section,
  "regenerate" calls the pipeline with only that section's prompt.
- [ ] **Version history**: list of `SummaryVersion` rows, diff vs.
  current, one-click restore.
- [ ] **Failed-jobs panel** (carry-over).

---

## ⏳ Phase 3 — Audio (build fully)

- [ ] **TTS providers**: `lib/ai/providers/tts/openai.ts` and
  `…/elevenlabs.ts`. Same `withCostGuard` wrapper. Write MP3 to
  `public/audio/<sha256(text+voice+model)>.mp3`.
- [ ] **AudioTrack creation**: triggered from the reader ("Listen"
  button) per summary; queue downstream sections in the background.
- [ ] **Player** (`features/audio/player.tsx`): Howler.js, persistent
  on mobile (bottom-sheet), with play/pause, ±15s, speed 0.5–3x, queue,
  sleep timer.
- [ ] **PlaybackPosition** writes on `timeupdate` (debounced ~5s).
- [ ] **Karaoke sync (lite)**: when timings are present in
  `AudioTrack.timings`, highlight the current sentence in the reader.
- [ ] **Offline audio cache**: register the audio URL with Serwist's
  precache list (Phase 7 prereq), or download-and-store-in-IndexedDB on
  demand via Dexie.

**STOP** after Phase 3 — confirm with the user before continuing.

---

## 📋 Phase 4 — Knowledge (scaffold + one working version)

- [ ] **Highlight server actions** + a small overlay on the reader to
  select text → save highlight.
- [ ] **SM-2 implementation** in `lib/srs/sm2.ts` with unit tests
  (Vitest). The math is the part most likely to silently rot — tests
  are mandatory.
  - Next step: `lib/srs/sm2.ts` exporting `schedule(card, quality)`
    returning `{ ease, intervalDays, dueAt }`. Test with the canonical
    SM-2 examples (q=5 streak, q=2 fail/reset).
- [ ] **Flashcard generation job** in the pipeline.
- [ ] **Daily review screen** (`/review`): top of the queue, mobile-friendly
  swipe.
- [ ] **Quiz (multiple-choice only)** generation + UI.

---

## 📋 Phase 5 — Intelligence (scaffold + one working version)

- [ ] **Embeddings providers**:
  - `lib/ai/embeddings/openai.ts` — text-embedding-3-small via OpenAI SDK.
  - `lib/ai/embeddings/local.ts` — Transformers.js + bge-small-en-v1.5,
    cached under `node_modules/@xenova/transformers/.cache` (dev) or
    `~/.cache/distill-models` (prod).
  - Both behind `EmbeddingsProvider` interface in
    `lib/ai/embeddings/index.ts`.
- [ ] **Embedding job kind**: walks Summary/Section/Highlight/Flashcard
  rows with null `embedding`, batches into provider-specific limits.
- [ ] **Cosine similarity index**: `lib/ai/similarity.ts` loads all
  embeddings into memory once per request (fine for <10k rows).
- [ ] **Semantic search** on `/search`: query → embed → top-k across
  all embedded rows, grouped by book.
- [ ] **Ask-the-book chat**: per-book session, retrieve top-k chunks
  from that book's summary/highlights, prompt Sonnet with citations.
  Persist `ChatMessage.citations` as JSON.
- [ ] **Cross-book linking (list view)** on a book's page: 5 most
  related ideas from other books.

---

## 📋 Phase 6 — Habits (scaffold + one working version)

- [ ] **Reading events**: write a `ReadingEvent` whenever the reader
  scrolls past 50% of a section, an audio track passes 60s, or a
  flashcard is reviewed. Use rate-limiting (1 event per minute per kind).
- [ ] **Streak calculator** + calendar heatmap component.
- [ ] **Goals UI**: read/set rows in the `Goal` table.
- [ ] **Achievement engine**: nightly job re-evaluates conditions and
  sets `unlockedAt`.

---

## 📋 Phase 7 — Polish (build fully)

- [ ] Migrate `public/sw.js` stub to **Serwist**:
  - Install: `npm i -D @serwist/next serwist`.
  - Wrap `next.config.mjs` with `withSerwist`.
  - Cache strategies: `NetworkFirst` for HTML, `CacheFirst` for
    `/audio/*` and `/icons/*`, `StaleWhileRevalidate` for OL covers.
- [ ] IndexedDB outbox via Dexie for offline highlights/notes — replay
  on reconnect.
- [ ] Virtualised library (react-virtual) once libraries exceed ~200
  books.
- [ ] Microinteractions pass (Framer Motion) on book cards, dialog
  enter/exit, reader page turns.
- [ ] Lighthouse > 90 audit pass.

---

## 📋 Phase 8 — Optional

- [ ] Mind map visualisation (force-directed graph of embedding
  clusters).
- [ ] Open-ended + matching quiz types.
- [ ] EPUB export of summaries.

---

## Misc

- [ ] Unit tests required before Phase 4 ships:
  - `lib/ai/cost-guard.test.ts` — demo short-circuit, budget cap,
    confirmation threshold.
  - `lib/srs/sm2.test.ts` — SM-2 schedule.
- [ ] One E2E smoke test (Playwright):
  add book → demo-mode summary → highlight → flashcard review. Run via
  `npm run test:e2e`.
- [ ] Backup/restore endpoint: `npm run db:backup` zips the SQLite file
  plus `public/audio/` and `lib/demo/fixtures/`. Restore is the inverse.
