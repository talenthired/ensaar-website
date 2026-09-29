import 'server-only';

import { randomUUID } from 'node:crypto';
import { db, hasDatabase } from '@/lib/db/client';

export type AuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Record an administrative action. Best-effort: an audit write must never be the
 * reason a legitimate action fails, but user management without a trail of who
 * changed whose access is not management.
 */
export async function writeAudit(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await db()`
      INSERT INTO ensaar_audit (id, actor_id, actor_email, action, target, metadata)
      VALUES (${randomUUID()}, ${input.actorId ?? null}, ${input.actorEmail ?? null},
              ${input.action}, ${input.target ?? null},
              ${input.metadata ? db().json(input.metadata as never) : null})
    `;
  } catch {
    /* never block the action being audited */
  }
}

export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<
    { id: string; actor_email: string | null; action: string; target: string | null; metadata: Record<string, unknown> | null; created_at: Date }[]
  >`
    SELECT id, actor_email, action, target, metadata, created_at
    FROM ensaar_audit ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    target: r.target,
    metadata: r.metadata,
    createdAt: r.created_at.toISOString(),
  }));
}
