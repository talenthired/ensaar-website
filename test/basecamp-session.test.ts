import { afterEach, describe, expect, it, vi } from 'vitest';
import { BASECAMP_COOKIE, createBasecampToken, verifyBasecampPassword, verifyBasecampToken } from '@/lib/basecamp/auth';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Basecamp sessions', () => {
  it('issues distinct, server-verifiable session tokens', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BASECAMP_PASSWORD', 'correct horse battery staple');
    vi.stubEnv('BASECAMP_SECRET', 'test-secret');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const first = await createBasecampToken();
    const second = await createBasecampToken();

    expect(first).not.toBe(second);
    await expect(verifyBasecampToken(first)).resolves.toBe(true);
    await expect(verifyBasecampToken(second)).resolves.toBe(true);
    expect(BASECAMP_COOKIE).toBe('ensaar_basecamp');
  });
});

/**
 * Regression found reviewing the SEC-002 remediation.
 *
 * The password check compared JS string length and then handed both strings to
 * timingSafeEqual, which throws when the buffers differ in size. UTF-8 makes
 * those two lengths different things.
 */
describe('verifyBasecampPassword: byte-safe comparison', () => {
  const previous = process.env.BASECAMP_PASSWORD;
  afterEach(() => {
    if (previous === undefined) delete process.env.BASECAMP_PASSWORD;
    else process.env.BASECAMP_PASSWORD = previous;
  });

  it('returns false instead of throwing on a same-length, different-byte guess', () => {
    // 'é!' is two characters but three UTF-8 bytes. A two-character ASCII guess
    // passed the length check and then crashed the comparison, turning the login
    // route into a 500 and leaking that the real password is not plain ASCII.
    process.env.BASECAMP_PASSWORD = 'é!';
    expect(() => verifyBasecampPassword('ab')).not.toThrow();
    expect(verifyBasecampPassword('ab')).toBe(false);
  });

  it('still accepts the exact password and rejects a wrong one', () => {
    process.env.BASECAMP_PASSWORD = 'é!';
    expect(verifyBasecampPassword('é!')).toBe(true);
    expect(verifyBasecampPassword('é?')).toBe(false);
    expect(verifyBasecampPassword('')).toBe(false);
  });

  it('rejects everything when no password is configured', () => {
    // Production with nothing configured must admit nobody, not everybody. The
    // development fallback password must not leak into a deployed environment.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BASECAMP_PASSWORD', '');
    vi.stubEnv('LEAD_PORTAL_PASSWORD', '');
    expect(verifyBasecampPassword('')).toBe(false);
    expect(verifyBasecampPassword('anything')).toBe(false);
    expect(verifyBasecampPassword('ensaar-local')).toBe(false);
  });
});
