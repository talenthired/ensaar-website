# EOR Onboarding End-to-End Audit

Date: 29 September 2026

Source: `main`, commit `1f533cf0232a4df1749deca38770ef333bf251e3`.

## Decision

**Do not treat this flow as production-ready yet.** The local happy path works, but the public customer route is missing and a reproduced concurrency defect allows approval with a required document missing. Fix EOR-01 and EOR-02 first, then the document, signing, and correction-workflow gaps before inviting real customers.

This is an audit, not an implementation. No application code, production records, customer messages, or deployment settings were changed.

## Scope and Evidence

- Public site: read-only browser and HTTP checks of `https://ensaar.com/basecamp`, `/onboard`, `/api/onboard`, and `/api/basecamp/clients`.
- Local application: actual Next.js routes, PostgreSQL persistence, admin and customer browser sessions, API authorization, uploads, signing, countersigning, link rotation, cancellation, and expiration.
- Isolated PostgreSQL database, synthetic `audit.example` identities, and email/analytics integrations disabled. No production credentials or data used. No paid AI requests made.
- Chromium via local Playwright, explicitly approved by the user. Desktop 1440px, tablet 768px, and mobile 390px widths. These are responsive browser checks, not physical-device or Safari tests.
- Existing suite: **94 tests passed in 11 files**, including 22 EOR unit tests. These do not replace integration coverage.
- Evidence: [primary test results](eor-2026-09-29/results.json), [supplemental results](eor-2026-09-29/extra-results.json), and linked screenshots below.
- A three-page browser-generated agreement PDF was text-inspected: agreement body, employee schedule, customer signature, named staff countersignature, and SHA-256 fingerprint were present. PDF page rendering was not separately visually audited.

No authenticated production onboarding was attempted: the relevant deployed routes returned 404. Email delivery, provider retries, production proxy behavior, backups, distributed load, and legal enforceability remain unverified.

## Journey Health

| Step | Result | Notes |
| --- | --- | --- |
| Public Basecamp entry | Partial | Redirects to a working login, but its shared-password-only UI differs from current source. |
| Public customer portal | Blocked | `/onboard` returns 404. |
| Local named-owner login and invite | Pass | Browser create returned 201; manual link available with email disabled. |
| Customer opens link and resumes | Pass | Token removed from address bar; reload in the same tab preserved access. |
| Company details and validation | Partial | Valid details persist; error focus/accessibility fails. |
| Upload required documents | Partial | Uploads persist, but corrupt PDF data qualifies and customer cannot inspect uploaded contents. |
| Review and sign | Partial | Happy path succeeds; stale hash, missing consent, wrong name, and absent documents are rejected. Unsaved editing and concurrency remain unsafe. |
| Staff review and countersign | Partial | Named owner can approve; required-document invariant is not enforced at approval. |
| Agreement export | Pass with limitation | Browser PDF contains complete text and both signatures; visual pagination not separately tested. |
| Correction and employee handoff | Gap | No in-product correction cycle or downstream employee workflow found. |
| Mobile/tablet | Partial | No horizontal overflow in sampled screens; long-form validation recovery is poor. |

## Confirmed Defects and Functional Limitations

### EOR-01 [P1] Deployed customer onboarding routes are absent

**Evidence:** Live `/onboard`, `/api/onboard`, and `/api/basecamp/clients` returned 404. `/basecamp` redirected to a login with only the legacy shared-password field. [Live portal screenshot](eor-2026-09-29/12-live-onboard-404.png).

**Location:** Deployment serving ensaar.com; current source includes `app/onboard/page.tsx` and `app/api/basecamp/clients/route.ts`. `lib/eor/email.ts:9` generates links to the public `/onboard` route.

**Impact:** Customer onboarding links point to a missing page. Current local functionality is not evidence that the public feature is available. The exact deployment cause was not established.

**Action:** Verify the deployed commit, Railway service/root directory, build artifact, domain mapping, and migration status. Deploy the intended revision only after the blocking local defects are addressed.

