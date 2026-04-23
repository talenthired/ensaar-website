'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type GradientBorderProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  animated?: boolean;
};

/**
 * Gradient border card. Outer element is the 1px gradient; inner holds content.
 * When `animated`, the gradient flows via background-position shift on hover.
 */
export function GradientBorder({
  children,
  className,
  innerClassName,
  animated = true,
}: GradientBorderProps) {
  return (
    <motion.div
      className={cn(
        'relative rounded-[var(--r,1.25rem)] p-[1px]',
        'bg-[linear-gradient(135deg,rgba(99,102,241,0.4),rgba(6,182,212,0.15)_50%,rgba(99,102,241,0.4))]',
        animated && 'bg-[length:300%_300%]',
        className,
      )}
      whileHover={animated ? { backgroundPosition: '100% 50%' } : undefined}
      transition={{ duration: 1.8, ease: 'easeInOut' }}
      style={{ '--r': '1.25rem' } as React.CSSProperties}
    >
      <div className={cn('rounded-[calc(var(--r,1.25rem)-1px)] bg-bg-secondary h-full', innerClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
