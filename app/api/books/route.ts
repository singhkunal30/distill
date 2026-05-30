import { NextResponse } from 'next/server';
import {
  createBook,
  importFromOpenLibrary,
  importFromText,
} from '@/features/books/actions';

export const dynamic = 'force-dynamic';

// POST /api/books
// Body shape:
//   { mode: 'openlibrary', payload: OLBook }
//   { mode: 'manual',      title, authors[], year? }
//   { mode: 'text',        title, authors?, body, kind: 'md' | 'txt' }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.mode !== 'string') {
    return NextResponse.json({ error: 'mode required' }, { status: 400 });
  }

  try {
    if (body.mode === 'openlibrary') {
      const fd = new FormData();
      fd.set('payload', JSON.stringify(body.payload));
      const res = await importFromOpenLibrary(fd);
      return NextResponse.json(res);
    }

    if (body.mode === 'text') {
      const fd = new FormData();
      fd.set('title', String(body.title ?? ''));
      fd.set('authors', String(body.authors ?? ''));
      fd.set('body', String(body.body ?? ''));
      fd.set('kind', String(body.kind ?? 'md'));
      const res = await importFromText(fd);
      return NextResponse.json(res);
    }

    if (body.mode === 'manual') {
      const res = await createBook({
        title: String(body.title ?? ''),
        authors: Array.isArray(body.authors) ? (body.authors as string[]) : [],
        publishedYear:
          body.year != null && body.year !== '' ? Number(body.year) : null,
        sourceType: 'manual',
        genres: [],
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create book' },
      { status: 500 },
    );
  }
}