**Acceptance:** Public `/onboard` serves the portal shell; invalid/missing token gives a controlled invalid-link state. Unauthenticated admin API returns 401, not a route-level 404. Complete a staging invite-to-countersign smoke test, then a controlled production smoke test.

### EOR-02 [P1] Concurrent deletion can remove a required document after signing; approval still succeeds

**Location:** `lib/eor/store.ts:242`, `lib/eor/store.ts:287`, `lib/eor/store.ts:320`; `app/api/onboard/documents/[docId]/route.ts:12`; `app/api/onboard/sign/route.ts:26`.

**Reproduction:** Create an editable onboarding with both required documents. Hold a database lock on one document row. Start the real DELETE request, allowing its editable-status check to pass before it waits on the lock. Sign the agreement in a second request, then release the lock. Finally approve as the named owner.

**Observed:** DELETE 200, sign 200, state `signed` with `missingDocuments: ["formation"]`; approval also returned 200. This was tested using real routes and database operations, not mocked status responses.

**Cause:** Document mutation and signing do not serialize against a shared client row. Signing checks documents before its update; deletion only constrains document/client IDs. Approval checks only `status = 'signed'`.

**Action:** Use transactions and a consistent per-client locking protocol for upload, delete, sign, and approve. Revalidate status and required accepted documents inside the transaction. Bind the signing evidence to the document set. Approval must independently reject missing or rejected evidence.

**Acceptance:** A deterministic concurrent delete/sign test cannot finish signed with a missing document. The loser gets a conflict or signing is blocked. Repeat for upload/sign and cancel/sign. An inconsistent signed record cannot be approved.

### EOR-03 [P2] Corrupt PDFs satisfy the required-document gate

**Location:** `lib/eor/onboarding.ts:132`, `lib/eor/onboarding.ts:121`, `app/api/onboard/documents/route.ts:51`.

**Reproduction:** Upload the literal bytes `%PDF-not-a-document` under both required document kinds.

**Observed:** Upload returned 201. Both files counted as present, and signing and approval returned 200. A magic-byte prefix is the only PDF content validation. This proves unreadable files qualify, not that a malware exploit was demonstrated.

**Action:** Parse PDFs and decode images with bounded resource limits, reject malformed/encrypted or unsupported content according to policy, and introduce document review states. Structural validity does not prove a file is the correct incorporation/EIN evidence. Keep staff review explicit and gate approval on accepted documents; scan uploads before access where appropriate.

**Acceptance:** Truncated PDF and invalid image fixtures return 422 without advancing progress. Valid but incorrect evidence can be rejected with a reason and corrected before approval. Parser time/memory budgets are covered by tests.

### EOR-04 [P2] Signing remains enabled with unsaved company edits

**Location:** `components/eor/OnboardingPortal.tsx:146`, `:267`, `:299`.

**Reproduction:** Save company details and upload both documents. Click Edit, change the legal company name without saving, then enter the existing signatory name and consent.

**Observed:** Sign agreement is enabled while the server still holds the original company name. [Screenshot](eor-2026-09-29/06-unsaved-edit-sign-enabled.png). The enabled state was browser-tested; the wrong-name variant was not submitted. Source confirms signing submits the saved draft hash, not the unsaved form.

**Impact:** A customer can reasonably believe their edited details will be signed, while the agreement still describes the old entity. Successful signing also resets the form from persisted data.

**Action:** Track dirty/edit state, require save or explicit discard before signing, clear consent when contractual details change, and prevent conflicting mutations while a save/upload/delete is pending.

**Acceptance:** Editing any contractual field disables signing until saved and the revised agreement is reviewed. Navigation/reload warns about unsaved edits. A signature cannot race a pending company save.

### EOR-05 [P2] Document-delete failures are silently ignored

**Location:** `components/eor/OnboardingPortal.tsx:227`, `:257`.

**Reproduction:** Fault-inject a 500 response for the DELETE request using Playwright routing, then click Remove.

