'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const PHRASES = [
  'software backlog',
  'manual operations',
  'support workload',
  'research cycles',
  'staffing gaps',
  'knowledge work',
];

export function TypingHeadline() {
  const reducedMotion = useReducedMotion();
  const [text, setText] = useState(PHRASES[0]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const phrase = PHRASES[phraseIdx];
    const atFull = text === phrase;
    const atEmpty = text === '';

    let delay = 70;
    if (atFull && !deleting) delay = 1800;
    else if (atEmpty && deleting) delay = 400;
    else if (deleting) delay = 35;

    const timer = setTimeout(() => {
      if (atFull && !deleting) {
        setDeleting(true);
      } else if (atEmpty && deleting) {
        setDeleting(false);
        setPhraseIdx((i) => (i + 1) % PHRASES.length);
      } else if (deleting) {
        setText((t) => t.slice(0, -1));
      } else {
        setText(phrase.slice(0, text.length + 1));
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [text, deleting, phraseIdx, reducedMotion]);

  return (
    <span className="inline-flex items-baseline text-accent-cyan-soft font-semibold">
      <span className="min-w-[14ch] text-left" aria-live="polite">
        {text}
      </span>
      <motion.span
        className="inline-block w-[2px] h-[1em] bg-accent-primary ml-0.5 self-center"
        animate={reducedMotion ? undefined : { opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />
    </span>
  );
}
