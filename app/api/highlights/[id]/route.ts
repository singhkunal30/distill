import { NextResponse } from 'next/server';
import { deleteHighlight } from '@/features/highlights/actions';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteHighlight(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