**Observed:** The file remains and no status/error message appears. [Screenshot](eor-2026-09-29/05-delete-failure-silent.png). This is a controlled failure-response test, not evidence that the production server emitted 500.

**Cause:** `removeDocument` does not check `response.ok` or catch failures; `reload` also ignores non-OK responses.

**Action:** Check HTTP status, catch network errors, surface contextual retryable messages, and handle a failed refresh without implying success. Keep the previous document visible until deletion is confirmed.

**Acceptance:** Cover 401/404/409/429/500 and network failure. Each produces an understandable visible message, accessible announcement, restored controls, and correct retained state.

### EOR-06 [P2] Customers cannot inspect their uploaded documents

**Location:** `components/eor/OnboardingPortal.tsx:494`; `app/api/onboard/documents/[docId]/route.ts` has DELETE but no customer download operation. Staff download is implemented separately.

**Observed:** Uploaded filenames are displayed but there are zero customer document links. Staff download returned 200 for the same fixture.

**Impact:** Customers cannot verify that the correct attachment was uploaded before signing or retrieve their evidence later.

**Action:** Add token-scoped, ownership-checked download and safe preview. Use private/no-store responses, attachment defaults, and sandboxed or non-active previews. Do not expose object storage URLs or other clients' files.

**Acceptance:** Customer can inspect each own upload on desktop/mobile. Missing, expired, revoked, or other-customer credentials cannot retrieve it. Large preview errors do not break onboarding.

### EOR-07 [P2] Completed agreements disappear behind invite expiry

**Location:** `lib/eor/store.ts:140`; `components/eor/OnboardingPortal.tsx:322`; `lib/eor/email.ts:21`.

**Reproduction:** Finish signing and approval, then simulate elapsed time by setting the isolated fixture's token expiry to yesterday.

**Observed:** Customer GET returns 404 even for an approved agreement. Portal copy tells the customer to keep the link to download their copy. Initial invitation email mentions the 30-day lifetime, but the completion UI does not explain this limit and no signed-copy delivery is implemented.

**Action:** Retain short-lived access, but deliver the final signed copy securely and provide authenticated recovery or expiring reissue. Display expiry in the portal. Do not solve this by making bearer links permanent.

**Acceptance:** A customer who returns after expiry has a verified recovery path and retains access to the final executed agreement without staff manually locating records.

### EOR-08 [P2] A start date that passes during onboarding can still be approved

**Location:** `lib/eor/onboarding.ts:223` validates dates only at creation; signing and approval paths in `lib/eor/store.ts:287` and `:320` do not revalidate.

**Reproduction:** Create a valid future-dated invitation, then set only its start date to an earlier date in the isolated database to simulate waiting past that date. Sign and approve normally.

**Observed:** Both return 200 with the past start date. This was a time-elapse simulation, not a demonstrated arbitrary-date injection through the public API.

**Action:** Recheck readiness/start date before countersignature. Allow an explicit, audited exception if retroactive onboarding is a deliberate business policy; otherwise support date correction and regenerate the agreement for consent.

**Acceptance:** Passing the start date cannot silently approve an impossible schedule. Normal and explicitly authorized exception paths are tested.

### EOR-09 [P2] Supported India work locations are incomplete

**Location:** `lib/eor/onboarding.ts:61`, `:232`.

**Observed:** Creating a hire with `workState: "Sikkim"` returns 400. The hardcoded options omit valid locations and do not explain a restricted service footprint.

**Action:** Establish the actual supported employment jurisdictions with operations. Use a maintained complete location catalogue, with separate explicit availability restrictions where required. Do not imply unsupported locations are simply invalid inputs.

**Acceptance:** Supported locations can be selected and submitted; unsupported locations have an explicit alternative/contact path. Include Sikkim in regression coverage according to the confirmed service policy.

### EOR-10 [P2] Invitation creation has no retry idempotency or duplicate warning

**Location:** `lib/eor/store.ts:152`; `app/api/basecamp/clients/route.ts`.

**Observed:** Two identical creation requests returned 201 and different record IDs.

