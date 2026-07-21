'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Bot, Braces, CloudCog, UsersRound } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const CAPABILITIES = [
  {
    number: '01',
    title: 'Enterprise AI Enablement',
    description: 'Model strategy, engineering workflows, secure deployment, observability, governance, and team adoption.',
    href: '/services/ai-solutions',
    icon: Bot,
  },
  {
    number: '02',
    title: 'Software Development',
    description: 'Web, mobile, SaaS, and enterprise products engineered from discovery through production and handover.',
    href: '/services/software-development',
    icon: Braces,
  },
  {
    number: '03',
    title: 'Cloud and Automation',
    description: 'Modern applications, connected systems, repeatable delivery pipelines, and dependable automated workflows.',
    href: '/services/software-development',
    icon: CloudCog,
  },
  {
    number: '04',
    title: 'AI-Ready Engineering Teams',
    description: 'AI-fluent contributors and specialists supported by Ensaar review, enablement, and delivery oversight.',
    href: '/services/staffing',
    icon: UsersRound,
  },
] as const;

export function EngineeringCapabilitiesSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="engineering-capabilities" className="bg-bg-secondary py-20 md:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <span className="eyebrow">Technology Services</span>
            <h2 className="mt-6 text-[clamp(2.3rem,4.8vw,4.2rem)] leading-[1.02] text-balance">
              Advice is useful. Delivery makes it real.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-ink-secondary lg:justify-self-end">
            Ensaar can help a team understand AI, build the surrounding software, establish the cloud and governance layer, and continue supporting the people doing the work.
          </p>
        </div>

        <motion.div
          className="mt-14 grid border-l border-t border-line-subtle md:grid-cols-2"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {CAPABILITIES.map(({ number, title, description, href, icon: Icon }) => (
            <motion.article
              key={number}
              variants={fadeUp}
              className="group relative min-h-[280px] border-b border-r border-line-subtle p-7 transition-colors hover:bg-accent-primary/[0.04] md:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-[0.14em] text-accent-secondary">{number}</span>
                <Icon className="h-6 w-6 text-accent-primary" aria-hidden />
              </div>
              <h3 className="mt-14 max-w-lg text-2xl md:text-3xl">{title}</h3>
              <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">{description}</p>
              <Link href={href} aria-label={`Explore ${title}`} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-primary transition-colors hover:text-accent-primary">
                Explore capability
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
