/**
 * Basecamp roles and what each one may do.
 *
 * Permissions are a capability set rather than a rank comparison, so a route asks
 * "may this person do X" instead of "is this person at least an admin". Rank
 * checks spread the policy across every call site and drift; this keeps it in one
 * table that can be read top to bottom.
 *
 * No 'server-only' import: the panel needs these labels to decide what to render.
 * Rendering is presentation, never the boundary — every mutation re-checks on the
 * server.
 */

export const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'users:read',
  'users:invite',
  /** Change someone's role, deactivate or reactivate them. */
  'users:manage',
  'events:read',
  'events:write',
  'events:delete',
  'registrations:read',
  'registrations:write',
  'leads:read',
  'leads:write',
  'audit:read',
  /** EOR customers: salaries, EINs and signed agreements, so owners and admins only. */
  'clients:read',
  'clients:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [
    'users:read',
    'users:invite',
    'users:manage',
    'events:read',
    'events:write',
    'events:delete',
    'registrations:read',
    'registrations:write',
    'leads:read',
    'leads:write',
    'audit:read',
    'clients:read',
    'clients:write',
  ],
  editor: ['events:read', 'events:write', 'registrations:read', 'registrations:write', 'leads:read', 'leads:write'],
  viewer: ['events:read', 'registrations:read', 'leads:read'],
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Full access, including managing other owners and admins.',
  admin: 'Manage people, events, registrations and EOR clients.',
  editor: 'Create and edit events, manage registrations.',
  viewer: 'Read-only access to events, registrations and leads.',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Who may act on whom.
 *
 * Only an owner can create or modify another owner, so an admin cannot promote
 * themselves past their own ceiling or demote the person who invited them. Nobody
 * may change their own role, which is what stops the last owner from accidentally
 * locking everyone out of owner-only actions.
 */
export function canManageUser(
  actor: { id: string; role: Role },
  target: { id: string; role: Role },
  nextRole?: Role,
): { ok: true } | { ok: false; reason: string } {
  if (!can(actor.role, 'users:manage')) return { ok: false, reason: 'Not allowed.' };
  if (actor.id === target.id) return { ok: false, reason: 'You cannot change your own access.' };
  if (target.role === 'owner' && actor.role !== 'owner') {
    return { ok: false, reason: 'Only an owner can change another owner.' };
  }
  if (nextRole === 'owner' && actor.role !== 'owner') {
    return { ok: false, reason: 'Only an owner can grant owner access.' };
  }
  return { ok: true };
}
