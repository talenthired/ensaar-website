import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { employeeLetters, respondToLetter } from '@/lib/eor/conduct-store';
import { requireTeam } from '@/lib/eor/team-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Letters Ensaar has sent the employee: warnings, notices and decisions. Only their own. */
export async function GET(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  return NextResponse.json({ letters: await employeeLetters(gate.employee.id) });
}

/** { id, reply? }: acknowledge a letter, and optionally reply (once). */
export async function POST(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `team-letters:${gate.employee.id}`), 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; reply?: unknown };
  const done = await respondToLetter(gate.employee, String(body.id ?? ''), { reply: body.reply });
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.letter.respond', target: gate.employee.id, metadata: { id: body.id, replied: Boolean(typeof body.reply === 'string' && body.reply.trim()) } });
  await deliverSoon();
  return NextResponse.json({ letters: await employeeLetters(gate.employee.id) });
}
