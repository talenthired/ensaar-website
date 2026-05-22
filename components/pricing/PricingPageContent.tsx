'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { PackageCard } from '@/components/pricing/PackageCard';
import { ComparisonTable } from '@/components/pricing/ComparisonTable';
import { CurrencyToggle } from '@/components/pricing/CurrencyToggle';
import { getProgramsByTier, type Currency } from '@/lib/content/pricing';

const STORAGE_KEY = 'ensaar-pricing-currency';

function detectDefaultCurrency(): Currency {
  if (typeof window === 'undefined') return 'USD';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'USD' || saved === 'INR') return saved;
  } catch {
    // localStorage unavailable; fall through
  }
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.startsWith('en-in') || lang.startsWith('hi')) return 'INR';
  }
  return 'USD';
}

export function PricingPageContent() {
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    setCurrency(detectDefaultCurrency());
  }, []);

  const handleChange = (next: Currency) => {
    setCurrency(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort persistence
    }
  };

  const community = getProgramsByTier('community');
  const cohorts = getProgramsByTier('cohort');
  const coaching = getProgramsByTier('coaching');

  return (
    <>
      {/* Currency toggle bar */}
      <div className="sticky top-[72px] z-30 border-b border-line-subtle bg-bg-primary/85 backdrop-blur-md">
        <Container>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-xs font-mono uppercase tracking-[0.15em] text-ink-muted">
              Prices in
            </span>
            <CurrencyToggle value={currency} onChange={handleChange} />
          </div>
        </Container>
      </div>

      {/* Community tier */}
      <Section id="community">
        <Container>
          <SectionHeader
            eyebrow="Community"
            title={
              <>
                Start here. <span className="gradient-text">Momentum + peers.</span>
              </>
            }
            lede="The Builder Community is the lowest-friction way in. Pay monthly, learn alongside other builders, and decide later whether to commit to a cohort or coaching."
          />
          <div className="grid gap-5 max-w-2xl mx-auto">
            {community.map((p) => (
              <PackageCard key={p.slug} pkg={p} currency={currency} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Cohorts tier */}
      <Section id="cohorts" className="bg-bg-secondary">
        <Container>
          <SectionHeader
            eyebrow="Live Cohorts"
            title={
              <>
                Eight weeks. <span className="gradient-text">One product shipped.</span>
              </>
            }
            lede="Live cohorts are the fastest path from idea to shipped product. Limited seats so the operator can give every builder real attention."
          />
          <div className="grid gap-5 md:grid-cols-2 max-w-4xl mx-auto">
            {cohorts.map((p) => (
              <PackageCard key={p.slug} pkg={p} currency={currency} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Coaching tier */}
      <Section id="coaching">
        <Container>
          <SectionHeader
            eyebrow="1:1 Coaching"
            title={
              <>
                For founders <span className="gradient-text">already building.</span>
              </>
            }
            lede="Direct 1:1 access to a senior operator. You bring the business; we bring decade-old AI operator scar tissue. Three months minimum, application required."
          />
          <div className="grid gap-5 max-w-2xl mx-auto">
            {coaching.map((p) => (
              <PackageCard key={p.slug} pkg={p} currency={currency} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Tier comparison */}
      <Section id="compare" className="bg-bg-secondary">
        <Container>
          <SectionHeader
            eyebrow="Compare"
            title={
              <>
                Which path is <span className="gradient-text">right for you?</span>
              </>
            }
            lede="Time commitment, support level, refund policy, and best-fit audience side by side."
          />
          <ComparisonTable />
        </Container>
      </Section>
    </>
  );
}
