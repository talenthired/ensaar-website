# Security Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the confirmed high-risk SAST findings in Ensaar and DailyByte, and add source-level defenses for the identified abuse, privacy, and transport hardening gaps.

**Architecture:** Ensaar will replace its shared deterministic Basecamp bearer value with server-revocable sessions and will place certificate lookup behind privacy-preserving responses and shared limits. DailyByte will treat production as fail-closed for code execution and costly request paths, bind magic links to a configured origin, hash SCIM credentials at rest, and enforce bounded request handling. Mobile will reject non-HTTPS production origins.

**Tech Stack:** Next.js, TypeScript, Prisma/PostgreSQL, Supabase REST, Redis, Auth.js, Expo.

## Global Constraints

- Preserve existing dirty working-tree changes.
- No production secret or token may be logged, committed, or returned after first display.
- Production security controls fail closed; local development ergonomics remain explicit.
- Add a focused regression test before each behavior change, then run it red and green.
- Edge WAF/origin-lockdown controls are deployment prerequisites and must be documented when source code cannot enforce them.

---

### Task 1: Ensaar Basecamp and certificate privacy

**Files:**
- Modify: `lib/basecamp/auth.ts`, `lib/rate-limit.ts`, `app/api/basecamp/session/route.ts`
- Modify: `app/api/certificate-verification/[action]/route.ts`, `components/certificates/CertificateVerifier.tsx`
- Create: a Supabase migration for hashed Basecamp sessions and shared rate-limit records
- Test: focused Basecamp token/session and certificate response tests

- [ ] Write failing tests for random per-login sessions, server-side expiry/revocation, certificate pre-OTP response redaction, and public endpoint throttling.
- [ ] Implement the minimal session store and request limits.
- [ ] Run focused tests, type check, and an authenticated Basecamp regression flow.

### Task 2: DailyByte identity and authorization credentials

**Files:**
- Modify: `apps/web/auth.ts`, `apps/web/lib/magic-link-email.ts`
- Modify: `packages/db/prisma/schema.prisma`, `packages/db/src/repo.ts`
- Create: a Prisma migration and regression tests for magic-link origin and hashed SCIM lookup

- [ ] Write failing tests for host-origin rejection and SCIM token hashing.
- [ ] Implement trusted-origin validation and token hash persistence with one-way rotation.
- [ ] Run focused tests, Prisma generation, type check, and migration validation.

### Task 3: DailyByte abuse and execution boundaries

**Files:**
- Modify: `packages/engine/src/sandbox/script-runner.ts`
- Modify: `apps/web/lib/ratelimit.ts` and costly route call sites
- Modify: billing webhook routes and magic-link send controls
- Test: sandbox, rate-limit, and webhook-bound tests

- [ ] Write failing tests for production local-sandbox rejection, Redis-failure denial, email cooldown, and oversized webhook rejection.
- [ ] Implement minimal fail-closed checks and request bounds.
- [ ] Run focused tests, then the full DailyByte suite.

### Task 4: Browser/mobile and telemetry hardening

**Files:**
- Modify: `apps/mobile/lib/api.ts`, `apps/mobile/app.json`
- Modify: `packages/obs/src/index.ts`
- Modify: both Next.js CSP configurations and layouts as required
- Test: mobile origin validation, telemetry redaction, and header integration tests

- [ ] Write failing tests for production HTTP rejection and PII redaction.
- [ ] Implement the minimal validation and redaction changes.
- [ ] Implement nonce-based CSP only after a production-header regression test is in place.
- [ ] Run focused tests, full lint/type checks, builds, and update `vulnerabilities.md` with remediation status.

## Deployment Prerequisites

- Lock app origins to the CDN/WAF and strip client-supplied forwarding headers before routing.
- Configure a shared Redis service with health alerts, then verify costly routes deny requests while it is unavailable.
- Set a fixed HTTPS `AUTH_URL` and production `NEXT_PUBLIC_SITE_URL`.
- Configure mobile release networking and certificate-pinning rotation before app-store release.
- Apply database migrations before deploying web/worker code that expects hashed SCIM or Basecamp sessions.
