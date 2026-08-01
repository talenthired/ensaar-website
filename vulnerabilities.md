# SAST Vulnerability Backlog

Assessment date: 2026-08-01

## Remediation status

The source-level remediation for SEC-001 through SEC-011 has been implemented
across Ensaar and DailyByte. Production activation still requires applying
`supabase/security.sql` in Ensaar and the DailyByte Prisma migration, setting
`AUTH_URL` to the public DailyByte origin, and retaining managed HTTPS, WAF,
and CDN controls. SEC-012 remains an operational hardening recommendation for
mobile certificate pinning and release binary protections, which require managed
signing and native release infrastructure rather than web-source-only changes.

## Scope and method

Static review covered:

- `C:\Users\nidhi\Documents\github\ensaar-website` (public Ensaar site, lead portal, certificate proxy)
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web` (DailyByte web and API)
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\mobile` (DailyByte Expo client)
- Supporting DailyByte packages for database access, billing, workers, observability, and sandbox execution.

This is a source review, not an external penetration test. It cannot prove CDN, WAF, database, email-provider, mobile-store, or reverse-proxy configuration. No real secrets are reproduced here. The audit found no tracked `.env` files or obvious production credentials in the reviewed repositories.

Severity is based on a production deployment exposed to the internet. Items marked **conditional** require a specific unsafe deployment setting or a compromised trusted dependency, but are still release blockers where noted.

## Priority order

1. Block the host-local code-execution fallback in deployed environments.
2. Replace the Ensaar shared, deterministic Basecamp session mechanism.
3. Stop trusting the request Host header for DailyByte magic links.
4. Store only hashes of long-lived bearer credentials, starting with SCIM tokens.
5. Move public abuse controls to a trusted, shared edge/rate-limit service.

---

## SEC-001: Host-local Python execution can be re-enabled in production

**Severity:** High, conditional deployment RCE

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\packages\engine\src\sandbox\script-runner.ts:68-74`
- `C:\Users\nidhi\Documents\github\rai-cursor\packages\engine\src\sandbox\script-runner.ts:77-114`

**Issue:** The application executes AI-generated Python for workspace tasks. The local runner is explicitly acknowledged as escapable, but `DAILYBYTE_ALLOW_LOCAL_SANDBOX=true` permits it outside development. The runner then invokes the host Python binary through `execFile`.

**Impact and exploit path:** If a deployed worker or web process receives this environment variable, an authenticated user can induce the agent to run hostile Python. The Python preamble is not an isolation boundary. A sandbox escape can read environment secrets, access the host filesystem, make network requests, or execute arbitrary host commands. This can become full service compromise.

**Remediation:** Remove the production override completely. Production must require Docker/E2B isolation and fail closed when neither is ready. Add a deployment startup check that rejects `DAILYBYTE_SANDBOX=local` and `DAILYBYTE_ALLOW_LOCAL_SANDBOX` outside local development.

```ts
function guardLocalTaskRunner(): void {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Local task execution is disabled outside development.");
  }
}

export async function runPythonScript(code: string, files = {}, opts = {}) {
  const mode = process.env.DAILYBYTE_SANDBOX;
  if (mode === "e2b") return runPythonScriptE2B(code, files, opts);
  if (mode === "docker") return runPythonScriptDocker(code, files, opts);
  if (mode === "local") {
    guardLocalTaskRunner();
    return runPythonScriptLocal(code, files, opts);
  }
  if (await isDatasciReady()) return runPythonScriptDocker(code, files, opts);
  throw new Error("No production-grade sandbox is available.");
}
```

**Acceptance checks:** CI rejects production manifests containing the local override. A production smoke test verifies that an unavailable E2B/Docker sandbox returns an error and never starts `python` on the host.

---

## SEC-002: Ensaar Basecamp uses a shared, deterministic bearer session token

**Severity:** High

**Affected code:**

- `C:\Users\nidhi\Documents\github\ensaar-website\lib\basecamp\auth.ts:15-43`
- `C:\Users\nidhi\Documents\github\ensaar-website\app\api\basecamp\session\route.ts:33-40`
- `C:\Users\nidhi\Documents\github\ensaar-website\app\api\leads\route.ts:68-76`

**Issue:** Every successful login receives the same HMAC value, derived only from the shared Basecamp password and secret. The server verifies only that fixed value, with no session identifier, issued-at time, expiration, user identity, device binding, or revocation record. The browser cookie's seven-day lifetime is not enforced by `verifyBasecampToken`.

**Impact and exploit path:** Anyone who obtains the cookie value can replay it to read all lead PII and modify leads/events. It remains valid until the Basecamp password or secret changes, even if the original browser cookie has expired. A single shared password also eliminates accountability and makes offboarding impossible without disrupting every administrator.

**Remediation:** Replace the fixed token with a high-entropy, per-login random session stored server-side only as a hash. Move Basecamp to individual authenticated accounts or, at minimum, map each approved operator to a session so it can be revoked and audited.

```ts
import { createHash, randomBytes } from "node:crypto";

