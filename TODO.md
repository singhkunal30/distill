# Distill — TODO

Live punch list, organised by phase. Each entry includes the **exact
next step** so future-me (or future-Claude) can pick it up cold.

---

## ✅ Phase 1 — Foundation (DONE)

Library, importers, settings, cost guardrails, mobile shell, PWA scaffold,
onboarding. See README for what shipped.

## ✅ Phase 2 — Summaries (DONE)

- Job runner: `lib/jobs/runner.ts`. Polling worker in-process, leased by
  `leasedAt`; stale leases (>60s) reclaimed on boot. 3 attempts with
  exponential backoff (2s/8s/30s), then a `FailedJob` row. Booted lazily
  from `(app)` and `read` layouts via `ensureWorkerStarted`.
- Anthropic provider: `lib/ai/providers/anthropic.ts`, wrapped in
  `withCostGuard`. Outputs include actual token counts; JSON parser is
  tolerant of fenced/wrapped responses.
- Summary pipeline: `lib/jobs/handlers/summary.ts`. Chunks source (~21k
  chars/chunk), map step extracts bullets via Sonnet 4.6, reduce step
  composes final sections via Opus 4.7. Resumable via
  `completedSteps`.
- Demo path: reads `lib/demo/fixtures/<bookId>.json` and persists
  directly, logging via `logDemoUsage`. Every fixture format is wired.
- Cost-confirmation dialog: `components/ui/cost-confirm-dialog.tsx`.
  Demo mode shows a "free" banner; live mode shows estimate + warning
  above $1.
- Distill dialog: format/tone/length/audience picker → estimate →
  confirm → enqueue.
- Reader UI: `app/read/[id]/[format]/page.tsx`, standalone (no shell).
  Theme switcher (light/sepia/dark), font scale, zen mode, keyboard
  shortcuts (+/-/z), section-level edit + per-section regenerate,
  version history sheet.
- Failed-jobs panel: `features/jobs/failed-jobs-panel.tsx` mounted in
  Settings. One-click retry.
- Job progress polling: `features/summaries/job-progress.tsx`. 1s poll
  via `/api/jobs`; auto-refreshes the page when a job completes.
- Integration test: `lib/jobs/handlers/summary.test.ts` with 5 cases —
  demo path, missing fixture, live single-chunk, live chunked
  map/reduce + resume, snapshot-on-replace.

### Phase 2 polish carryover

- [ ] **Goodreads CSV importer**. Add `lib/importers/goodreads.ts`
  parsing the standard export columns. Add a tab to
  `AddBookButton`.
- [ ] **SSE-based job progress** instead of polling once we have a
  long-running job whose progress updates a lot (Phase 3 TTS will need
  this; revisit then).
- [ ] **Sectioned diff in version history**. Today restore is "swap all
  sections". A diff view that highlights only changed sections would
  make manual restores feel safer.
- [ ] **Cancel button on in-flight jobs**. The DB column exists; the UI
  doesn't expose it yet. Add a kebab next to JobProgress with "Pause"
  (sets `status='paused'`) and "Cancel" (sets `status='failed'` +
  records into FailedJob with a synthetic 'cancelled' error).

---

## ⏳ Phase 3 — Audio (build fully)

- [ ] **TTS providers**: `lib/ai/providers/tts/openai.ts` and
  `…/elevenlabs.ts`. Same `withCostGuard` wrapper. Write MP3 to
  `public/audio/<sha256(text+voice+model)>.mp3`. Content-addressed so
  re-narration of the same section returns the existing track.
- [ ] **TTS handler**: register in `lib/jobs/runner.ts` HANDLERS map.
  Step: enumerate sections, narrate each, write AudioTrack rows.
- [ ] **"Listen" button** on book/reader pages enqueues a `tts` job
  for the visible summary.
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
  select text → save highlight. Hot key `h` is reserved in the reader
  shortcut map.
- [ ] **SM-2 implementation** in `lib/srs/sm2.ts` with unit tests
  (Vitest). The math is the part most likely to silently rot — tests
  are mandatory.
  - Next step: `lib/srs/sm2.ts` exporting `schedule(card, quality)`
    returning `{ ease, intervalDays, dueAt }`. Test with the canonical
    SM-2 examples (q=5 streak, q=2 fail/reset).
- [ ] **Flashcard generation job** in the pipeline (register handler).
- [ ] **Daily review screen** (`/review`): top of the queue,
  mobile-friendly swipe.
- [ ] **Quiz (multiple-choice only)** generation + UI.

---

## 📋 Phase 5 — Intelligence (scaffold + one working version)

- [ ] **Embeddings providers**:
  - `lib/ai/embeddings/openai.ts` — text-embedding-3-small via OpenAI SDK.
  - `lib/ai/embeddings/local.ts` — Transformers.js + bge-small-en-v1.5.
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
  flashcard is reviewed. Rate-limit (1 event per minute per kind).
- [ ] **Streak calculator** + calendar heatmap component.
- [ ] **Goals UI**: read/set rows in the `Goal` table.
- [ ] **Achievement engine**: nightly job re-evaluates conditions and
  sets `unlockedAt`.

---

## 📋 Phase 7 — Polish (build fully)

- [ ] Migrate `public/sw.js` stub to **Serwist**:
  - `npm i -D @serwist/next serwist`. Wrap `next.config.mjs` with
    `withSerwist`. Strategies: `NetworkFirst` for HTML, `CacheFirst`
    for `/audio/*` and `/icons/*`, `StaleWhileRevalidate` for OL
    covers.
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

- [ ] One E2E smoke test (Playwright):
  add book → demo-mode summary → highlight → flashcard review. Run via
  `npm run test:e2e`.
- [ ] Backup/restore endpoint: `npm run db:backup` zips the SQLite file
  plus `public/audio/` and `lib/demo/fixtures/`. Restore is the inverse.
- [ ] Move `scripts/smoke.ts` out of the repo or into a `scripts/`
  folder marked as dev-only (currently a working stash file).
