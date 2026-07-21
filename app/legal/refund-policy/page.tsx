import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema, breadcrumbSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Cancellation and Refund Policy',
  description:
    'Cancellation, rescheduling, and refund terms for Ensaar Global technology, AI enablement, and corporate training engagements.',
  path: '/legal/refund-policy',
});

export default function RefundPolicyPage() {
  const url = `${siteConfig.url}/legal/refund-policy`;

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Cancellation and Refund Policy',
            description:
              'Cancellation, rescheduling, and refund terms for Ensaar Global engagements.',
            url,
          }),
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Cancellation and Refund Policy', url },
          ]),
        ]}
      />

      <div className="relative pt-32 pb-12">
        <Container>
          <Breadcrumbs items={[{ name: 'Cancellation and Refund Policy', href: '/legal/refund-policy' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-6">Legal</span>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] mt-6 mb-6 text-balance leading-[1.05]">
              Cancellation and refund policy
            </h1>
            <p className="text-lg text-ink-secondary">
              Commercial terms are confirmed in each statement of work. This page explains the
              default policy when an agreement does not specify different terms.
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <article className="max-w-3xl space-y-10 text-[1rem] leading-relaxed text-ink-secondary">
            <PolicySection title="Advisory and discovery engagements">
              An advisory or discovery engagement can be cancelled for a full refund before the
              first working session begins. Once work has started, completed work is chargeable and
              any unused portion may be refunded at Ensaar&apos;s discretion.
            </PolicySection>

            <PolicySection title="Fixed-scope technology engagements">
              A project reservation can be rescheduled once without charge when notice is provided at
              least five business days before kickoff. After kickoff, payments cover reserved capacity
              and completed milestones. Any refund is limited to work that has not started and costs
              that Ensaar has not already incurred.
            </PolicySection>

            <PolicySection title="Ongoing engineering support">
              Monthly services can be cancelled before the next billing date. Current billing periods
              remain active and are not partially refundable. Longer staffing engagements follow the
              notice period in the signed statement of work.
            </PolicySection>

            <PolicySection title="Corporate training">
              Training cancellations and rescheduling depend on facilitator reservations, travel, venue,
              and material costs. The applicable terms are included in the training proposal before
              payment.
            </PolicySection>

            <PolicySection title="Service concerns">
              Report a delivery concern promptly so the team can investigate and correct it. Where the
              agreed scope has not been delivered, Ensaar may reperform the affected work, issue a
              service credit, or provide a refund appropriate to the undelivered portion.
            </PolicySection>

            <PolicySection title="How to make a request">
              Email <a href={`mailto:${siteConfig.email}`} className="underline">{siteConfig.email}</a>{' '}
              with the engagement name, invoice number, and reason for the request. We aim to respond
              within two business days. Approved refunds are returned through the original payment
              method whenever possible.
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
