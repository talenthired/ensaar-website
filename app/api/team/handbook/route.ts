import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { acknowledgeHandbook, currentHandbook, handbookStatus, setNightWorkConsent } from '@/lib/eor/policies';
import { requireTeam } from '@/lib/eor/team-auth';
import { clientIp, clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The current handbook (its frozen text and fingerprint) and where this employee stands with it. */
export async function GET(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const [handbook, status] = await Promise.all([currentHandbook(), handbookStatus(gate.employee.id)]);
  return NextResponse.json({ handbook: handbook ? { version: handbook.version, text: handbook.text, hash: handbook.hash, publishedAt: handbook.publishedAt } : null, status });
}

/**
 * { action: 'acknowledge', name, hash, consent: true }: acknowledge the version shown.
 * { action: 'night_work', consented }: give or withdraw consent to work after 8:30 pm.
 */
export async function POST(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `team-handbook:${gate.employee.id}`), 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; name?: unknown; hash?: unknown; consent?: unknown; consented?: unknown };

  if (body.action === 'night_work') {
    if (typeof body.consented !== 'boolean') return NextResponse.json({ error: 'Say whether you consent.' }, { status: 400 });
    await setNightWorkConsent(gate.employee.id, body.consented);
    await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.night_work', target: gate.employee.id, metadata: { consented: body.consented } });
    return NextResponse.json({ status: await handbookStatus(gate.employee.id) });
  }

  if (body.action !== 'acknowledge') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: 'Tick the box to confirm you have read and understood the handbook.' }, { status: 400 });
  if (typeof body.hash !== 'string' || !/^[0-9a-f]{64}$/.test(body.hash)) {
    return NextResponse.json({ error: 'Reload the page and read the handbook before acknowledging.' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  const done = await acknowledgeHandbook(gate.employee, {
    hash: body.hash,
    name,
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  });
  if (!done.ok) return NextResponse.json({ error: done.error, ...(done.changed ? { changed: true } : {}) }, { status: done.status });
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.handbook.acknowledge', target: gate.employee.id, metadata: { version: done.value.version } });
  await deliverSoon();
  return NextResponse.json({ status: await handbookStatus(gate.employee.id) });
}