const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

export async function createBasecampSession(operatorId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.basecampSession.create({
    data: {
      tokenHash: hashToken(token),
      operatorId,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function verifyBasecampSession(token?: string) {
  if (!token) return null;
  return prisma.basecampSession.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() }, revokedAt: null },
    select: { id: true, operatorId: true },
  });
}
```

**Acceptance checks:** A stolen pre-logout cookie fails after revocation, a cookie fails after server-side expiry regardless of browser metadata, and lead/event audit entries contain an individual operator ID.

---

## SEC-003: DailyByte trusts the incoming Host header when issuing magic links

**Severity:** High

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\auth.ts:70-85`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\lib\magic-link-email.ts:5-35`

**Issue:** `trustHost: true` tells Auth.js to accept the request host as an authority. The resulting `url` is embedded directly in the sign-in email. There is no allowlist check that the magic link origin equals the configured DailyByte origin.

**Impact and exploit path:** An attacker can submit a magic-link request with an attacker-controlled Host header if the edge forwards it. The recipient receives a legitimate-looking DailyByte email containing a link to the attacker host. The attacker can capture the one-time token from the URL and redeem it against the real site, producing account takeover.

**Remediation:** Use one explicit HTTPS origin for production authentication, disable request-host trust, enforce host allowlisting at the edge, and reject a generated magic-link URL whose origin differs from the configured origin.

```ts
const AUTH_ORIGIN = new URL(process.env.AUTH_URL!);
if (process.env.NODE_ENV === "production" && AUTH_ORIGIN.protocol !== "https:") {
  throw new Error("AUTH_URL must be HTTPS in production.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: false,
  // providers and callbacks omitted
});

export async function sendMagicLinkEmail(to: string, rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.origin !== AUTH_ORIGIN.origin) throw new Error("Rejected untrusted magic-link origin.");
  await sendEmail({ to, subject: "Your DailyByte sign-in link", html: renderEmail(url), text: url.toString() });
}
```

**Acceptance checks:** Requests with arbitrary Host or X-Forwarded-Host values cannot change the emailed origin. Email E2E tests assert the link begins with the configured HTTPS DailyByte domain.

---

## SEC-004: SCIM bearer tokens are stored in plaintext

**Severity:** High

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\packages\db\src\repo.ts:2140-2150`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\app\api\team\scim-token\route.ts:10-22`

**Issue:** The generated SCIM bearer token is saved directly in `Organization.scimToken`, then retrieved by exact plaintext lookup.

**Impact and exploit path:** A database export, support query, accidental ORM dump, or read-only database compromise exposes live SCIM credentials. Possession allows an attacker to enumerate team members and provision/deprovision users through the SCIM API.

**Remediation:** Return the plaintext token once, store only a SHA-256 or HMAC digest, query by digest, and migrate/rotate all existing tokens. Do not log the returned token or place it in audit metadata.

```ts
import { createHash, randomBytes } from "node:crypto";

const digestScimToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("base64url");

