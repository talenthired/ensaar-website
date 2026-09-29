import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { recoverLinks } from '@/lib/eor/store';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DONE = {
  ok: true,
  message: 'If that address belongs to an Ensaar onboarding, a new link is on its way. It can take a minute to arrive.',
};

/**
 * Email a fresh onboarding link to its contact or signatory (EOR-07). The
 * answer is the same whether or not the address matched, so this cannot be used
 * to find out who is an Ensaar customer; possession of the mailbox is the proof.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: 'Enter the email address the onboarding was sent to.' }, { status: 400 });
  }

  const byIp = await rateLimit(clientKey(request, 'onboard-recover'), 5, 60 * 60 * 1000);
  const emailBucket = createHash('sha256').update(email).digest('hex');
  const byEmail = await rateLimit(`onboard-recover-email:${emailBucket}`, 3, 60 * 60 * 1000);
  if (!byIp.ok || !byEmail.ok) {
    return tooManyRequests(Math.max(byIp.retryAfter, byEmail.retryAfter), 'Too many requests. Try again later.');
  }

  try {
    const matched = await recoverLinks(email);
    if (matched) {
      await writeAudit({ actorEmail: email, action: 'eor.recover', metadata: { matched } });
      await deliverSoon();
    }
  } catch (error) {
    console.error('Onboarding recovery failed', error);
  }
  return NextResponse.json(DONE, { status: 202 });
}
