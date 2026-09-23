import type { Metadata } from 'next';
import { Check, Minus } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceDetailSchemas, faqPageSchema } from '@/components/seo/schemas';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';
import { EOR_FAQ } from '@/lib/content/faq';
import {
  EOR_EXCLUDED,
  EOR_INCLUDED,
  EOR_PRICE_USD,
  EOR_STEPS,
  INDIA_RULES_ASOF,
  PE_POSITION,
  RECRUITMENT_FEE_PERCENT,
  REPLACEMENT_GUARANTEE_DAYS,
  STATUTORY_COSTS,
  STATUTORY_SUMMARY,
} from '@/lib/content/india';

const service = SERVICES.find((item) => item.slug === 'employer-of-record')!;

export const metadata: Metadata = pageMetadata({
  title: 'Employer of Record in India',
  description: service.shortDescription,
  path: '/services/employer-of-record',
  eyebrow: 'Employer of Record',
  keywords: [
    'employer of record India',
    'EOR India',
    'EOR India pricing',
    'hire in India without an entity',
    'India payroll compliance',
    'India PF ESI professional tax',
    'permanent establishment risk India',
  ],
});

const RIGHT_CALL = [
  'You have found someone in India and want them employed properly, now.',
  'You are testing whether an India team works before committing to a company.',
  'You need one to fifteen people, which is below the level where your own entity pays for itself.',
  'You want engineering, support, or operations talent, not a local sales force.',
];

const WRONG_CALL = [
  'You already run an Indian entity. Use it. An EOR on top adds a fee and nothing else.',
  'You are hiring people to close contracts in India. That is a sales presence, and it needs tax advice before it needs an EOR.',
  'You expect to pass thirty people within a year. Go straight to a subsidiary; we will still build the team.',
];

export default function EmployerOfRecordPage() {
  return (
    <>
      <JsonLd data={serviceDetailSchemas(service)} />
      <JsonLd data={faqPageSchema(EOR_FAQ)} />

      <div className="pt-28 pb-14 md:pt-32">
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Services', href: '/services' },
              { name: 'Employer of Record', href: '/services/employer-of-record' },
            ]}
          />
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="max-w-2xl">
              <span className="eyebrow mb-5">Employer of Record</span>
              <h1 className="mt-5 text-[clamp(2.35rem,4.4vw,4.35rem)] leading-[1.03] text-balance">
                Hire in India without setting up a company.
              </h1>
              <p className="mt-6 max-w-xl text-[clamp(1rem,1.25vw,1.18rem)] leading-relaxed text-ink-secondary">
                Ensaar becomes the legal employer of your India hire. We issue the contract, pay the
                salary in rupees, and file every statutory return. You decide what the person works
                on, the same as anyone else on your team.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/contact" withArrow>Talk about a hire</Button>
                <Button href="#cost" variant="outline">See what it costs</Button>
              </div>
            </div>

            <div className="border border-line-glow bg-bg-secondary p-8 shadow-card">
              <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-accent-secondary">
                Our price
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-[3.25rem] leading-none text-ink-primary">${EOR_PRICE_USD}</span>
                <span className="text-sm text-ink-secondary">per employee, per month</span>
              </div>
              <ul className="mt-6 flex flex-col gap-2.5 text-[0.9375rem] text-ink-secondary">
                {['No setup fee', 'No security deposit', 'No minimum term', 'Statutory costs passed through at cost'].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-line-subtle pt-5 text-sm leading-relaxed text-ink-muted">
                Global platforms charge $499 to $699 for the same India hire. The difference is
                brand, not compliance.
              </p>
            </div>
          </div>
        </Container>
      </div>

      <section className="border-y border-line-subtle bg-bg-secondary py-16 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl">When an EOR is the right call</h2>
              <ul className="mt-6 flex flex-col gap-3">
                {RIGHT_CALL.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-ink-secondary">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl">When it is not</h2>
              <ul className="mt-6 flex flex-col gap-3">
                {WRONG_CALL.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-ink-secondary">
                    <Minus className="mt-1 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section id="cost" className="scroll-mt-24 py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">What it costs</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            One fee from us. Everything else is the government&apos;s.
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-secondary">
            Your monthly invoice is the salary, the statutory employer contributions at cost, and our
            ${EOR_PRICE_USD}. Recruitment is separate and only applies if we find the person:{' '}
            {RECRUITMENT_FEE_PERCENT}% of annual salary, one month, charged when they join, with a{' '}
            {REPLACEMENT_GUARANTEE_DAYS}-day replacement if it does not work out.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="border border-line-subtle bg-bg-secondary p-8">
              <h3 className="text-xl">Included in the fee</h3>
              <ul className="mt-6 flex flex-col gap-3">
                {EOR_INCLUDED.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-[0.9375rem] text-ink-secondary">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-line-subtle bg-bg-secondary p-8">
              <h3 className="text-xl">Not included</h3>
              <ul className="mt-6 flex flex-col gap-3">
                {EOR_EXCLUDED.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-[0.9375rem] text-ink-secondary">
                    <Minus className="mt-1 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">Statutory employer costs</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            What India requires on top of salary.
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-secondary">{STATUTORY_SUMMARY}</p>

          <div className="mt-10 grid border-l border-t border-line-subtle sm:grid-cols-2">
            {STATUTORY_COSTS.map((item, index) => (
              <div key={item.name} className="border-b border-r border-line-subtle p-6 md:p-7">
                <div className="font-mono text-xs text-accent-secondary">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-6 text-lg">{item.name}</h3>
                <div className="mt-2 font-display text-2xl text-accent-primary">{item.rate}</div>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{item.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-xs text-ink-muted">
            Rates verified {INDIA_RULES_ASOF}. India&apos;s four labour codes took effect on 21 November 2025.
          </p>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">How it runs</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            From an agreed offer to a first working day, in about two weeks.
          </h2>
          <div className="mt-10 grid border-l border-t border-line-subtle sm:grid-cols-2 lg:grid-cols-4">
            {EOR_STEPS.map((step, index) => (
              <div key={step.title} className="border-b border-r border-line-subtle p-6 md:p-7">
                <div className="font-mono text-xs text-accent-secondary">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-6 text-lg">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{step.detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#0c2343] py-16 text-white md:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-cyan-200">
                Permanent establishment
              </div>
              <h2 className="mt-5 text-3xl leading-tight md:text-4xl">The honest answer.</h2>
            </div>
            <p className="max-w-2xl leading-relaxed text-slate-300">{PE_POSITION}</p>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">Questions</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            What buyers ask before the first hire.
          </h2>
          <dl className="mt-10 border-t border-line-subtle">
            {EOR_FAQ.map((item) => (
              <div key={item.question} className="border-b border-line-subtle py-6">
                <dt className="font-display text-lg text-ink-primary">{item.question}</dt>
                <dd className="mt-3 max-w-3xl leading-relaxed text-ink-secondary">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="/contact" withArrow>Talk about a hire</Button>
            <Button href="/services/gcc" variant="outline">Building a whole team instead?</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
