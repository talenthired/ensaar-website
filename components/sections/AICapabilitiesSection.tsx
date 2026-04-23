'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { fadeUp, viewportOnce } from '@/lib/motion';

const LINES: Array<{ text: string; kind?: 'success' | 'prompt' }> = [
  { text: '$ ensaar analyze --input customer-data.json', kind: 'prompt' },
  { text: '  > Loading Claude Sonnet 4.6 context...' },
  { text: '  > Analyzing 127,000 customer interactions...' },
  { text: '  > Prompt caching enabled · cache hit rate 94%' },
  { text: '  [OK] Pattern detection: 94.2% accuracy' },
  { text: '  [OK] Deployment ready in 2.3s' },
  { text: '$ ensaar deploy --production', kind: 'prompt' },
  { text: '  Business impact: +340% operational efficiency', kind: 'success' },
];

const CAPABILITIES = [
  'Large Language Models',
  'Claude Integration',
  'Agentic Workflows',
  'Intelligent Automation',
  'Prompt Engineering',
  'AI-Powered Analytics',
  'Custom AI Tools',
  'RAG & Knowledge Systems',
  'MCP Servers',
  'Claude Skills & Plugins',
] as const;

export function AICapabilitiesSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="ai" className="overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      />

      <Container>
        <SectionHeader
          eyebrow="AI Capabilities"
          title={
            <>
              We Don't Just Talk About AI — <span className="gradient-text">We Build With It.</span>
            </>
          }
          lede="Every solution we ship leverages AI where it creates real value. Our team actively develops with Claude Code, its plugins, and the broader AI tooling ecosystem."
        />

        <Terminal reducedMotion={!!reducedMotion} />

        <motion.div
          className="flex flex-wrap gap-3 justify-center max-w-[880px] mx-auto mt-12"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {CAPABILITIES.map((cap) => (
            <motion.div
              key={cap}
              variants={fadeUp}
              whileHover={{ y: -2 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-bg-glass border border-line-subtle rounded-full backdrop-blur-md text-sm font-medium text-ink-secondary hover:border-line-glow hover:text-ink-primary hover:shadow-[0_4px_20px_rgba(99,102,241,0.2)] transition-all"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(99,102,241,1)]" />
              {cap}
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

function Terminal({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [doneTyping, setDoneTyping] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setVisibleLines(LINES.map((l) => l.text));
      setDoneTyping(true);
      return;
    }

    let cancelled = false;
    let lineIdx = 0;

    const typeLine = async () => {
      if (cancelled || lineIdx >= LINES.length) {
        if (!cancelled) setDoneTyping(true);
        return;
      }
      const target = LINES[lineIdx].text;
      const speed = target.startsWith('$') ? 30 : 15;
      for (let i = 0; i <= target.length; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, speed));
        setVisibleLines((curr) => {
          const next = [...curr];
          next[lineIdx] = target.slice(0, i);
          return next;
        });
      }
      await new Promise((r) => setTimeout(r, 220));
      lineIdx++;
      typeLine();
    };
    typeLine();
    return () => {
      cancelled = true;
    };
  }, [inView, reducedMotion]);

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6 }}
      className="max-w-[780px] mx-auto rounded-2xl overflow-hidden border border-line-glow shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(99,102,241,0.15)] bg-[#0c0c12] relative z-[1]"
    >
      <div className="flex items-center gap-4 px-5 py-3 bg-[#15151f] border-b border-line-subtle">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="flex-1 text-center font-mono text-[0.8125rem] text-ink-muted">ensaar@ai:~</span>
      </div>
      <div className="p-6 font-mono text-sm leading-[1.8] min-h-[320px] text-accent-cyan-soft">
        {LINES.map((line, i) => (
          <div
            key={i}
            className={line.kind === 'success' ? 'text-emerald-400 font-medium' : undefined}
          >
            {visibleLines[i] || ''}
          </div>
        ))}
        {doneTyping && (
          <div className="flex items-center">
            <span>$ </span>
            <motion.span
              className="inline-block w-2 h-4 bg-accent-cyan ml-1"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
