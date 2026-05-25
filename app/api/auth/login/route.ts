import { NextResponse } from 'next/server';
import { checkPasscode, signIn, passcodeEnabled } from '@/lib/auth';

export async function POST(req: Request) {
  if (!passcodeEnabled()) {
    return NextResponse.json({ ok: true });
  }
  const body = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (typeof body.passcode !== 'string' || !checkPasscode(body.passcode)) {
    return NextResponse.json({ error: 'Wrong passcode' }, { status: 401 });
  }
  await signIn();
  return NextResponse.json({ ok: true });
}