export async function generateScimToken(orgId: string) {
  const token = `scim_${randomBytes(32).toString("base64url")}`;
  await prisma.organization.update({
    where: { id: orgId },
    data: { scimTokenHash: digestScimToken(token), scimToken: null },
  });
  return token;
}

export async function getOrgByScimToken(token: string) {
  if (!token) return null;
  return prisma.organization.findUnique({
    where: { scimTokenHash: digestScimToken(token) },
    select: { id: true, seats: true },
  });
}
```

**Acceptance checks:** Database rows never contain `scim_` values, old token columns are removed after rotation, and an old token fails immediately after rotation.

---

## SEC-005: Public certificate lookup discloses recipient PII and has no application-level abuse control

**Severity:** Medium

**Affected code:**

- `C:\Users\nidhi\Documents\github\ensaar-website\lib\certificates.ts:7-12`
- `C:\Users\nidhi\Documents\github\ensaar-website\app\api\certificate-verification[action]\route.ts:51-67`
- `C:\Users\nidhi\Documents\github\ensaar-website\components\certificates\CertificateVerifier.tsx:56-66` and `:166-167`

**Issue:** A public search returns the certificate holder's name and status before OTP verification. The proxy has no rate limit for searches, OTP requests, OTP resends, or OTP guesses.

**Impact and exploit path:** If certificate numbers are predictable or leaked from QR codes, an attacker can enumerate holders and credential status. The same endpoint can be used to automate OTP/email abuse and overload the upstream verification service. The upstream service may also rate-limit, but the Ensaar proxy does not enforce this itself.

**Remediation:** Return only a non-identifying `found` result before OTP. Apply a distributed limit by trusted client identity, certificate hash, and normalized recipient email. Add an OTP lockout/cooldown server-side in the certificate service, not only in the UI.

```ts
const identifier = sha256(`${certificateNumber}:${email}`);
const allowed = await limiter.limit(`certificate-otp:${trustedClientIp(request)}:${identifier}`);
if (!allowed.success) return NextResponse.json({ error: "Try again later." }, { status: 429 });

// Search response before proof of email ownership.
return NextResponse.json({ found: true, certificateNumber, status: "active" });

// Only after OTP verification succeeds.
return NextResponse.json({ certificate: verifiedRecord });
```

**Acceptance checks:** A pre-OTP search never contains `recipientName`, `recipientEmail`, or issuance metadata. Automated requests receive 429s across multiple instances, and invalid OTP attempts lock the certificate/email pair temporarily.

---

## SEC-006: Ensaar rate limiting can be bypassed across instances and with spoofed forwarding headers

**Severity:** Medium

**Affected code:**

- `C:\Users\nidhi\Documents\github\ensaar-website\lib\rate-limit.ts:7-18`
- `C:\Users\nidhi\Documents\github\ensaar-website\lib\rate-limit.ts:53-61`
- `C:\Users\nidhi\Documents\github\ensaar-website\app\api\basecamp\session\route.ts:19-30`
- `C:\Users\nidhi\Documents\github\ensaar-website\app\api\leads\route.ts:19-25`

**Issue:** The limiter is process-local memory and derives its key from client-supplied forwarding headers. It does not share counters between serverless instances and is only reliable when the origin is unreachable except through a proxy that strips/replaces these headers.

**Impact and exploit path:** An attacker can distribute Basecamp password guesses or lead submissions across cold starts/instances. If the origin accepts direct traffic, they can rotate `X-Forwarded-For` to evade the limit. This enables brute force, lead-store flooding, and operational DoS.

**Remediation:** Enforce limits at the CDN/WAF and use a shared atomic store such as Redis/Upstash for application limits. Accept client IP only from a provider-added header after the backend is network-restricted to that provider. Add account/password-based limits alongside IP limits.

```ts
async function enforcePublicLimit(request: Request, scope: string, subject = "") {
  const ip = request.headers.get("cf-connecting-ip"); // Only trust after origin lock-down.
  if (!ip) throw new Error("Missing trusted proxy identity");
  const key = `${scope}:${ip}:${subject}`;
  const result = await redis.eval(LUA_FIXED_WINDOW, { keys: [`rl:${key}`], arguments: ["5", "3600"] });
  if (!result.allowed) throw new RateLimitError(result.retryAfter);
}
```

**Acceptance checks:** Limits hold across two application instances, a forged X-Forwarded-For does not change the effective client identity, and the origin security group/CDN policy blocks direct public access.

---

## SEC-007: DailyByte expensive endpoints fail open when Redis rate limiting is unavailable

**Severity:** Medium

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\lib\ratelimit.ts:3-20`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\app\api\judge\route.ts:20-23`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\app\api\contribute\route.ts:76`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\app\api\notifications\test\route.ts:15-17`

**Issue:** `rateLimit` allows requests on a Redis error unless callers opt into `failClosed`. The judge endpoint queues sandboxed code execution, and some contribution/notification paths can trigger expensive worker or provider activity. Several callers use the fail-open default.

**Impact and exploit path:** During a Redis outage or induced connectivity failure, a signed-in attacker can submit requests without the intended ceiling. This can exhaust workers, sandbox capacity, email/push quotas, and paid infrastructure.

**Remediation:** Make the default fail closed for cost-bearing endpoints, add independent concurrency limits in the queue/worker, and set per-user plus global circuit breakers. Keep harmless read-only UX routes fail-open only when explicitly justified.

```ts
export async function rateLimitCostly(bucket: string, subject: string, limit: number, windowSec: number) {
  try {
    return await rateLimit(bucket, subject, limit, windowSec, { failClosed: true });
  } catch {
    return { ok: false, remaining: 0 };
  }
}

