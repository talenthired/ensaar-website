import type { Metadata } from 'next';
import { VerificationPage } from '@/app/verify/page';
import { pageMetadata } from '@/lib/metadata';
import { normalizeCertificateNumber } from '@/lib/certificates';

// Deep links carry an arbitrary certificate number, so this route can produce unbounded
// near-duplicate URLs. It canonicalizes to /verify and stays out of the index; `follow`
// keeps the links on the page crawlable.
export const metadata: Metadata = pageMetadata({
  title: 'Validate an Ensaar Credential',
  description: 'Validate an Ensaar Global certificate against the official registry and review its current credential status.',
  path: '/verify',
  noindex: true,
});

export default async function CertificateDeepLinkPage({ params }: { params: Promise<{ certificateNumber: string }> }) {
  const { certificateNumber } = await params;
  return <VerificationPage initialCertificateNumber={normalizeCertificateNumber(decodeURIComponent(certificateNumber)) || ''} />;
}
