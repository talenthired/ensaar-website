import { TIER_COMPARISON } from '@/lib/content/pricing';

/**
 * "Which path is right for you?" — three-column tier comparison.
 * Columns: Community / Cohort / Coaching.
 */
export function ComparisonTable() {
  return (
    <div className="glass-strong rounded-3xl p-2 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line-subtle">
              <th className="px-5 py-5 text-[0.8125rem] font-mono uppercase tracking-[0.15em] text-ink-muted">
                Decision
              </th>
              <th className="px-5 py-5 text-sm">
                <div className="font-display text-base text-ink-primary">Community</div>
                <div className="text-[0.8125rem] text-ink-muted mt-0.5">
                  Momentum + peers
                </div>
              </th>
              <th className="px-5 py-5 text-sm bg-gradient-brand-soft rounded-2xl">
                <div className="font-display text-base gradient-text">Cohort</div>
                <div className="text-[0.8125rem] text-ink-muted mt-0.5">
                  Ship a product in 8 weeks
                </div>
              </th>
              <th className="px-5 py-5 text-sm">
                <div className="font-display text-base text-ink-primary">1:1 Coaching</div>
                <div className="text-[0.8125rem] text-ink-muted mt-0.5">
                  Senior operator sparring partner
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {TIER_COMPARISON.rows.map((r) => (
              <tr key={r.label} className="border-b border-line-subtle last:border-b-0">
                <td className="px-5 py-4 text-sm text-ink-secondary">{r.label}</td>
                <td className="px-5 py-4 text-sm text-ink-secondary">{r.community}</td>
                <td className="px-5 py-4 text-sm text-ink-primary bg-accent-primary/[0.04] font-display">
                  {r.cohort}
                </td>
                <td className="px-5 py-4 text-sm text-ink-secondary">{r.coaching}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-4 text-xs text-ink-muted">
        Most builders start with the community, graduate to a cohort, and add coaching once they have
        a product earning revenue. The three are designed to work as a ladder, not as alternatives.
      </p>
    </div>
  );
}
