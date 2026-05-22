'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { PackageCard } from './PackageCard';
import { PROGRAMS, type Currency } from '@/lib/content/pricing';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

export function PricingTable({ currency = 'USD' }: { currency?: Currency }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      initial={reducedMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
    >
      {PROGRAMS.map((p) => (
        <motion.div key={p.slug} variants={fadeUp}>
          <PackageCard pkg={p} currency={currency} />
        </motion.div>
      ))}
    </motion.div>
  );
}
