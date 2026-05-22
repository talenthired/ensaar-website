import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { GlowOrbs } from '@/components/illustrations/Decorations';
import { DotPattern } from '@/components/ui/DotPattern';
import { ROICalculator } from '@/components/calculator/ROICalculator';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  webPageSchema,
  howToSchema,
  faqPageSchema,
} from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'AI Cost Reduction Calculator (legacy)',
    description:
      'Legacy estimator from the prior B2B positioning. Being rebuilt as the AI Earnings Projector.',
    path: '/calculator',
  }),
  robots: { index: false, follow: true },
};

const HOW_TO_STEPS = [
  {
    name: 'Enter your current monthly engineering spend',
    text: 'Add up monthly salaries plus contractors plus any outsourced engineering line items. Approximate figures are fine for a first read.',
  },
  {
    name: 'Enter your team size',
    text: 'Count engineers as full-time equivalents. Two part-timers at 50% count as one FTE.',
  },
  {
    name: 'Estimate the AI-augmentable portion',
    text: 'Estimate how much of your work is suitable for AI-assisted delivery such as boilerplate, CRUD, integrations, tests, documentation, research, support, and repeat operations. Most teams find this is 50 to 70 percent.',
  },
  {
    name: 'Read your blended rate',
    text: 'The calculator divides monthly spend by team size and standard hours per month to surface your blended hourly cost. It compares that against Ensaar entry execution capacity inside a managed AI pod.',
  },
  {
    name: 'Read your projected savings',
    text: 'You see projected monthly and annual savings, your cost-per-hour reduction percentage, and engineering hours freed per month at a 2.2x productivity multiplier.',
  },
];

const CALC_FAQS = [
  {
    question: 'Is the calculator accurate?',
    answer:
      'It models a transparent, conservative comparison: your current blended rate versus Ensaar entry execution capacity inside a managed AI pod. Productivity gains are capped at 2.2x even though real Claude Code engagements often exceed it. The result is a directionally honest first-look estimate, not a binding quote.',
  },
  {
    question: 'What does "AI-augmentable" actually mean?',
    answer:
      'AI-augmented work is effort where Claude Code, Copilot, and similar tools materially reduce the time to ship. In practice that includes scaffolding, CRUD, integration glue, test authoring, documentation, research, support drafts, refactoring, and boilerplate. Net-new architecture and high-stakes decisions are usually counted as not-augmentable.',
  },
  {
    question: 'Why is your rate $7/hr?',
    answer:
      'Ensaar is headquartered in Hyderabad with a lower structural cost base and an AI-augmented delivery workflow. The $7/hr tier is execution capacity inside a managed model with senior oversight, not a freelancer marketplace.',
  },
  {
    question: 'Will you actually email me the analysis?',
    answer:
      'The email capture on this legacy calculator is paused while we rebuild the tool as the AI Earnings Projector. See our current programs at /pricing.',
  },
];

export default function CalculatorPage() {
  const url = `${siteConfig.url}/calculator`;
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'AI Cost Reduction Calculator',
            description:
              'Interactive calculator for estimating savings from managed AI execution pods against current spend.',
            url,
          }),
          howToSchema({
            name: 'How to estimate AI cost savings for your engineering team',
            description:
              'Five-step interactive estimator that compares current delivery cost against a managed AI execution model.',
            url,
            steps: HOW_TO_STEPS,
          }),
          faqPageSchema(CALC_FAQS),
        ]}
      />

      {/* Hero */}
      <div className="relative pt-32 pb-12 overflow-hidden">
        <GlowOrbs className="absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 -z-10 opacity-[0.07] text-accent-primary">
          <DotPattern />
        </div>
        <Container>
          <Breadcrumbs items={[{ name: 'Calculator', href: '/calculator' }]} />
          <div
            role="status"
            className="mb-8 max-w-3xl rounded-2xl border border-amber-300/30 bg-amber-50/5 px-5 py-4 text-sm text-ink-secondary"
          >
            <span className="font-semibold text-ink-primary">Legacy calculator.</span>{' '}
            This estimator was built for our previous B2B positioning. We&apos;re rebuilding it as the{' '}
            <span className="text-accent-primary">AI Earnings Projector</span> — &ldquo;how much could you
            earn building AI products?&rdquo; — launching in v2.{' '}
            <a href={siteConfig.disclaimerUrl} className="underline hover:text-ink-primary">
              Earnings disclaimer
            </a>
            .
          </div>
          <div className="max-w-3xl">
            <span className="eyebrow mb-6">Cost Reduction Calculator</span>
            <h1 className="text-[clamp(2.25rem,5.5vw,4.25rem)] mt-6 mb-6 text-balance leading-[1.05]">
              What could AI reduce in{' '}
              <span className="gradient-text">your delivery cost?</span>
            </h1>
            <p className="text-lg md:text-xl text-ink-secondary mb-10">
              Three inputs. Live math. A directionally honest read on how managed AI execution could reduce your monthly delivery cost.
            </p>
          </div>
        </Container>
      </div>

      {/* Calculator */}
      <Section id="calculator" className="!pt-0">
        <Container>
          <ROICalculator />
        </Container>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-bg-secondary">
        <Container>
          <SectionHeader
            eyebrow="Calculator FAQ"
            title={
              <>
                How to <span className="gradient-text">read this.</span>
              </>
            }
            lede="Answers to the four questions most people ask about the math before they trust it."
          />
          <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto">
            {CALC_FAQS.map((f) => (
              <details
                key={f.question}
                className="group glass rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer flex items-start justify-between gap-4 list-none">
                  <span className="font-display text-base md:text-lg text-ink-primary">{f.question}</span>
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

      {/* Closing pointer to current programs */}
      <Section>
        <Container>
          <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl mb-4">
              Looking for the current direction?{' '}
              <span className="gradient-text">See our programs.</span>
            </h2>
            <p className="text-ink-secondary text-lg mb-8 max-w-xl mx-auto">
              This estimator is being rebuilt. In the meantime, our community, cohorts, and 1:1
              coaching are live on the pricing page.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button href="/pricing" size="lg" withArrow>
                See programs
              </Button>
              <Button href={siteConfig.disclaimerUrl} variant="outline" size="lg">
                Earnings disclaimer
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
