import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { writeAudit } from '@/lib/basecamp/audit';
import { sameOriginMutation } from '@/lib/basecamp/guard';
import { deliverSoon } from '@/lib/notify/outbox';
import { requestTeamLogin } from '@/lib/eor/team-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DONE = { ok: true, message: 'If that address belongs to someone Ensaar employs, a sign-in link is on its way. It can take a minute to arrive.' };

/** Email a one-time sign-in link. The answer is identical whether or not the address is known. */
export async function POST(request: NextRequest) {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  if (!EMAIL.test(email)) return NextResponse.json({ error: 'Enter your email address.' }, { status: 400 });
  const byIp = await rateLimit(clientKey(request, 'team-login'), 10, 60 * 60 * 1000);
  const byEmail = await rateLimit(`team-login-email:${createHash('sha256').update(email).digest('hex')}`, 5, 60 * 60 * 1000);
  if (!byIp.ok || !byEmail.ok) return tooManyRequests(Math.max(byIp.retryAfter, byEmail.retryAfter), 'Too many requests. Try again later.');
  try {
    const matched = await requestTeamLogin(email);
    if (matched) {
      await writeAudit({ actorEmail: email, action: 'team.login.request' });
      await deliverSoon();
    }
  } catch (error) {
    console.error('Employee login request failed', error);
  }
  return NextResponse.json(DONE, { status: 202 });
}
