import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { invoicePdfFor } from '@/lib/eor/invoices';

export const runtime = 'nodejs';

/** An invoice as the client receives it. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string; invoiceId: string }> }) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id, invoiceId } = await context.params;
  const pdf = await invoicePdfFor(id, invoiceId);
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
