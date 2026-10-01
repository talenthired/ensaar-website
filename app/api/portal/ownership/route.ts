import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { displayName, getCompany } from '@/lib/eor/companies';
import { validateOwnership } from '@/lib/eor/ownership';
import { saveOwnership } from '@/lib/eor/ownership-store';
import { requirePortal } from '@/lib/eor/portal-auth';
import { companyView } from '@/lib/eor/views';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Declare who owns or controls the company, signed by the person signed in.
 * The typed name is their signature; the session proves their email.
 */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `portal-ownership:${gate.ctx.user.id}`), 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.consent !== true) return NextResponse.json({ error: 'Tick the box to confirm the declaration.' }, { status: 400 });
  const checked = validateOwnership(body);
  if (!checked.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: checked.errors }, { status: 400 });
  const company = await getCompany(gate.ctx.companyId);
  if (!company) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const name = typeof body.signature === 'string' ? body.signature.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  const saved = await saveOwnership(company.id, displayName(company), checked.value, { name, email: gate.ctx.user.email });
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'eor.ownership.declare', target: company.id, metadata: { hash: saved.value.hash, owners: checked.value.owners.length } });
  return NextResponse.json(await companyView(company, gate.ctx));
}
