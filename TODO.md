# Distill — TODO

Live punch list, organised by phase. Each entry includes the **exact
next step** so future-me (or future-Claude) can pick it up cold.

---

## 🟢 Mobile (Phase 1–4 parity, demo-mode ready)

The web app and mobile app are now feature-equivalent for the
flows that matter day to day. Mobile is built on Expo Router +
NativeWind + TanStack Query + SecureStore, talks to the same Next.js
backend, and authenticates via Bearer token.

Done:
- Server: Bearer-token auth, CORS preflight + origin reflection on
  `/api/*`, and a mobile-shaped REST surface — `/api/library`,
  `/api/books`, `/api/books/[id]`, `/api/books/openlibrary`,
  `/api/summaries`, `/api/summaries/[id]`, `/api/tts`,
  `/api/audio/queue`, `/api/playback`, `/api/flashcards`,
  `/api/flashcards/[id]/review`, `/api/quizzes`, `/api/quizzes/[id]`,
  `/api/highlights`, `/api/highlights/[id]`, `/api/jobs`.
- Mobile screens: Login, Library + currently-reading carousel + FAB
  → Add Book, Add Book (Open Library search + paste text),
  Book detail (Distill + Listen + JobProgress + flashcard / quiz /
  highlights actions), Reader (light/sepia/dark + long-press →
  highlight), Review (full SM-2 deck), Quiz runner, Highlights list,
  Settings (sign-out).
- Audio: persistent mini-bar + expanded sheet, `expo-av` for MP3,
  `expo-speech` for the text fallback (demo mode). Real iOS
  background playback configured via the audio mode.

Still pending:
- [ ] EPUB/PDF upload in mobile via `expo-document-picker` (web
  already handles it; defer until needed).
- [ ] Section-level editing + regenerate inside the mobile reader
  (web has it).
- [ ] EAS Build config (`eas.json`) for TestFlight / Play Internal
  Testing.
- [ ] Production deployment of the server (Vercel / Render / Fly) so
  the mobile app works over HTTPS without LAN access.

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

## ✅ Phase 3 — Audio (DONE)

- TTS providers: `lib/ai/providers/tts/openai.ts` and `…/elevenlabs.ts`,
  both behind a common `TTSProvider` interface (`tts/types.ts`) and
  wrapped in `withCostGuard`. Selection in `tts/index.ts` reads from
  Settings. ElevenLabs uses `/with-timestamps` so its tracks carry
  word-level alignment for karaoke sync.
- MP3s are content-addressed by `sha256(provider|model|voice|text)`,
  written to `public/audio/<hash>.mp3`. Re-narration of identical
  content is free.
- `runTtsJob` (`lib/jobs/handlers/tts.ts`): per-section narration with
  resumability via `completedSteps` (skips already-narrated sections,
  skips on cache hit via the AudioTrack unique constraint).
- Demo mode: TTS jobs short-circuit and return a "browser TTS"
  progress note. The client-side player drives `window.speechSynthesis`
  directly using the section's plain text — no API spend, works on
  iOS/Android.
- `/api/audio/queue?summaryId=…` resolves a flat queue: each section
  either has a `url` (MP3) or `text` (browser-TTS fallback), plus
  word `timings` if available and saved playback position per track.
- Player: Zustand store + invisible `AudioEngine` driving Howler.js for
  MP3 and `SpeechSynthesisUtterance` for browser-TTS. Mini-bar pinned
  above the mobile nav (or the desktop bottom), tappable to expand
  into a full Spotify-style sheet with: speed 0.75–3x, ±15s seek,
  prev/next, sleep timer (5/15/30/60 min), queue list, karaoke
  highlight when timings exist.
- PlaybackPosition autosaved every 5s + on track change.
- Listen button is wired on the book detail page and in the reader
  header. If every section already has a track (or demo mode has
  text), it queues immediately; otherwise it shows the cost
  confirmation and enqueues a TTS job, polling until tracks land.

### Phase 3 polish carryover

- [ ] **Offline audio cache** with Serwist (lands in Phase 7). The
  audio URLs (`/audio/*.mp3`) are content-addressed so a `CacheFirst`
  strategy in the SW is trivial.
- [ ] **Per-summary "narrate all" status** on the book page (e.g.
  "5 of 12 sections narrated"). Today the player polls; the book page
  doesn't show progress unless the JobProgress card is visible.
- [ ] **OpenAI TTS timings**: OpenAI doesn't expose alignment from
  `audio.speech.create`. To support karaoke for OpenAI, run a Whisper
  pass on the MP3 and stash word timings. Defer until needed.

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
