'use client';

/**
 * Case study illustrations - editorial restraint with diverse palettes.
 *
 * Each case gets its own assigned hue, designed as a duo-tone gradient that
 * brings warm/cool variety to the gallery while staying cohesive.
 *
 * Palette assignments (intentional, balanced):
 *   trading    to indigo  (brand anchor, financial)
 *   language   to rose    (warm, cultural)
 *   marketing  to amber   (energy, growth)
 *   taxi       to emerald (mobility, fresh)
 *   health     to violet  (premium, calm)
 *   restaurant to coral   (warm hospitality)
 *   realestate to cyan    (sky, openness)
 */

import { motion } from 'framer-motion';

type Props = { className?: string };
type Hue = 'indigo' | 'rose' | 'amber' | 'emerald' | 'violet' | 'coral' | 'cyan';

const VIEWBOX = '0 0 600 300';

/* Duo-tone palettes - each gradient mixes two related hues for richness */
const PALETTE: Record<Hue, { a: string; b: string; accent: string; soft: string }> = {
  indigo:   { a: '#6366f1', b: '#06b6d4', accent: '#6366f1', soft: '#6366f1' },
  rose:     { a: '#f472b6', b: '#fb923c', accent: '#ec4899', soft: '#f472b6' },
  amber:    { a: '#f59e0b', b: '#ec4899', accent: '#f59e0b', soft: '#fbbf24' },
  emerald:  { a: '#10b981', b: '#06b6d4', accent: '#10b981', soft: '#34d399' },
  violet:   { a: '#a78bfa', b: '#f472b6', accent: '#8b5cf6', soft: '#a78bfa' },
  coral:    { a: '#fb7185', b: '#f59e0b', accent: '#fb7185', soft: '#fda4af' },
  cyan:     { a: '#06b6d4', b: '#6366f1', accent: '#06b6d4', soft: '#22d3ee' },
};

/* Shared atmosphere + per-hue gradient */
function Atmosphere({ k, hue }: { k: string; hue: Hue }) {
  const c = PALETTE[hue];
  return (
    <>
      <defs>
        <filter id={`${k}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
        <linearGradient id={`${k}-grad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.a} />
          <stop offset="100%" stopColor={c.b} />
        </linearGradient>
      </defs>
      <ellipse cx="430" cy="240" rx="260" ry="160" fill={c.a} opacity="0.10" filter={`url(#${k}-blur)`} />
    </>
  );
}

/* ============================================================
 * 1. Trading - Singapore - INDIGO
 * ============================================================ */
export function TradingIllustration({ className }: Props) {
  const c = PALETTE.indigo;
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Atmosphere k="trade" hue="indigo" />
      <defs>
        <linearGradient id="trade-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c.accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.path
        d="M 60 220 C 160 215 220 195 290 165 C 360 135 430 100 540 70 L 540 240 L 60 240 Z"
        fill="url(#trade-fill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.0, delay: 0.3 }}
      />

      <motion.path
        d="M 60 220 C 160 215 220 195 290 165 C 360 135 430 100 540 70"
        stroke="url(#trade-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />

      <circle cx="540" cy="70" r="14" fill={c.accent} opacity="0.12" />
      <circle cx="540" cy="70" r="4.5" fill={c.accent} />
    </svg>
  );
}

/* ============================================================
 * 2. Language Learning - China - ROSE
 * ============================================================ */
export function LanguageIllustration({ className }: Props) {
  const c = PALETTE.rose;
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Atmosphere k="lang" hue="rose" />

      <motion.text
        x="120"
        y="210"
        fontSize="180"
        fontFamily="ui-serif, 'Songti SC', 'Noto Serif CJK SC', serif"
        fontWeight="700"
        fill="url(#lang-grad)"
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        Hello
      </motion.text>

      <motion.line
        x1="430"
        y1="160"
        x2="490"
        y2="160"
        stroke={c.accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />

      <motion.text
        x="500"
        y="170"
        fontSize="36"
        fontFamily="ui-sans-serif, 'Inter', sans-serif"
        fontWeight="300"
        fill="#0f172a"
        opacity="0.78"
        initial={{ opacity: 0, x: 8 }}
        whileInView={{ opacity: 0.78, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        Hello
      </motion.text>
    </svg>
  );
}

/* ============================================================
 * 3. Marketing - India - AMBER
 * ============================================================ */
export function MarketingIllustration({ className }: Props) {
  const c = PALETTE.amber;
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Atmosphere k="mkt" hue="amber" />

      {[40, 80, 120, 160, 200, 240].map((r, i) => (
        <motion.circle
          key={r}
          cx="300"
          cy="150"
          r={r}
          fill="none"
          stroke="url(#mkt-grad)"
          strokeWidth="1"
          strokeOpacity={0.65 - i * 0.09}
          initial={{ scale: 0.7, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: '300px 150px' }}
        />
      ))}

      <circle cx="300" cy="150" r="14" fill="url(#mkt-grad)" opacity="0.18" />
      <circle cx="300" cy="150" r="6" fill="url(#mkt-grad)" />

      <motion.g
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.0, type: 'spring', stiffness: 180 }}
      >
        <circle cx="466" cy="90" r="3.5" fill={c.b} />
        <circle cx="466" cy="90" r="9" fill={c.b} opacity="0.18" />
      </motion.g>
    </svg>
  );
}

