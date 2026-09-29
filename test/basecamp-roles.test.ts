import { describe, expect, it } from 'vitest';
import { ROLES, can, canManageUser, type Role } from '@/lib/basecamp/roles';

/**
 * The permission table is the whole access policy for Basecamp, so it is asserted
 * directly rather than inferred from the UI. Every route calls can() or
 * canManageUser(); if these drift, a viewer silently gains the ability to delete
 * an event and nothing else would catch it.
 */
describe('role permissions', () => {
  it('gives an owner everything', () => {
    for (const permission of ['users:manage', 'events:delete', 'audit:read'] as const) {
      expect(can('owner', permission), permission).toBe(true);
    }
  });

  it('lets an editor change events but not people', () => {
    expect(can('editor', 'events:write')).toBe(true);
    expect(can('editor', 'registrations:write')).toBe(true);
    expect(can('editor', 'events:delete')).toBe(false);
    expect(can('editor', 'users:read')).toBe(false);
    expect(can('editor', 'users:invite')).toBe(false);
  });

  it('keeps a viewer read-only', () => {
    expect(can('viewer', 'events:read')).toBe(true);
    expect(can('viewer', 'registrations:read')).toBe(true);
    for (const permission of ['events:write', 'events:delete', 'registrations:write', 'users:invite'] as const) {
      expect(can('viewer', permission), permission).toBe(false);
    }
  });

  it('refuses an unknown or absent role', () => {
    expect(can(null, 'events:read')).toBe(false);
    expect(can(undefined, 'events:read')).toBe(false);
    expect(can('nonsense' as Role, 'events:read')).toBe(false);
  });
});

describe('canManageUser', () => {
  const owner = { id: 'o1', role: 'owner' as Role };
  const admin = { id: 'a1', role: 'admin' as Role };
  const editor = { id: 'e1', role: 'editor' as Role };

  it('stops anyone changing their own access', () => {
    // Otherwise the last owner can demote themselves and lock the platform.
    expect(canManageUser(owner, { id: 'o1', role: 'owner' }).ok).toBe(false);
  });

  it('stops an admin touching an owner', () => {
    expect(canManageUser(admin, { id: 'o1', role: 'owner' }).ok).toBe(false);
  });

  it('stops an admin minting an owner', () => {
    expect(canManageUser(admin, { id: 'e1', role: 'editor' }, 'owner').ok).toBe(false);
  });

  it('lets an owner promote someone to owner', () => {
    expect(canManageUser(owner, { id: 'e1', role: 'editor' }, 'owner').ok).toBe(true);
  });

  it('lets an admin manage a non-owner', () => {
    expect(canManageUser(admin, { id: 'e1', role: 'editor' }, 'viewer').ok).toBe(true);
  });

  it('refuses someone without the manage permission outright', () => {
    expect(canManageUser(editor, { id: 'a1', role: 'admin' }).ok).toBe(false);
  });

  it('covers every declared role', () => {
    expect(ROLES).toEqual(['owner', 'admin', 'editor', 'viewer']);
  });
});
