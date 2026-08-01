import { NextRequest, NextResponse } from 'next/server';
import { BASECAMP_COOKIE, verifyBasecampToken } from '@/lib/basecamp/auth';
import { LEAD_STATUSES, type LeadStatus, type LeadUpdate } from '@/lib/leads/types';
import { updateLead } from '@/lib/leads/store';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyBasecampToken(request.cookies.get(BASECAMP_COOKIE)?.value))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const update: LeadUpdate = {};
    if (typeof body.status === 'string' && LEAD_STATUSES.includes(body.status as LeadStatus)) {
      update.status = body.status as LeadStatus;
    }
    if (typeof body.owner === 'string') update.owner = body.owner.trim().slice(0, 120);
    if (typeof body.nextActionAt === 'string') update.nextActionAt = body.nextActionAt.slice(0, 30);
    if (typeof body.notes === 'string') update.notes = body.notes.trim().slice(0, 10000);
    if (typeof body.estimatedValue === 'number' && Number.isFinite(body.estimatedValue)) {
      update.estimatedValue = Math.max(0, body.estimatedValue);
    }

    const lead = await updateLead(id, update);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Lead update failed', error);
    return NextResponse.json({ error: 'Unable to update lead.' }, { status: 500 });
  }
}
