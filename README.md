# Ensaar Global Website

Next.js website and lead operations workspace for Ensaar Global Pvt. Ltd.

## Positioning

Ensaar sells managed AI execution, not anonymous freelancer access. Prospects submit costly work,
receive an AI reduction plan, and can engage a fixed-scope pod or ongoing managed capacity.

The website also retains Ensaar's AI-augmented staffing and corporate training practices.

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

Run `supabase/leads.sql` once in the Supabase SQL editor. The service role key must never be exposed
through a `NEXT_PUBLIC_` variable.

Without Supabase, development submissions are written to `.data/leads.json`. Production on Vercel
requires Supabase because the deployment filesystem is not durable.

## Routes

- `/`: conversion-focused home page
- `/services`: AI Solutions, Staffing, and Corporate Training
- `/pricing`: productized audits, pods, and managed capacity
- `/calculator`: AI cost reduction estimator and lead capture
- `/contact`: structured work brief with campaign attribution
- `/workspace`: private lead operations interface
- `/about`, `/events`, `/faq`: supporting inbound content
- `/llms.txt`, `/sitemap.xml`, `/robots.txt`: crawler discovery assets

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
