import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { AGREEMENT_VERSION } from '@/lib/eor/agreement';
import { getTemplateApproval, recordTemplateApproval } from '@/lib/eor/companies';

export const runtime = 'nodejs';

/**
 * Record the legal sign-off for the current agreement version (GAP-06).
 * Customers cannot sign until this exists. Owners only, named accounts only,
 * and write-once per version: a changed template gets a new version and needs
 * its own review.
 */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  if (gate.session.role !== 'owner' || gate.session.bootstrap || !gate.session.email) {
    return NextResponse.json({ error: 'Only an owner, signed in with their own account, can record legal sign-off.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { reviewer?: unknown; note?: unknown; version?: unknown };
  const reviewer = typeof body.reviewer === 'string' ? body.reviewer.trim().slice(0, 200) : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';
  if (reviewer.length < 3) {
    return NextResponse.json({ error: 'Name the lawyer or firm who reviewed the agreement.' }, { status: 400 });
  }
  if (body.version !== AGREEMENT_VERSION) {
    return NextResponse.json({ error: 'The agreement version changed. Reload and review the current one.' }, { status: 409 });
  }
  if (await getTemplateApproval()) {
    return NextResponse.json({ error: 'This version already has a recorded sign-off.' }, { status: 409 });
  }
  const recordedBy = gate.session.name ? `${gate.session.name} (${gate.session.email})` : gate.session.email;
  const approval = await recordTemplateApproval({ reviewer, note: note || null, recordedBy });
  await writeAudit({
    actorId: gate.session.userId,
    actorEmail: gate.session.email,
    action: 'eor.template.approve',
    target: AGREEMENT_VERSION,
    metadata: { reviewer },
  });
  return NextResponse.json({ approval });
}
