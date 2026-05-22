import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema, breadcrumbSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Refund Policy',
  description:
    'Ensaar Global refund policy for the Builder Community, AI Business Cohort, and 1:1 Operator Coaching programs.',
  path: '/legal/refund-policy',
});

export default function RefundPolicyPage() {
  const url = `${siteConfig.url}/legal/refund-policy`;

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Refund Policy',
            description:
              'Refund mechanics by program tier for Ensaar Global community, cohort, and coaching.',
            url,
          }),
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Refund Policy', url },
          ]),
        ]}
      />

      <div className="relative pt-32 pb-12">
        <Container>
          <Breadcrumbs items={[{ name: 'Refund Policy', href: '/legal/refund-policy' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-6">Legal</span>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] mt-6 mb-6 text-balance leading-[1.05]">
              Refund policy
            </h1>
            <p className="text-lg text-ink-secondary">
              Different programs, different refund rules. The principle is the same: if you follow the
              program in good faith and it does not work for you, you get your money back.
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <article className="max-w-3xl space-y-10 text-[1rem] leading-relaxed text-ink-secondary">
            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">
                Builder Community
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>14-day full refund</strong> from the date of your first payment, for any reason.
                </li>
                <li>
                  Monthly subscriptions can be cancelled at any time and stop billing at the end of the current period.
                </li>
                <li>
                  Annual subscriptions: after the first 14 days, no partial refund for the remaining months.
                  Cancellation prevents the next annual renewal.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">AI Business Cohort</h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>14-day full refund</strong> from the cohort start date, for any reason.
                </li>
                <li>
                  <strong>Completion-based refund after week 2:</strong> if you complete every weekly
                  assignment, attend at least 80% of live sessions, and still have not shipped a
                  working product by the end of the cohort, we refund 100% of fees paid.
                </li>
                <li>
                  No refund if you stop attending, skip assignments, or otherwise do not follow the program.
                </li>
                <li>
                  Installment plans: cancellation after week 2 stops future installments but does not
                  refund installments already paid (subject to the completion-based clause above).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">
                1:1 Operator Coaching
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Minimum engagement is three months. Within the first 30 days, full refund minus any
                  intros already made and sessions already attended at standard hourly rate.
                </li>
                <li>
                  After 30 days, refund is pro-rated based on the unused portion of the current
                  three-month block.
                </li>
                <li>
                  Cancellation does not affect the obligation to settle any expenses (travel, software,
                  agreed third-party fees) already incurred on your behalf.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">How to request a refund</h2>
              <p>
                Email <a href={`mailto:${siteConfig.email}`} className="underline">{siteConfig.email}</a>{' '}
                with the subject &ldquo;Refund request&rdquo;, your enrollment date, and the program. We
                respond within two business days and process approved refunds within 7 business days
                via the original payment method.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">Earnings and outcomes</h2>
              <p>
                A refund is about whether the program was delivered as described. It is not tied to
                whether you earned money, since outcomes depend on factors outside our control. See the{' '}
                <Link href="/legal/earnings-disclaimer" className="underline">
                  Earnings Disclaimer
                </Link>
                .
              </p>
            </section>
          </article>
        </Container>
      </Section>
    </>
  );
}
