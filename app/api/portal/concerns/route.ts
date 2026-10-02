import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { clientConcerns, raiseConcern } from '@/lib/eor/conduct-store';
import { requirePortal } from '@/lib/eor/portal-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Concerns this client raised about its employees: open or closed, and the outcome Ensaar shares. */
export async function GET(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  return NextResponse.json({ concerns: await clientConcerns(gate.ctx.companyId) });
}

/** { employeeId, reason, details }: tell Ensaar, in writing, about a concern. Only Ensaar acts on it. */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `portal-concern:${gate.ctx.companyId}`), 10, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again later.');
  const body = (await request.json().catch(() => ({}))) as { employeeId?: unknown; reason?: unknown; details?: unknown };
  const done = await raiseConcern(gate.ctx.companyId, { employeeId: body.employeeId, reason: body.reason, details: body.details, by: `${gate.ctx.user.name ?? gate.ctx.user.email} <${gate.ctx.user.email}>` });
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'portal.concern.raise', target: gate.ctx.companyId, metadata: { caseId: done.value.id, reason: body.reason } });
  await deliverSoon();
  return NextResponse.json({ concerns: await clientConcerns(gate.ctx.companyId) });
}
