import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { GlowOrbs } from '@/components/illustrations/Decorations';
import { DotPattern } from '@/components/ui/DotPattern';
import { PricingPageContent } from '@/components/pricing/PricingPageContent';
import { EarningsDisclaimer } from '@/components/sections/EarningsDisclaimer';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  webPageSchema,
  productSchema,
  courseSchema,
  faqPageSchema,
} from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';
import { PROGRAMS } from '@/lib/content/pricing';
import { schemaPriceUsd } from '@/lib/content/currency';
import { FAQ } from '@/lib/content/faq';

export const metadata: Metadata = pageMetadata({
  title: 'Programs & Pricing',
  description:
    'Three paths to build a profitable AI business: a paid Builder Community, an 8-week AI Business Cohort, and 1:1 Operator Coaching. Pricing in USD and INR.',
  path: '/pricing',
});

export default function PricingPage() {
  const url = `${siteConfig.url}/pricing`;
  const pricingFaqs = FAQ.filter((f) => f.category === 'pricing');

  const programSchemas = PROGRAMS.map((p) => {
    const programUrl = `${siteConfig.url}/pricing/${p.slug}`;
    const priceUsd = schemaPriceUsd(p.price);
    if (p.tier === 'cohort') {
      return courseSchema({
        name: p.name,
        description: p.description,
        url: programUrl,
        priceUsd,
        ...(p.startDate ? { startDate: p.startDate } : {}),
      });
    }
    return productSchema({
      name: p.name,
      description: p.description,
      url: programUrl,
      priceUsd,
    });
  });

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Programs & Pricing',
            description:
              'Three paths to build a profitable AI business: community, cohorts, 1:1 coaching.',
            url,
          }),
          faqPageSchema(pricingFaqs.map((f) => ({ question: f.question, answer: f.answer }))),
          ...programSchemas,
        ]}
      />

      <div className="relative pt-32 pb-16 overflow-hidden">
        <GlowOrbs className="absolute inset-0 -z-10 opacity-60" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-40 -z-10 opacity-[0.07] text-accent-primary"
        >
          <DotPattern />
        </div>
        <Container>
          <Breadcrumbs items={[{ name: 'Pricing', href: '/pricing' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-6">Programs &amp; Pricing</span>
            <h1 className="text-[clamp(2.25rem,5.5vw,4.25rem)] mt-6 mb-6 text-balance leading-[1.05]">
              Three paths to a <span className="gradient-text">profitable AI business.</span>
            </h1>
            <p className="text-lg md:text-xl text-ink-secondary mb-8">
              Community for momentum and peers. Cohorts to ship a product in eight weeks. 1:1 coaching
              for founders already building. Pick the path that matches the time you have and the
              outcome you want.
            </p>
            <div className="mb-8 flex flex-wrap gap-3">
              <Button href="#community" withArrow>
                Start with the community
              </Button>
              <Button href="#cohorts" variant="outline">
                See cohorts
              </Button>
            </div>
            <EarningsDisclaimer variant="callout" />
          </div>
        </Container>
      </div>

      <PricingPageContent />

      {/* FAQ */}
      <Section id="faq">
        <Container>
          <SectionHeader
            eyebrow="Pricing FAQ"
            title={
              <>
                Common <span className="gradient-text">questions.</span>
              </>
            }
            lede="The questions builders ask before enrolling."
          />
          <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto">
            {pricingFaqs.map((f) => (
              <details
                key={f.question}
                className="group glass rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer flex items-start justify-between gap-4 list-none">
                  <span className="font-display text-base md:text-lg text-ink-primary">
                    {f.question}
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-subtle text-accent-primary transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-[0.9375rem] text-ink-secondary leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section className="bg-bg-secondary">
        <Container>
          <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl mb-4">
              Not sure which path? <span className="gradient-text">Start with the community.</span>
            </h2>
            <p className="text-ink-secondary text-lg mb-8 max-w-xl mx-auto">
              The Builder Community is $19/month and has a 14-day refund. It is the lowest-friction
              way to see if this is for you before committing to a cohort or coaching.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button href="#community" size="lg" withArrow>
                Join the community
              </Button>
              <Button href="/calculator" variant="outline" size="lg">
                Earnings projector
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
