'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { LogoMark } from '@/components/icons/LogoMark';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'BCEP', href: '/bcep' },
  { label: 'Work', href: '/work' },
  { label: 'AI', href: '/ai' },
  { label: 'FAQ', href: '/faq' },
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
        <Link href="/" className="flex items-center gap-2.5" aria-label="Ensaar Global home">
          <LogoMark />
          <span className="font-display text-lg tracking-[0.15em] gradient-text">ENSAAR</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-[0.9375rem] font-medium text-ink-secondary hover:text-ink-primary transition-colors group"
            >
              {item.label}
              <span className="absolute left-0 -bottom-1 h-[1px] w-0 bg-gradient-brand transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <Button href="/contact" size="md" className="px-5 py-2 text-sm">
            Get in Touch
          </Button>
        </nav>

        <button
          type="button"
          className="lg:hidden p-2 text-ink-primary"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 top-0 pt-20 bg-bg-primary/97 backdrop-blur-2xl z-40"
        >
          <nav className="container-page flex flex-col items-center gap-6 pt-12">
            {NAV.map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <Link
                  href={item.href}
                  className="text-2xl font-display text-ink-primary hover:gradient-text transition-all"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
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
                Get in Touch
              </Button>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
