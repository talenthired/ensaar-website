import { Container } from '@/components/ui/Container';

export type Stat = {
  value: string;
  label: string;
  hint?: string;
};

/**
 * Soft credibility stats directly under the hero. Phase 1 uses Ensaar-history
 * numbers; Phase 2 layers in real student/cohort numbers once the community
 * launches. Never fabricate — the credibility job here is "this is real,"
 * not "this looks impressive."
 */
const DEFAULT_STATS: Stat[] = [
  { value: 'Since 2014', label: 'Operator-led', hint: 'Ensaar Global Pvt. Ltd.' },
  { value: '7', label: 'Countries delivered to', hint: 'India, Singapore, China, UAE, Saudi Arabia, Japan, Australia' },
  { value: '10 yrs', label: 'Production AI experience' },
  { value: 'Hyderabad', label: 'Headquarters', hint: 'Begumpet, Telangana, India' },
];

export function StatBar({ stats = DEFAULT_STATS }: { stats?: Stat[] }) {
  return (
    <section
      aria-label="Credibility stats"
      className="border-y border-line-subtle bg-bg-secondary/40 py-8 md:py-10"
    >
      <Container>
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4">
          {stats.map((s) => (
            <li key={s.label} className="flex flex-col gap-1">
              <span className="font-display text-2xl md:text-3xl gradient-text">{s.value}</span>
              <span className="text-sm text-ink-primary">{s.label}</span>
              {s.hint && <span className="text-xs text-ink-muted">{s.hint}</span>}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
