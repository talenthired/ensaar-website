import { NextRequest, NextResponse } from 'next/server';
import {
  absoluteCertificateAsset,
  certificateServiceUrl,
  normalizeCertificateNumber,
} from '@/lib/certificates';

export const dynamic = 'force-dynamic';

const POST_ACTIONS = new Set(['request-otp', 'verify-otp', 'resend-otp']);

function upstreamPath(action: string, certificateNumber?: string) {
  if (action === 'search' && certificateNumber) {
    return `/api/certificates/search/${encodeURIComponent(certificateNumber)}`;
  }
  return `/api/verify/${action}`;
}

async function readUpstream(response: Response) {
  const data = (await response.json().catch(() => ({ error: 'Certificate service returned an invalid response.' }))) as Record<string, unknown>;
  const certificate = data.certificate as Record<string, unknown> | undefined;
  if (certificate?.certificateImage) {
    certificate.certificateImage = absoluteCertificateAsset(certificate.certificateImage);
  }
  return NextResponse.json(data, {
    status: response.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function callCertificateService(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${certificateServiceUrl}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
    return readUpstream(response);
  } catch {
    return NextResponse.json(
      { error: 'Certificate verification is temporarily unavailable. Please try again shortly.' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (action !== 'search') {
    return NextResponse.json({ error: 'Unsupported verification action.' }, { status: 404 });
  }

  const certificateNumber = normalizeCertificateNumber(
    request.nextUrl.searchParams.get('certificateNumber'),
  );
  if (!certificateNumber) {
    return NextResponse.json({ error: 'Enter a valid certificate number.' }, { status: 400 });
  }

  return callCertificateService(upstreamPath(action, certificateNumber));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!POST_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Unsupported verification action.' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const certificateNumber = normalizeCertificateNumber(body?.certificateNumber);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const otp = typeof body?.otp === 'string' ? body.otp.replace(/\D/g, '').slice(0, 6) : undefined;

  if (!certificateNumber || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: 'A valid certificate number and email address are required.' },
      { status: 400 },
    );
  }
  if (action === 'verify-otp' && otp?.length !== 6) {
    return NextResponse.json({ error: 'Enter the 6-digit verification code.' }, { status: 400 });
  }

  return callCertificateService(upstreamPath(action), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, certificateNumber, ...(otp ? { otp } : {}) }),
  });
}
