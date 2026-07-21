'use client';

import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openAdvisor, type AdvisorIntent } from '@/lib/analytics';

type AdvisorTriggerProps = {
  children: ReactNode;
  intent?: AdvisorIntent;
  source: string;
  variant?: 'primary' | 'light' | 'outline' | 'text';
  className?: string;
  withArrow?: boolean;
};

const variants = {
  primary: 'bg-[#f5a623] text-[#0c2343] hover:bg-[#f7b83e]',
  light: 'bg-white text-[#0c2343] hover:bg-cyan-50',
  outline: 'border border-current/30 bg-transparent hover:bg-current/[0.06]',
  text: 'border-b border-current pb-1',
};

export function AdvisorTrigger({
  children,
  intent,
  source,
  variant = 'primary',
  className,
  withArrow = true,
}: AdvisorTriggerProps) {
  return (
    <button
      type="button"
      onClick={() => openAdvisor(intent, source)}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-semibold transition-all hover:-translate-y-0.5',
        variants[variant],
        className,
      )}
    >
      <span>{children}</span>
      {withArrow && (
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
      )}
    </button>
  );
}

