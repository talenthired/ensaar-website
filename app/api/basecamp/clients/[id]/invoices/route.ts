import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed } from '@/lib/basecamp/actor';
import { deliverSoon, emailConfigured } from '@/lib/notify/outbox';
import { billingNow, defaultInvoiceDates, validateInvoice } from '@/lib/eor/billing';
import { createInvoice, invoiceState, listInvoices } from '@/lib/eor/invoices';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/** A client's invoices, each with how late it is and the interest accrued, plus the dates a new one defaults to. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const { today } = billingNow();
  try {
    const invoices = await listInvoices(id);
    return NextResponse.json({ invoices: invoices.map((i) => invoiceState(i, today)), defaults: defaultInvoiceDates(today), today, emailConfigured: emailConfigured() });
  } catch (error) {
    console.error('Invoice list failed', error);
    return NextResponse.json({ error: 'Unable to load invoices.' }, { status: 500 });
  }
}

/** Record an invoice Ensaar has raised. The customer is emailed, and reminded until it is marked paid. */
export async function POST(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const refused = requireNamed(gate.session);
  if (refused) return refused;
  const { id } = await context.params;
  const result = validateInvoice(await request.json().catch(() => ({})));
  if (!result.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: result.errors }, { status: 400 });
  try {
    const created = await createInvoice(id, result.value, actorName(gate.session));
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'eor.invoice.create',
      target: id,
      metadata: { number: created.value.number, amountUsd: created.value.amountUsd, dueOn: created.value.dueOn },
    });
    await deliverSoon();
    return NextResponse.json({ invoice: created.value }, { status: 201 });
  } catch (error) {
    console.error('Invoice create failed', error);
    return NextResponse.json({ error: 'Unable to record that invoice.' }, { status: 500 });
  }
}
