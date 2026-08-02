'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import { AdvisorTrigger } from '@/components/marketing/AdvisorTrigger';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';
import { INDUSTRIES } from '@/lib/content/trust';

type NavChild = { label: string; href: string; description?: string; group?: 'Services' | 'Industries' };
type NavItem = { label: string; href: string; children?: NavChild[] };

const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  {
    label: 'What We Do',
    href: '/services',
    children: [
      { label: 'Enterprise AI Enablement', href: '/services/ai-solutions', description: 'Adoption, engineering support, and governance', group: 'Services' },
      { label: 'Software Development', href: '/services/software-development', description: 'Web, mobile, SaaS, and enterprise applications', group: 'Services' },
      { label: 'AI-Ready Engineering Teams', href: '/services/staffing', description: 'Supported AI-fluent delivery capacity', group: 'Services' },
      { label: 'Corporate Training', href: '/services/corporate-training', description: 'BCEP certification, AI readiness, and industry readiness', group: 'Services' },
      ...INDUSTRIES.map((industry) => ({
        label: industry.name,
        href: `/#industry-${industry.id}`,
        group: 'Industries' as const,
      })),
    ],
  },
  { label: 'DailyByte™', href: '/ai-work-lab' },
  { label: 'Insights', href: '/insights' },
  { label: 'Events', href: '/events' },
  { label: 'Contact', href: '/contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    window.dispatchEvent(
      new CustomEvent('ensaar:navigation-state', { detail: { open: menuOpen } }),
    );
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <motion.header
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 inset-x-0 z-50 border-t-[3px] border-t-accent-primary transition-all duration-300',
        scrolled ? 'py-2.5 shadow-card' : 'py-3.5',
        'bg-bg-primary/95 backdrop-blur-xl border-b border-line-subtle',
      )}
    >
      <div className="container-page flex items-center justify-between gap-8">
        <Link href="/" className="flex items-center" aria-label="Ensaar Global home">
          <Image
            src="/ensaar-logo.png"
            alt="Ensaar Global"
            width={938}
            height={259}
            priority
            className="h-8 w-auto md:h-9"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-5" aria-label="Primary">
          {NAV.map((item) =>
            item.children ? (
              <NavDropdown key={item.href} item={item} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-[0.9375rem] font-medium text-ink-secondary hover:text-ink-primary transition-colors group"
              >
                {item.label}
                <span className="absolute left-0 -bottom-1 h-[1px] w-0 bg-gradient-brand transition-all duration-300 group-hover:w-full" />
              </Link>
            ),
          )}
          <ThemeToggle />
          <AdvisorTrigger source="header" variant="primary" className="px-5 py-2.5">
            Find Your AI Fit
          </AdvisorTrigger>
        </nav>

        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            suppressHydrationWarning
            className="p-2 text-ink-primary"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-x-0 top-full z-40 h-[calc(100svh-4.25rem)] overflow-y-auto overscroll-contain bg-bg-primary lg:hidden"
        >
          {/* Left-aligned rows, not a centred poster.
              This panel used to render every link at text-2xl, centred, with the
              12-item What We Do submenu permanently expanded: 19 links stacked
              well past the viewport, so Insights, Events and Contact sat below
              the fold with nothing indicating they were there, and the nested
              card was left-aligned inside centred parents. A phone menu is a
              list to scan, so it reads as one, and the section that carries a
              dozen children collapses instead of pushing everything else off
              screen. */}
          <nav className="container-page flex flex-col py-2">
            {NAV.map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 + i * 0.035 }}
                className="border-b border-line-subtle last:border-b-0"
              >
                {item.children ? (
                  <MobileNavGroup item={item} onNavigate={() => setMenuOpen(false)} />
                ) : (
                  <Link
                    href={item.href}
                    // min-h-[52px] keeps every row a comfortable tap target.
                    className="flex min-h-[52px] items-center text-lg font-display text-ink-primary transition-colors hover:text-accent-secondary"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 + NAV.length * 0.035 }}
              className="pt-5 pb-8"
              onClick={() => setMenuOpen(false)}
            >
              <AdvisorTrigger source="mobile-menu" variant="primary" className="w-full justify-center">
                Find Your AI Fit
              </AdvisorTrigger>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}

/**
 * A nav item with children, on mobile.
 *
 * Collapsed by default. Expanded, "What We Do" adds twelve links, which is more
 * than the rest of the menu combined, so leaving it open permanently buried
 * every item below it.
 */
function MobileNavGroup({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className="flex min-h-[52px] flex-1 items-center text-lg font-display text-ink-primary transition-colors hover:text-accent-secondary"
          onClick={onNavigate}
        >
          {item.label}
        </Link>
        <button
          type="button"
          // A separate control from the link: tapping the label should still
          // navigate, and only the chevron expands.
          className="-mr-2 flex h-[52px] w-12 items-center justify-center text-ink-secondary"
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="grid gap-4 pb-4">
          {(['Services', 'Industries'] as const).map((group) => (
            <div key={group}>
              <div className="mb-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-accent-secondary">
                {group}
              </div>
              <div className="flex flex-col">
                {item.children?.filter((child) => child.group === group).map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="flex min-h-[40px] items-center pl-3 text-sm text-ink-secondary transition-colors hover:text-accent-secondary"
                    onClick={onNavigate}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Link
        href={item.href}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex items-center gap-1 text-[0.9375rem] font-medium text-ink-secondary hover:text-ink-primary transition-colors group"
      >
        {item.label}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        />
        <span className="absolute left-0 -bottom-1 h-[1px] w-0 bg-gradient-brand transition-all duration-300 group-hover:w-[calc(100%-1.25rem)]" />
      </Link>

      {open && item.children && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-1/2 top-full w-[720px] -translate-x-1/2 pt-3"
        >
          <div className="grid grid-cols-[1.15fr_0.85fr] overflow-hidden rounded-lg border border-line-glow bg-bg-secondary shadow-card">
            {(['Services', 'Industries'] as const).map((group) => (
              <div key={group} className="border-r border-line-subtle p-4 last:border-r-0">
                <div className="px-3 pb-3 pt-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-accent-secondary">
                  {group}
                </div>
                {item.children?.filter((child) => child.group === group).map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="group/child block border-t border-line-subtle px-3 py-2.5 transition-colors hover:bg-accent-primary/[0.06]"
                  >
                    <div className="font-display text-sm text-ink-primary transition-colors group-hover/child:text-accent-primary">
                      {child.label}
                    </div>
                    {child.description && (
                      <div className="mt-0.5 text-[0.75rem] text-ink-secondary">
                        {child.description}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
