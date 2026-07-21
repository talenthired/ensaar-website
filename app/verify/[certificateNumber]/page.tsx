import type { Metadata } from 'next';
import { VerificationPage } from '@/app/verify/page';
import { pageMetadata } from '@/lib/metadata';
import { normalizeCertificateNumber } from '@/lib/certificates';

export const metadata: Metadata = pageMetadata({
  title: 'Validate an Ensaar Credential',
  description: 'Validate an Ensaar Global certificate against the official registry and review its current credential status.',
  path: '/verify',
});

export default async function CertificateDeepLinkPage({ params }: { params: Promise<{ certificateNumber: string }> }) {
  const { certificateNumber } = await params;
  return <VerificationPage initialCertificateNumber={normalizeCertificateNumber(decodeURIComponent(certificateNumber)) || ''} />;
}
