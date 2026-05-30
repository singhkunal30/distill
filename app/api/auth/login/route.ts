import { NextResponse } from 'next/server';
import { checkPasscode, signIn, passcodeEnabled, issueToken } from '@/lib/auth';

export async function POST(req: Request) {
  if (!passcodeEnabled()) {
    // No-op auth → return a token anyway so mobile clients can store
    // *something* and treat themselves as authenticated.
    return NextResponse.json({ ok: true, token: issueToken() });
  }
  const body = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (typeof body.passcode !== 'string' || !checkPasscode(body.passcode)) {
    return NextResponse.json({ error: 'Wrong passcode' }, { status: 401 });
  }
  // Web → HttpOnly cookie. Mobile → reads `token` from the JSON.
  const token = await signIn();
  return NextResponse.json({ ok: true, token });
}
