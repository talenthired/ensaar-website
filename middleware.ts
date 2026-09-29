import { NextResponse, type NextRequest } from 'next/server';
import { buildContentSecurityPolicy } from '@/lib/csp';

// Pages under /basecamp that someone without a session must be able to reach.
const BASECAMP_PUBLIC = /^\/basecamp\/(login|invite)(\/|$)/;

export function middleware(request: NextRequest) {
  // First line only: no session cookie at all means no Basecamp page. The real
  // check (the session in the database) still runs in the layout, the pages and
  // every API route; this just keeps an unauthenticated request from reaching them.
  const path = request.nextUrl.pathname;
  if (
    path.startsWith('/basecamp') &&
    !BASECAMP_PUBLIC.test(path) &&
    !request.cookies.get('ensaar_basecamp')?.value
  ) {
    return NextResponse.redirect(new URL('/basecamp/login', request.url));
  }

  const nonce = crypto.randomUUID();
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV !== 'production');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  // Always overwritten here, so a client cannot spoof it. The root layout reads it
  // to keep analytics and third-party widgets off private pages.
  requestHeaders.set('x-ensaar-path', request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
