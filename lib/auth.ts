import { createHmac, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';
import { env } from './env';

const COOKIE_NAME = 'distill_session';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days
// Mobile clients (Expo) send the same signed token as a Bearer header
// because cross-origin cookies are fiddly. The token format is identical
// to what we put in the cookie — same HMAC, same verifier.
const BEARER_PREFIX = 'Bearer ';

export function passcodeEnabled(): boolean {
  return env.passcode != null && env.passcode.length > 0;
}

function sign(payload: string): string {
  return createHmac('sha256', env.sessionSecret).update(payload).digest('hex');
}

function makeToken(): string {
  const payload = `ok.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [marker, ts, sig] = parts;
  if (!marker || !ts || !sig) return false;
  const expected = sign(`${marker}.${ts}`);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export function checkPasscode(input: string): boolean {
  if (!env.passcode) return true;
  const a = Buffer.from(env.passcode);
  const b = Buffer.from(input);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  if (!passcodeEnabled()) return true;
  const cookieToken = cookies().get(COOKIE_NAME)?.value;
  if (cookieToken && verifyToken(cookieToken)) return true;
  // Bearer fallback for mobile / API consumers.
  const authHeader = headers().get('authorization');
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const headerToken = authHeader.slice(BEARER_PREFIX.length).trim();
    if (verifyToken(headerToken)) return true;
  }
  return false;
}

/** Issue a fresh token. Mobile consumes the returned string directly;
 * web also sets it as an HttpOnly cookie. */
export function issueToken(): string {
  return makeToken();
}

export async function signIn(): Promise<string> {
  const token = makeToken();
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S,
  });
  return token;
}

export async function signOut(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}
