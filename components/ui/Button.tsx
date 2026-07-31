import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type ButtonBaseProps = {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'md' | 'lg';
  withArrow?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonProps = ButtonBaseProps & { href: string };

const variants = {
  // text-accent-ink / bg-accent-press, not white / a hardcoded blue: the dark
  // theme's accent is a LIGHT blue, so white label text on it fails AA (2.5:1).
  primary:
    'bg-accent-primary text-accent-ink shadow-[0_6px_20px_rgba(0,142,207,0.24)] hover:bg-accent-press hover:shadow-[0_10px_28px_rgba(0,142,207,0.32)] hover:-translate-y-0.5',
  outline:
    'border border-line-glow text-ink-primary backdrop-blur-md hover:bg-accent-primary/10 hover:border-accent-primary hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
  ghost:
    'text-ink-secondary hover:text-ink-primary',
};

const sizes = {
  md: 'px-6 py-3 text-[0.9375rem]',
  lg: 'px-8 py-4 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  withArrow = false,
  href,
  children,
  className,
}: ButtonProps) {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
  const content = (
    <>
      <span>{children}</span>
      {withArrow && (
        <ArrowRight
          className="h-[1.125rem] w-[1.125rem] transition-transform group-hover:translate-x-1"
          aria-hidden
        />
      )}
    </>
  );

  const classes = cn(
    'group inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[0.01em] transition-all duration-300 whitespace-nowrap',
    variants[variant],
    sizes[size],
    className,
  );

  if (isExternal) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
