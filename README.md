# Ensaar Global Website

Next.js website and lead operations workspace for Ensaar Global Pvt. Ltd.

## Positioning

Ensaar helps companies outside India build teams inside it. The site leads with two India services
and treats the rest as what those teams then do:

1. Employer of Record: Ensaar is the legal employer, so a foreign company hires in India without
   its own entity. The published price is a flat fee per employee per month.
2. India capability centres: a pod of three to fifteen people that converts into the client's own
   subsidiary once headcount makes that cheaper.
3. Software engineering, enterprise AI enablement, DailyByte, and BCEP certification.

Every India figure the site quotes (the EOR price, statutory rates, entity timelines) lives in
`lib/content/india.ts` and is asserted by `test/india-content.test.ts`. Change it there, not in a
page, or the test fails.

## Stack

- Next.js 15 App Router
- React 19 and TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Local JSON lead storage for development
- Supabase REST storage for production

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. In development, the lead workspace is available at
`/workspace/login` with password `ensaar-local` when `LEAD_PORTAL_PASSWORD` is not set.

## Environment

Copy the values in `.env.example` into `.env.local`.

- `LEAD_PORTAL_PASSWORD`: private workspace password
- `LEAD_PORTAL_SECRET`: long random value used to sign the workspace session
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key
- `SUPPORT_BRIDGE_SECRET`: shared server-only secret for the DailyByte support inbox
- `DAILYBYTE_SUPPORT_API_URL`: DailyByte's `/api/support/bridge` endpoint

Run `supabase/leads.sql` once in the Supabase SQL editor. The service role key must never be exposed
through a `NEXT_PUBLIC_` variable.

Without Supabase, development submissions are written to `.data/leads.json`. Production on Vercel
requires Supabase because the deployment filesystem is not durable.

## Routes

- `/`: conversion-focused home page
- `/services`: the service index, generated from `lib/content/services.ts`
- `/services/employer-of-record`: EOR pricing, inclusions, statutory costs, PE position
- `/services/gcc`: pod to capability centre, cost model, entity conversion facts
- `/services/ai-solutions`, `/services/software-development`, `/services/staffing`,
  `/services/corporate-training`: the remaining service detail pages
- `/ai-work-lab`: the DailyByte product page
- `/contact`: structured work brief with campaign attribution
- `/basecamp`: private lead operations interface, noindex and session gated
- `/about`, `/events`, `/faq`, `/insights`, `/verify`: supporting inbound content
- `/pricing` and `/calculator`: legacy redirects
- `/llms.txt`, `/sitemap.xml`, `/robots.txt`: crawler discovery assets

A new page must be added to `app/sitemap.ts`, `components/layout/Header.tsx`, and
`components/layout/Footer.tsx` by hand. None of those is generated from the route tree.

## Lead workflow

Public submissions are sent to `/api/leads` and include:

- prospect and company information
- work type, current cost, desired timeline, and detailed brief
- first landing page, referrer, UTM source, medium, and campaign
- calculator inputs and outputs when submitted from `/calculator`

The private workspace supports stage, owner, estimated value, next action date, notes, pipeline value,
due actions, search, and campaign visibility.

## SEO and LLM GEO

- Static rendering for all marketing pages
- Page-specific titles, descriptions, canonicals, Open Graph, and Twitter metadata
- Organization, ProfessionalService, Service, Product, FAQ, Event, Breadcrumb, HowTo, and WebPage JSON-LD
- Dynamic sitemap for services, managed offers, and training tracks
- Explicit AI crawler rules and a plain-text `llms.txt`
- Semantic headings, internal links, crawlable pricing, and anonymized case-study facts

## Commands

```bash
npm run typecheck
npm run build
npm run dev
```
