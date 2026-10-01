import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { renderEmploymentDocumentHtml } from '@/lib/eor/employment-docs';
import { evidenceFor, getEmployeeDocument, signEmployeeDocument } from '@/lib/eor/team';
import { requireTeam } from '@/lib/eor/team-auth';
import { clientIp, clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/**
 * One of the employee's own documents: as a printable page with its signature
 * evidence, or (?format=json) as data with the fingerprint to sign against.
 */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const doc = await getEmployeeDocument(id, gate.employee.id);
  if (!doc) return NextResponse.json({ error: 'No such document.' }, { status: 404 });
  if (request.nextUrl.searchParams.get('format') === 'json') {
    return NextResponse.json({ id: doc.id, kind: doc.kind, status: doc.status, hash: doc.hash, document: doc.document });
  }
  const html = renderEmploymentDocumentHtml(doc.document, {
    logoUrl: '/ensaar-logo.png',
    generatedNote:
      doc.status === 'signed' ? 'Your signed copy.' : doc.status === 'void' ? 'This document was replaced and is kept for the record.' : 'Read this, then sign it in the employee portal.',
    evidence: evidenceFor(doc),
  });
  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' },
  });
}

/** The employee signs. Who is signing comes from the session; the typed name must be theirs. */
export async function POST(request: NextRequest, context: Context) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `team-sign:${gate.employee.id}`), 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; consent?: unknown; hash?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  if (body.consent !== true) return NextResponse.json({ error: 'Tick the box to agree to sign electronically.' }, { status: 400 });
  if (typeof body.hash !== 'string' || !/^[0-9a-f]{64}$/.test(body.hash)) {
    return NextResponse.json({ error: 'Reload the page and read the document before signing.' }, { status: 400 });
  }
  const signed = await signEmployeeDocument(id, gate.employee, body.hash, {
    name,
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  });
  if (!signed.ok) return NextResponse.json({ error: signed.error, ...(signed.changed ? { changed: true } : {}) }, { status: signed.status });
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.document.sign', target: gate.employee.id, metadata: { kind: signed.value.kind, hash: signed.value.hash } });
  await deliverSoon();
  return NextResponse.json({ document: { ...signed.value, signedIp: null } });
}
