import { NextRequest, NextResponse } from 'next/server';
import { BASECAMP_COOKIE, BASECAMP_SESSION_MAX_AGE, createBasecampToken } from '@/lib/basecamp/auth';
import { acceptInvitation, getUsableInvitation } from '@/lib/basecamp/invitations';
import { writeAudit } from '@/lib/basecamp/audit';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Accept an invitation: set a password, create the account, sign in.
 *
 * Public by necessity (the invitee has no session yet), so the token is the only
 * credential and the endpoint is throttled like the login form.
 */
export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientKey(request, 'basecamp-invite'), 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');

  const body = (await request.json().catch(() => ({}))) as {
    token?: unknown;
    name?: unknown;
    password?: unknown;
  };
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null;
  if (!token) return NextResponse.json({ error: 'That invitation link is not valid.' }, { status: 400 });

  try {
    const result = await acceptInvitation(token, { name, password });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    await writeAudit({
      actorId: result.user.id,
      actorEmail: result.user.email,
      action: 'invitation.accept',
      target: result.user.email,
      metadata: { role: result.user.role },
    });

    const response = NextResponse.json({ ok: true, user: result.user });
    response.cookies.set(BASECAMP_COOKIE, await createBasecampToken(result.user.id), {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: BASECAMP_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error('Invite accept failed', error);
    return NextResponse.json({ error: 'Unable to accept that invitation.' }, { status: 500 });
  }
}

/** Whether a link is still usable, so the page can show the right thing. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const invitation = await getUsableInvitation(token).catch(() => null);
  if (!invitation) return NextResponse.json({ valid: false }, { status: 404 });
  return NextResponse.json({ valid: true, email: invitation.email, role: invitation.role });
}
