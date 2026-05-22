import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check, X, ArrowRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { GlowOrbs } from '@/components/illustrations/Decorations';
import { DotPattern } from '@/components/ui/DotPattern';
import { PackageCard } from '@/components/pricing/PackageCard';
import { EarningsDisclaimer } from '@/components/sections/EarningsDisclaimer';
import { GuaranteeBadge } from '@/components/sections/GuaranteeBadge';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  webPageSchema,
  productSchema,
  courseSchema,
  breadcrumbSchema,
} from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';
import { PROGRAMS, getProgram } from '@/lib/content/pricing';
import { formatPrice, schemaPriceUsd, schemaPriceInr } from '@/lib/content/currency';

type Params = { program: string };

export async function generateStaticParams(): Promise<Params[]> {
  return PROGRAMS.map((p) => ({ program: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { program: slug } = await params;
  const program = getProgram(slug);
  if (!program) {
    return pageMetadata({
      title: 'Program not found',
      description: 'Not found',
      path: `/pricing/${slug}`,
    });
  }
  const priceUsd = formatPrice(program.price, 'USD').amount;
  return pageMetadata({
    title: `${program.name} — ${priceUsd} ${program.duration}`,
    description: program.description,
    path: `/pricing/${program.slug}`,
  });
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { program: slug } = await params;
  const program = getProgram(slug);
  if (!program) return notFound();

  const url = `${siteConfig.url}/pricing/${program.slug}`;
  const related = PROGRAMS.filter((p) => p.slug !== program.slug).slice(0, 3);
  const usdPrice = formatPrice(program.price, 'USD');
  const inrPrice = formatPrice(program.price, 'INR');

  const detailSchema =
    program.tier === 'cohort'
      ? courseSchema({
          name: program.name,
          description: program.description,
          url,
          priceUsd: schemaPriceUsd(program.price),
          priceInr: schemaPriceInr(program.price),
          ...(program.startDate ? { startDate: program.startDate } : {}),
        })
      : productSchema({
          name: program.name,
          description: program.description,
          url,
          priceUsd: schemaPriceUsd(program.price),
        });

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: program.name, description: program.description, url }),
          detailSchema,
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Pricing', url: `${siteConfig.url}/pricing` },
            { name: program.name, url },
          ]),
        ]}
      />

      {/* Hero */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        <GlowOrbs className="absolute inset-0 -z-10 opacity-60" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-40 -z-10 opacity-[0.07] text-accent-primary"
        >
          <DotPattern />
        </div>
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Pricing', href: '/pricing' },
              { name: program.name, href: `/pricing/${program.slug}` },
            ]}
          />

          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] items-start">
            <div>
              <span className="eyebrow mb-6">{program.duration}</span>
              <h1 className="text-[clamp(2.25rem,5.5vw,4.25rem)] mt-6 mb-6 text-balance leading-[1.05]">
                {program.headline}
              </h1>
              <p className="text-lg md:text-xl text-ink-secondary mb-8">{program.description}</p>
              <div className="mb-6 flex flex-wrap gap-3">
                <Button href={`/contact?program=${program.slug}`} size="lg" withArrow>
                  {program.cta}
                </Button>
                <Button href="/calculator" variant="outline" size="lg">
                  Earnings projector
                </Button>
              </div>
              {program.guarantee && (
                <GuaranteeBadge text={program.guarantee} className="mb-2" />
              )}
              <EarningsDisclaimer />
            </div>

            <aside className="glass-strong rounded-3xl p-8 sticky top-28">
              <div className="font-mono text-xs uppercase tracking-[0.15em] text-accent-secondary">
                Price
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-[3rem] leading-none gradient-text">
                  {usdPrice.amount}
                </span>
                {usdPrice.suffix && (
                  <span className="text-ink-secondary">{usdPrice.suffix} USD</span>
                )}
              </div>
              <div className="mt-1 text-sm text-ink-muted">
                or {inrPrice.amount}
                {inrPrice.suffix ? ` ${inrPrice.suffix}` : ''} INR
              </div>
              {usdPrice.secondary && (
                <div className="mt-3 inline-flex items-center rounded-full bg-accent-primary/10 px-3 py-1 text-xs text-accent-primary">
                  {usdPrice.secondary}
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-line-subtle">
                <div className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-muted mb-3">
                  Best for
                </div>
                <p className="text-[0.9375rem] text-ink-secondary leading-relaxed">{program.bestFor}</p>
              </div>
              <div className="mt-6 pt-6 border-t border-line-subtle">
                <div className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-muted mb-3">
                  Duration
                </div>
                <p className="text-ink-primary">{program.duration}</p>
              </div>
              {program.tier === 'cohort' && program.seatsLeft != null && program.seatsTotal != null && (
                <div className="mt-6 pt-6 border-t border-line-subtle">
                  <div className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-muted mb-3">
                    Seats
                  </div>
                  <p className="text-ink-primary">
                    {program.seatsLeft} of {program.seatsTotal} remaining
                  </p>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </div>

      {/* Deliverables */}
      <Section id="deliverables" className="bg-bg-secondary">
        <Container>
          <SectionHeader
            eyebrow="Deliverables"
            title={
              <>
                What you <span className="gradient-text">get.</span>
              </>
            }
            lede="Concrete artifacts and outcomes — not vague promises."
          />
          <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto">
            {program.deliverables.map((d) => (
              <div key={d} className="glass rounded-2xl p-5 flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-primary/15 border border-accent-primary/40 text-accent-primary">
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-ink-secondary">{d}</span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Included / Not included */}
      <Section id="scope">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
            <div className="glass-strong rounded-2xl p-8">
              <h2 className="text-2xl mb-6 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-500">
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                What&apos;s included
              </h2>
              <ul className="flex flex-col gap-3">
                {program.whatsIncluded.map((item) => (
                  <li
                    key={item}
                    className="text-ink-secondary pl-5 relative before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-gradient-brand"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-8">
              <h2 className="text-2xl mb-6 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-500">
                  <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                What&apos;s not included
              </h2>
              <ul className="flex flex-col gap-3">
                {program.whatsNotIncluded.map((item) => (
                  <li
                    key={item}
                    className="text-ink-muted pl-5 relative before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-line-subtle"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-ink-muted">
                The other two paths cover most of what is not in this one. Most builders move between
                them as their needs change.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Related */}
      <Section className="bg-bg-secondary">
        <Container>
          <SectionHeader
            eyebrow="Other paths"
            title={
              <>
                Compare the <span className="gradient-text">three paths.</span>
              </>
            }
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {related.map((p) => (
              <PackageCard key={p.slug} pkg={p} variant="compact" />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/pricing"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-accent-secondary hover:text-accent-cyan-soft transition-colors"
            >
              See all programs side by side
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section>
        <Container>
          <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl mb-4">{program.cta}.</h2>
            <p className="text-ink-secondary text-lg mb-8">
              Tell us about your situation. We confirm fit, scope, and start date in one short call.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button href={`/contact?program=${program.slug}`} size="lg" withArrow>
                {program.cta}
              </Button>
              <Button href="/pricing" variant="outline" size="lg">
                Compare programs
              </Button>
            </div>
            <EarningsDisclaimer className="mt-6" />
          </div>
        </Container>
      </Section>
    </>
  );
}
