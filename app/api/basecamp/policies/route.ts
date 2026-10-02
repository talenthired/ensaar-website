import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed, requireSignatory, signatoryEmail, signatoryLabel } from '@/lib/basecamp/actor';
import { getTemplateApproval, recordTemplateApproval } from '@/lib/eor/companies';
import { HANDBOOK_CHANGES, HANDBOOK_VERSION } from '@/lib/eor/handbook';
import { currentHandbook, draftHandbookText, employeeCount, handbookApprovalKey, handbookRoster, publishHandbook } from '@/lib/eor/policies';
import { signedPdf } from '@/lib/eor/signed-pdf';
import { deliverSoon } from '@/lib/notify/outbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The Employee Handbook in Basecamp: the version in the code, its sign-off,
 * what is published, and who has acknowledged it. ?format=pdf returns the
 * published text as a PDF, or the draft of this version before it is published.
 */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const published = await currentHandbook();
  if (request.nextUrl.searchParams.get('format') === 'pdf') {
    const draft = !published || published.version !== HANDBOOK_VERSION;
    const text = draft ? draftHandbookText(signatoryLabel(gate.session), await employeeCount()) : published.text;
    const bytes = await signedPdf([text], `Ensaar Employee Handbook ${HANDBOOK_VERSION}${draft ? ' (draft)' : ''}`);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="Ensaar-Employee-Handbook-${HANDBOOK_VERSION}${draft ? '-draft' : ''}.pdf"`,
        'cache-control': 'private, no-store',
      },
    });
  }
  const [approval, roster] = await Promise.all([getTemplateApproval(handbookApprovalKey()), handbookRoster()]);
  return NextResponse.json({
    version: HANDBOOK_VERSION,
    changes: HANDBOOK_CHANGES,
    approval,
    published: published ? { version: published.version, issuedBy: published.issuedBy, publishedBy: published.publishedBy, publishedAt: published.publishedAt } : null,
    roster,
    viewer: { bootstrap: gate.session.bootstrap, owner: gate.session.role === 'owner', signatory: !signatoryEmail() || gate.session.email?.toLowerCase() === signatoryEmail() },
  });
}

/**
 * { action: 'approve', reviewer, note }: an owner records sign-off for this version (write-once).
 * { action: 'publish' }: Ensaar's signatory publishes it, and contactable employees are emailed.
 */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; reviewer?: unknown; note?: unknown; version?: unknown };
  if (body.version !== HANDBOOK_VERSION) return NextResponse.json({ error: 'The handbook version changed. Reload and review the current one.' }, { status: 409 });

  if (body.action === 'approve') {
    const refused = requireNamed(gate.session);
    if (refused) return refused;
    if (gate.session.role !== 'owner') return NextResponse.json({ error: 'Only an owner can record sign-off for the handbook.' }, { status: 403 });
    const reviewer = typeof body.reviewer === 'string' ? body.reviewer.trim().slice(0, 200) : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';
    if (reviewer.length < 3) return NextResponse.json({ error: 'Name who reviewed the handbook (a lawyer, a firm, or yourself).' }, { status: 400 });
    if (await getTemplateApproval(handbookApprovalKey())) return NextResponse.json({ error: 'This version already has a recorded sign-off.' }, { status: 409 });
    const approval = await recordTemplateApproval({ version: handbookApprovalKey(), reviewer, note: note || null, recordedBy: actorName(gate.session) });
    await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.handbook.approve', target: handbookApprovalKey(), metadata: { reviewer } });
    return NextResponse.json({ approval });
  }

  if (body.action === 'publish') {
    const refused = requireSignatory(gate.session);
    if (refused) return refused;
    const done = await publishHandbook({ issuedBy: signatoryLabel(gate.session), publishedBy: actorName(gate.session) });
    if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'eor.handbook.publish',
      target: HANDBOOK_VERSION,
      metadata: { hash: done.value.handbook.hash, emailed: done.value.emailed },
    });
    await deliverSoon();
    return NextResponse.json({ published: done.value.handbook.version, emailed: done.value.emailed });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
