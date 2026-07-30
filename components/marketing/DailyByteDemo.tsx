'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

type DailyByteDemoView = 'learn' | 'target' | 'dailyCode' | 'simulation' | 'tasks' | 'insights';

type DailyByteDemoProps = {
  view: DailyByteDemoView;
  className?: string;
  label?: string;
};

const ease = [0.16, 1, 0.3, 1] as const;

function normalized(view: DailyByteDemoView): 'learn' | 'target' | 'dailyCode' {
  if (view === 'simulation') return 'target';
  if (view === 'tasks') return 'learn';
  if (view === 'insights') return 'dailyCode';
  return view;
}

function Cursor({ path }: { path: Array<{ x: number; y: number }> }) {
  const reducedMotion = useReducedMotion();
  const points = reducedMotion ? [path[path.length - 1]!] : path;

  return (
    <motion.g
      animate={{ x: points.map((point) => point.x), y: points.map((point) => point.y) }}
      transition={{ duration: 5.6, repeat: Infinity, repeatDelay: 0.6, ease }}
      filter="url(#cursor-shadow)"
    >
      <path d="M0 0 0 26 8 19 14 31 21 28 15 16 25 16Z" fill="#f8fafc" stroke="#101010" strokeWidth="1.5" />
      <motion.circle
        cx="5"
        cy="5"
        r="17"
        fill="#ffb703"
        opacity="0.22"
        animate={reducedMotion ? undefined : { scale: [0.55, 1.35, 0.55], opacity: [0, 0.26, 0] }}
        transition={{ duration: 1.45, repeat: Infinity, repeatDelay: 1.1 }}
      />
    </motion.g>
  );
}

function Shell({
  children,
  active,
  title,
}: {
  children: ReactNode;
  active: 'AI Learn' | 'AI Jobs' | 'Daily code';
  title: string;
}) {
  const navItems = [
    ['AI Learn', 210],
    ['AI Jobs', 244],
    ['Daily code', 278],
    ['Practice', 312],
    ['Progress', 346],
    ['Rewards', 380],
  ] as const;

  return (
    <>
      <rect x="32" y="28" width="896" height="544" rx="28" fill="#141414" stroke="rgba(255,255,255,0.14)" />
      <rect x="32" y="28" width="896" height="46" rx="28" fill="#1b1b1b" />
      <circle cx="62" cy="51" r="6" fill="#ff605c" />
      <circle cx="82" cy="51" r="6" fill="#ffbd44" />
      <circle cx="102" cy="51" r="6" fill="#00ca4e" />
      <rect x="122" y="42" width="270" height="18" rx="9" fill="rgba(255,255,255,0.07)" />
      <text x="140" y="55" fill="rgba(255,255,255,0.48)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10">
        labs.ensaar.com
      </text>

      <rect x="32" y="74" width="166" height="498" fill="#171717" stroke="rgba(255,255,255,0.08)" />
      {/* The DailyByte mark, generated from brand/build.mjs in the product
          repo. Scaled so its 100-unit height reads at 26px here. */}
      <g transform="translate(54 98) scale(0.26)">
          <path fill="#ffffff" d="M 4.2 0 H 60 V 19 H 4.2 A 4.2 4.2 0 0 1 0 14.8 V 4.2 A 4.2 4.2 0 0 1 4.2 0 Z" />
          <path fill="#ffffff" d="M 58.2 0 A 37.4 50 0 0 1 58.2 100 L 58.2 81 A 18.4 31 0 0 0 58.2 19 Z" />
          <path fill="#ffffff" d="M 4.2 33.7 H 14.8 A 4.2 4.2 0 0 1 19 37.9 V 77.2 A 4.2 4.2 0 0 0 23.2 81.4 H 34.9 A 4.2 4.2 0 0 1 39.1 85.6 V 95.8 A 4.2 4.2 0 0 1 34.9 100 H 4.2 A 4.2 4.2 0 0 1 0 95.8 V 37.9 A 4.2 4.2 0 0 1 4.2 33.7 Z" />
          <rect x="28.67" y="37.1" width="29.3" height="29.3" rx="5.4" fill="#ffb703" />
      </g>
      <text x="86" y="116" fontFamily="Inter, Arial, sans-serif" fontSize="15" fontWeight="800" letterSpacing="-0.6">
        <tspan fill="#ffffff">daily</tspan><tspan fill="#ffb703">byte</tspan>
      </text>
      <rect x="54" y="140" width="122" height="32" rx="8" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.12)" />
      <text x="73" y="161" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight="700">
        + Start AI Learn
      </text>
      {navItems.map(([label, y]) => {
        const isActive = label === active;
        return (
        <g key={String(label)}>
          <rect x="48" y={Number(y) - 19} width="138" height="28" rx="8" fill={isActive ? 'rgba(255,255,255,0.08)' : 'transparent'} />
          <circle cx="64" cy={Number(y) - 5} r="4" fill={isActive ? '#ffb703' : 'rgba(255,255,255,0.35)'} />
          <text x="78" y={Number(y)} fill={isActive ? '#f8fafc' : 'rgba(255,255,255,0.58)'} fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight={isActive ? '800' : '650'}>
            {label}
          </text>
        </g>
      );
      })}
      <rect x="48" y="506" width="138" height="36" rx="9" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.1)" />
      <circle cx="68" cy="524" r="12" fill="#ffb703" />
      <text x="88" y="520" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="10" fontWeight="800">
        L2 Bronze
      </text>
      <rect x="88" y="529" width="72" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="88" y="529" width="42" height="4" rx="2" fill="#5fc3e0" />

      <rect x="198" y="74" width="730" height="498" fill="#121212" />
      <rect x="198" y="74" width="730" height="44" fill="#181818" stroke="rgba(255,255,255,0.08)" />
      <text x="228" y="102" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="13" fontWeight="800">
        {title}
      </text>
      <rect x="806" y="86" width="66" height="20" rx="6" fill="rgba(255,255,255,0.06)" />
      <text x="820" y="100" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="10" fontWeight="800">
        L2
      </text>
      <circle cx="900" cy="96" r="14" fill="#0f2a33" stroke="rgba(255,255,255,0.18)" />
      {children}
    </>
  );
}