/* ============================================================
 * 4. Taxi Booking - UAE - EMERALD
 * ============================================================ */
export function TaxiIllustration({ className }: Props) {
  const c = PALETTE.emerald;
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Atmosphere k="taxi" hue="emerald" />

      <motion.path
        d="M 80 230 Q 200 230 220 150 Q 240 70 360 70 Q 480 70 520 150"
        stroke="url(#taxi-grad)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 8"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />

      <circle cx="80" cy="230" r="14" fill={c.accent} opacity="0.14" />
      <circle cx="80" cy="230" r="4.5" fill={c.accent} />

      <motion.g
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.4, type: 'spring' }}
      >
        <circle cx="520" cy="150" r="20" fill={c.accent} opacity="0.10" />
        <circle cx="520" cy="150" r="10" fill={c.accent} opacity="0.18" />
        <circle cx="520" cy="150" r="5" fill={c.accent} />
      </motion.g>
    </svg>
  );
}

/* ============================================================
 * 5. Healthcare - KSA - VIOLET
 * ============================================================ */
export function HealthIllustration({ className }: Props) {
  const c = PALETTE.violet;
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Atmosphere k="hlth" hue="violet" />

      <line x1="60" y1="150" x2="540" y2="150" stroke="#94a3b8" strokeOpacity="0.15" strokeWidth="1" />

      <motion.path
        d="M 60 150 L 200 150 L 230 110 L 260 200 L 290 60 L 320 230 L 350 150 L 540 150"
        stroke="url(#hlth-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      />

      <motion.circle
        cx="290"
        cy="60"
        r="22"
        fill={c.accent}
        opacity="0.14"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, duration: 0.6 }}
      />
      <motion.circle
        cx="290"
        cy="60"
        r="5"
        fill={c.accent}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.0, type: 'spring' }}
      />
    </svg>
  );
}

/* ============================================================
 * 6. Restaurant - Japan - CORAL
 * ============================================================ */
export function RestaurantIllustration({ className }: Props) {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Atmosphere k="rest" hue="coral" />
      <defs>
        <radialGradient id="rest-plate" cx="0.45" cy="0.4">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="55%" stopColor="#ffedd5" />
          <stop offset="100%" stopColor="#fed7aa" />
        </radialGradient>
      </defs>

      <motion.g
        initial={{ scale: 0.92, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: '200px 150px' }}
      >
        <circle cx="200" cy="150" r="118" fill="url(#rest-plate)" />
        <circle cx="200" cy="150" r="118" fill="none" stroke="#fb7185" strokeOpacity="0.20" strokeWidth="1" />
        <circle cx="200" cy="150" r="92" fill="none" stroke="#fb7185" strokeOpacity="0.12" strokeWidth="1" />
      </motion.g>

      <motion.text
        x="380"
        y="148"
        fontSize="44"
        fontFamily="ui-serif, 'Iowan Old Style', Georgia, serif"
        fontWeight="400"
        fill="#0f172a"
        opacity="0.85"
        initial={{ opacity: 0, x: 10 }}
        whileInView={{ opacity: 0.85, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        omakase
      </motion.text>
      <motion.text
        x="380"
        y="180"
        fontSize="13"
        fontFamily="ui-monospace, monospace"
        fontWeight="400"
        fill="#fb7185"
        opacity="0.7"
        letterSpacing="0.3em"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.7 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        TOKYO | KYOTO
      </motion.text>
    </svg>
  );
}

/* ============================================================
 * 7. Real Estate - Australia - CYAN
 * ============================================================ */
export function RealEstateIllustration({ className }: Props) {
  const c = PALETTE.cyan;
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Atmosphere k="re" hue="cyan" />

      <motion.path
        d="M 100 220 L 240 100 L 380 220"
        stroke="url(#re-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.path
        d="M 200 240 L 340 120 L 480 240"
        stroke="url(#re-grad)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <line x1="60" y1="240" x2="540" y2="240" stroke="#94a3b8" strokeOpacity="0.15" strokeWidth="1" />

      <motion.g
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.0, type: 'spring' }}
      >
        <circle cx="240" cy="100" r="14" fill={c.accent} opacity="0.12" />
        <circle cx="240" cy="100" r="4.5" fill={c.accent} />
      </motion.g>
    </svg>
  );
}

/* ============================================================ */
const ILLUS = {
  trading: TradingIllustration,
  language: LanguageIllustration,
  marketing: MarketingIllustration,
  taxi: TaxiIllustration,
  health: HealthIllustration,
  restaurant: RestaurantIllustration,
  realestate: RealEstateIllustration,
};

export function CaseIllustration({
  kind,
  className,
}: {
  kind: keyof typeof ILLUS;
  className?: string;
}) {
  const Component = ILLUS[kind];
  return <Component className={className} />;
}
