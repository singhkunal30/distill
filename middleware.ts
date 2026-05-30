import { NextResponse, type NextRequest } from 'next/server';

// Passcode middleware. If DISTILL_PASSCODE is unset, this middleware
// only adds CORS headers for /api/*. When set, all routes except
// /login, /api/auth, and static assets require a valid session — either
// the cookie (web) or a Bearer token (mobile).

const PUBLIC_PATHS = ['/login', '/api/auth', '/manifest.webmanifest', '/icons', '/sw.js'];

function withCors(res: NextResponse, origin: string | null): NextResponse {
  // Reflect the origin so the Expo dev server (a random LAN port) works
  // without an allow-list. Distill is single-user; the passcode is the
  // real boundary.
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin');
  const isApi = pathname.startsWith('/api/');

  // Pre-flight: short-circuit with CORS headers.
  if (isApi && req.method === 'OPTIONS') {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }

  const passcode = process.env.DISTILL_PASSCODE;
  if (!passcode) {
    return isApi ? withCors(NextResponse.next(), origin) : NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return isApi ? withCors(NextResponse.next(), origin) : NextResponse.next();
  }

  // Auth check: cookie OR Bearer token.
  const cookieToken = req.cookies.get('distill_session')?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;
  const hasToken = Boolean(cookieToken) || Boolean(bearerToken);

  if (!hasToken) {
    if (isApi) {
      return withCors(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        origin,
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return isApi ? withCors(NextResponse.next(), origin) : NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
};
