# Distill — cost estimates

Distill calls four families of services. This page documents the
indicative cost of each, the per-book/per-month math, and how the in-app
guardrails translate.

> Prices change. The pricing tables live in `lib/ai/pricing.ts` — update
> there if a provider moves and the cost-guard will follow.

## Provider rates (USD)

### Anthropic — `claude-opus-4-7`
| Direction | Per 1M tokens |
| --------- | -------------- |
| Input     | $15            |
| Output    | $75            |

### Anthropic — `claude-sonnet-4-6`
| Direction | Per 1M tokens |
| --------- | -------------- |
| Input     | $3             |
| Output    | $15            |

### Anthropic — `claude-haiku-4-5-20251001`
| Direction | Per 1M tokens |
| --------- | -------------- |
| Input     | $1             |
| Output    | $5             |

### OpenAI embeddings
| Model                     | Per 1M tokens |
| ------------------------- | -------------- |
| text-embedding-3-small    | $0.02          |
| text-embedding-3-large    | $0.13          |

### OpenAI TTS
| Model      | Per 1M characters |
| ---------- | ----------------- |
| tts-1      | $15               |
| tts-1-hd   | $30               |

### ElevenLabs
≈ $0.30 per 1k characters on the Starter tier.

### Local
Embeddings via Transformers.js + bge-small: **$0**, runs in-process,
~30 MB model download.

## What things cost

These figures assume default Distill settings. The cost-guard sums them
up and asks for confirmation when a single job > $0.50 (configurable
under Settings → Cost guardrails).

### Per-book costs (one-time, on import)

| Step                          | Model                 | Typical cost | Notes |
| ----------------------------- | --------------------- | ------------ | ----- |
| Blink summary (8–12 sections) | claude-opus-4-7       | ~$0.20       | Bigger books cost more; capped by chunked summarization. |
| Key insights, applications    | claude-sonnet-4-6     | ~$0.03       | Reuses the blink output as context. |
| TL;DR + detailed breakdown    | claude-sonnet-4-6     | ~$0.06       | |
| Embeddings (summary + sections) | bge-small (local)   | $0           | Switch to `text-embedding-3-small` in Settings for higher quality. |
| Flashcard generation          | claude-sonnet-4-6     | ~$0.02       | ~15 cards. |
| Quiz generation               | claude-sonnet-4-6     | ~$0.02       | |
| TTS narration (full book summary, OpenAI tts-1) | tts-1 | ~$0.10 | ~7,000 characters of audio. |
| **Full distill (one book)**   |                       | **~$0.40**   | Bumps to ~$1 if you also narrate detailed breakdown. |

### Per-month, modest usage

10 new books, 100 chat messages, daily flashcard review:

| Bucket              | Cost      |
| ------------------- | --------- |
| Summaries × 10      | ~$4.00    |
| TTS × 10            | ~$1.00    |
| Chat (sonnet-4-6)   | ~$0.50    |
| Embeddings (local)  | $0        |
| **Total**           | **~$5.50**|

Default budget cap is **$25/month**, generous headroom for this profile.

## In-app guardrails

- **Demo mode** (default): every call short-circuits. Always $0.
- **Monthly budget cap**: `Settings → Cost guardrails`. The next paid
  call that would exceed the cap is refused with a `budget_exceeded`
  error and a banner explaining how to override.
- **Per-job confirmation threshold**: jobs estimated above the threshold
  surface a confirmation dialog with the exact estimate (token/char
  breakdown). You click Confirm to proceed.
- **Cost-aware model selection**: cheap classification (tagging, quick
  helpers) uses Haiku 4.5; default chat uses Sonnet 4.6; only the
  flagship summary endpoint uses Opus 4.7.
- **API Usage page** (Stats): every call logged with timestamp, model,
  tokens, cost, feature. Demo runs are flagged.

## Updating prices

When a provider changes rates:

1. Edit the tables in `lib/ai/pricing.ts`.
2. Update the numbers above so this doc stays honest.
3. Existing `ApiUsageLog.estimatedUsd` and `actualUsd` rows are not
   rewritten — they reflect what we charged at the time.
