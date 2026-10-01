import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { displayName, getCompany } from '@/lib/eor/companies';
import { getEmployee } from '@/lib/eor/employees';
import { buildEmploymentAgreement, buildOfferLetter, renderEmploymentDocumentHtml } from '@/lib/eor/employment-docs';
import { todayInIndia } from '@/lib/eor/onboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * An employee's offer letter or employment agreement, as a printable page for
 * staff. Never served to the portal: it carries the salary, which a customer on
 * loaded-cost pricing must not see.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string; kind: string }> }) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id, kind } = await context.params;
  if (kind !== 'offer' && kind !== 'agreement') return NextResponse.json({ error: 'Unknown document.' }, { status: 404 });
  const employee = await getEmployee(id).catch(() => null);
  if (!employee) return NextResponse.json({ error: 'No such employee.' }, { status: 404 });
  const company = await getCompany(employee.companyId);
  if (!company) return NextResponse.json({ error: 'No such client.' }, { status: 404 });

  const requested = request.nextUrl.searchParams.get('date');
  const issuedOn = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && !Number.isNaN(Date.parse(requested)) ? requested : todayInIndia();
  const input = {
    employee,
    customerName: displayName(company),
    issuedOn,
    signatory: { name: gate.session.name ?? '', title: 'Authorised Signatory' },
    reference: `ENS-${employee.id.slice(0, 8).toUpperCase()}`,
  };
  const doc = kind === 'offer' ? buildOfferLetter(input) : buildEmploymentAgreement(input);
  const html = renderEmploymentDocumentHtml(doc, {
    logoUrl: '/ensaar-logo.png',
    generatedNote: `Generated in Basecamp on ${issuedOn} from ${employee.employeeName}'s current offer details. Check every term before sending; these templates have not yet had legal review.`,
  });
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
    },
  });
}
