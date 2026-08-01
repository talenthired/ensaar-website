import { describe, expect, it } from 'vitest';
import { publicCertificateSearchResult } from '@/lib/certificates';

describe('certificate search privacy', () => {
  it('does not disclose recipient PII before OTP verification', () => {
    const result = publicCertificateSearchResult({
      found: true,
      certificateNumber: 'ENSAAR-2026-ABC123',
      recipientName: 'Ada Lovelace',
      recipientEmail: 'ada@example.com',
      status: 'active',
    });
    expect(result).toEqual({ found: true, certificateNumber: 'ENSAAR-2026-ABC123', status: 'active' });
    expect(JSON.stringify(result)).not.toContain('Ada');
    expect(JSON.stringify(result)).not.toContain('example.com');
  });
});
