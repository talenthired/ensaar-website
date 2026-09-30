import { NextRequest, NextResponse } from 'next/server';
import { billingNow } from '@/lib/eor/billing';
import { invoiceView, listInvoices } from '@/lib/eor/invoices';
import { requirePortal } from '@/lib/eor/portal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in company's invoices: what is due, what is late, what is paid. Voided ones are not shown. */
export async function GET(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const { today } = billingNow();
  const invoices = await listInvoices(gate.ctx.companyId);
  return NextResponse.json({ invoices: invoices.filter((i) => i.status !== 'void').map((i) => invoiceView(i, today)) });
}
