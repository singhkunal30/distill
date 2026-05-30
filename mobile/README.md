# Distill mobile

Native iOS + Android client for Distill, built with Expo Router and
NativeWind. The server (this repo's root) is the source of truth — the
mobile app is just another client talking to its API.

## What's wired

- **Login** — passcode → bearer token in SecureStore.
- **Library** — list + currently-reading carousel + pull-to-refresh.
  Floating "+" opens Add Book.
- **Add Book** — Open Library search and paste-text. (Demo mode runs
  off seed fixtures; live mode hits Claude as soon as you switch off
  demo in the web Settings.)
- **Book detail** — Distill button (format/length/tone/audience picker
  with cost gating server-side), Listen button, in-flight JobProgress
  poller, Knowledge row (generate flashcards / quiz, view highlights).
- **Reader** — light / sepia / dark themes, font scale, long-press a
  section to save it as a highlight.
- **Audio player** — persistent mini-bar above the tab bar, tap to
  expand into a full sheet (speed 0.75–2x, prev/next, queue). Uses
  `expo-av` for MP3 tracks (real iOS background playback) and
  `expo-speech` for the browser-TTS-equivalent text fallback in demo
  mode. Playback position autosaves every 5s.
- **Review** — full SM-2 deck with Again/Hard/Good/Easy quality
  buttons. Reviews sync to the same SQLite as the web /review screen.
- **Quiz** — list per book, runner with instant feedback + explanations.
- **Highlights** — list per book with swipe-to-delete.
- **Settings tab** — sign out, shows the configured server URL.

## Running on your phone

```bash
# 1. Make sure the Distill server is running and reachable from your
#    phone. From the repo root:
npm run dev        # serves on http://localhost:3000

# 2. Find your laptop's LAN IP (macOS):
ipconfig getifaddr en0     # → e.g. 192.168.1.42

# 3. In mobile/, set the API URL:
cd mobile
cp .env.example .env
# then edit .env:
# EXPO_PUBLIC_DISTILL_API_URL=http://192.168.1.42:3000

# 4. Install and start.
npm install
npm start
```

Scan the QR code with the Expo Go app (iOS App Store / Google Play).

If your server has `DISTILL_PASSCODE` set, enter it on the login screen.
Otherwise leave the field empty and tap Unlock — the server returns a
token regardless so authenticated routes work.

## Production

Once you're deploying the server (Vercel / Render / Fly), set
`EXPO_PUBLIC_DISTILL_API_URL` to the HTTPS URL and run `eas build` for
iOS/Android binaries. EAS Build is free for personal projects and
handles signing for you.

## Architecture

| Layer    | Web                                      | Mobile                       |
| -------- | ---------------------------------------- | ---------------------------- |
| Routing  | Next.js App Router                       | Expo Router (file-based)     |
| Styling  | Tailwind + shadcn primitives             | NativeWind (Tailwind for RN) |
| State    | TanStack Query                           | TanStack Query (same)        |
| Auth     | HttpOnly cookie                          | Bearer token in SecureStore  |
| Audio    | Howler + SpeechSynthesis (browser)       | expo-av + expo-speech        |
| Storage  | Server (Prisma + SQLite)                 | Server (same)                |

Both clients talk to the same `/api/*` routes. The server is the
single source of truth for AI generation, cost guardrails, jobs, and
the database.