**Impact:** A retry after an uncertain network response can produce multiple onboarding records, invitations, and agreements for the same hire. Separate legitimate engagements must remain possible.

**Action:** Add scoped idempotency keys and a server-backed duplicate warning for the same company/hire/start date. Do not enforce a simplistic company-name uniqueness constraint.

**Acceptance:** Retrying the same intent returns the same record/link outcome without another email. A deliberate additional engagement is possible through explicit confirmation.

### EOR-11 [P2] Mobile form validation leaves users below the errors

**Location:** `components/eor/OnboardingPortal.tsx:30`, `:196`.

**Observed:** At 390px, empty-form submission left focus on Save and continue at scroll position 2134. No controls had `aria-invalid=true`; no input/select had `aria-describedby`. The summary above the long form was offscreen. [Viewport screenshot](eor-2026-09-29/14-mobile-validation.png).

**Action:** Add field IDs, linked error descriptions, invalid attributes, and a focusable summary with links to invalid fields. Focus/scroll the first error under the fixed header. Preserve entered data.

**Acceptance:** Keyboard and mobile users can immediately identify and navigate to all errors. Screen reader testing confirms each error is announced with its field; 390px and 768px layouts remain usable.

### EOR-12 [P2, deployment-dependent] Signature IP evidence trusts an unverified edge header

**Location:** `lib/eor/portal.ts:112`.

**Observed locally:** Supplying `cf-connecting-ip: 203.0.113.99` directly to the sign request stored that value as `signed_ip`.

**Impact:** Signature audit evidence can be forged if the production ingress permits this caller-supplied header. This is not an authentication bypass. Whether the production proxy strips/replaces it was not tested.

**Action:** Document trusted ingress, strip untrusted forwarding headers, and derive canonical client identity only from verified proxy behavior. Store raw claims separately from trusted transport metadata where needed.

**Acceptance:** A request with forged edge headers through the actual staging ingress cannot control the trusted signer-IP field. Confirm behavior on every publicly reachable ingress, not just the custom domain.

## Operational Gaps

These are source/UI-confirmed omissions, not claims that unimplemented behavior failed an existing contract.

### GAP-01 [P1 before operational launch] No request-corrections or hire-edit workflow

**Location:** `app/api/basecamp/clients/[id]/route.ts:22` exposes only resend, approve, and cancel. `lib/eor/store.ts:184` prevents company edits once signed.

Staff cannot return a wrong EIN document for replacement, correct a fee/start date, or send structured feedback without restarting the onboarding. Add `changes_requested`, per-document review/rejection reasons, editable unsigned hire details, customer notifications, and versioned re-signing when contractual terms change. Preserve historical signed snapshots rather than overwriting them.

**Acceptance:** Staff reject a document, customer replaces it, staff re-review, and the correct version is signed/approved. A changed salary/date invalidates consent for the previous draft and leaves an audit trail.

### GAP-02 [P2] No durable review notifications or workflow queue

**Location:** `lib/eor/email.ts:21` implements invitations; sign and approve routes have no customer/staff notification delivery. Portal copy promises review usually within one working day.

Add transactional outbox events for signature received, review requested, corrections, approval, and approaching expiry/start date. Show owner, due date, delivery status, retries, and overdue queue in Basecamp. Distinguish email disabled from delivery failed; reissue currently rotates the token before email delivery is known.

**Acceptance:** A completed signature produces one durable staff-review task and one confirmation. Provider failure retries without duplicate sends or losing the workflow. Staff can see whether the new invitation was delivered and manually recover.

### GAP-03 [P2] Signatory identity assurance is limited to possession of the invite

**Location:** `components/eor/OnboardingPortal.tsx:84`; `app/api/onboard/sign/route.ts`; `lib/eor/onboarding.ts:359`.

The invite goes to the contact, but that holder can set a different signatory email/name and sign by typing the declared name. The local test signed using a different, unverified signatory email. Bearer-link possession is the current authentication model, not verification of the separately named signatory's mailbox or authority.

