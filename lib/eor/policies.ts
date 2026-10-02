import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue } from '@/lib/notify/outbox';
import { sha256 } from './companies';
import { handbookAcknowledgedEmail, handbookPublishedEmail } from './email';
import type { EorEmployee } from './employees';
import { HANDBOOK_CHANGES, HANDBOOK_VERSION, POSH_INTERNAL_COMMITTEE_FROM, buildHandbook, handbookToText } from './handbook';
import { EMPLOYEE_CONTACTABLE, knownAs, signatureMatches } from './onboarding';
import { ok, refuse, type Outcome } from './outcome';
import { signedPdfAttachment } from './signed-pdf';
import { markStep } from './team';

/*
 * The Employee Handbook in use: Ensaar publishes a version (its text frozen and
 * fingerprinted once, after the owner records sign-off), every employee
 * acknowledges that exact text in the portal, and night-work consent sits
 * alongside it. Acknowledging is a receipt, not a contract signature.
 */

type Executor = postgres.Sql | postgres.TransactionSql;

/** The approval key for a handbook version in ensaar_eor_template_approvals. */
export const handbookApprovalKey = (version = HANDBOOK_VERSION) => `handbook:${version}`;

export type PublishedHandbook = { version: string; text: string; hash: string; issuedBy: string; publishedBy: string; publishedAt: string };

type VersionRow = { version: string; text: string; hash: string; issued_by: string; published_by: string; published_at: Date };
const toPublished = (r: VersionRow): PublishedHandbook => ({
  version: r.version, text: r.text, hash: r.hash, issuedBy: r.issued_by, publishedBy: r.published_by, publishedAt: r.published_at.toISOString(),
});

/** The handbook text as it would be published now. */
export function draftHandbookText(issuedBy: string, employeeCount: number): string {
  return handbookToText(buildHandbook({ internalCommittee: employeeCount >= POSH_INTERNAL_COMMITTEE_FROM, issuedBy }));
}

