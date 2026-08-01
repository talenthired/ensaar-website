import { NextRequest, NextResponse } from 'next/server';
import {
  BASECAMP_COOKIE,
  basecampIsConfigured,
  createBasecampToken,
  revokeBasecampToken,
  verifyBasecampPassword,
} from '@/lib/basecamp/auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Basecamp is one shared password guarding lead PII, so an unthrottled form is a
// free brute-force oracle. Ten attempts per 10 minutes per client is generous for
// a human typo and useless for a guessing loop.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

/** Sign in. */
export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientKey(request, 'basecamp-login'), MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter, 'Too many sign-in attempts. Try again shortly.');
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!basecampIsConfigured()) {
    return NextResponse.json({ error: 'Basecamp access is not configured.' }, { status: 503 });
  }
  if (!verifyBasecampPassword(body.password || '')) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(BASECAMP_COOKIE, await createBasecampToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

/** Sign out. */
export async function DELETE(request: NextRequest) {
  await revokeBasecampToken(request.cookies.get(BASECAMP_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BASECAMP_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
