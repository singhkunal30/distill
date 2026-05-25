# Distill

> The essence of every book.

A personal, local-first book-summary app. Distill takes the books you read,
extracts their essence — blink-style summaries, key insights, audio
narration, highlights, spaced-repetition flashcards, semantic search — and
keeps it all within reach on any device.

This repository tracks Distill across seven build phases. **Phase 1 is
complete** (library, importers, settings, cost guardrails, brand,
mobile-first PWA shell). Phases 2–7 land iteratively. See
[`TODO.md`](./TODO.md) for status by phase.

## Quick start

```bash
# 1. Install deps & generate the Prisma client.
npm install

# 2. Create the SQLite database from the schema.
DATABASE_URL="file:./distill.db" npx prisma db push

# 3. Seed 10 sample books, demo fixtures, achievements.
npm run seed

# 4. Run the app.
npm run dev
```

Open <http://localhost:3000>. The first launch shows a 3-screen
onboarding; afterward you land on Home.

## API keys (optional)

Distill boots in **demo mode** by default. Every AI call short-circuits
to a pre-cached fixture from the seed. You only need keys when you want
to switch to live generation.

Copy `.env.example` to `.env` and fill in whichever keys you have:

| Variable                | Used for                       | Required? |
| ----------------------- | ------------------------------ | --------- |
| `ANTHROPIC_API_KEY`     | Summaries, chat, flashcards    | optional  |
| `OPENAI_API_KEY`        | TTS, optional embeddings        | optional  |
| `ELEVENLABS_API_KEY`    | Alternative TTS provider        | optional  |
| `DISTILL_PASSCODE`      | Passcode gate for non-localhost | optional  |
| `DISTILL_SESSION_SECRET`| HMAC for the session cookie     | required *if* passcode set |
| `DISTILL_FORCE_DEMO_MODE` | Hard-force demo regardless    | optional  |
| `DISTILL_MONTHLY_BUDGET_USD` | Override monthly cap       | optional, default $25 |

See `.env.example` for the full list including model overrides and
provider preferences.

### Switching to live mode

1. Add your keys to `.env`.
2. Open **Settings → Cost guardrails → Demo mode** and toggle it off.
3. The first generation will show a cost-estimate confirmation; this is
   the cost guardrail at work.

## What costs what

See [`COSTS.md`](./COSTS.md) for current per-book and per-month estimates
broken down by feature.

## How the architecture is laid out

See [`ARCHITECTURE.md`](./ARCHITECTURE.md). The short version:

- Next.js 14 App Router, Tailwind, shadcn-style primitives.
- Prisma + SQLite, one file at `prisma/distill.db`.
- All AI calls go through `lib/ai/cost-guard.ts`. Demo mode short-circuits
  before any provider runs; budget caps and per-job confirmation gate the
  rest. Every call is logged to `ApiUsageLog`.
- Mobile-first PWA shell with a desktop sidebar.

## Mobile install

After `npm run dev` (or a deployed build), open the app in mobile
Safari/Chrome and use **Add to Home Screen**. The manifest, theme color,
and apple-touch-icon are wired so the install promotes correctly.

If you reach the app from outside localhost (LAN, Tailscale, Vercel),
set `DISTILL_PASSCODE=…` and `DISTILL_SESSION_SECRET=…` to gate access
with a passcode.

## Scripts

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Next.js dev server                             |
| `npm run build`     | Production build                               |
| `npm run start`     | Run the production build                       |
| `npm run lint`      | Next/ESLint                                    |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run db:push`   | Apply schema to SQLite (Prisma)                |
| `npm run db:studio` | Open Prisma Studio                             |
| `npm run db:reset`  | **Destructive.** Drops DB and re-runs seed.    |
| `npm run seed`      | Seed the library + demo fixtures               |
| `npm run test`      | Vitest                                         |

## Status

- ✅ **Phase 1 — Foundation** (this commit): library, importers,
  settings, cost guardrails, mobile shell, PWA scaffold, onboarding.
- ⏳ **Phases 2–3**: summaries + audio (build fully).
- 📋 **Phases 4–7**: scaffolded; see `TODO.md` for the punch list.

## Brand

- **Name**: Distill
- **Tagline**: The essence of every book.
- **Mark**: A stylised "D" droplet (`components/brand/wordmark.tsx`).
- **Palette**: Warm off-white background, deep navy primary, amber
  accent. Sepia is a separate variant used in the reader.