function LearnScreen() {
  const reducedMotion = useReducedMotion();
  const cards = [
    ['AI Product Analyst', 'Ready to start', '#ffb703', 248, 248],
    ['Automate test suite', 'Best score 86%', '#5fcfa8', 458, 248],
    ['Data QA from CSV', 'Ready to start', '#f5a623', 668, 248],
    ['Support insight brief', 'AI generated', '#5fc3e0', 248, 374],
    ['Revenue dashboard', 'For your role', '#fb7185', 458, 374],
  ] as const;

  return (
    <>
      <text x="244" y="160" fill="#ffb703" fontFamily="Inter, Arial, sans-serif" fontSize="12" fontWeight="800">
        Personalized for Data Analyst
      </text>
      <text x="244" y="196" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="34" fontWeight="850">
        Choose your next AI Learn lab.
      </text>
      <text x="246" y="224" fill="rgba(255,255,255,0.62)" fontFamily="Inter, Arial, sans-serif" fontSize="13">
        Direct AI with real tools, submit a deliverable, and build proof.
      </text>

      {cards.map(([title, meta, accent, x, y], index) => (
        <motion.g key={title} animate={reducedMotion ? undefined : { y: index === 0 ? [0, -4, 0] : 0 }} transition={{ duration: 4.8, repeat: Infinity }}>
          <rect x={x} y={y} width="182" height="104" rx="12" fill="#1f1f1f" stroke="rgba(255,255,255,0.1)" />
          <rect x={x + 16} y={y + 16} width="34" height="34" rx="10" fill={accent} opacity="0.95" />
          <text x={x + 16} y={y + 66} fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="13" fontWeight="800">
            {title}
          </text>
          <text x={x + 16} y={y + 88} fill="rgba(255,255,255,0.55)" fontFamily="Inter, Arial, sans-serif" fontSize="10" fontWeight="700">
            15 to 25 min / practical
          </text>
          <rect x={x + 112} y={y + 17} width="50" height="18" rx="9" fill="rgba(255,255,255,0.06)" />
          <text x={x + 121} y={y + 30} fill={accent} fontFamily="Inter, Arial, sans-serif" fontSize="9" fontWeight="800">
            {meta.slice(0, 8)}
          </text>
        </motion.g>
      ))}
      <Cursor path={[{ x: 744, y: 308 }, { x: 525, y: 300 }, { x: 322, y: 306 }, { x: 362, y: 420 }]} />
    </>
  );
}