const rl = await rateLimitCostly("judge", userId, 20, 60);
if (!rl.ok) return NextResponse.json({ error: "Temporarily unavailable. Try again shortly." }, { status: 503 });
```

**Acceptance checks:** A Redis outage produces 503/429 for judge, LLM, email-test, and generation routes. Queue-level tests prove a single user cannot exceed configured active jobs even if requests bypass web limits.

---

## SEC-008: DailyByte magic-link sign-in has no application-owned anti-automation control

**Severity:** Medium

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\auth.ts:59-87`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\lib\magic-link-email.ts:5-35`

**Issue:** The Resend email provider is enabled directly through Auth.js. No surrounding route-level rate limit, CAPTCHA/Turnstile validation, email-domain abuse control, or send-budget control is visible in application code.

**Impact and exploit path:** An attacker can automate magic-link requests to burn email quota, annoy or phish recipients using branded mail, and create a denial of service for legitimate sign-ins. Provider-side controls may exist, but the application does not enforce a defense in depth limit.

**Remediation:** Put the sign-in request behind a controlled endpoint or edge rule that verifies Turnstile, limits requests by trusted IP and HMAC-hashed normalized email, and returns a generic response. Add a per-recipient cooldown and alerting on abnormal send volume.

```ts
const emailKey = createHmac("sha256", process.env.RATE_LIMIT_KEY!)
  .update(normalizedEmail)
  .digest("base64url");
const decision = await limiter.limit(`magic-link:${trustedIp(req)}:${emailKey}`);
if (!decision.success) return genericSignInResponse();

await verifyTurnstile(req);
await signIn("email", { email: normalizedEmail, redirectTo: "/learn" });
```

**Acceptance checks:** Repeated requests for one email and a burst across many emails are throttled without exposing account existence. Monitoring reports sends, blocks, and provider failures without storing raw email addresses in metrics labels.

---

## SEC-009: Billing webhooks buffer unbounded request bodies before validation

**Severity:** Medium

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\app\api\billing\webhook\stripe\route.ts:7-15`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\app\api\billing\webhook\razorpay\route.ts:7-15`

**Issue:** Both endpoints call `req.text()` before checking request size. Signature validation protects integrity but does not prevent unauthenticated clients from forcing body buffering, HMAC work, and JSON processing in downstream code.

**Impact and exploit path:** An attacker can send oversized invalid webhook bodies to consume memory and CPU. This risks availability of billing and co-located application routes.

**Remediation:** Enforce a small content-length ceiling at the CDN and application boundary before reading the body. Maintain the raw-body verification requirement, but reject missing/oversized bodies early. Add provider IP/WAF allowlists where operationally safe.

```ts
const MAX_WEBHOOK_BYTES = 1_048_576;

