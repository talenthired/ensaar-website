import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { getCompany } from '@/lib/eor/companies';
import { MAX_BATCH, signSchedules } from '@/lib/eor/employees';
import { signatureMatches } from '@/lib/eor/onboarding';
import { requirePortal } from '@/lib/eor/portal-auth';
import { clientIp, clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * The signatory signs one or many Schedule As at once. Each item carries the
 * hash of the text they were shown; signSchedules refuses the whole batch if
 * any text changed, and checks the signed-in person is the named signatory.
 */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `portal-sign:${gate.ctx.user.id}`), 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');

  const company = await getCompany(gate.ctx.companyId);
  if (!company?.company) return NextResponse.json({ error: 'Complete the company details first.' }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; consent?: unknown; items?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  if (body.consent !== true) return NextResponse.json({ error: 'Tick the box to agree to sign electronically.' }, { status: 400 });
  if (!signatureMatches(name, company.company.signatoryName)) {
    return NextResponse.json({ error: `Type your full name, ${company.company.signatoryName}, to sign.` }, { status: 400 });
  }
  const items = Array.isArray(body.items)
    ? body.items
        .filter((i): i is { id: string; hash: string } => Boolean(i) && typeof i.id === 'string' && typeof i.hash === 'string' && /^[0-9a-f]{64}$/.test(i.hash))
        .slice(0, MAX_BATCH)
    : [];
  if (items.length === 0 || items.length !== (body.items as unknown[]).length) {
    return NextResponse.json({ error: 'Reload the page and choose the schedules to sign.' }, { status: 400 });
  }

  const result = await signSchedules(gate.ctx.companyId, items, {
    name,
    email: gate.ctx.user.email,
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error, ...(result.changed ? { changed: true } : {}) }, { status: result.status });
  await writeAudit({
    actorEmail: gate.ctx.user.email,
    action: 'eor.schedules.sign',
    target: gate.ctx.companyId,
    metadata: { count: result.value.length, employees: result.value.map((e) => e.id) },
  });
  await deliverSoon();
  return NextResponse.json({ signed: result.value.length });
}