function TargetScreen() {
  return (
    <>
      <text x="244" y="154" fill="#ffb703" fontFamily="Inter, Arial, sans-serif" fontSize="12" fontWeight="800">
        AI Jobs learning
      </text>
      <text x="244" y="192" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="36" fontWeight="850">
        Master this job target.
      </text>
      <text x="246" y="222" fill="rgba(255,255,255,0.62)" fontFamily="Inter, Arial, sans-serif" fontSize="13">
        Learn each requirement, practice with AI, and build proof for interviews.
      </text>
      <rect x="734" y="142" width="136" height="114" rx="14" fill="#1f1f1f" stroke="rgba(255,255,255,0.1)" />
      <text x="754" y="168" fill="#ffb703" fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight="800">
        Needs focus
      </text>
      <text x="754" y="214" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="46" fontWeight="850">
        42
      </text>
      <text x="754" y="236" fill="rgba(255,255,255,0.48)" fontFamily="Inter, Arial, sans-serif" fontSize="10" fontWeight="800">
        READINESS SCORE
      </text>

      <rect x="244" y="286" width="220" height="224" rx="14" fill="#1d1d1d" stroke="rgba(255,255,255,0.1)" />
      <text x="266" y="318" fill="#ffb703" fontFamily="Inter, Arial, sans-serif" fontSize="12" fontWeight="800">
        Job-specific coach
      </text>
      <text x="266" y="344" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="16" fontWeight="850">
        Choose what to master
      </text>
      {[
        ['Skill', 'Master SQL for this role'],
        ['Responsibility', 'Turn JD into practice'],
        ['Gap', 'Close AI workflow gap'],
        ['Proof', 'Build interview evidence'],
      ].map(([kicker, title], index) => (
        <g key={title}>
          <rect x="266" y={366 + index * 34} width="176" height="28" rx="8" fill={index === 0 ? 'rgba(138,180,255,0.18)' : '#151515'} stroke="rgba(255,255,255,0.08)" />
          <text x="278" y={383 + index * 34} fill={index === 0 ? '#ffb703' : 'rgba(255,255,255,0.55)'} fontFamily="Inter, Arial, sans-serif" fontSize="9" fontWeight="800">
            {kicker}
          </text>
          <text x="332" y={383 + index * 34} fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="10" fontWeight="750">
            {title}
          </text>
        </g>
      ))}

      <rect x="488" y="286" width="382" height="224" rx="14" fill="#1f1f1f" stroke="rgba(255,255,255,0.1)" />
      <text x="512" y="318" fill="#ffb703" fontFamily="Inter, Arial, sans-serif" fontSize="12" fontWeight="800">
        EnAI Jobs Coach
      </text>
      <text x="512" y="350" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="22" fontWeight="850">
        Master SQL for this role
      </text>
      {[
        ['Learn', 'Understand the requirement in the job workflow.'],
        ['Practice with AI', 'Create one artifact and verify every claim.'],
        ['Prove it', 'Prepare interview proof mapped to the JD.'],
      ].map(([title, detail], index) => (
        <g key={title}>
          <rect x={512 + index * 116} y="382" width="102" height="82" rx="10" fill="#151515" stroke="rgba(255,255,255,0.08)" />
          <text x={526 + index * 116} y="410" fill="#ffb703" fontFamily="Inter, Arial, sans-serif" fontSize="10" fontWeight="850">
            {title}
          </text>
          <text x={526 + index * 116} y="434" fill="rgba(255,255,255,0.58)" fontFamily="Inter, Arial, sans-serif" fontSize="9">
            {detail.slice(0, 25)}
          </text>
        </g>
      ))}
      <rect x="512" y="480" width="112" height="28" rx="8" fill="#ffb703" />
      <text x="530" y="499" fill="#101010" fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight="850">
        Start AI Learn
      </text>
      <Cursor path={[{ x: 810, y: 198 }, { x: 344, y: 381 }, { x: 566, y: 492 }, { x: 620, y: 424 }]} />
    </>
  );
}

