import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon, emailConfigured, listMessages } from '@/lib/notify/outbox';
import { onboardingLink } from '@/lib/eor/email';
import { validateHire } from '@/lib/eor/onboarding';
import { portalView } from '@/lib/eor/portal';
import {
  approveClient,
  attestSignatory,
  cancelClient,
  getClient,
  listDocuments,
  listSignatureHistory,
  reissueToken,
  requestChanges,
  reviewDocument,
  updateEmployeeCase,
  updateHire,
  type Outcome,
} from '@/lib/eor/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/** One onboarding: the full record, documents with review state, emails and voided signatures. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const client = await getClient(id).catch(() => null);
  if (!client) return NextResponse.json({ error: 'No such client.' }, { status: 404 });
  const [view, documents, messages, history] = await Promise.all([
    portalView(client),
    listDocuments(id),
    listMessages(id),
    listSignatureHistory(id),
  ]);
  return NextResponse.json({
    client,
    view,
    documents,
    messages,
    history,
    emailConfigured: emailConfigured(),
    viewer: { email: gate.session.email, bootstrap: gate.session.bootstrap },
  });
}

const text = (value: unknown, max = 1000) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Staff actions after inviting:
 *   resend            fresh link (the old one stops working), emailed
 *   update_hire       correct the offer; a signed agreement is voided and re-signed
 *   review_document   accept or reject one document, with a reason
 *   request_changes   send it back to the customer with a note
 *   attest_signatory  Ensaar vouches for the signatory when email verification is not possible
 *   approve           countersign (named staff only); opens the employee checklist
 *   employee_step / employee_owner   work the employee checklist
 *   cancel            stop it; the link stops working
 */
export async function POST(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;

  // Everything that binds Ensaar or decides for the customer must be attributable to a person.
  const named = !gate.session.bootstrap && gate.session.email;
  const actor = gate.session.name ? `${gate.session.name} (${gate.session.email})` : gate.session.email ?? 'shared login';
  const needsNamed = ['approve', 'attest_signatory', 'update_hire', 'request_changes', 'review_document'];
  if (typeof action === 'string' && needsNamed.includes(action) && !named) {
    return NextResponse.json(
      { error: 'Sign in with your own Basecamp account for this. The shared login cannot.' },
      { status: 403 },
    );
  }

  const audit = (name: string, metadata?: Record<string, unknown>) =>
    writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: name, target: id, metadata });
  const respond = async (outcome: Outcome<unknown>, auditName: string, metadata?: Record<string, unknown>) => {
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    await audit(auditName, metadata);
    await deliverSoon();
    return NextResponse.json({ ok: true });
  };

  try {
    switch (action) {
      case 'resend': {
        const token = await reissueToken(id, 'Ensaar sent you a fresh link to your onboarding.');
        if (!token) return NextResponse.json({ error: 'This onboarding was cancelled.' }, { status: 409 });
        await audit('eor.resend');
        await deliverSoon();
        return NextResponse.json({ link: onboardingLink(token), emailConfigured: emailConfigured() });
      }
      case 'update_hire': {
        const current = await getClient(id);
        if (!current) return NextResponse.json({ error: 'No such client.' }, { status: 404 });
        const hire = validateHire({ ...current, ...(body.hire as Record<string, unknown>) });
        if (!hire.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: hire.errors }, { status: 400 });
        return respond(await updateHire(id, hire.value, actor), 'eor.hire.update', { status: current.status });
      }
      case 'review_document': {
        const decision = body.decision;
        if (decision !== 'accepted' && decision !== 'rejected' && decision !== 'pending') {
          return NextResponse.json({ error: 'Choose accept or reject.' }, { status: 400 });
        }
        return respond(
          await reviewDocument(id, text(body.documentId, 64), decision, text(body.note, 500) || null, actor),
          'eor.document.review',
          { documentId: body.documentId, decision },
        );
      }
      case 'request_changes': {
        const note = text(body.note, 2000);
        if (note.length < 5) return NextResponse.json({ error: 'Tell the customer what needs to change.' }, { status: 400 });
        return respond(await requestChanges(id, note, actor), 'eor.changes');
      }
      case 'attest_signatory': {
        const note = text(body.note, 300);
        if (note.length < 5) return NextResponse.json({ error: 'Say how you verified the signatory, for example a video call.' }, { status: 400 });
        return respond(await attestSignatory(id, actor, note), 'eor.signatory.attest', { note });
      }
      case 'approve':
        return respond(await approveClient(id, actor, { confirmPastStart: body.confirmPastStart === true }), 'eor.approve', {
          confirmPastStart: body.confirmPastStart === true,
        });
      case 'employee_step':
        return respond(
          await updateEmployeeCase(id, { step: text(body.step, 40), done: body.done === true }, actor),
          'eor.employee.step',
          { step: body.step, done: body.done === true },
        );
      case 'employee_owner':
        return respond(await updateEmployeeCase(id, { owner: text(body.owner, 200) }, actor), 'eor.employee.owner');
      case 'cancel': {
        if (!(await cancelClient(id))) {
          return NextResponse.json({ error: 'That onboarding cannot be cancelled.' }, { status: 409 });
        }
        await audit('eor.cancel');
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Client action failed', error);
    return NextResponse.json({ error: 'Unable to do that.' }, { status: 500 });
  }
}
