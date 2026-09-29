import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed } from '@/lib/basecamp/actor';
import { deliverSoon, emailConfigured, listMessages } from '@/lib/notify/outbox';
import { agreementToText } from '@/lib/eor/agreement';
import {
  addContact,
  approveCompany,
  cancelCompany,
  employeeCounts,
  getCompany,
  getSignedMasterText,
  getTemplateApproval,
  listCompanyDocuments,
  listVoidedSignatures,
  masterDraft,
  requestCompanyChanges,
  reviewCompanyDocument,
  updateCompanyInvite,
} from '@/lib/eor/companies';
import { validateCompanyInvite } from '@/lib/eor/onboarding';
import type { Outcome } from '@/lib/eor/outcome';
import { deactivatePortalUser, listPortalUsers, reinvitePortalUser } from '@/lib/eor/portal-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/** One client company: details, headcount, documents, contacts, agreement, emails. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const company = await getCompany(id).catch(() => null);
  if (!company) return NextResponse.json({ error: 'No such client.' }, { status: 404 });
  const [counts, documents, contacts, voided, messages, approval, signedText] = await Promise.all([
    employeeCounts(id),
    listCompanyDocuments(id),
    listPortalUsers(id),
    listVoidedSignatures(id),
    listMessages(id),
    getTemplateApproval(),
    company.signedAt ? getSignedMasterText(id) : Promise.resolve(null),
  ]);
  const draft = masterDraft(company);
  return NextResponse.json({
    company,
    counts,
    documents,
    contacts,
    voided,
    messages,
    readyToSign: Boolean(approval),
    master: { draft, text: signedText ?? agreementToText(draft) },
    emailConfigured: emailConfigured(),
    viewer: { email: gate.session.email, bootstrap: gate.session.bootstrap, role: gate.session.role },
  });
}

const str = (value: unknown, max = 1000) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Company-level staff actions. Employee actions live under /employees. */
export async function POST(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');
  const actor = actorName(gate.session);
  if (['approve', 'request_changes', 'review_document', 'update_invite'].includes(action)) {
    const refused = requireNamed(gate.session);
    if (refused) return refused;
  }

  const done = async (outcome: Outcome<unknown>, auditAction: string, metadata?: Record<string, unknown>) => {
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: auditAction, target: id, metadata });
    await deliverSoon();
    return NextResponse.json({ ok: true });
  };

  try {
    switch (action) {
      case 'update_invite': {
        const invite = validateCompanyInvite(body.invite);
        if (!invite.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: invite.errors }, { status: 400 });
        return done(await updateCompanyInvite(id, invite.value), 'eor.company.update');
      }
      case 'add_contact': {
        const email = str(body.email, 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
        return done(await addContact(id, email, str(body.name, 120) || null), 'eor.contact.add', { email });
      }
      case 'reinvite_contact': {
        const link = await reinvitePortalUser(id, str(body.userId, 64));
        if (!link) return NextResponse.json({ error: 'That contact is not active.' }, { status: 409 });
        await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.contact.reinvite', target: id });
        await deliverSoon();
        // Returned so staff can pass it on directly if email is not working.
        return NextResponse.json({ link, emailConfigured: emailConfigured() });
      }
      case 'remove_contact': {
        if (!(await deactivatePortalUser(id, str(body.userId, 64)))) return NextResponse.json({ error: 'No such contact.' }, { status: 404 });
        await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.contact.remove', target: id });
        return NextResponse.json({ ok: true });
      }
      case 'review_document': {
        const decision = body.decision;
        if (decision !== 'accepted' && decision !== 'rejected' && decision !== 'pending') {
          return NextResponse.json({ error: 'Choose accept or reject.' }, { status: 400 });
        }
        return done(await reviewCompanyDocument(id, str(body.documentId, 64), decision, str(body.note, 500) || null, actor), 'eor.document.review', {
          documentId: body.documentId,
          decision,
        });
      }
      case 'request_changes': {
        const note = str(body.note, 2000);
        if (note.length < 5) return NextResponse.json({ error: 'Tell the customer what needs to change.' }, { status: 400 });
        return done(await requestCompanyChanges(id, note, actor), 'eor.company.changes');
      }
      case 'approve':
        return done(await approveCompany(id, actor), 'eor.company.approve');
      case 'cancel':
        return done(await cancelCompany(id), 'eor.company.cancel');
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Client action failed', error);
    return NextResponse.json({ error: 'Unable to do that.' }, { status: 500 });
  }
}
