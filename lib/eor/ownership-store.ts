import 'server-only';

import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { sha256 } from './companies';
import { todayInIndia } from './onboarding';
import { ok, refuse, type Outcome } from './outcome';
import { ownershipText, type Controller, type Owner, type OwnershipInput } from './ownership';

type Executor = postgres.Sql | postgres.TransactionSql;

export type OwnershipDeclaration = OwnershipInput & { declaredName: string; declaredEmail: string; declaredAt: string; text: string; hash: string };

type Row = {
  owners: Owner[]; no_large_owner: boolean; controller: Controller | null;
  declared_name: string; declared_email: string; declared_at: Date; text: string; hash: string;
};

export async function getOwnership(companyId: string, sql: Executor = db()): Promise<OwnershipDeclaration | null> {
  if (!hasDatabase()) return null;
  const [r] = await sql<Row[]>`
    SELECT owners, no_large_owner, controller, declared_name, declared_email, declared_at, text, hash FROM ensaar_eor_ownership WHERE company_id = ${companyId}
  `;
  return r
    ? { owners: r.owners ?? [], noLargeOwner: r.no_large_owner, controller: r.controller, declaredName: r.declared_name, declaredEmail: r.declared_email, declaredAt: r.declared_at.toISOString(), text: r.text, hash: r.hash }
    : null;
}

/**
 * Record (or replace) the declaration, signed by the person signed in to the
 * portal. The text is frozen and fingerprinted, as an agreement is.
 */
export async function saveOwnership(companyId: string, companyName: string, input: OwnershipInput, signer: { name: string; email: string }): Promise<Outcome<OwnershipDeclaration>> {
  if (signer.name.trim().length < 3) return refuse(400, 'Type your full name to sign the declaration.');
  const text = ownershipText(companyName, input, signer, todayInIndia());
  const hash = sha256(text);
  return requireDatabase().begin(async (tx) => {
    const [company] = await tx`SELECT status FROM ensaar_eor_companies WHERE id = ${companyId} FOR UPDATE`;
    if (!company || company.status === 'cancelled') return refuse(404, 'No such client.');
    await tx`
      INSERT INTO ensaar_eor_ownership (company_id, owners, no_large_owner, controller, declared_name, declared_email, text, hash)
      VALUES (${companyId}, ${tx.json(input.owners as never)}, ${input.noLargeOwner}, ${input.controller ? tx.json(input.controller as never) : null},
              ${signer.name}, ${signer.email}, ${text}, ${hash})
      ON CONFLICT (company_id) DO UPDATE SET owners = EXCLUDED.owners, no_large_owner = EXCLUDED.no_large_owner, controller = EXCLUDED.controller,
        declared_name = EXCLUDED.declared_name, declared_email = EXCLUDED.declared_email, declared_at = NOW(), text = EXCLUDED.text, hash = EXCLUDED.hash
    `;
    return ok((await getOwnership(companyId, tx))!);
  });
}
