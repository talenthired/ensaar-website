import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { sameOriginMutation } from '@/lib/basecamp/guard';
import { TEAM_COOKIE, consumeTeamToken, revokeTeamSession, teamCookie } from '@/lib/eor/team-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Exchange a one-time link token (from the URL fragment) for a session cookie. */
export async function POST(request: NextRequest) {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 });
  const limit = await rateLimit(clientKey(request, 'team-session'), 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');
  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const result = await consumeTeamToken(typeof body.token === 'string' ? body.token : '').catch(() => null);
  if (!result) return NextResponse.json({ error: 'This sign-in link has expired or was already used. Request a new one.' }, { status: 401 });
  await writeAudit({ actorEmail: result.email, action: 'team.login', target: result.employeeId });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(teamCookie(result.sessionToken));
  return response;
}

/** Sign out. */
export async function DELETE(request: NextRequest) {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 });
  await revokeTeamSession(request.cookies.get(TEAM_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(teamCookie('', 0));
  return response;
}
