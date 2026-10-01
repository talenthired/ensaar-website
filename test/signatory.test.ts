import { afterEach, describe, expect, it } from 'vitest';
import { requireSignatory } from '@/lib/basecamp/actor';

const session = (email: string, bootstrap = false) => ({ userId: 'u', email, name: 'x', role: 'owner' as const, bootstrap });

describe("Ensaar's authorised signatory", () => {
  afterEach(() => delete process.env.EOR_SIGNATORY_EMAIL);

  it('lets only the named signatory sign for Ensaar, whatever their role', () => {
    process.env.EOR_SIGNATORY_EMAIL = 'shanimole@ensaar.com';
    expect(requireSignatory(session('shanimole@ensaar.com'))).toBe(null);
    expect(requireSignatory(session('Shanimole@Ensaar.com'))).toBe(null);
    expect(requireSignatory(session('owner@ensaar.com'))?.status).toBe(403);
    expect(requireSignatory(session('shanimole@ensaar.com', true))?.status).toBe(403);
  });

  it('falls back to any named staff member when no signatory is set', () => {
    expect(requireSignatory(session('owner@ensaar.com'))).toBe(null);
  });
});
