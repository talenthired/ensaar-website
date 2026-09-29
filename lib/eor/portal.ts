import 'server-only';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { clientIp, clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { agreementToText } from './agreement';
import {
  currentAgreement,
  getClientByToken,
  getSignedAgreementText,
  getTemplateApproval,
  listDocuments,
  type EorClient,
} from './store';
import { EMPLOYEE_STEPS, missingRequiredDocuments } from './onboarding';
import { emailConfigured } from '@/lib/notify/outbox';

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
 * notes, no signer IP, no reviewer identities.
 */
export async function portalView(client: EorClient) {
  const [documents, approval] = await Promise.all([listDocuments(client.id), getTemplateApproval()]);
  const signed = Boolean(client.signedAt);
  const agreement = currentAgreement(client);
  const draftText = agreementToText(agreement);
  const verified =
    Boolean(client.company) &&
    client.signatoryVerifiedEmail?.toLowerCase() === client.company?.signatoryEmail.toLowerCase();
  return {
    status: client.status,
    expiresAt: client.tokenExpiresAt,
    changesNote: client.status === 'changes_requested' ? client.changesNote : null,
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
    documents: documents.map((d) => ({
      id: d.id,
      kind: d.kind,
      filename: d.filename,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt,
      reviewStatus: d.reviewStatus,
      reviewNote: d.reviewStatus === 'rejected' ? d.reviewNote : null,
    })),
    missingDocuments: missingRequiredDocuments(documents).map((d) => d.kind),
    signatory: {
      verified,
      // Whether the page can offer "email me a code", or must say Ensaar will verify by other means.
      emailAvailable: emailConfigured(),
    },
    // The agreement version has a recorded legal sign-off; until it does, nobody can sign.
    readyToSign: Boolean(approval),
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
    employee: client.employeeCase
      ? {
          dueDate: client.employeeCase.dueDate,
          steps: EMPLOYEE_STEPS.map((s) => ({ key: s.key, label: s.label, done: Boolean(client.employeeCase?.steps[s.key]) })),
        }
      : null,
  };
}

export type PortalView = Awaited<ReturnType<typeof portalView>>;

/**
 * The signer's address for the evidence record: only an address a trusted proxy
 * set (see clientIp), never a header the signer could have typed.
 */
export function signerNetwork(request: Request): string | null {
  return clientIp(request);
}
