import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { requireNamed } from '@/lib/basecamp/actor';
import { deliverSoon } from '@/lib/notify/outbox';
import { billingNow } from '@/lib/eor/billing';
import { markInvoicePaid, remindNow, setInvoiceStatus } from '@/lib/eor/invoices';

export const runtime = 'nodejs';

/** Act on one invoice: mark it paid, void it, reopen it, or send a reminder now. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string; invoiceId: string }> }) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const refused = requireNamed(gate.session);
  if (refused) return refused;
  const { id, invoiceId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');
  const audit = (metadata: Record<string, unknown>) =>
    writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: `eor.invoice.${action}`, target: id, metadata: { invoiceId, ...metadata } });

  try {
    switch (action) {
      case 'paid': {
        const { today } = billingNow();
        const paidOn = typeof body.paidOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.paidOn) ? body.paidOn : today;
        if (paidOn > today) return NextResponse.json({ error: 'The payment date cannot be in the future.' }, { status: 400 });
        const paid = await markInvoicePaid(id, invoiceId, paidOn);
        if (!paid.ok) return NextResponse.json({ error: paid.error }, { status: paid.status });
        await audit({ paidOn });
        await deliverSoon();
        return NextResponse.json({ invoice: paid.value });
      }
      case 'void':
      case 'reopen': {
        const changed = await setInvoiceStatus(id, invoiceId, action === 'void' ? 'void' : 'open');
        if (!changed.ok) return NextResponse.json({ error: changed.error }, { status: changed.status });
        await audit({});
        return NextResponse.json({ invoice: changed.value });
      }
      case 'remind': {
        const sent = await remindNow(id, invoiceId);
        if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status });
        await audit({ kind: sent.value.kind });
        await deliverSoon();
        return NextResponse.json(sent.value);
      }
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Invoice action failed', error);
    return NextResponse.json({ error: 'Unable to do that.' }, { status: 500 });
  }
}
