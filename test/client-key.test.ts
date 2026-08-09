import { describe, expect, it, afterEach, vi } from 'vitest';
import { clientKey } from '@/lib/rate-limit';

/**
 * Every visitor must get their own rate-limit bucket.
 *
 * `x-forwarded-for` used to be read only outside production, so on any host that
 * is not Vercel or Cloudflare the production site hashed every visitor to
 * "unknown" and shared a single bucket. With lead submission capped at five per
 * hour, that meant five leads per hour across all traffic, after which every
 * genuine prospect saw "Too many submissions". The failure is silent: each
 * visitor simply believes they were rate limited.
 */

const req = (headers: Record<string, string>) => new Request('https://ensaar.com/api/leads', { headers });

afterEach(() => vi.unstubAllEnvs());

describe('clientKey', () => {
  it('separates visitors by x-forwarded-for in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const a = clientKey(req({ 'x-forwarded-for': '203.0.113.7' }), 'lead-submit');
    const b = clientKey(req({ 'x-forwarded-for': '198.51.100.4' }), 'lead-submit');
    expect(a).not.toBe(b);
  });

  it('takes the originating client, not a proxy hop', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const viaProxy = clientKey(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' }), 'lead-submit');
    const direct = clientKey(req({ 'x-forwarded-for': '203.0.113.7' }), 'lead-submit');
    expect(viaProxy).toBe(direct);
  });

  it('prefers the headers a proxy owns over the forgeable one', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cf = clientKey(req({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4' }), 's');
    const plain = clientKey(req({ 'x-forwarded-for': '203.0.113.7' }), 's');
    expect(cf).toBe(plain);
  });

  it('falls back to x-real-ip', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const a = clientKey(req({ 'x-real-ip': '203.0.113.7' }), 's');
    const b = clientKey(req({ 'x-real-ip': '198.51.100.4' }), 's');
    expect(a).not.toBe(b);
  });

  it('scopes buckets so one endpoint cannot exhaust another', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const lead = clientKey(req({ 'x-forwarded-for': '203.0.113.7' }), 'lead-submit');
    const login = clientKey(req({ 'x-forwarded-for': '203.0.113.7' }), 'basecamp-login');
    expect(lead).not.toBe(login);
  });

  it('still yields a stable key when nothing identifies the caller', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(clientKey(req({}), 's')).toBe(clientKey(req({}), 's'));
  });

  it('never puts a raw address in the key', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(clientKey(req({ 'x-forwarded-for': '203.0.113.7' }), 's')).not.toContain('203.0.113.7');
  });
});
