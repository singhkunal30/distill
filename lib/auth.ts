import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from './env';

const COOKIE_NAME = 'distill_session';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

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
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function signIn(): Promise<void> {
  cookies().set({
    name: COOKIE_NAME,
    value: makeToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

export async function signOut(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}
