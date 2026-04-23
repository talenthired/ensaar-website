'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import type { Service } from '@/lib/content/services';

export function ServiceDetailPage({ service }: { service: Service }) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="pt-32 pb-12">
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Services', href: '/services' },
              { name: service.name, href: `/services/${service.slug}` },
            ]}
          />
          <motion.div
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.span variants={fadeUp} className="eyebrow mb-5">
              {service.name}
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-6 text-balance"
            >
              {service.tagline.split(' ').slice(0, -2).join(' ')}{' '}
              <span className="gradient-text">
                {service.tagline.split(' ').slice(-2).join(' ')}
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-ink-secondary">
              {service.longDescription}
            </motion.p>
          </motion.div>
        </Container>
      </div>

      <section className="py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <motion.div
              initial={reducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={viewportOnce}
              variants={stagger}
              className="glass rounded-2xl p-10"
            >
              <motion.h2 variants={fadeUp} className="text-2xl mb-8">
                What we offer
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
              className="glass-strong rounded-2xl p-10 h-fit sticky top-28"
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
              <Button href="/contact" withArrow>
                Start a conversation
              </Button>
            </motion.div>
          </div>
        </Container>
      </section>
    </>
  );
}
