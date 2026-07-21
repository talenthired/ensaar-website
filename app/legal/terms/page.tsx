import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema, breadcrumbSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description:
    'The terms that govern use of the Ensaar Global website, enquiries, and engagements for AI enablement, software engineering, and training.',
  path: '/legal/terms',
});

export default function TermsPage() {
  const url = `${siteConfig.url}/legal/terms`;

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Terms of Service',
            description: 'Terms that govern use of the Ensaar Global website and engagements.',
            url,
          }),
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Terms of Service', url },
          ]),
        ]}
      />

      <div className="relative pt-32 pb-12">
        <Container>
          <Breadcrumbs items={[{ name: 'Terms of Service', href: '/legal/terms' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-6">Legal</span>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] mt-6 mb-6 text-balance leading-[1.05]">
              Terms of service
            </h1>
            <p className="text-lg text-ink-secondary">
              These terms govern your use of this website and any enquiry you submit. Commercial
              engagements are governed by a separate signed agreement, which takes precedence over
              this page where they differ.
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <article className="max-w-3xl space-y-10 text-[1rem] leading-relaxed text-ink-secondary">
            <PolicySection title="Acceptance">
              By using this website or contacting {siteConfig.legalName}, you agree to these terms. If
              you do not agree, please do not use the site.
            </PolicySection>

            <PolicySection title="What we provide">
              {siteConfig.name} provides enterprise AI enablement, software engineering, secure
              deployment, AI-ready engineering teams, the Business Communication Excellence Program
              (BCEP), and the DailyByte practical AI capability platform. This website presents
              information about those services and lets you request a conversation. Availability,
              features, and content may change.
            </PolicySection>

            <PolicySection title="Engagements are governed by a separate agreement">
              Any paid work is defined in a proposal or statement of work that sets the scope,
              deliverables, fees, timelines, and terms. That signed agreement governs the engagement.
              Nothing on this website is an offer, a guarantee of outcomes, or a binding commitment to
              deliver a specific result.
            </PolicySection>

            <PolicySection title="Using the site">
              Use the site lawfully and do not attempt to disrupt, probe, or gain unauthorized access
              to it or to related systems. Do not submit false information or another person&apos;s
              details without permission. We may restrict access to protect the site and its users.
            </PolicySection>

            <PolicySection title="Enquiries and communications">
              When you submit an enquiry, you consent to us contacting you about it. Provide accurate
              details. We handle the information you share in line with our{' '}
              <a href="/legal/privacy" className="underline">Privacy Policy</a>.
            </PolicySection>

            <PolicySection title="Intellectual property">
              The site, its content, branding, and the DailyByte and BCEP names and materials are owned
              by {siteConfig.legalName} or its licensors. You may view and share the content for
              informational purposes, but you may not copy, republish, or use it commercially without
              written permission.
            </PolicySection>

            <PolicySection title="Third-party services and links">
              The site links to and integrates with services such as the DailyByte platform and the
              Ensaar certificate verification service. Those services may have their own terms. We are
              not responsible for third-party websites or content we link to.
            </PolicySection>

            <PolicySection title="Certificates">
              Certificate verification results reflect the current status in the issuing registry at
              the time of the check and are provided for convenience. A verification result is not a
              warranty of any qualification, employment, or engagement.
            </PolicySection>

            <PolicySection title="Disclaimers and liability">
              The website is provided &quot;as is&quot; without warranties of any kind. To the extent
              permitted by law, {siteConfig.legalName} is not liable for indirect or consequential loss
              arising from use of the website, and its total liability relating to the website is
              limited to the amount, if any, you paid to access it. Liability for paid engagements is
              addressed in the applicable agreement.
            </PolicySection>

            <PolicySection title="Changes">
              We may update these terms; material changes will be posted here with a new effective
              date, and continued use means you accept them.
            </PolicySection>

            <PolicySection title="Governing law">
              These terms are governed by the laws of India, and the courts of India have jurisdiction,
              without regard to conflict-of-laws rules.
            </PolicySection>

            <PolicySection title="Contact">
              Questions about these terms: email{' '}
              <a href={`mailto:${siteConfig.email}`} className="underline">{siteConfig.email}</a>. See
              also our <a href="/legal/privacy" className="underline">Privacy Policy</a> and{' '}
              <a href="/legal/refund-policy" className="underline">Cancellation and Refund Policy</a>.
            </PolicySection>
          </article>
        </Container>
      </Section>
    </>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ink-primary mb-3">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
