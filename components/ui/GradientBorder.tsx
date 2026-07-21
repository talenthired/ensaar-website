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
        'relative rounded-[var(--r,0.5rem)] p-[1px]',
        'bg-[linear-gradient(135deg,rgba(37,99,235,0.42),rgba(13,148,136,0.18)_50%,rgba(225,29,72,0.35))]',
        animated && 'bg-[length:300%_300%]',
        className,
      )}
      whileHover={animated ? { backgroundPosition: '100% 50%' } : undefined}
      transition={{ duration: 1.8, ease: 'easeInOut' }}
      style={{ '--r': '0.5rem' } as React.CSSProperties}
    >
      <div className={cn('rounded-[calc(var(--r,0.5rem)-1px)] bg-bg-secondary h-full', innerClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
