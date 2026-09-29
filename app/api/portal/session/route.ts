import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { sameOriginMutation } from '@/lib/basecamp/guard';
import { PORTAL_COOKIE, consumeLoginToken, revokePortalSession, sessionCookie } from '@/lib/eor/portal-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Exchange a one-time link token (from the URL fragment) for a session cookie. */
export async function POST(request: NextRequest) {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 });
  const limit = await rateLimit(clientKey(request, 'portal-session'), 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');

  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === 'string' ? body.token : '';
  const result = await consumeLoginToken(token).catch(() => null);
  if (!result) {
    return NextResponse.json({ error: 'This sign-in link has expired or was already used. Request a new one.' }, { status: 401 });
  }
  await writeAudit({ actorEmail: result.user.email, action: 'portal.login', target: result.user.companyId });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie(result.sessionToken));
  return response;
}

/** Sign out. */
export async function DELETE(request: NextRequest) {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 });
  await revokePortalSession(request.cookies.get(PORTAL_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie('', 0));
  return response;
}
