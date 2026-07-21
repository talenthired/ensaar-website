export const certificateServiceUrl = (
  process.env.CERTIFICATE_API_URL || 'https://verify.ensaar.com'
).replace(/\/+$/, '');

export type CertificateSearchResult = {
  found: true;
  certificateNumber: string;
  recipientName: string;
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
