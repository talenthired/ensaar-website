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

describe('when an employee can be contacted', () => {
  it('needs the client to have signed the agreement, and their Schedule A to have been sent', async () => {
    const { employeeContactable } = await import('@/lib/eor/onboarding');
    expect(employeeContactable('draft', 'active')).toBe(false);
    expect(employeeContactable('awaiting_signature', 'onboarding')).toBe(false);
    expect(employeeContactable('awaiting_signature', 'signed')).toBe(true);
    expect(employeeContactable('awaiting_signature', 'active')).toBe(true);
    expect(employeeContactable('onboarding', 'active')).toBe(true);
    expect(employeeContactable('cancelled', 'active')).toBe(false);
  });
});
