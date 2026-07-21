'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Building2, Code2, GraduationCap } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const PATHWAYS = [
  {
    number: '01',
    icon: GraduationCap,
    audience: 'Students',
    title: 'Build the judgment to work with AI, not just prompt it.',
    description:
      'Industry-readiness programs combine AI literacy, problem solving, communication, emotional intelligence, and hands-on engineering practice.',
    link: '/contact?interest=student-ai-readiness',
    action: 'Bring AI readiness to a campus',
  },
  {
    number: '02',
    icon: Code2,
    audience: 'Engineers',
    title: 'Turn AI into a dependable part of the software lifecycle.',
    description:
      'Learn to use IDE-native AI for code generation, refactoring, testing, documentation, review, and secure delivery without surrendering engineering judgment.',
    link: '/services/ai-solutions',
    action: 'Explore engineering enablement',
  },
  {
    number: '03',
    icon: Building2,
    audience: 'Organizations',
    title: 'Move from scattered experiments to governed adoption.',
    description:
      'Define the model strategy, infrastructure, controls, observability, and team practices required to use enterprise AI with confidence.',
    link: '/contact?interest=enterprise-ai',
    action: 'Plan an adoption program',
  },
] as const;

export function AudiencePathwaysSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="who-we-support" className="bg-bg-primary py-20 md:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <span className="eyebrow">Who We Support</span>
            <h2 className="mt-6 text-[clamp(2.3rem,5vw,4.4rem)] leading-[1.02] text-balance">
              One AI transition. Three very different starting points.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-ink-secondary lg:justify-self-end">
            Enterprise-grade AI is not only an infrastructure decision. It changes how people learn,
            how engineers build, and how organizations govern technology. Ensaar supports all three.
          </p>
        </div>

        <motion.div
          className="mt-14 border-y border-line-subtle"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {PATHWAYS.map(({ number, icon: Icon, audience, title, description, link, action }) => (
            <motion.article
              key={audience}
              variants={fadeUp}
              className="group grid gap-5 border-b border-line-subtle py-8 last:border-b-0 md:grid-cols-[100px_0.75fr_1.25fr] md:items-start md:py-10"
            >
              <div className="flex items-center gap-4 text-accent-secondary">
                <span className="font-mono text-xs tracking-[0.14em]">{number}</span>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.08em] text-accent-secondary">{audience}</div>
                <h3 className="mt-3 text-2xl leading-tight md:text-3xl">{title}</h3>
              </div>
              <div className="md:pl-8">
                <p className="leading-relaxed text-ink-secondary">{description}</p>
                <Link href={link} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-primary transition-colors hover:text-accent-primary">
                  {action}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