Decide the required assurance with the business and counsel. If the intended signer must be verified, transfer signing to an expiring challenge delivered to their verified address or integrate an appropriate signing provider. Record identity and delegation evidence, not merely the typed name. This audit does not assess legal validity.

**Acceptance:** A forwarded invite cannot silently impersonate a different asserted signatory. Signatory changes trigger verification and renewed consent under the chosen policy.

### GAP-04 [P2] Approval does not initiate an employee onboarding workflow

**Location:** `components/eor/OnboardingPortal.tsx:319`; approval branch in `app/api/basecamp/clients/[id]/route.ts:54` only changes state and writes an audit event.

The completion message says Ensaar will send the employment contract and update the customer about the start date. No employee invitation, identity/document checklist, contract task, payroll readiness, assigned operator, or tracked handoff is initiated here. This may intentionally be manual today, but it is a gap if the feature is advertised as end-to-end EOR onboarding.

**Acceptance:** Approval creates an owned employee-onboarding case with visible next steps, due dates, readiness state, and manual/integrated handoff evidence. Customer can distinguish agreement countersigned from employee ready to start.

### GAP-05 [P2 at volume] Client list silently stops at 500 records

**Location:** `lib/eor/store.ts:118` uses `LIMIT 500`; `components/basecamp/ClientsAdmin.tsx` has no server pagination workflow.

Add cursor pagination, server-side search, and status/owner/due-date filters. Older cases must remain discoverable without remembering a direct URL. Reuse these controls for the review queue.

**Acceptance:** With more than 500 synthetic records, all cases remain reachable through search/pagination, with bounded response payloads and usable mobile controls.

### GAP-06 [Release gate] Agreement template review is explicitly outstanding in source

**Location:** `lib/eor/agreement.ts:22` says the template has not had a lawyer's review and asks for review before the first customer signs.

Confirm whether this comment is current. Obtain the business/legal approval outside this technical audit, record its provenance, and version the approved template. No conclusion about enforceability or regulatory compliance is made here.

**Acceptance:** An approved, versioned template and review record are available before enabling real signatures; deployments preserve previously signed snapshots.

## Passing Negative Tests

| Scenario | Actual result |
| --- | --- |
| Unauthenticated client list | 401 |
| Missing customer token | 404 |
| Editor/viewer read client list and detail | 403 for both roles |
| Customer B deletes customer A's document | 404 |
| Old token after reissue | 404; replacement token 200 |
| Cancelled customer link | 404 |
| Save/upload/re-sign after completed signature | 409 for all three |
| Sign without required documents | 400 |
| Sign after persisted agreement details change using old hash | 409 with `changed: true` |
| Sign without consent | 400 |
| Sign with mismatched typed name | 400 |
| Sampled customer/admin mobile and customer tablet overflow | Document scroll width equals viewport width |

Passing these cases is not a complete penetration test or proof of all authorization paths. The direct signature-IP behavior and document race remain despite the passing sequential guards.

## Execution Order

1. Resolve deployment mismatch and prove staging runs the audited revision. Confirm agreement-template approval.
2. Serialize mutations/signing/approval, enforce document validity/review, and add deterministic regression tests.
3. Fix dirty-form signing, deletion/reload feedback, customer file access, and accessible validation.
4. Add corrections, identity assurance policy, schedule revalidation, invitation idempotency, and supported-location handling.
5. Add durable notifications, final agreement delivery/recovery, employee handoff, and searchable/paginated review queues.
6. Run staged email delivery and failure tests, trusted-proxy checks, physical-device/browser coverage, production build tests, and controlled production smoke testing before launch.

## Artifacts and Test Hygiene

Only this report and sanitized synthetic evidence are intended as repository changes. Authentication state, local credentials, invitation tokens, and executable temporary harnesses are not included in committed evidence. The temporary harness lives outside the repository at `C:\tmp\ensaar-eor-audit-20260929`.

An initial primary harness run stopped after its functional tests because the harness treated a numeric status as a function. That harness typo was corrected; the final primary run and supplemental results, not the failed harness exit, are the basis for the saved evidence. It was not an application defect.

