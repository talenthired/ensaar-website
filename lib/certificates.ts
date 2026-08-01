export const certificateServiceUrl = (
  process.env.CERTIFICATE_API_URL || 'https://verify.ensaar.com'
).replace(/\/+$/, '');

export type CertificateSearchResult = {
  found: true;
  certificateNumber: string;
  status: 'active' | 'expired' | 'revoked';
};

export type VerifiedCertificate = {
  certificateNumber: string;
  recipientName: string;
  recipientEmail?: string;
  purpose: string;
  description?: string;
  issueDate: string;
  validFrom?: string;
  validUntil?: string;
  isLifetime: boolean;
  issuerName: string;
  issuerDesignation?: string;
  organizationName: string;
  status: 'active' | 'expired' | 'revoked';
  verificationCount?: number;
  certificateImage?: string;
};

export function normalizeCertificateNumber(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9-]{6,64}$/.test(normalized) ? normalized : null;
}

export function absoluteCertificateAsset(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  return `${certificateServiceUrl}/${value.replace(/^\/+/, '')}`;
}

/** The public lookup step proves only that a registry record exists. PII stays behind OTP. */
export function publicCertificateSearchResult(payload: Record<string, unknown>): CertificateSearchResult {
  const source = payload.certificate && typeof payload.certificate === 'object'
    ? payload.certificate as Record<string, unknown>
    : payload;
  const certificateNumber = normalizeCertificateNumber(source.certificateNumber ?? payload.certificateNumber);
  const status = source.status ?? payload.status;
  if (!certificateNumber || !['active', 'expired', 'revoked'].includes(String(status))) {
    throw new Error('Certificate service returned an invalid search response.');
  }
  return {
    found: true,
    certificateNumber,
    status: status as CertificateSearchResult['status'],
  };
}
