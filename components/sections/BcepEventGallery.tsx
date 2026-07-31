'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Container } from '@/components/ui/Container';

const PHOTOS = [
  {
    src: '/images/bcep/IMG-20260715-WA0012.jpg',
    alt: 'BCEP participants taking part in a live workshop discussion',
    label: 'Live application',
    caption: 'Participation that moves beyond passive learning',
    position: 'center 54%',
    layout: 'lg:col-span-7 lg:row-span-2',
    sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 58vw',
  },
  {
    src: '/images/bcep/IMG-20260715-WA0016.jpg',
    alt: 'BCEP participants presenting to their cohort',
    label: 'Presentation practice',
    caption: 'Workplace communication practiced in the room',
    position: 'center 58%',
    layout: 'lg:col-span-5',
    sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 42vw',
  },
  {
    src: '/images/bcep/IMG-20260715-WA0013.jpg',
    alt: 'BCEP participants responding during an interactive group session',
    label: 'Active participation',
    caption: 'Every participant has a voice in the room',
    position: 'center 55%',
    layout: 'lg:col-span-5',
    sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 42vw',
  },
  {
    src: '/images/bcep/IMG-20260715-WA0073.jpg',
    alt: 'BCEP cohort listening during a facilitated session',
    label: 'Cohort learning',
    caption: 'Focused cohorts with a shared learning standard',
    position: 'center 48%',
    layout: 'lg:col-span-4',
    sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  },
  {
    src: '/images/bcep/IMG-20260715-WA0021.jpg',
    alt: 'A BCEP facilitator speaking with participants',
    label: 'Expert facilitation',
    caption: 'Practical frameworks grounded in workplace reality',
    position: 'center 42%',
    layout: 'lg:col-span-4',
    sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  },
  {
    src: '/images/bcep/IMG-20260715-WA0014.jpg',
    alt: 'BCEP participants engaged in an interactive group session',
    label: 'Peer perspective',
    caption: 'Reflection, discussion, and feedback in every cohort',
    position: 'center 52%',
    layout: 'lg:col-span-4',
    sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  },
] as const;

export function BcepEventGallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + PHOTOS.length) % PHOTOS.length,
        );
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % PHOTOS.length,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex]);

  const activePhoto = activeIndex === null ? null : PHOTOS[activeIndex];

  return (
    <>
      <section
        id="bcep-in-practice"
        aria-labelledby="bcep-gallery-title"
        className="relative isolate overflow-hidden border-y border-white/10 bg-[#071a31] py-20 text-white md:py-28"
      >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_12%,rgba(0,142,207,0.2),transparent_31%),radial-gradient(circle_at_12%_88%,rgba(19,166,148,0.13),transparent_30%)]"
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5a623]/80 to-transparent" />

      <Container>
        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#f5a623]">
              BCEP in practice
            </p>
            <h2 id="bcep-gallery-title" className="mt-5 max-w-3xl text-3xl leading-tight text-white md:text-5xl">
              Capability becomes visible when people have to apply it.
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
              BCEP combines AI readiness practice, live facilitation, applied exercises, peer
              observation, structured feedback, and assessment. These are the moments where
              stronger communication, emotional intelligence, responsible AI use, and professional
              confidence become observable.
            </p>
            <Link
              href="/services/corporate-training"
              className="mt-6 inline-flex items-center gap-2 border-b border-cyan-300 pb-1 text-sm font-semibold text-cyan-100 transition-colors hover:text-white"
            >
              Explore BCEP AI readiness
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 border-y border-white/10 py-5 text-center md:mt-16">
          {['AI readiness', 'Peer feedback', 'Assessed outcomes'].map((item, index) => (
            <div
              key={item}
              className={`px-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-300 md:text-xs ${index > 0 ? 'border-l border-white/10' : ''}`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:auto-rows-[210px] lg:grid-cols-12">
          {PHOTOS.map((photo, index) => (
            <motion.button
              key={photo.src}
              type="button"
              onClick={() => setActiveIndex(index)}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.48, delay: reduceMotion ? 0 : Math.min(index * 0.055, 0.22) }}
              className={`group relative aspect-[4/3] overflow-hidden rounded-md border border-white/10 bg-slate-900 text-left shadow-[0_22px_70px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#071a31] lg:aspect-auto ${photo.layout}`}
              aria-label={`Open photo: ${photo.caption}`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority={index === 0}
                quality={90}
                sizes={photo.sizes}
                style={{ objectPosition: photo.position }}
                className="object-cover saturate-[0.92] transition duration-700 ease-out group-hover:scale-[1.035] group-hover:saturate-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06162a]/95 via-[#06162a]/5 to-black/5 transition-colors group-hover:from-[#06162a]" />
              <span className="absolute right-4 top-4 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full border border-white/25 bg-[#071a31]/65 text-white opacity-0 backdrop-blur-md transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                <Maximize2 className="h-4 w-4" aria-hidden />
              </span>
              <span className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <span className="block text-[0.67rem] font-semibold uppercase tracking-[0.12em] text-cyan-200">
                  {photo.label}
                </span>
                <span className="mt-1.5 block max-w-md text-sm font-semibold leading-snug text-white md:text-base">
                  {photo.caption}
                </span>
              </span>
            </motion.button>
          ))}
        </div>

        {/* slate-400, not slate-500: this caption sits on the section's dark navy,
            where slate-500 is only 3.7:1. */}
        <p className="mt-5 text-right text-[0.68rem] uppercase tracking-[0.1em] text-slate-400">
          Selected moments from an Ensaar BCEP cohort
        </p>
        </Container>
      </section>

      <AnimatePresence>
        {activePhoto && activeIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020813]/95 p-4 backdrop-blur-xl md:p-8"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => setActiveIndex(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="BCEP event photo viewer"
              className="relative flex w-full max-w-6xl flex-col md:h-[min(88vh,900px)]"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="absolute right-0 top-0 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#071a31]/85 text-white backdrop-blur-md transition hover:bg-white hover:text-[#071a31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                aria-label="Close photo viewer"
                title="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>

              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-white/10 bg-black/20 md:min-h-0 md:flex-1 md:aspect-auto">
                <Image
                  key={activePhoto.src}
                  src={activePhoto.src}
                  alt={activePhoto.alt}
                  fill
                  quality={95}
                  sizes="100vw"
                  className="object-contain"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-5 text-white">
                <div>
                  <p className="text-[0.67rem] font-semibold uppercase tracking-[0.12em] text-cyan-200">
                    {activePhoto.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-200 md:text-base">{activePhoto.caption}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-400">
                  {String(activeIndex + 1).padStart(2, '0')} / {String(PHOTOS.length).padStart(2, '0')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveIndex((activeIndex - 1 + PHOTOS.length) % PHOTOS.length)}
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#071a31]/85 text-white backdrop-blur-md transition hover:bg-white hover:text-[#071a31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:-left-16"
                aria-label="Previous photo"
                title="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((activeIndex + 1) % PHOTOS.length)}
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#071a31]/85 text-white backdrop-blur-md transition hover:bg-white hover:text-[#071a31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:-right-16"
                aria-label="Next photo"
                title="Next photo"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
