'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

type NavChild = { label: string; href: string; description?: string };
type NavItem = { label: string; href: string; children?: NavChild[] };

const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Events', href: '/events' },
  { label: 'Contact', href: '/contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();

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
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <motion.header
      initial={reducedMotion ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'py-3 bg-bg-primary/75 backdrop-blur-xl border-b border-line-subtle'
          : 'py-5',
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
            className="h-9 w-auto md:h-10"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
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
          <Button href="/contact" size="md" className="px-5 py-2 text-sm">
            Get Cost Plan
          </Button>
        </nav>

        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
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
          className="lg:hidden fixed inset-0 top-0 pt-20 bg-bg-primary/97 backdrop-blur-2xl z-40 overflow-y-auto"
        >
          <nav className="container-page flex flex-col items-center gap-5 pt-10 pb-12 text-center">
            {NAV.map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
                className="w-full"
              >
                <Link
                  href={item.href}
                  className="block text-2xl font-display text-ink-primary hover:gradient-text transition-all"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="flex flex-col gap-2 mt-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="text-base text-ink-secondary hover:text-accent-secondary"
                        onClick={() => setMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4"
              onClick={() => setMenuOpen(false)}
            >
              <Button href="/contact" size="lg">
                Get Cost Plan
              </Button>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}

function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={item.href}
        className="relative inline-flex items-center gap-1 text-[0.9375rem] font-medium text-ink-secondary hover:text-ink-primary transition-colors group"
      >
        {item.label}
        <svg
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            open && 'rotate-180',
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="absolute left-0 -bottom-1 h-[1px] w-0 bg-gradient-brand transition-all duration-300 group-hover:w-[calc(100%-1.25rem)]" />
      </Link>

      {open && item.children && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[320px]"
        >
          <div className="glass-strong rounded-2xl p-2 shadow-glow">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="block px-4 py-3 rounded-xl hover:bg-accent-primary/[0.08] transition-colors group/child"
              >
                <div className="font-display text-base text-ink-primary group-hover/child:text-accent-primary transition-colors">
                  {child.label}
                </div>
                {child.description && (
                  <div className="text-[0.8125rem] text-ink-secondary mt-0.5">
                    {child.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
