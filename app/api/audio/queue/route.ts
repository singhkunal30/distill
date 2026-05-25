import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Returns a flat queue for a given summary, including saved playback
// positions per track so the client picks up where it left off.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const summaryId = searchParams.get('summaryId');
  if (!summaryId) {
    return NextResponse.json({ error: 'summaryId required' }, { status: 400 });
  }
  const summary = await prisma.summary.findUnique({
    where: { id: summaryId },
    include: {
      book: { select: { id: true, title: true } },
      sections: {
        orderBy: { position: 'asc' },
        select: { id: true, position: true, heading: true, body: true },
      },
    },
  });
  if (!summary) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tracks = await prisma.audioTrack.findMany({
    where: {
      scope: 'section',
      scopeId: { in: summary.sections.map((s) => s.id) },
    },
  });
  const positions = await prisma.playbackPosition.findMany({
    where: { bookId: summary.bookId, trackId: { in: tracks.map((t) => t.id) } },
  });
  const trackBySection = new Map(tracks.map((t) => [t.scopeId, t]));
  const positionByTrack = new Map(positions.map((p) => [p.trackId, p]));

  const queue = summary.sections.map((s) => {
    const track = trackBySection.get(s.id) ?? null;
    const position = track ? positionByTrack.get(track.id) ?? null : null;
    return {
      id: `${summary.id}:${s.id}`,
      sectionId: s.id,
      trackId: track?.id ?? null,
      url: track?.url ?? null,
      bookId: summary.bookId,
      summaryId: summary.id,
      title: s.heading,
      subtitle: summary.book.title,
      durationMs:
        track?.durationMs ??
        // Browser-TTS fallback: estimate from char count (avg 14 chars/sec).
        Math.round(((s.heading.length + s.body.length) / 14) * 1000),
      text: track ? null : sectionToSpeech(s.heading, s.body),
      timings: track?.timings ? JSON.parse(track.timings) : null,
      savedPositionMs: position?.positionMs ?? 0,
      savedSpeed: position?.speed ?? 1,
    };
  });

  return NextResponse.json({ queue });
}

function sectionToSpeech(heading: string, body: string): string {
  const clean = body
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '. ')
    .replace(/^\d+\.\s+/gm, '. ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return `${heading}. ${clean}`;
}
