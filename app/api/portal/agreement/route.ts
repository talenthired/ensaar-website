import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { getCompany, signMaster } from '@/lib/eor/companies';
import { signatureMatches } from '@/lib/eor/onboarding';
import { requirePortal } from '@/lib/eor/portal-auth';
import { companyView } from '@/lib/eor/views';
import { clientIp, clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * The signatory signs the master agreement. Who is signing comes from the
 * session (they proved their mailbox to get it), not from the form; the typed
 * name must match them. Everything that depends on the record is re-checked by
 * signMaster under the company lock.
 */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `portal-sign:${gate.ctx.user.id}`), 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');

  const company = await getCompany(gate.ctx.companyId);
  if (!company?.company) return NextResponse.json({ error: 'Complete the company details first.' }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; consent?: unknown; agreementHash?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  if (body.consent !== true) return NextResponse.json({ error: 'Tick the box to agree to sign electronically.' }, { status: 400 });
  if (!signatureMatches(name, company.company.signatoryName)) {
    return NextResponse.json({ error: `Type your full name, ${company.company.signatoryName}, to sign.` }, { status: 400 });
  }
  if (typeof body.agreementHash !== 'string' || !/^[0-9a-f]{64}$/.test(body.agreementHash)) {
    return NextResponse.json({ error: 'Reload the page and review the agreement before signing.' }, { status: 400 });
  }

  const result = await signMaster(gate.ctx.companyId, body.agreementHash, {
    name,
    email: gate.ctx.user.email,
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error, ...(result.changed ? { changed: true } : {}) }, { status: result.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'eor.master.sign', target: gate.ctx.companyId, metadata: { hash: result.value.agreementHash } });
  await deliverSoon();
  return NextResponse.json(await companyView(result.value, gate.ctx));
}
