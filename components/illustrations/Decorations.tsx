'use client';

/**
 * Decorative SVGs - editorial restraint.
 * One gesture, generous space, no clip-art.
 */

import { motion } from 'framer-motion';

type Props = { className?: string };

/* ============================================================
 * GlowOrbs - soft atmospheric mesh with warm + cool balance
 * ============================================================ */
export function GlowOrbs({ className, palette = 'brand' }: Props & { palette?: 'brand' | 'warm' | 'fresh' }) {
  const sets = {
    brand: { a: '#6366f1', b: '#06b6d4', c: '#f472b6' }, // indigo + cyan + warm rose accent
    warm:  { a: '#fb7185', b: '#f59e0b', c: '#a78bfa' }, // coral + amber + violet
    fresh: { a: '#10b981', b: '#06b6d4', c: '#f59e0b' }, // emerald + cyan + amber
  }[palette];

  return (
    <svg
      viewBox="0 0 1600 800"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <defs>
        <filter id={`orb-blur-${palette}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="100" />
        </filter>
        <radialGradient id={`orb-a-${palette}`}>
          <stop offset="0%" stopColor={sets.a} stopOpacity="0.45" />
          <stop offset="100%" stopColor={sets.a} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`orb-b-${palette}`}>
          <stop offset="0%" stopColor={sets.b} stopOpacity="0.35" />
          <stop offset="100%" stopColor={sets.b} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`orb-c-${palette}`}>
          <stop offset="0%" stopColor={sets.c} stopOpacity="0.28" />
          <stop offset="100%" stopColor={sets.c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="280" cy="220" rx="380" ry="300" fill={`url(#orb-a-${palette})`} filter={`url(#orb-blur-${palette})`} />
      <ellipse cx="1320" cy="600" rx="420" ry="320" fill={`url(#orb-b-${palette})`} filter={`url(#orb-blur-${palette})`} />
      <ellipse cx="900" cy="160" rx="260" ry="200" fill={`url(#orb-c-${palette})`} filter={`url(#orb-blur-${palette})`} />
    </svg>
  );
}

/* ============================================================
 * Constellation - minimalist line with quiet dots
 * ============================================================ */
export function Constellation({ className }: Props) {
  const nodes = [
    { x: 30, y: 80 },
    { x: 110, y: 50 },
    { x: 200, y: 70 },
    { x: 290, y: 40 },
    { x: 380, y: 60 },
  ];
  return (
    <svg viewBox="0 0 420 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="cl-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <motion.path
        d={`M ${nodes.map((n) => `${n.x} ${n.y}`).join(' L ')}`}
        stroke="url(#cl-line)"
        strokeOpacity="0.4"
        strokeWidth="1"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
      />
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="2.5"
          fill="url(#cl-line)"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 200 }}
        />
      ))}
    </svg>
  );
}

/* ============================================================
 * BrainIllustration - abstract neural form for AI Solutions hero
 *   A single elegant ellipse with a few internal connections.
 * ============================================================ */
export function BrainIllustration({ className }: Props) {
  const nodes = [
    { x: 160, y: 120, r: 4 },
    { x: 220, y: 90, r: 5 },
    { x: 240, y: 170, r: 4 },
    { x: 290, y: 130, r: 5 },
    { x: 320, y: 200, r: 4 },
    { x: 360, y: 150, r: 6 },
    { x: 400, y: 110, r: 4 },
  ];
  const links = [
    [0, 1],
    [1, 3],
    [2, 1],
    [2, 4],
    [3, 5],
    [4, 5],
    [5, 6],
    [3, 6],
  ];

  return (
    <svg viewBox="0 0 600 320" className={className} aria-hidden>
      <defs>
        <linearGradient id="brn-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="brn-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      {/* one quiet atmospheric blob */}
      <ellipse cx="300" cy="160" rx="220" ry="140" fill="#6366f1" opacity="0.10" filter="url(#brn-blur)" />

      {/* connections */}
      {links.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="url(#brn-grad)"
          strokeOpacity="0.35"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.06, duration: 0.7 }}
        />
      ))}

      {/* nodes - varied sizes, quiet halos */}
      {nodes.map((n, i) => (
        <motion.g
          key={i}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 + i * 0.06, type: 'spring', stiffness: 180 }}
        >
          <circle cx={n.x} cy={n.y} r={n.r * 2.2} fill="url(#brn-grad)" opacity="0.14" />
          <circle cx={n.x} cy={n.y} r={n.r} fill="url(#brn-grad)" />
        </motion.g>
      ))}
    </svg>
  );
}

/* ============================================================
 * StaffingIllustration - emerald palette
 *   Three figures, restrained line abstractions.
 * ============================================================ */
