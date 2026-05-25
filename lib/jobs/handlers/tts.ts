import { createHash } from 'crypto';
import { mkdir, writeFile, access } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { selectTTSProvider } from '@/lib/ai/providers/tts';
import type { JobContext } from '../types';

const Params = z.object({
  summaryId: z.string(),
  voice: z.string().optional(),
});

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

async function ensureAudioDir() {
  try {
    await access(AUDIO_DIR);
  } catch {
    await mkdir(AUDIO_DIR, { recursive: true });
  }
}

// Content-addressed filename: same text + voice + model + provider → same file.
// Means re-narrating the same section is free.
function audioFilename(opts: {
  text: string;
  voice: string;
  model: string;
  provider: string;
}): string {
  const h = createHash('sha256');
  h.update(`${opts.provider}|${opts.model}|${opts.voice}|${opts.text}`);
  return `${h.digest('hex').slice(0, 32)}.mp3`;
}

export async function runTtsJob(ctx: JobContext): Promise<void> {
  const params = Params.parse(ctx.params);
  const settings = await getSettings();

  if (settings.demoMode) {
    // Demo mode produces no MP3s — the client-side player uses browser
    // SpeechSynthesis on the raw section text instead. The job exists
    // only to keep the UI flow consistent.
    await ctx.setProgress({ progress: 100, progressNote: 'Demo mode: browser TTS' });
    return;
  }

  await ensureAudioDir();
  const provider = await selectTTSProvider();
  const voice = params.voice ?? provider.defaultVoice;

  const summary = await prisma.summary.findUniqueOrThrow({
    where: { id: params.summaryId },
    include: {
      book: true,
      sections: { orderBy: { position: 'asc' } },
    },
  });

  const completedSteps = new Set(ctx.completedSteps);

  await ctx.setProgress({
    progress: 1,
    progressNote: `Narrating ${summary.sections.length} sections`,
  });

  for (let i = 0; i < summary.sections.length; i++) {
    const section = summary.sections[i]!;
    const stepId = `section_${section.id}`;
    if (completedSteps.has(stepId)) continue;

    // Skip re-narration if an AudioTrack exists for this exact combo.
    const existing = await prisma.audioTrack.findUnique({
      where: {
        scope_scopeId_voice_provider: {
          scope: 'section',
          scopeId: section.id,
          voice,
          provider: provider.name,
        },
      },
    });
    if (existing) {
      completedSteps.add(stepId);
      await ctx.setProgress({
        progress: Math.round(((i + 1) / summary.sections.length) * 100),
        completedSteps: Array.from(completedSteps),
        progressNote: `Skipped section ${i + 1} (cached)`,
      });
      continue;
    }

    const narration = renderSectionForSpeech(section.heading, section.body);
    const res = await provider.synthesize({
      text: narration,
      voice,
      bookId: summary.bookId,
      jobId: ctx.jobId,
      confirmed: true,
    });
    const filename = audioFilename({
      text: narration,
      voice,
      model: res.model,
      provider: res.provider,
    });
    await writeFile(path.join(AUDIO_DIR, filename), res.mp3);
    await prisma.audioTrack.create({
      data: {
        bookId: summary.bookId,
        scope: 'section',
        scopeId: section.id,
        provider: res.provider,
        voice: res.voice,
        url: `/audio/${filename}`,
        durationMs: res.durationMs,
        timings: res.timings ? JSON.stringify(res.timings) : null,
      },
    });

    completedSteps.add(stepId);
    await ctx.setProgress({
      progress: Math.round(((i + 1) / summary.sections.length) * 100),
      progressNote: `Section ${i + 1} of ${summary.sections.length} narrated`,
      completedSteps: Array.from(completedSteps),
    });
  }
}

// Strip markdown for TTS — leading bullets become natural pauses,
// inline emphasis is collapsed.
function renderSectionForSpeech(heading: string, body: string): string {
  const cleanBody = body
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '. ')
    .replace(/^\d+\.\s+/gm, '. ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return `${heading}. ${cleanBody}`;
}

export function estimateTtsUsd(opts: {
  textCharCount: number;
  provider: 'openai' | 'elevenlabs';
  model: string;
}): number {
  if (opts.provider === 'openai') {
    const rate = opts.model === 'tts-1-hd' ? 30 : 15;
    return (opts.textCharCount / 1_000_000) * rate;
  }
  return (opts.textCharCount / 1_000) * 0.3;
}