function DailyCodeScreen() {
  const reducedMotion = useReducedMotion();
  return (
    <>
      <text x="244" y="154" fill="#ffb703" fontFamily="Inter, Arial, sans-serif" fontSize="12" fontWeight="800">
        Set Daily Code path
      </text>
      <text x="244" y="192" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="34" fontWeight="850">
        Keep the fundamentals moving.
      </text>
      <text x="246" y="222" fill="rgba(255,255,255,0.62)" fontFamily="Inter, Arial, sans-serif" fontSize="13">
        Choose Python, SQL, Java, TypeScript, or AI work missions.
      </text>

      <rect x="244" y="260" width="276" height="218" rx="14" fill="#1f1f1f" stroke="rgba(255,255,255,0.1)" />
      {['Python coding', 'SQL analytics', 'Java backend', 'TypeScript frontend', 'AI work missions'].map((label, index) => (
        <g key={label}>
          <rect x="266" y={286 + index * 34} width="232" height="26" rx="8" fill={index === 1 ? 'rgba(138,180,255,0.18)' : '#151515'} stroke="rgba(255,255,255,0.08)" />
          <circle cx="282" cy={299 + index * 34} r="5" fill={index === 1 ? '#ffb703' : 'rgba(255,255,255,0.28)'} />
          <text x="296" y={303 + index * 34} fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight="760">
            {label}
          </text>
        </g>
      ))}

      <rect x="548" y="260" width="322" height="218" rx="14" fill="#1f1f1f" stroke="rgba(255,255,255,0.1)" />
      <text x="572" y="296" fill="#f8fafc" fontFamily="Inter, Arial, sans-serif" fontSize="18" fontWeight="850">
        Query and validate business data
      </text>
      <rect x="572" y="324" width="248" height="112" rx="10" fill="#101010" stroke="rgba(255,255,255,0.08)" />
      {['SELECT user_id, revenue', 'FROM weekly_activity', 'WHERE activated = true', 'GROUP BY user_id'].map((line, index) => (
        <motion.text
          key={line}
          x="592"
          y={354 + index * 20}
          fill={index === 0 ? '#ffb703' : 'rgba(255,255,255,0.68)'}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="11"
          animate={reducedMotion ? undefined : { opacity: [0.4, 1, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: index * 0.18 }}
        >
          {line}
        </motion.text>
      ))}
      <rect x="572" y="452" width="116" height="30" rx="9" fill="#ffb703" />
      <text x="606" y="472" fill="#101010" fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight="850">
        Run
      </text>
      <Cursor path={[{ x: 300, y: 298 }, { x: 630, y: 467 }, { x: 758, y: 374 }, { x: 408, y: 432 }]} />
    </>
  );
}

export function DailyByteDemo({ view, className, label = 'Animated DailyByte product workflow' }: DailyByteDemoProps) {
  const id = `dailybyte-${useId().replace(/:/g, '')}`;
  const screen = normalized(view);
  const shell = {
    learn: { active: 'AI Learn', title: 'AI Learn' },
    target: { active: 'AI Jobs', title: 'AI Jobs' },
    dailyCode: { active: 'Daily code', title: 'Daily Code' },
  }[screen] as { active: 'AI Learn' | 'AI Jobs' | 'Daily code'; title: string };

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-[#121212]', className)} aria-label={label}>
      <svg viewBox="0 0 960 600" className="h-full w-full" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>{label}</title>
        <defs>
          <filter id="cursor-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#000000" floodOpacity="0.32" />
          </filter>
        </defs>
        <rect width="960" height="600" fill="#0f0f0f" />
        <Shell active={shell.active} title={shell.title}>
          {screen === 'learn' && <LearnScreen />}
          {screen === 'target' && <TargetScreen />}
          {screen === 'dailyCode' && <DailyCodeScreen />}
        </Shell>
      </svg>
    </div>
  );
}
