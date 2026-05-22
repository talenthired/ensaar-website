'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  Bot,
  Code2,
  DatabaseZap,
  Headphones,
  Search,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const WORK_TYPES = [
  {
    icon: Code2,
    title: 'Software backlog',
    body: 'Turn feature specs, bug queues, tests, integrations, and refactors into a managed AI Software Pod.',
    pod: 'AI Software Pod',
    outcome: 'Ship more features with fewer senior hours.',
  },
  {
    icon: Bot,
    title: 'Manual operations',
    body: 'Convert SOPs, spreadsheet steps, approvals, and repetitive workflows into automation assisted by AI.',
    pod: 'AI Automation Pod',
    outcome: 'Replace repeat work with governed workflows.',
  },
  {
    icon: Headphones,
    title: 'Support workload',
    body: 'Build AI assistants over tickets, docs, CRM notes, and escalation policies with human review loops.',
    pod: 'AI Support Pod',
    outcome: 'Deflect routine queries and speed up resolution.',
  },
  {
    icon: Search,
    title: 'Research and analysis',
    body: 'Use AI research desks for market scans, data enrichment, competitor tracking, and report drafts.',
    pod: 'AI Research Desk',
    outcome: 'Move research from days to hours.',
  },
  {
    icon: Users,
    title: 'Hiring gaps',
    body: 'Add AI-augmented engineers, product people, and specialists without building a permanent bench.',
    pod: 'AI Staffing Pod',
    outcome: 'Get capacity without slow hiring cycles.',
  },
  {
    icon: DatabaseZap,
    title: 'Data and knowledge',
    body: 'Turn documents, product knowledge, policies, and databases into RAG systems and internal copilots.',
    pod: 'Knowledge Automation Pod',
    outcome: 'Make institutional knowledge searchable and useful.',
  },
];

export function WorkReductionSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="work-reduction" className="bg-bg-secondary">
      <Container>
        <SectionHeader
          eyebrow="AI Cost Reduction System"
          title={
            <>
              What work do you want <span className="gradient-text">AI to reduce?</span>
            </>
          }
          lede="This is not a freelancer marketplace. Ensaar scopes the work, assigns the right AI pod, applies senior oversight, and tracks the request from estimate to delivery."
        />

        <motion.div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {WORK_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-3xl border border-line-subtle bg-bg-primary p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent-primary/50"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand opacity-70" />
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-line-subtle bg-bg-secondary text-accent-primary">
                  <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                </div>
                <h3 className="text-2xl mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed text-ink-secondary mb-6">{item.body}</p>
                <div className="space-y-3 border-t border-line-subtle pt-5">
                  <div>
                    <div className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                      Recommended pod
                    </div>
                    <div className="mt-1 font-semibold text-ink-primary">{item.pod}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                      Business outcome
                    </div>
                    <div className="mt-1 text-sm text-ink-secondary">{item.outcome}</div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Button href="/contact" size="lg" withArrow>
            Submit Work for AI Cost Review
          </Button>
          <Button href="/calculator" variant="outline" size="lg">
            Calculate Savings
          </Button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-muted">
          <span>Execution capacity can start at $7/hr inside managed tiers.</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
          <span>Senior review and delivery governance stay built in.</span>
        </div>
      </Container>
    </Section>
  );
}
