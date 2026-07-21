import { Container } from '@/components/ui/Container';

export type Stat = {
  value: string;
  label: string;
  hint?: string;
};

/** Credibility signals based on Ensaar's operating history. */
const DEFAULT_STATS: Stat[] = [
  { value: 'Since 2014', label: 'Operator-led', hint: 'Ensaar Global Pvt. Ltd.' },
  { value: '7', label: 'Countries delivered to', hint: 'India, Singapore, China, UAE, Saudi Arabia, Japan, Australia' },
  { value: 'AI + software', label: 'Integrated delivery capability' },
  { value: '2 locations', label: 'India presence', hint: 'Hyderabad, Telangana and Noida, Uttar Pradesh' },
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
