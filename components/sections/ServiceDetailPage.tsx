'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { AdvisorTrigger } from '@/components/marketing/AdvisorTrigger';
import { HeroImage } from '@/components/ui/HeroImage';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import type { Service } from '@/lib/content/services';

const HERO_IMAGES: Record<Service['slug'], { src: string; alt: string; tint: 'brand' | 'fresh' | 'warm' }> = {
  'ai-solutions': {
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400&q=85&auto=format&fit=crop',
    alt: 'Close view of modern computing infrastructure for enterprise AI systems',
    tint: 'brand',
  },
  'software-development': {
    src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1400&q=85&auto=format&fit=crop',
    alt: 'Modern software product development workspace with application code',
    tint: 'brand',
  },
  staffing: {
    src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1400&q=85&auto=format&fit=crop',
    alt: 'Technology delivery team collaborating around a work table',
    tint: 'fresh',
  },
  'corporate-training': {
    src: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1400&q=85&auto=format&fit=crop',
    alt: 'Business professionals aligning on an enterprise capability plan',
    tint: 'warm',
  },
};

export function ServiceDetailPage({ service }: { service: Service }) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="pt-28 pb-14 md:pt-32">
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Services', href: '/services' },
              { name: service.name, href: `/services/${service.slug}` },
            ]}
          />
          <div className="grid items-center gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <motion.div
              initial={false}
              animate="visible"
              variants={stagger}
              className="max-w-2xl"
            >
              <motion.span variants={fadeUp} className="eyebrow mb-5">
                {service.slug === 'corporate-training' ? 'BCEP AI Readiness Certification' : service.name}
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="mt-5 max-w-[620px] text-[clamp(2.35rem,4.4vw,4.35rem)] leading-[1.03] text-balance"
              >
                {service.tagline}
              </motion.h1>
              <motion.p variants={fadeUp} className="max-w-xl text-[clamp(1rem,1.25vw,1.18rem)] leading-relaxed text-ink-secondary">
                {service.longDescription}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                {service.slug === 'ai-solutions' ? (
                  <AdvisorTrigger intent="enterprise" source="ai-service-hero" variant="primary">Map one workflow</AdvisorTrigger>
                ) : (
                  <Button href={service.slug === 'corporate-training' ? `mailto:info@ensaar.com` : '/contact'} withArrow>
                    {service.slug === 'corporate-training' ? 'Start BCEP AI Readiness' : 'Discuss your project'}
                  </Button>
                )}
                {service.slug !== 'corporate-training' && <Button href="#service-details" variant="outline">Review the support scope</Button>}
              </motion.div>
            </motion.div>
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="lg:pl-4 xl:-mr-8"
            >
              <HeroImage {...HERO_IMAGES[service.slug]} className="aspect-[16/10] lg:aspect-[16/9.6]" />
            </motion.div>
          </div>
        </Container>
      </div>

      {service.slug === 'ai-solutions' && (
        <section className="bg-[#0c2343] py-16 text-white md:py-20">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-cyan-200">A decision-led engagement</div>
                <h2 className="mt-5 text-3xl leading-tight md:text-4xl">Move from possibility to operating evidence.</h2>
              </div>
              <p className="max-w-2xl leading-relaxed text-slate-300 lg:justify-self-end">Each stage reduces a different uncertainty: whether the workflow matters, whether the system works, whether the controls hold, and whether the team can operate it.</p>
            </div>
            <div className="mt-10 grid border-l border-t border-white/15 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'Diagnose', 'Map the workflow, value hypothesis, data, users, and decision criteria.'],
                ['02', 'Prove', 'Build the smallest credible system that can produce real quality and cost evidence.'],
                ['03', 'Control', 'Add evaluation, access, observability, human review, and operating boundaries.'],
                ['04', 'Enable', 'Prepare the people, playbooks, ownership, and capability signals required to scale.'],
              ].map(([number, title, detail]) => (
                <div key={number} className="border-b border-r border-white/15 p-6 md:p-7">
                  <div className="font-mono text-xs text-[#59d8c8]">{number}</div>
                  <h3 className="mt-8 text-xl text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-4 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm text-slate-300">Bring one workflow to EnAI Navigator. It will identify the most useful first conversation in two questions.</p>
              <AdvisorTrigger intent="enterprise" source="ai-service-process" variant="primary" className="shrink-0">Find my starting point</AdvisorTrigger>
            </div>
          </Container>
        </section>
      )}

      <section id="service-details" className="scroll-mt-24 py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <motion.div
              initial={reducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={viewportOnce}
              variants={stagger}
              className="border border-line-subtle bg-bg-secondary p-8 md:p-10"
            >
              <motion.h2 variants={fadeUp} className="text-2xl mb-8">
                {service.slug === 'corporate-training' ? 'Certification pathways' : 'What we offer'}
              </motion.h2>
              <ul className="flex flex-col gap-3">
                {service.offerings.map((offering) => (
                  <motion.li
                    key={offering}
                    variants={fadeUp}
                    className="flex items-start gap-3 text-ink-secondary"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-primary/15 border border-accent-primary/40 text-accent-primary mt-0.5 shrink-0">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span>{offering}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={reducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={viewportOnce}
              variants={stagger}
              className="sticky top-28 h-fit border border-line-glow bg-bg-secondary p-8 shadow-card md:p-10"
            >
              <motion.h2 variants={fadeUp} className="text-2xl mb-6">
                Typical outcomes
              </motion.h2>
              <ul className="flex flex-col gap-4 mb-8">
                {service.outcomes.map((outcome) => (
                  <motion.li
                    key={outcome}
                    variants={fadeUp}
                    className="text-ink-secondary pl-5 relative before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-gradient-brand"
                  >
                    {outcome}
                  </motion.li>
                ))}
              </ul>
              {service.slug === 'ai-solutions' ? (
                <AdvisorTrigger intent="enterprise" source="ai-service-outcomes" variant="primary">Request a workflow diagnostic</AdvisorTrigger>
              ) : (
                <Button href={service.slug === 'corporate-training' ? `mailto:info@ensaar.com` : '/contact'} withArrow>
                  {service.slug === 'corporate-training' ? 'Get BCEP Certified' : 'Start a conversation'}
                </Button>
              )}
            </motion.div>
          </div>
        </Container>
      </section>
    </>
  );
}
