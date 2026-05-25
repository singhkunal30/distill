import { NextResponse, type NextRequest } from 'next/server';

// Passcode middleware. If DISTILL_PASSCODE is unset, this middleware is
// a no-op. When set, all routes except /login, /api/auth, and static
// assets require a valid session cookie.

const PUBLIC_PATHS = ['/login', '/api/auth', '/manifest.webmanifest', '/icons', '/sw.js'];

export function middleware(req: NextRequest) {
  const passcode = process.env.DISTILL_PASSCODE;
  if (!passcode) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('distill_session')?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
};