function rejectOversized(req: Request): Response | null {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (!Number.isFinite(length) || length < 1 || length > MAX_WEBHOOK_BYTES) {
    return new Response("payload too large", { status: 413 });
  }
  return null;
}

export async function POST(req: Request) {
  const rejected = rejectOversized(req);
  if (rejected) return rejected;
  const raw = await req.text();
  // Verify provider signature over raw.
}
```

**Acceptance checks:** Requests over the limit are blocked at the edge and app layer, invalid requests never reach provider SDK processing, and valid Stripe/Razorpay fixture payloads still verify.

---

## SEC-010: DailyByte mobile client does not enforce a production HTTPS origin or certificate-pinning policy

**Severity:** Medium hardening gap

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\apps\mobile\lib\api.ts:1-10`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\mobile\lib\api.ts:110-129`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\mobile\app.json:1-20`

**Issue:** API origin comes from a public build variable without runtime scheme validation. Development defaults are HTTP, and the mobile configuration contains no explicit release transport policy or certificate pinning. Standard platform TLS protects normal production HTTPS traffic, but it does not prevent interception on rooted/jailbroken devices or devices with a malicious trusted root certificate.

**Impact and exploit path:** A misconfigured production build can send session cookies and API traffic over HTTP. Under a strict mobile threat model, a local proxy or installed root CA can inspect/modify HTTPS traffic and replay session-bearing requests because there is no pinning.

**Remediation:** Fail the release build/startup unless the configured API origin is HTTPS and in an allowlist. Add Android/iOS transport-security configuration. Decide on certificate pinning based on supportability, with at least one backup pin and a documented rotation procedure. Expo Go cannot provide robust pinning, so use a custom development client/native module for release builds.

```ts
function resolveApiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL;
  const url = new URL(value);
  if (!__DEV__) {
    if (url.protocol !== "https:") throw new Error("DailyByte production API must use HTTPS.");
    if (!new Set(["dailybytepro.com", "app.dailybytepro.com"]).has(url.hostname)) {
      throw new Error("DailyByte production API host is not approved.");
    }
  }
  return url.origin;
}

export const API_URL = resolveApiUrl();
```

**Acceptance checks:** Release CI fails for HTTP or unapproved hosts. A device test confirms the release build rejects a TLS-intercepting proxy according to the chosen pinning policy, while a backup pin allows planned certificate rotation.

---

## SEC-011: CSP permits arbitrary inline script execution if an XSS sink is introduced

**Severity:** Low defense-in-depth gap

**Affected code:**

- `C:\Users\nidhi\Documents\github\ensaar-website\next.config.mjs:33-62`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\next.config.mjs:1-20`

**Issue:** Both production CSPs allow `script-src 'unsafe-inline'`. The sites currently rely mainly on React's escaping and do not show a confirmed user-controlled XSS sink in the reviewed code. However, this directive removes CSP's ability to block injected inline script if a future sink is added.

**Impact and exploit path:** A future HTML injection bug can execute script in an authenticated browser, including the Ensaar Basecamp session or DailyByte account actions. The current CSP would not contain it.

**Remediation:** Use per-request nonces for the required bootstraps and JSON-LD, remove `unsafe-inline` from `script-src`, and maintain a narrow source allowlist. Keep `unsafe-eval` development-only.

```ts
// middleware.ts
const nonce = crypto.randomUUID().replace(/-/g, "");
const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://js.stripe.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`;
const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
response.headers.set("Content-Security-Policy", csp);
response.headers.set("x-nonce", nonce);
return response;

