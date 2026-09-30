import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceDetailSchemas, faqPageSchema } from '@/components/seo/schemas';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';
import { GCC_FAQ } from '@/lib/content/faq';
import {
  ENTITY_FACTS,
  EOR_PRICE_USD,
  GCC_PHASES,
  INDIA_RULES_ASOF,
  RECRUITMENT_FEE_PERCENT,
  REPLACEMENT_GUARANTEE_DAYS,
} from '@/lib/content/india';

const service = SERVICES.find((item) => item.slug === 'gcc')!;

export const metadata: Metadata = pageMetadata({
  title: 'GCC Setup in India: Start With a Pod',
  description: service.shortDescription,
  path: '/services/gcc',
  eyebrow: 'India Capability Centres',
  keywords: [
    'GCC setup India',
    'global capability centre India',
    'India offshore development centre',
    'build operate transfer India',
    'India subsidiary incorporation',
    'captive centre transfer pricing India',
    'India engineering pod',
  ],
});

const ENSAAR_RUNS = [
  'Hiring, from role definition to signed offer',
  'Employment, payroll, and every statutory filing',
  'Laptops, access, and the security baseline you specify',
  'A named India operations contact, and monthly reporting',
  'Exits, replacements, and the paperwork around both',
];

const YOU_RUN = [
  'What the team works on, and in what order',
  'Day-to-day management, reviews, and standards',
  'Tools, repositories, and engineering practice',
  'Who gets hired, from the shortlist we bring',
  'The decision to convert into your own entity, and when',
];

export default function GccPage() {
  return (
    <>
      <JsonLd data={serviceDetailSchemas(service)} />
      <JsonLd data={faqPageSchema(GCC_FAQ)} />

      <div className="pt-28 pb-14 md:pt-32">
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Services', href: '/services' },
              { name: 'India Capability Centres', href: '/services/gcc' },
            ]}
          />
          <div className="max-w-3xl">
            <span className="eyebrow mb-5">India Capability Centres</span>
            <h1 className="mt-5 text-[clamp(2.35rem,4.4vw,4.35rem)] leading-[1.03] text-balance">
              Start with a pod. Grow into your own centre.
            </h1>
            <p className="mt-6 max-w-2xl text-[clamp(1rem,1.25vw,1.18rem)] leading-relaxed text-ink-secondary">
              A capability centre usually fails on sequencing, not ambition. An entity, a lease, and a
              country head get committed before anyone knows whether the operating model works across
              time zones. Ensaar runs it the other way round: a small team first, your own company
              later, once the work has proved it deserves one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/contact" withArrow>Plan an India team</Button>
              <Button href="#stages" variant="outline">See the stages</Button>
            </div>
          </div>
        </Container>
      </div>

      <section id="stages" className="scroll-mt-24 border-y border-line-subtle bg-bg-secondary py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">The sequence</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            Four stages, and permission to stop at any of them.
          </h2>
          <div className="mt-10 grid border-l border-t border-line-subtle sm:grid-cols-2">
            {GCC_PHASES.map((phase, index) => (
              <div key={phase.title} className="border-b border-r border-line-subtle p-6 md:p-8">
                <div className="font-mono text-xs text-accent-secondary">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-6 text-xl">{phase.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-secondary">{phase.detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">Division of labour</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            You manage the work. We carry India.
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="border border-line-subtle bg-bg-secondary p-8">
              <h3 className="text-xl">Ensaar runs</h3>
              <ul className="mt-6 flex flex-col gap-3">
                {ENSAAR_RUNS.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-[0.9375rem] text-ink-secondary">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-line-glow bg-bg-secondary p-8 shadow-card">
              <h3 className="text-xl">You run</h3>
              <ul className="mt-6 flex flex-col gap-3">
                {YOU_RUN.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-[0.9375rem] text-ink-secondary">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-bg-secondary py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">What it costs</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            Priced per person, so the cost follows the team.
          </h2>
          <div className="mt-10 grid border-l border-t border-line-subtle md:grid-cols-3">
            <div className="border-b border-r border-line-subtle p-6 md:p-8">
              <div className="font-mono text-xs text-accent-secondary">Per hire</div>
              <div className="mt-6 font-display text-3xl text-ink-primary">{RECRUITMENT_FEE_PERCENT}%</div>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Of annual salary, which is one month, charged when the person joins. A{' '}
                {REPLACEMENT_GUARANTEE_DAYS}-day replacement is included. Bring your own candidate and
                this does not apply.
              </p>
            </div>
            <div className="border-b border-r border-line-subtle p-6 md:p-8">
              <div className="font-mono text-xs text-accent-secondary">Per person, per month</div>
              <div className="mt-6 font-display text-3xl text-ink-primary">From ${EOR_PRICE_USD}</div>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Employment, payroll, and compliance through our Employer of Record. Salary and
                statutory contributions are passed through at cost.
              </p>
            </div>
            <div className="border-b border-r border-line-subtle p-6 md:p-8">
              <div className="font-mono text-xs text-accent-secondary">Conversion</div>
              <div className="mt-6 font-display text-3xl text-ink-primary">Quoted</div>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Incorporation, registrations, and moving the team into your entity. Scoped and priced
                once we know the structure, because honest numbers here depend on your parent company.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">Your own entity</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            What conversion actually involves.
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-secondary">
            Past roughly twenty to thirty people, per-person fees start to cost more than running a
            company, and the case for your own subsidiary becomes arithmetic rather than ambition.
            These are the facts that shape that decision.
          </p>
          <dl className="mt-10 border-t border-line-subtle">
            {ENTITY_FACTS.map((fact) => (
              <div key={fact.name} className="grid gap-2 border-b border-line-subtle py-6 md:grid-cols-[0.8fr_0.7fr_1.5fr] md:gap-6">
                <dt className="font-display text-lg text-ink-primary">{fact.name}</dt>
                <dd className="font-mono text-sm text-accent-primary">{fact.rate}</dd>
                <dd className="leading-relaxed text-ink-secondary">{fact.note}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 font-mono text-xs text-ink-muted">Verified {INDIA_RULES_ASOF}.</p>
        </Container>
      </section>

      <section className="border-t border-line-subtle py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">Questions</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            What gets asked before a team exists.
          </h2>
          <dl className="mt-10 border-t border-line-subtle">
            {GCC_FAQ.map((item) => (
              <div key={item.question} className="border-b border-line-subtle py-6">
                <dt className="font-display text-lg text-ink-primary">{item.question}</dt>
                <dd className="mt-3 max-w-3xl leading-relaxed text-ink-secondary">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="/contact" withArrow>Plan an India team</Button>
            <Button href="/services/employer-of-record" variant="outline">Hiring one person first?</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
