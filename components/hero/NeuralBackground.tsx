'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '@/components/theme/ThemeProvider';

type Node = { id: number; x: number; y: number; r: number; phase: number };

/**
 * SVG-based neural network background for the hero.
 * - Pure SVG (crisp at any zoom, GPU-friendly transforms, small payload)
 * - Nodes drift subtly via Framer Motion; no RAF loop per frame
 * - Connections drawn once based on proximity, pathLength animates on mount
 * - Respects prefers-reduced-motion (static layout, no animation)
 */
export function NeuralBackground() {
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const ref = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  const [mobile, setMobile] = useState(false);

  const isDark = theme === 'dark';
  const nodeColor = isDark ? 'rgba(129,140,248,0.95)' : 'rgba(99,102,241,0.7)';
  const glowStop = isDark ? 'rgba(129,140,248,0.9)' : 'rgba(99,102,241,0.45)';
  const lineFromColor = isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)';
  const lineToColor = isDark ? 'rgba(6,182,212,0.5)' : 'rgba(6,182,212,0.25)';

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
      setMobile(window.innerWidth < 768);
    };
    update();
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(update, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
    };
  }, []);

  const { nodes, edges } = useMemo(() => {
    const count = mobile ? 28 : 55;
    const { w, h } = dims;
    if (w === 0) return { nodes: [] as Node[], edges: [] as Array<[number, number, number]> };

    const seed = 12345;
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    const list: Node[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * w,
      y: rand() * h,
      r: 1.2 + rand() * 1.8,
      phase: rand() * Math.PI * 2,
    }));

    const maxDist = mobile ? 120 : 170;
    const e: Array<[number, number, number]> = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const dx = list[i].x - list[j].x;
        const dy = list[i].y - list[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) e.push([i, j, 1 - d / maxDist]);
      }
    }
    return { nodes: list, edges: e };
  }, [dims, mobile]);

  return (
    <svg
      ref={ref}
      className="absolute inset-0 h-full w-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="nodeGlow">
          <stop offset="0%" stopColor={glowStop} />
          <stop offset="60%" stopColor={lineFromColor} />
          <stop offset="100%" stopColor="rgba(99,102,241,0)" />
        </radialGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={lineFromColor} />
          <stop offset="100%" stopColor={lineToColor} />
        </linearGradient>
      </defs>

      {edges.map(([a, b, op], i) => {
        const na = nodes[a];
        const nb = nodes[b];
        if (!na || !nb) return null;
        return (
          <motion.line
            key={`e-${i}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke="url(#lineGrad)"
            strokeWidth="0.7"
            strokeOpacity={op * 0.4}
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={reducedMotion ? undefined : { pathLength: 1 }}
            transition={{ duration: 1.5, delay: Math.random() * 0.8, ease: 'easeOut' }}
          />
        );
      })}

      {nodes.map((n) => (
        <motion.g
          key={n.id}
          initial={reducedMotion ? false : { opacity: 0, scale: 0 }}
          animate={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 + Math.random() * 0.8 }}
        >
          <motion.circle
            cx={n.x}
            cy={n.y}
            r={n.r * 3}
            fill="url(#nodeGlow)"
            animate={
              reducedMotion
                ? undefined
                : {
                    r: [n.r * 2.5, n.r * 3.5, n.r * 2.5],
                    opacity: [0.4, 0.7, 0.4],
                  }
            }
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: n.phase,
            }}
          />
          <circle cx={n.x} cy={n.y} r={n.r} fill={nodeColor} />
        </motion.g>
      ))}
    </svg>
  );
}