## Resolution (29 September 2026, same day)

Fixed in the commit that adds this section. Verified with a production build against PostgreSQL and a mock mail provider: 54 of 54 integration checks and 15 of 15 browser checks, plus the unit suite.

| ID | Resolution | Verified by |
| --- | --- | --- |
| EOR-01 | Deployed (1f533cf, 29 Sep); `/onboard` live, admin API returns 401. Railway ignored the repo's pre-deploy migration, so it is now set on the service itself. | Live checks |
| EOR-02 | Every mutation (upload, delete, company save, sign, review, request changes, approve) runs in a transaction that locks the client row first and re-checks state. Approval independently requires every required document present and staff-accepted. | Audit's held-lock reproduction: delete 200, sign 400, never signed with a missing document |
| EOR-03 | Structural checks: PDF needs objects, `startxref` and `%%EOF`, and is refused if encrypted; PNG needs IHDR and IEND; JPEG needs its end marker. 422 on failure. Per-document staff review (accept / reject with reason) gates approval. | `%PDF-not-a-document` and truncated files return 422 |
| EOR-04 | Signing is hidden while company edits are open or unsaved; a leave-page warning covers unsaved edits; consent resets whenever the record changes. The server's shown-text hash still refuses stale signatures. | Browser and API |
| EOR-05 | Delete and refresh check status and network errors, keep the file listed until confirmed, and announce errors in a live region. | Fault-injected 500 in the browser |
| EOR-06 | Token-scoped customer download (attachment, nosniff, no-store); another customer's id returns 404. | API |
| EOR-07 | Signing extends access 30 days; the portal shows the expiry date; signed and executed copies are emailed as attachments; `/onboard/recover` emails a fresh link to the contact or signatory address, with an identical answer for unknown addresses. | API and mock mailbox |
| EOR-08 | Approval refuses a passed start date unless staff confirm a backdated start, which is audited; staff can edit the date instead (the customer re-signs). | API and audit log |
| EOR-09 | All 28 states and 8 union territories. | Unit and API (Sikkim) |
| EOR-10 | Idempotency key per form submission (replays return the same record, no second email); an open onboarding for the same contact and employee needs explicit confirmation. | API and mock mailbox |
| EOR-11 | Linked error summary receives focus below the fixed header; every field has an id, `aria-invalid` and `aria-describedby`. | 390px browser check |
| EOR-12 | Broader than reported: a caller-set `cf-connecting-ip` also reset every rate limit on production. `cf-connecting-ip` and `x-vercel-forwarded-for` are now trusted only with `TRUST_CLOUDFLARE_IP=1` / on Vercel; signer IP uses the same trusted address. Production confirmed Railway overwrites `x-forwarded-for`. | Live probe before, unit and API after |
| GAP-01 | `changes_requested` status, per-document rejection reasons, staff hire edits until approval; a change to a signed record voids the signature into `ensaar_eor_signature_history` and asks for re-signing. | API |
| GAP-02 | Transactional outbox (`ensaar_outbox`): enqueued with the change, delivered with Resend idempotency keys, retried with backoff, failures and retries visible in Basecamp. Staff are notified of signatures and new leads; customers of signature, changes and countersignature. | Mock outage then retry |
| GAP-03 | The declared signatory verifies a 6-digit emailed code before signing (hashed, 15 minutes, 5 attempts, redacted from the outbox after delivery); changing the signatory resets it. Staff can attest instead, with a note that goes into the evidence. | API and browser |
| GAP-04 | Approval opens an eight-step employee onboarding checklist with an owner and due date; the customer sees progress. | API and browser |
| GAP-05 | Cursor pagination (50 per page), search, status filters and a "needs action" queue. | 56 records, all reachable once |
| GAP-06 | Signing is closed until an owner records the reviewer of the current agreement version (write-once per version, audited). Still requires the actual legal review. | API |

Open, outside code: legal review of the agreement (GAP-06), verifying ensaar.com in Resend so email can be switched on, and a named Basecamp owner in production.
