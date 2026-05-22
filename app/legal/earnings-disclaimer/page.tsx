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
  title: 'Earnings Disclaimer',
  description:
    'Ensaar Global earnings disclaimer. Income and outcomes from the Builder Community, AI Business Cohort, and 1:1 Operator Coaching are not guaranteed and depend on the work you put in and the market you ship into.',
  path: '/legal/earnings-disclaimer',
});

export default function EarningsDisclaimerPage() {
  const url = `${siteConfig.url}/legal/earnings-disclaimer`;

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Earnings Disclaimer',
            description:
              'Disclaimer covering income and outcome claims for Ensaar Global programs.',
            url,
          }),
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Earnings Disclaimer', url },
          ]),
        ]}
      />

      <div className="relative pt-32 pb-12">
        <Container>
          <Breadcrumbs
            items={[{ name: 'Earnings Disclaimer', href: '/legal/earnings-disclaimer' }]}
          />
          <div className="max-w-3xl">
            <span className="eyebrow mb-6">Legal</span>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] mt-6 mb-6 text-balance leading-[1.05]">
              Earnings disclaimer
            </h1>
            <p className="text-lg text-ink-secondary">
              Last updated:{' '}
              {new Date().toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              .
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <article className="max-w-3xl space-y-8 text-[1rem] leading-relaxed text-ink-secondary">
            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">No guarantee of income</h2>
              <p>
                Ensaar Global Pvt. Ltd. (&ldquo;Ensaar&rdquo;) operates a paid Builder Community, an
                AI Business Cohort program, and 1:1 Operator Coaching. Our marketing language —
                including the phrase <em>&ldquo;Become an AI millionaire&rdquo;</em> on our homepage —
                describes an aspirational outcome, not a promise. <strong>Ensaar does not guarantee
                any specific income, revenue, profit, or business outcome</strong> from participation
                in any of our programs.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">Results vary</h2>
              <p>
                Outcomes from learning to build AI products depend on factors entirely outside
                Ensaar&apos;s control, including but not limited to: your prior skills, the hours you
                commit, the market you choose, your ability to ship and iterate, your willingness to
                sell and market what you build, broader economic conditions, and luck. Many participants
                will earn nothing. Some will earn modestly. A small number may build substantial
                businesses. <strong>You should assume your results will be on the lower end unless you
                have prior evidence to the contrary.</strong>
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">Substantiating any income claims</h2>
              <p>
                Where Ensaar publishes a named student outcome (on the homepage, our <Link href="/" className="underline">Wins</Link>{' '}
                page, or elsewhere), the income figures will be supplied directly by the named participant
                with their written consent. These are individual examples and are <strong>not typical</strong>.
                We do not aggregate or compute &ldquo;average earnings&rdquo; because the program is too
                new and the variance too high to do so honestly.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">Earnings projector / calculator</h2>
              <p>
                Our <Link href="/calculator" className="underline">earnings projector</Link> produces
                conservative, range-based estimates from explicit inputs (hours per week, starting
                capability, months committed). The projector models revenue from building AI products
                using assumptions we publish openly and update quarterly. It is a planning tool, not a
                forecast. Real outcomes will deviate.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">No investment, legal, or tax advice</h2>
              <p>
                Nothing in our programs, materials, calls, or community is investment, legal, financial,
                or tax advice. If you build a business as a result of our programs, consult licensed
                professionals in your jurisdiction for advice specific to your situation.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">Refund policy</h2>
              <p>
                If you are unhappy with a program, our refund policy describes the conditions under
                which money is returned. See{' '}
                <Link href="/legal/refund-policy" className="underline">
                  Refund Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-ink-primary mb-3">Questions</h2>
              <p>
                Email <a href={`mailto:${siteConfig.email}`} className="underline">{siteConfig.email}</a>{' '}
                with any questions about this disclaimer before enrolling.
              </p>
            </section>
          </article>
        </Container>
      </Section>
    </>
  );
}
