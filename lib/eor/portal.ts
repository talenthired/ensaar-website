import 'server-only';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { agreementToText } from './agreement';
import { currentAgreement, getClientByToken, getSignedAgreementText, listDocuments, type EorClient } from './store';
import { missingRequiredDocuments } from './onboarding';

/**
 * The customer's link is ensaar.com/onboard#<token>. The token lives in the URL
 * fragment, which browsers never send to a server, never put in a Referer, and
 * which analytics and request logs do not see. The page reads it and sends it
 * to these routes in this header, so it never appears in a URL at all.
 */
export const TOKEN_HEADER = 'x-onboarding-token';

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

const NOT_FOUND = 'This onboarding link is not valid or has expired. Ask Ensaar for a new one.';

type Gate = { ok: true; client: EorClient } | { ok: false; response: Response };

/**
 * Throttle, then resolve the caller's token to its client.
 *
 * The throttle is keyed per token as well as per address. Without a trusted
 * proxy header every visitor shares one address bucket, and a global bucket
 * would let a stranger lock the real customer out of signing. Keyed per token,
 * only someone holding this customer's link can use up this customer's
 * allowance, and a guessed token (256 bits) gains nothing from its own bucket.
 *
 * Wrong, expired and cancelled links all get the same 404.
 */
export async function portalGate(
  request: Request,
  scope: string,
  limit: number,
): Promise<Gate> {
  const token = request.headers.get(TOKEN_HEADER) ?? '';
  if (!TOKEN_SHAPE.test(token)) {
    return { ok: false, response: NextResponse.json({ error: NOT_FOUND }, { status: 404 }) };
  }
  const bucket = createHash('sha256').update(token).digest('hex').slice(0, 16);
  const allowed = await rateLimit(clientKey(request, `onboard-${scope}:${bucket}`), limit, 10 * 60 * 1000);
  if (!allowed.ok) return { ok: false, response: tooManyRequests(allowed.retryAfter, 'Too many requests. Try again shortly.') };

  const client = await getClientByToken(token).catch(() => null);
  if (!client) return { ok: false, response: NextResponse.json({ error: NOT_FOUND }, { status: 404 }) };
  return { ok: true, client };
}

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * What the customer sees. Deliberately a subset of the record: no internal
 * notes and no signer IP.
 */
export async function portalView(client: EorClient) {
  const documents = await listDocuments(client.id);
  const signed = Boolean(client.signedAt);
  const agreement = currentAgreement(client);
  const draftText = agreementToText(agreement);
  return {
    status: client.status,
    expiresAt: client.tokenExpiresAt,
    hire: {
      companyName: client.companyName,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      employeeName: client.employeeName,
      jobTitle: client.jobTitle,
      salaryInr: client.salaryInr,
      startDate: client.startDate,
      workState: client.workState,
      monthlyFeeUsd: client.monthlyFeeUsd,
    },
    company: client.company,
    documents,
    missingDocuments: missingRequiredDocuments(documents.map((d) => d.kind)).map((d) => d.kind),
    agreement,
    // After signing, the stored snapshot is the agreement, not today's template.
    agreementText: signed ? await getSignedAgreementText(client.id) : draftText,
    // Sent back when signing, so the server can refuse if the text changed after
    // the customer read it (a template deploy, or an edit in another tab).
    draftHash: signed ? null : hashText(draftText),
    signature: signed
      ? {
          name: client.signedName,
          title: client.signedTitle,
          at: client.signedAt,
          hash: client.agreementHash,
          version: client.agreementVersion,
          countersignedBy: client.countersignedBy,
          countersignedAt: client.countersignedAt,
        }
      : null,
  };
}

export type PortalView = Awaited<ReturnType<typeof portalView>>;

/**
 * The signer's network origin, recorded as evidence rather than used for any
 * decision. A trusted edge header when present; otherwise the whole
 * x-forwarded-for chain as received. The chain's left-most entry can be forged
 * by the client, but the entries appended by Railway's proxy cannot, so keeping
 * all of it is more useful evidence than keeping none.
 */
export function signerNetwork(request: Request): string | null {
  const edge = request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-forwarded-for');
  const chain = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  return (edge || chain || null)?.slice(0, 200) ?? null;
}
