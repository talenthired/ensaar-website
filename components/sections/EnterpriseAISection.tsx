'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, ArrowRight, Braces, CloudCog, Network, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const CAPABILITIES = [
  {
    icon: Network,
    title: 'Multi-model strategy',
    description:
      'Evaluate and combine Qwen, DeepSeek, Gemma-style, GPT-compatible, and frontier models around your workloads, controls, and deployment requirements.',
  },
  {
    icon: CloudCog,
    title: 'Cloud and GPU foundations',
    description:
      'Design scalable deployments with Amazon Bedrock, AWS GPU infrastructure, and cloud or hybrid patterns that match enterprise constraints.',
  },
  {
    icon: Braces,
    title: 'IDE-native engineering',
    description:
      'Enable VS Code and developer workflows for code generation, refactoring, testing, documentation, review, and reusable engineering playbooks.',
  },
  {
    icon: Activity,
    title: 'Observability and economics',
    description:
      'Track token use, latency, model quality, infrastructure utilization, and cost so teams can improve performance with evidence.',
  },
  {
    icon: ShieldCheck,
    title: 'Security and governance',
    description:
      'Put access controls, evaluation, data boundaries, human review, and deployment flexibility around AI from the beginning.',
  },
] as const;

export function EnterpriseAISection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="enterprise-ai" className="overflow-hidden bg-[#0c2343] text-white">
      <Container className="!w-full max-w-[1440px]">
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative min-h-[440px] lg:min-h-[820px]">
            <Image
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&q=88&auto=format&fit=crop"
              alt="Engineer using AI-assisted software development tools"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,35,67,0.08),rgba(12,35,67,0.88))]" />
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-cyan-200">Support, not lock-in</p>
              <p className="mt-3 max-w-lg text-xl leading-relaxed text-white">
                We help your people choose, use, and govern AI. The capability stays understandable and operable inside your organization.
              </p>
            </div>
          </div>

          <div className="px-6 py-16 sm:px-10 md:py-20 lg:px-16 lg:py-24">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">What we help you put in place</span>
            <h2 className="mt-6 max-w-3xl text-[clamp(2.35rem,4.8vw,4.4rem)] leading-[1.02]">
              An AI operating model your team can understand.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Ensaar combines technical implementation with practical enablement so adoption improves developer productivity without weakening security, cost control, or engineering judgment.
            </p>

            <motion.div
              className="mt-12 border-t border-white/15"
              initial={reducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={viewportOnce}
              variants={stagger}
            >
              {CAPABILITIES.map(({ icon: Icon, title, description }, index) => (
                <motion.div key={title} variants={fadeUp} className="grid gap-4 border-b border-white/15 py-6 sm:grid-cols-[52px_0.75fr_1.25fr] sm:items-start">
                  <div className="flex items-center gap-3 text-cyan-200">
                    <span className="font-mono text-xs">0{index + 1}</span>
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <h3 className="text-lg text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{description}</p>
                </motion.div>
              ))}
            </motion.div>

            <Link href="/services/ai-solutions" className="mt-10 inline-flex items-center gap-3 border-b border-[#f5a623] pb-2 font-semibold text-[#f5a623] transition hover:text-white">
              Explore enterprise AI enablement
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
