'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function LogoMark({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('h-8 w-8', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="16"
        cy="16"
        r="14"
        stroke="url(#logoGrad)"
        strokeWidth="2"
        initial={animated ? { pathLength: 0, opacity: 0.5 } : undefined}
        animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="16"
        cy="16"
        r="3"
        fill="url(#logoGrad)"
        initial={animated ? { scale: 0 } : undefined}
        animate={animated ? { scale: 1 } : undefined}
        transition={{ duration: 0.6, delay: 0.4, type: 'spring' }}
      />
      {[
        { cx: 6, cy: 10 },
        { cx: 26, cy: 10 },
        { cx: 6, cy: 22 },
        { cx: 26, cy: 22 },
      ].map((p, i) => (
        <g key={i}>
          <motion.line
            x1="16"
            y1="16"
            x2={p.cx}
            y2={p.cy}
            stroke="url(#logoGrad)"
            strokeWidth="1"
            opacity="0.6"
            initial={animated ? { pathLength: 0 } : undefined}
            animate={animated ? { pathLength: 1 } : undefined}
            transition={{ duration: 0.7, delay: 0.5 + i * 0.08 }}
          />
          <motion.circle
            cx={p.cx}
            cy={p.cy}
            r="2"
            fill="url(#logoGrad)"
            initial={animated ? { scale: 0 } : undefined}
            animate={animated ? { scale: 1 } : undefined}
            transition={{ duration: 0.4, delay: 0.8 + i * 0.08, type: 'spring' }}
          />
        </g>
      ))}
    </svg>
  );
}
