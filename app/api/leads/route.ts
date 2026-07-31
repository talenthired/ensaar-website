import { NextRequest, NextResponse } from 'next/server';
import { createLead, listLeads } from '@/lib/leads/store';
import { BASECAMP_COOKIE, verifyBasecampToken } from '@/lib/basecamp/auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import type { NewLead } from '@/lib/leads/types';

export const runtime = 'nodejs';

// The lead form is public and writes to storage, so it needs a ceiling on top of
// the honeypot below. Five submissions an hour is far above genuine use and well
// below what makes flooding the inbox worthwhile.
const MAX_SUBMISSIONS = 5;
const WINDOW_MS = 60 * 60 * 1000;

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKey(request, 'lead-submit'), MAX_SUBMISSIONS, WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter, 'Too many submissions. Please try again later.');
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (clean(body.website)) return NextResponse.json({ ok: true }, { status: 202 });

    const email = clean(body.email, 200).toLowerCase();
    const input: NewLead = {
      name: clean(body.name, 120),
      email,
      phone: clean(body.phone, 80),
      company: clean(body.company, 160),
      workType: clean(body.workType, 160),
      audience: clean(body.audience, 160),
      adoptionStage: clean(body.adoptionStage, 160),
      leadSource: clean(body.leadSource, 100),
      currentCost: clean(body.currentCost, 100),
      timeline: clean(body.timeline, 100),
      details: clean(body.details || body.message, 5000),
      sourcePath: clean(body.sourcePath, 500),
      landingPage: clean(body.landingPage, 1000),
      referrer: clean(body.referrer, 1000),
      utmSource: clean(body.utmSource, 200),
      utmMedium: clean(body.utmMedium, 200),
      utmCampaign: clean(body.utmCampaign, 200),
      calculator:
        body.calculator && typeof body.calculator === 'object'
          ? (body.calculator as Record<string, number>)
          : undefined,
    };

    if (!input.name || !input.workType || !input.details || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Please complete the required fields.' }, { status: 400 });
    }

    const lead = await createLead(input);
    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error('Lead submission failed', error);
    return NextResponse.json(
      { error: 'The request could not be saved. Please email info@ensaar.com.' },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest) {
  if (!verifyBasecampToken(request.cookies.get(BASECAMP_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ leads: await listLeads() });
  } catch (error) {
    console.error('Lead list failed', error);
    return NextResponse.json({ error: 'Unable to load leads.' }, { status: 500 });
  }
}
