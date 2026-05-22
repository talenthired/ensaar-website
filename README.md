# Ensaar Global - Website

Modern, AI-forward website for Ensaar Global Pvt. Ltd. - rebuilt with Next.js, TypeScript, Tailwind, and Framer Motion.

## Stack

- **Next.js 15** (App Router) - static site generation for SEO/GEO
- **TypeScript** - strict mode
- **Tailwind CSS** - design-token-driven styling
- **Framer Motion** - GPU-accelerated animations
- **Lucide React** - tree-shakeable icons

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` - local development with HMR
- `npm run build` - production build
- `npm run start` - run production server
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint

## Architecture

```
app/                   Next.js App Router routes
  layout.tsx           Root layout: metadata, global JSON-LD, fonts
  page.tsx             Home
  about/               /about
  services/            /services + 3 detail pages
  bcep/                /bcep + 4 track pages
  work/                /work
  ai/                  /ai
  contact/             /contact
  faq/                 /faq
  sitemap.ts           Dynamic sitemap
  robots.ts            Dynamic robots
  globals.css

components/
  hero/                Hero, NeuralBackground (SVG), TypingHeadline
  sections/            Reusable page sections (ServiceDetailPage, BcepTrackPage, etc.)
  layout/              Header, Footer
  ui/                  Button, Container, Section, Breadcrumbs, GradientBorder
  seo/                 JsonLd component + schema builders

lib/
  content/             Single source of truth for services, BCEP, portfolio, FAQ
  utils.ts             siteConfig, cn()
  metadata.ts          Next.js Metadata helpers
  motion.ts            Shared Framer Motion variants

public/
  llms.txt             LLM/AI crawler summary
  brochure/BCEP.jpeg   Original BCEP brochure
  ensaar-logo.png      Official Ensaar wordmark
```

## SEO / GEO features

- **Per-page metadata** via `generateMetadata` (title, description, canonical, OG, Twitter)
- **JSON-LD schemas**: `Organization`, `WebSite`, `ProfessionalService`, `WebPage`, `Service`, `FAQPage`, `BreadcrumbList`
- **Dynamic sitemap** at `/sitemap.xml` covering all routes
- **Dynamic robots.txt** at `/robots.txt` with explicit LLM bot allow rules
- **`llms.txt`** at `/llms.txt` - plain-text site summary for AI crawlers
- **Semantic HTML** - `<main>`, `<nav>`, `<article>`, `<section>` used correctly
- **SSG by default** - all pages pre-rendered; no JS required to index
- **Multi-page architecture** - each service / BCEP track / FAQ is independently indexable and citable

## Animations

- **Framer Motion** for all animations - transforms and opacity only (no layout thrash)
- **Respects `prefers-reduced-motion`** - animations skip entirely
- **IntersectionObserver-triggered** scroll reveals (offscreen content doesn't tax the CPU)
- Hero uses animated **SVG neural network** - crisp at any zoom, no canvas
- Terminal typing effect runs only when scrolled into view
- Stats counters use `useMotionValue` for 60fps numeric tweens

## Deployment

### Vercel (recommended)

1. Push to a GitHub repo
2. Import in Vercel - zero config needed
3. Custom domain: add `ensaar.com`

### Other static hosts

`npm run build` produces a `.next/` folder. Use any Node-capable host, or run `next export` for a fully static bundle.

## Updating content

All content lives in `lib/content/`:
- `services.ts` - AI Solutions, Engineering Design, Technology Services
- `bcep.ts` - BCEP advantages, tracks, modules
- `portfolio.ts` - case studies (industry only; client names confidential)
- `faq.ts` - Q&A with categories (used to build `/faq` page + FAQPage JSON-LD)

Edit these files and the relevant pages, sitemap, and schema update automatically.

## Contact form

Currently the contact form opens a `mailto:` draft as a fallback. To enable proper form submission:
1. Sign up for [Formspree](https://formspree.io) (50 submissions/month free) or [Web3Forms](https://web3forms.com)
2. Replace the `mailto:` flow in `components/sections/ContactSection.tsx` with a `fetch()` POST to your endpoint