// layout.tsx: read nonce from headers and apply nonce={nonce} to every inline script.
```

**Acceptance checks:** Production response headers contain no `unsafe-inline` in `script-src`; all required bootstrap, payment, and JSON-LD behavior continues to work; a CSP report-only rollout is monitored before enforcement.

---

## SEC-012: Observability redaction does not treat PII and payment identifiers as sensitive

**Severity:** Low to Medium, depending on logging/Sentry retention

**Affected code:**

- `C:\Users\nidhi\Documents\github\rai-cursor\packages\obs\src\index.ts:8-29`
- `C:\Users\nidhi\Documents\github\rai-cursor\packages\obs\src\index.ts:80-89`
- `C:\Users\nidhi\Documents\github\rai-cursor\apps\web\app\api\billing\razorpay\verify\route.ts:55-76`

**Issue:** Redaction covers token/secret-like key names only. It preserves user IDs, payment IDs, emails, phone numbers, names, job descriptions, and arbitrary exception messages. Payment verification explicitly sends `userId`, `orderId`, and `paymentId` to the error sink.

**Impact and exploit path:** A third-party error tracker or broad log access can become a secondary store of user and payment metadata. Error messages from upstream services may include further personal details.

**Remediation:** Define a data-classification policy for telemetry, hash stable identifiers with a monitoring-specific HMAC, omit payment identifiers by default, and scrub error messages before export. Configure Sentry server-side PII scrubbing and short retention.

```ts
const PII_KEYS = ["email", "phone", "name", "userid", "orderid", "paymentid", "address", "description"];

export function redact(value: unknown, seen = new Set<unknown>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    [...SECRET_KEYS, ...PII_KEYS].some((term) => key.toLowerCase().includes(term)) ? "[redacted]" : redact(item, seen),
  ]));
}
```

**Acceptance checks:** Telemetry unit tests prove email, payment IDs, job descriptions, and auth tokens never leave the process. Sentry is configured with PII collection disabled unless an approved exception exists.

---

## Authorization review result

No confirmed BOLA/IDOR was found in the primary DailyByte object flows reviewed:

- Task sessions are read with both `id` and `userId` in `packages/db/src/task-repo.ts:50-52`.
- Task message and source routes check the authenticated user and task/session relationship before reading or writing.
- Job targets are scoped with `id`, `userId`, and active status in `packages/db/src/job-target-repo.ts:391-395`.
- Contribution status is scoped to the author in `apps/web/app/api/contribute/status/route.ts:10-19`.
- Judge results accept the authenticated user ID in `apps/web/app/api/judge/result/route.ts:9-23`.
- Team member mutation calls are scoped by the caller's active organization/admin role and the target organization ID.
- SCIM resource operations resolve the organization from its bearer token before looking up a member.

These are good patterns, but they need regression tests. Add negative integration tests for every ID-bearing route with a second user and a second organization. A successful request against another user's session, target, contribution, judge job, proof build, team member, or SCIM user must return 404 or 403 without changing state.

## Other review results

- **SQL injection:** No confirmed SQL injection. Prisma is used for data access; the reviewed `$queryRaw` organization lock uses a tagged, parameterized query.
- **SSRF:** No confirmed exploitable SSRF in DailyByte job URL import. It uses a domain allowlist, manual redirect validation, timeouts, and a 500 KB response cap. Keep this allowlist approach and add DNS/IP revalidation if the list ever includes customer-controlled domains.
- **XSS:** No confirmed user-controlled XSS sink was found. React rendering is used for lead/event/certificate data. SEC-011 is the CSP hardening backlog item.
- **CSRF:** Ensaar Basecamp cookies use `SameSite=Strict`; DailyByte Auth.js handles its own CSRF token. State-changing JSON API routes should still be protected by Origin checks if any future cookie policy is relaxed or cross-origin app host is introduced.
- **Dependency scan:** Semgrep, Gitleaks, and TruffleHog are not installed in this environment. The prior DailyByte npm audit was clean, but dependency and secret scanning should be mandatory CI jobs rather than an ad hoc local action.

## Release gate

Do not launch the DailyByte AI workspace until SEC-001 through SEC-004 are fixed and verified. Do not expose Ensaar Basecamp lead data broadly until SEC-002 and SEC-006 are fixed. SEC-005 through SEC-012 should be planned into the next security hardening release, with SEC-005, SEC-007, SEC-008, and SEC-009 completed before materially increasing traffic.
