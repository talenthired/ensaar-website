import { NextRequest, NextResponse } from 'next/server';
import { invoicePdfFor } from '@/lib/eor/invoices';
import { requirePortal } from '@/lib/eor/portal-auth';

export const runtime = 'nodejs';

/** Download one of the company's own invoices. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const pdf = await invoicePdfFor(gate.ctx.companyId, id);
  if (!pdf.ok) return NextResponse.json({ error: pdf.error }, { status: pdf.status });
  return new NextResponse(Buffer.from(pdf.value.bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${pdf.value.filename}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
