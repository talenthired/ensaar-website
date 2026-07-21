import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, FileCheck2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';

const SIGNALS = [
  { icon: ShieldCheck, label: 'AI readiness for modern work' },
  { icon: HeartHandshake, label: 'Emotional intelligence at the core' },
  { icon: FileCheck2, label: 'Applied assessment' },
  { icon: BadgeCheck, label: 'Ensaar credential' },
  { icon: Building2, label: 'Individual and enterprise cohorts' },
];

export function BcepCertificationCta() {
  return (
    <section className="relative overflow-hidden bg-[#0c2343] py-20 text-white md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(19,166,148,0.22),transparent_35%)]" aria-hidden />
      <Container>
        <div className="relative grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <span className="eyebrow text-cyan-300">Business Communication Excellence Program</span>
            <h2 className="mt-7 max-w-3xl text-[clamp(2.5rem,5.5vw,4.8rem)] leading-[1.02]">
              Get <span className="text-[#f5a623]">BCEP Certified.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Build AI readiness, emotional intelligence, communication, leadership execution, and
              professional effectiveness through an applied and assessed Ensaar pathway.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/services/corporate-training"
                className="inline-flex items-center gap-2 rounded-md bg-[#f5a623] px-7 py-4 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]"
              >
                Explore BCEP AI Readiness
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center gap-2 rounded-md border border-white/30 px-7 py-4 font-semibold text-white transition hover:bg-white/10"
              >
                <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden />
                Verify a Certificate
              </Link>
            </div>
          </div>
          <div className="border-t border-white/15">
            {SIGNALS.map(({ icon: Icon, label }, index) => (
              <div key={label} className="flex items-center gap-4 border-b border-white/15 px-2 py-5">
                <span className="font-mono text-xs text-cyan-300">0{index + 1}</span>
                <Icon className="h-5 w-5 text-[#f5a623]" aria-hidden />
                <span className="font-semibold text-slate-100">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
