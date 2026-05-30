import { NextResponse } from 'next/server';
import { searchBooks } from '@/lib/openlibrary';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Number(searchParams.get('limit') ?? '12');
  if (!q) return NextResponse.json({ hits: [] });
  const hits = await searchBooks(q, Math.min(20, Math.max(1, limit)));
  return NextResponse.json({ hits });
}
