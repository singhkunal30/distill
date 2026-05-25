# Distill — architecture

A single-user, local-first reading app. Optimised for one person, but
written like a small production-grade application.

## Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  app/                  Next.js App Router pages & route handlers │
│  features/             Feature-level UI, hooks, server actions   │
│  components/           Reusable UI primitives + brand            │
│  lib/                  Framework-agnostic business logic         │
│    lib/ai/             Cost-guard, pricing, providers, budget    │
│    lib/importers/      PDF / EPUB / URL / text ingestion         │
│    lib/auth.ts         Passcode + session helpers                │
│    lib/db.ts           Prisma client singleton                   │
│    lib/settings.ts     Typed Settings table accessor             │
│    lib/openlibrary.ts  Open Library client                       │
│    lib/demo/           Pre-cached fixtures for demo mode         │
│  prisma/               Schema, seed, generated client            │
│  middleware.ts         Passcode gate (no-op when unset)          │
└──────────────────────────────────────────────────────────────────┘
```

## The cost-guard invariant

Every paid call in Distill flows through `lib/ai/cost-guard.ts`. The
guard:

1. **Short-circuits if demo mode is on.** No provider invocation; instead
   the caller falls back to a fixture and reports via `logDemoUsage`.
2. **Checks the missing-key case.** Returns a typed error so the UI can
   point you at Settings.
3. **Checks the monthly budget cap.** If the call would exceed the cap,
   refuses with `CostGuardError('budget_exceeded')`.
4. **Checks the per-job confirmation threshold** (default $0.50). Calls
   above it must arrive with `confirmed: true`; the UI shows a cost
   dialog and only retries when the user clicks Confirm.
5. **Logs the call to `ApiUsageLog` before and after**, so even failed
   calls leave a trace.

No code path bypasses this. New providers added in later phases plug into
the same wrapper.

## Generation jobs

Long-running AI work runs as `GenerationJob` rows.

- Lifecycle: `pending → generating → completed | failed | paused`.
- Each job carries its own `params`, `progress` (0–100), `progressNote`,
  and `completedSteps` (JSON array of sub-step ids). The worker writes
  these atomically so a crash mid-job is resumable: on restart, jobs
  with `status='generating'` and a stale `leasedAt` are picked up where
  they left off.
- Failures move to `FailedJob` for one-click retry from the
  Settings → Failed jobs panel (Phase 2 wires the panel).
- Phase 1 ships the table, indexes, and the lease mechanic. The worker
  loop lands in Phase 2.

## Demo mode

Demo mode is the application's calm default. It does three things:

1. **Disables all live AI provider calls** (cost-guard short-circuits).
2. **Serves seed fixtures from `lib/demo/fixtures/<bookId>.json`** for
   any summary/highlight/flashcard request.
3. **Still logs to `ApiUsageLog`** with `demoMode=true`, so the Stats
   page accurately shows "what this would have cost".

Toggle: `DISTILL_FORCE_DEMO_MODE=true` (env hard-force) or
`Settings → Demo mode` (user-toggleable, persisted in `Setting`).

## Auth

Three modes, by environment:

- **No auth (default)**: `DISTILL_PASSCODE` unset → the middleware is a
  no-op. Localhost dev experience.
- **Passcode gate**: `DISTILL_PASSCODE=…` and
  `DISTILL_SESSION_SECRET=…` → the middleware redirects unauthenticated
  visitors to `/login`. Used when you install the PWA on your phone and
  reach the server over LAN/Tailscale/Vercel.

Cookies are HTTP-only, `SameSite=Lax`, 30-day TTL, signed with HMAC-SHA256
over `ok.{timestamp}`. Verified in `lib/auth.ts`.

## Storage

- **SQLite via Prisma** at `prisma/distill.db`. One file, easy to back up
  with `cp`. The full schema covers every phase; later features just
  start writing rows.
- **Embeddings** live as JSON columns on their owning rows. For <10k
  vectors, in-memory cosine similarity is faster than maintaining a
  separate vector DB. Implementation plan in Phase 5.
- **Audio** files are written to `public/audio/<hash>.mp3`. Content
  addressed so identical narration is cached. Phase 3.
- **Uploads** (the source bytes of PDF/EPUB) are not retained after
  parsing — Distill keeps the extracted markdown in `Book.contentMd`
  instead.

## Frontend

- Tailwind with three theme classes on `<html>`: `dark`, `sepia` (used
  by the reader), and none (light). System preference is honoured.
- shadcn-style primitives in `components/ui/`. Hand-rolled (no
  generator), all forwardRef'd, Radix-backed where interactive.
- TanStack Query provider in `app/providers.tsx` for client-side data.
- Mobile-first: bottom nav at <768px, sidebar at ≥768px.

## Why these decisions

- **Why not next-pwa?** Effectively unmaintained for App Router. Phase 7
  uses Serwist instead. Phase 1 just registers `/sw.js` (a pass-through)
  so the install prompt works on iOS Safari.
- **Why a single big Prisma migration?** Avoids seven rounds of schema
  thrash during development. Empty tables cost nothing in SQLite.
- **Why no Redis/BullMQ?** Single user, single process. Jobs in the DB,
  worker polls every 2s, lease + completedSteps make it resumable. We'd
  add Redis only if multiple workers ever became a thing.
- **Why server actions, not /api/?** For pure CRUD they're terser and
  reuse Zod schemas with the form. Streaming (Phase 2 onward) uses route
  handlers.
