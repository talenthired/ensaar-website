import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientKey } from '@/lib/rate-limit';

afterEach(() => { vi.unstubAllEnvs(); });

describe('client identification', () => {
  it('does not trust a caller-provided X-Forwarded-For header in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const one = clientKey(new Request('https://ensaar.com/api/leads', { headers: { 'x-forwarded-for': '203.0.113.2' } }), 'lead');
    const two = clientKey(new Request('https://ensaar.com/api/leads', { headers: { 'x-forwarded-for': '198.51.100.9' } }), 'lead');
    expect(one).toBe(two);
    expect(one).not.toContain('203.0.113.2');
  });
});
