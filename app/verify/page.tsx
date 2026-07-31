import type { Metadata } from 'next';
import { BadgeCheck, FileSearch, LockKeyhole } from 'lucide-react';
import { CertificateVerifier } from '@/components/certificates/CertificateVerifier';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, webPageSchema } from '@/components/seo/schemas';
import { Container } from '@/components/ui/Container';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const description = 'Verify an Ensaar Global BCEP or professional certificate against the official registry using its certificate number or QR code.';

const url = `${siteConfig.url}/verify`;
const trail = [
  { name: 'Home', url: siteConfig.url },
  { name: 'Verify a certificate', url },
];

export const metadata: Metadata = pageMetadata({
  title: 'Verify an Ensaar Certificate',
  description,
  path: '/verify',
  eyebrow: 'Credential registry',
  keywords: [
    'Ensaar certificate verification',
    'BCEP certificate lookup',
    'verify credential',
    'certificate number check',
  ],
});

const STEPS = [
  { icon: FileSearch, title: 'Find the record', detail: 'Enter the credential number or scan its QR code.' },
  { icon: LockKeyhole, title: 'Confirm by email', detail: 'Use a one-time code to complete the validation request.' },
  { icon: BadgeCheck, title: 'Review live status', detail: 'See the official holder, purpose, validity, issuer, and current status.' },
] as const;

export default function VerifyCertificatePage() {
  return <VerificationPage />;
}

export function VerificationPage({ initialCertificateNumber = '' }: { initialCertificateNumber?: string }) {
  return (
    <>
      <JsonLd data={[
        webPageSchema({
          name: 'Ensaar Certificate Verification',
          description,
          url,
          breadcrumb: trail,
        }),
        breadcrumbSchema(trail, url),
        {
          '@context': 'https://schema.org',
          '@type': 'EducationalOccupationalCredential',
          name: 'Ensaar professional certificate',
          credentialCategory: 'Ensaar professional certificate',
          url,
          recognizedBy: { '@id': `${siteConfig.url}/#organization` },
        },
      ]} />
      <section className="relative isolate overflow-hidden bg-[#071a34] pb-20 pt-28 text-white md:pb-24 md:pt-36">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-brand" aria-hidden />
        <div className="absolute -right-32 top-10 h-80 w-80 rounded-full border border-cyan-300/10" aria-hidden />
        <div className="absolute -right-16 top-28 h-56 w-56 rounded-full border border-cyan-300/10" aria-hidden />
        <Container className="relative grid gap-10 lg:grid-cols-[0.86fr_0.74fr] lg:items-start lg:gap-x-16 lg:gap-y-8">
          <div className="pt-2 lg:pt-10">
            <div className="text-xs font-semibold uppercase tracking-[0.11em] text-cyan-200">Official credential registry</div>
            <h1 className="mt-7 max-w-3xl text-[clamp(2.8rem,6vw,5.3rem)] leading-[0.98] text-balance">Trust the credential. <span className="text-[#59d8c8]">Verify the evidence.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-200 md:text-xl">Validate a BCEP or Ensaar-issued certificate directly against the official registry. The result shows its current status, validity, issuer, and credential purpose.</p>
          </div>
          <CertificateVerifier initialCertificateNumber={initialCertificateNumber} />
          <div className="border-t border-white/15 lg:col-start-1 lg:row-start-2">
            {STEPS.map(({ icon: Icon, title, detail }, index) => (
              <div key={title} className="grid grid-cols-[32px_1fr] gap-4 border-b border-white/15 py-5">
                <Icon className="mt-0.5 h-5 w-5 text-[#f5a623]" aria-hidden />
                <div><div className="flex items-center gap-3"><span className="font-mono text-[0.6875rem] text-cyan-200">0{index + 1}</span><span className="font-semibold">{title}</span></div><p className="mt-1 text-sm leading-relaxed text-slate-400">{detail}</p></div>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="bg-bg-primary py-16 md:py-20">
        <Container className="grid gap-8 md:grid-cols-3">
          <div><div className="font-mono text-xs text-accent-secondary">01 / AUTHENTICITY</div><h2 className="mt-4 text-2xl">Registry-backed validation</h2><p className="mt-3 text-sm leading-relaxed text-ink-secondary">Results come from Ensaar's certificate registry, not from the visual appearance of an uploaded document.</p></div>
          <div><div className="font-mono text-xs text-accent-secondary">02 / STATUS</div><h2 className="mt-4 text-2xl">Current standing</h2><p className="mt-3 text-sm leading-relaxed text-ink-secondary">A validation checks whether the certificate is active, expired, or revoked at the time of the request.</p></div>
          <div><div className="font-mono text-xs text-accent-secondary">03 / PRIVACY</div><h2 className="mt-4 text-2xl">Controlled detail access</h2><p className="mt-3 text-sm leading-relaxed text-ink-secondary">Full credential details are returned after email OTP confirmation, providing a traceable validation step.</p></div>
        </Container>
      </section>
    </>
  );
}