export function StaffingIllustration({ className }: Props) {
  return (
    <svg viewBox="0 0 600 320" className={className} aria-hidden>
      <defs>
        <linearGradient id="stf-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="stf-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      <ellipse cx="300" cy="180" rx="220" ry="140" fill="#10b981" opacity="0.10" filter="url(#stf-blur)" />

      {/* baseline */}
      <line x1="80" y1="240" x2="520" y2="240" stroke="#94a3b8" strokeOpacity="0.25" strokeWidth="1" />

      {/* three figures - pure circle + line abstraction */}
      {[
        { x: 180, scale: 1, delay: 0 },
        { x: 300, scale: 1.18, delay: 0.12 },
        { x: 420, scale: 1, delay: 0.24 },
      ].map((p) => (
        <motion.g
          key={p.x}
          initial={{ y: 14, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: p.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          transform={`translate(${p.x} ${240}) scale(${p.scale})`}
        >
          {/* head */}
          <circle r="10" cy="-90" fill="url(#stf-grad)" />
          {/* shoulders */}
          <line x1="-22" y1="-50" x2="22" y2="-50" stroke="url(#stf-grad)" strokeWidth="2" strokeLinecap="round" />
          {/* torso */}
          <line x1="0" y1="-50" x2="0" y2="-6" stroke="url(#stf-grad)" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      ))}
    </svg>
  );
}

/* ============================================================
 * TrainingIllustration - violet palette
 *   Stacked layers + a quiet rise.
 * ============================================================ */
export function TrainingIllustration({ className }: Props) {
  return (
    <svg viewBox="0 0 600 320" className={className} aria-hidden>
      <defs>
        <linearGradient id="trn-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <filter id="trn-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      <ellipse cx="320" cy="180" rx="220" ry="140" fill="#a78bfa" opacity="0.12" filter="url(#trn-blur)" />

      {/* three rising layer lines */}
      {[230, 200, 170, 140].map((y, i) => (
        <motion.line
          key={y}
          x1="100"
          y1={y}
          x2={300 + i * 50}
          y2={y}
          stroke="url(#trn-grad)"
          strokeOpacity={0.35 + i * 0.15}
          strokeWidth={i === 3 ? 2 : 1}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, duration: 0.6 }}
        />
      ))}

      {/* trajectory */}
      <motion.path
        d="M 100 240 L 200 220 L 300 190 L 400 150 L 500 110"
        stroke="url(#trn-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.5 }}
      />

      <circle cx="500" cy="110" r="5" fill="#a78bfa" />
      <circle cx="500" cy="110" r="14" fill="#a78bfa" opacity="0.14" />
    </svg>
  );
}

/* ============================================================
 * EventIllustration - coral / amber palette
 *   Editorial date numeral.
 * ============================================================ */
export function EventIllustration({ className }: Props) {
  return (
    <svg viewBox="0 0 600 320" className={className} aria-hidden>
      <defs>
        <linearGradient id="evt-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="evt-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      <ellipse cx="320" cy="180" rx="220" ry="140" fill="#fb7185" opacity="0.12" filter="url(#evt-blur)" />

      {/* huge editorial numeral */}
      <motion.text
        x="180"
        y="220"
        fontSize="220"
        fontFamily="ui-sans-serif, 'Inter', sans-serif"
        fontWeight="800"
        fill="url(#evt-grad)"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        22
      </motion.text>

      {/* small tracking caption */}
      <motion.text
        x="380"
        y="170"
        fontSize="13"
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        fill="#fb7185"
        letterSpacing="0.3em"
        initial={{ opacity: 0, x: 8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        MAY | 2026
      </motion.text>
      <motion.text
        x="380"
        y="195"
        fontSize="13"
        fontFamily="ui-monospace, monospace"
        fontWeight="500"
        fill="#0f172a"
        opacity="0.5"
        letterSpacing="0.3em"
        initial={{ opacity: 0, x: 8 }}
        whileInView={{ opacity: 0.5, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.65, duration: 0.5 }}
      >
        HYDERABAD
      </motion.text>
    </svg>
  );
}

/* ============================================================
 * AIChip - quiet typographic monogram
 *   Just "AI" set inside a soft rounded form, no chip pins.
 * ============================================================ */
export function AIChip({ className }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <linearGradient id="chip-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="40" y="40" width="120" height="120" rx="32" fill="url(#chip-grad)" opacity="0.10" />
      <rect x="40" y="40" width="120" height="120" rx="32" fill="none" stroke="url(#chip-grad)" strokeOpacity="0.4" strokeWidth="1.5" />
      <text
        x="100"
        y="118"
        fontSize="44"
        fontFamily="ui-sans-serif, 'Inter', sans-serif"
        fontWeight="700"
        fill="url(#chip-grad)"
        textAnchor="middle"
        letterSpacing="0.04em"
      >
        AI
      </text>
    </svg>
  );
}

/* ============================================================
 * WaveDivider - minimal section divider
 * ============================================================ */
export function WaveDivider({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1200 60"
      className={className}
      preserveAspectRatio="none"
      aria-hidden
      style={flip ? { transform: 'scaleY(-1)' } : undefined}
    >
      <defs>
        <linearGradient id="wd-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.04" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d="M 0 30 Q 300 0 600 30 T 1200 30 L 1200 60 L 0 60 Z" fill="url(#wd-grad)" />
    </svg>
  );
}
