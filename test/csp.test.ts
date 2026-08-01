import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from '@/lib/csp';

describe('content security policy', () => {
  it('uses a request nonce instead of unsafe-inline scripts in production', () => {
    const csp = buildContentSecurityPolicy('test-nonce', false);
    expect(csp).toContain("'nonce-test-nonce'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
