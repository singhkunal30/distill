import { prisma } from '@/lib/db';

export async function getSummaryTracks(summaryId: string) {
  const summary = await prisma.summary.findUnique({
    where: { id: summaryId },
    include: { sections: { orderBy: { position: 'asc' } } },
  });
  if (!summary) return null;
  const tracks = await prisma.audioTrack.findMany({
    where: {
      scope: 'section',
      scopeId: { in: summary.sections.map((s) => s.id) },
    },
  });
  const trackBySection = new Map(tracks.map((t) => [t.scopeId, t]));
  return {
    summary,
    tracks: summary.sections.map((s) => ({
      sectionId: s.id,
      heading: s.heading,
      body: s.body,
      position: s.position,
      track: trackBySection.get(s.id) ?? null,
    })),
  };
}

export async function getPlaybackPosition(bookId: string, trackId: string) {
  return prisma.playbackPosition.findUnique({
    where: { bookId_trackId: { bookId, trackId } },
  });
}
