import { NextRequest, NextResponse } from 'next/server';
import {
  BASECAMP_COOKIE,
  BASECAMP_SESSION_MAX_AGE,
  basecampIsConfigured,
  createBasecampToken,
  revokeBasecampToken,
  sharedLoginAllowed,
  verifyBasecampPassword,
} from '@/lib/basecamp/auth';
import { verifyUserPassword } from '@/lib/basecamp/users';
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

  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const password = body.password || '';

  /* Two ways in, in this order:
     1. An invited user signs in with their own email and password.
     2. The shared password, which predates user accounts. It stays because it is
        how the first owner gets in to send the first invitation, and because
        removing it would lock out an install that has not invited anyone yet.
     An email that does not match any account falls through to the shared check,
     so a wrong email and a wrong password are the same answer. */
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (email) {
    const user = await verifyUserPassword(email, password);
    if (user) {
      const response = NextResponse.json({ ok: true, user: { email: user.email, role: user.role } });
      response.cookies.set(BASECAMP_COOKIE, await createBasecampToken(user.id), {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: BASECAMP_SESSION_MAX_AGE,
      });
      return response;
    }
  }

  if (!basecampIsConfigured()) {
    return NextResponse.json({ error: 'Basecamp access is not configured.' }, { status: 503 });
  }
  // Same answer as a wrong password, so the response does not reveal whether the
  // shared login is closed.
  if (!verifyBasecampPassword(password) || !(await sharedLoginAllowed())) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
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