/** Ensaar's current headcount: employees not cancelled or exited. Decides the POSH wording. */
export async function employeeCount(sql: Executor = db()): Promise<number> {
  if (!hasDatabase()) return 0;
  const [{ n }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ensaar_eor_employees WHERE status NOT IN ('draft', 'cancelled', 'exited')`;
  return n;
}

/** The latest published version, or null before the first is published. */
export async function currentHandbook(sql: Executor = db()): Promise<PublishedHandbook | null> {
  if (!hasDatabase()) return null;
  const [row] = await sql<VersionRow[]>`SELECT version, text, hash, issued_by, published_by, published_at FROM ensaar_policy_versions ORDER BY published_at DESC LIMIT 1`;
  return row ? toPublished(row) : null;
}

/**
 * Publish the current handbook version: freeze its text, then email every
 * employee Ensaar may contact who has not acknowledged it. Needs the owner's
 * sign-off for this version first.
 */
export async function publishHandbook(input: { issuedBy: string; publishedBy: string }): Promise<Outcome<{ handbook: PublishedHandbook; emailed: number }>> {
  return requireDatabase().begin(async (tx) => {
    const [approval] = await tx`SELECT 1 FROM ensaar_eor_template_approvals WHERE version = ${handbookApprovalKey()}`;
    if (!approval) return refuse(423, `Record the sign-off for handbook version ${HANDBOOK_VERSION} first.`);
    const [existing] = await tx<VersionRow[]>`SELECT version, text, hash, issued_by, published_by, published_at FROM ensaar_policy_versions WHERE version = ${HANDBOOK_VERSION}`;
    if (existing) return refuse(409, `Version ${HANDBOOK_VERSION} is already published.`);
    const previous = await currentHandbook(tx);
    const text = draftHandbookText(input.issuedBy, await employeeCount(tx));
    const [row] = await tx<VersionRow[]>`
      INSERT INTO ensaar_policy_versions (version, text, hash, issued_by, published_by)
      VALUES (${HANDBOOK_VERSION}, ${text}, ${sha256(text)}, ${input.issuedBy}, ${input.publishedBy})
      RETURNING version, text, hash, issued_by, published_by, published_at
    `;
    // Everyone Ensaar may contact: their client signed, their Schedule A was sent, they have an email.
    const people = await tx<{ id: string; employee_name: string; business_name: string | null; employee_email: string }[]>`
      SELECT e.id, e.employee_name, e.business_name, e.employee_email FROM ensaar_eor_employees e
      JOIN ensaar_eor_companies c ON c.id = e.company_id
      WHERE e.employee_email IS NOT NULL AND e.status IN ${tx(EMPLOYEE_CONTACTABLE as unknown as string[])} AND c.status IN ('signed', 'active')
    `;
    const changes = HANDBOOK_CHANGES.find((c) => c.version === HANDBOOK_VERSION)?.summary ?? '';
    for (const p of people) {
      await enqueue(tx, {
        kind: 'team.handbook.published',
        to: [p.employee_email],
        relatedId: p.id,
        dedupeKey: `team.handbook.published:${HANDBOOK_VERSION}:${p.id}`,
        ...handbookPublishedEmail({ name: knownAs({ employeeName: p.employee_name, businessName: p.business_name }), version: HANDBOOK_VERSION, first: !previous, changes }),
      });
    }
    return ok({ handbook: toPublished(row!), emailed: people.length });
  });
}

export type HandbookStatus = {
  current: { version: string; hash: string; publishedAt: string } | null;
  acknowledged: { version: string; at: string } | null;
  /** True when the current version still needs this employee's acknowledgement. */
  pending: boolean;
  nightWork: { consented: boolean; at: string } | null;
};

export async function handbookStatus(employeeId: string, sql: Executor = db()): Promise<HandbookStatus> {
  if (!hasDatabase()) return { current: null, acknowledged: null, pending: false, nightWork: null };
  const [current, acks, consent] = await Promise.all([
    currentHandbook(sql),
    sql<{ version: string; acknowledged_at: Date }[]>`SELECT version, acknowledged_at FROM ensaar_policy_acknowledgements WHERE employee_id = ${employeeId} ORDER BY acknowledged_at DESC`,
    sql<{ consented: boolean; updated_at: Date }[]>`SELECT consented, updated_at FROM ensaar_night_work_consents WHERE employee_id = ${employeeId}`,
  ]);
  const latest = acks[0] ? { version: acks[0].version, at: acks[0].acknowledged_at.toISOString() } : null;
  return {
    current: current ? { version: current.version, hash: current.hash, publishedAt: current.publishedAt } : null,
    acknowledged: latest,
    pending: Boolean(current && !acks.some((a) => a.version === current.version)),
    nightWork: consent[0] ? { consented: consent[0].consented, at: consent[0].updated_at.toISOString() } : null,
  };
}

/**
 * The employee acknowledges the current version, as shown to them (the hash),
 * typing their legal name. Ticks the checklist and emails them a PDF copy.
 */
export async function acknowledgeHandbook(
  employee: EorEmployee,
  input: { hash: string; name: string; ip: string | null; userAgent: string | null },
): Promise<Outcome<{ version: string }>> {
  return requireDatabase().begin(async (tx) => {
    const current = await currentHandbook(tx);
    if (!current) return refuse(404, 'There is no handbook to acknowledge yet.');
    if (current.hash !== input.hash) return refuse(409, 'The handbook changed since you opened it. Please read the current version.', { changed: true });
    if (!signatureMatches(input.name, employee.employeeName)) return refuse(400, `Type your full legal name, ${employee.employeeName}, to acknowledge.`);
    const [done] = await tx`SELECT 1 FROM ensaar_policy_acknowledgements WHERE employee_id = ${employee.id} AND version = ${current.version}`;
    if (done) return refuse(409, 'You have already acknowledged this version.');
    await tx`
      INSERT INTO ensaar_policy_acknowledgements (id, employee_id, version, hash, typed_name, ip, user_agent)
      VALUES (${randomUUID()}, ${employee.id}, ${current.version}, ${current.hash}, ${input.name}, ${input.ip}, ${input.userAgent})
    `;
    const at = new Date().toISOString();
    await enqueue(tx, {
      kind: 'team.handbook.acknowledged',
      to: [employee.employeeEmail!],
      relatedId: employee.id,
      dedupeKey: `team.handbook.acknowledged:${current.version}:${employee.id}`,
      attachments: [
        await signedPdfAttachment(
          `Ensaar-Employee-Handbook-${current.version}.pdf`,
          [`${current.text}\n\nACKNOWLEDGED\nAcknowledged electronically by ${input.name} <${employee.employeeEmail}> at ${at} (UTC), signed in to the Ensaar employee portal as that address.\n\nDocument fingerprint (SHA-256): ${current.hash}`],
          `Ensaar Employee Handbook ${current.version}`,
        ),
      ],
      ...handbookAcknowledgedEmail({ name: knownAs(employee), version: current.version }),
    });
    await markStep(tx, employee, 'handbook', 'Employee portal');
    return ok({ version: current.version });
  });
}

/** Give or withdraw consent to work after 8:30 pm India time. */
export async function setNightWorkConsent(employeeId: string, consented: boolean): Promise<void> {
  await requireDatabase()`
    INSERT INTO ensaar_night_work_consents (employee_id, consented) VALUES (${employeeId}, ${consented})
    ON CONFLICT (employee_id) DO UPDATE SET consented = EXCLUDED.consented, updated_at = NOW()
  `;
}

export type HandbookRosterRow = {
  employeeId: string;
  name: string;
  companyName: string;
  status: string;
  acknowledgedVersion: string | null;
  acknowledgedAt: string | null;
  nightWork: boolean | null;
};

/** Who has acknowledged what, for Basecamp. */
export async function handbookRoster(): Promise<HandbookRosterRow[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<{
    id: string; employee_name: string; business_name: string | null; company_name: string | null; status: string;
    version: string | null; acknowledged_at: Date | null; consented: boolean | null;
  }[]>`
    SELECT e.id, e.employee_name, e.business_name, COALESCE(c.company->>'legalName', c.company_name) AS company_name, e.status,
           a.version, a.acknowledged_at, n.consented
    FROM ensaar_eor_employees e
    JOIN ensaar_eor_companies c ON c.id = e.company_id
    LEFT JOIN LATERAL (
      SELECT version, acknowledged_at FROM ensaar_policy_acknowledgements WHERE employee_id = e.id ORDER BY acknowledged_at DESC LIMIT 1
    ) a ON TRUE
    LEFT JOIN ensaar_night_work_consents n ON n.employee_id = e.id
    WHERE e.status NOT IN ('draft', 'cancelled', 'exited')
    ORDER BY e.employee_name
  `;
  return rows.map((r) => ({
    employeeId: r.id,
    name: r.business_name ? `${r.employee_name} (${r.business_name})` : r.employee_name,
    companyName: r.company_name ?? '',
    status: r.status,
    acknowledgedVersion: r.version,
    acknowledgedAt: r.acknowledged_at?.toISOString() ?? null,
    nightWork: r.consented,
  }));
}
