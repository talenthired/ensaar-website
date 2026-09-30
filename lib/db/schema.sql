-- Basecamp durable schema.
--
-- Idempotent by construction (IF NOT EXISTS everywhere) so the migrate script can
-- run on every deploy without a migration ledger. There is no ORM here and no
-- down-migrations: this file is the schema, and changes are additive.

-- People who can sign in to Basecamp. Invitation-only: a row appears here only
-- when an invitation is accepted, or for the bootstrap owner.
CREATE TABLE IF NOT EXISTS ensaar_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  -- owner | admin | editor | viewer. Checked server-side on every mutation.
  role          TEXT NOT NULL DEFAULT 'viewer',
  -- scrypt, encoded as scrypt$N$r$p$salt$hash. Null until the invite is accepted.
  password_hash TEXT,
  -- Deactivated users keep their audit trail but cannot sign in.
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ensaar_users_role_idx ON ensaar_users (role);

-- Pending invitations. Only the hash is stored, so reading this table does not
-- let anyone accept an invitation (same posture as the session tokens).
CREATE TABLE IF NOT EXISTS ensaar_invitations (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer',
  token_hash    TEXT NOT NULL UNIQUE,
  invited_by    TEXT REFERENCES ensaar_users (id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One live invitation per address: re-inviting supersedes rather than duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_invitations_pending_email_idx
  ON ensaar_invitations (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Sessions, keyed by a hash of the cookie token.
CREATE TABLE IF NOT EXISTS ensaar_sessions (
  id           TEXT PRIMARY KEY,
  token_hash   TEXT NOT NULL UNIQUE,
  -- Null for the legacy shared-password session, which predates user accounts.
  user_id      TEXT REFERENCES ensaar_users (id) ON DELETE CASCADE,
  auth_version TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ensaar_sessions_expires_idx ON ensaar_sessions (expires_at);

-- Events. Column-per-field rather than the jsonb payload the Supabase store used,
-- because the public page filters and orders on date and published.
CREATE TABLE IF NOT EXISTS ensaar_events (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  title      TEXT NOT NULL,
  type       TEXT NOT NULL,
  location   TEXT NOT NULL,
  summary    TEXT NOT NULL,
  href       TEXT,
  speakers   TEXT[] NOT NULL DEFAULT '{}',
  published  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Null means unlimited. Registration closes when the count reaches this.
  capacity   INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ensaar_events_published_date_idx ON ensaar_events (published, date DESC);

-- Public registrations for an event.
CREATE TABLE IF NOT EXISTS ensaar_event_registrations (
  id           TEXT PRIMARY KEY,
  event_id     TEXT NOT NULL REFERENCES ensaar_events (id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  company      TEXT,
  phone        TEXT,
  notes        TEXT,
  -- registered | waitlisted | cancelled | attended
  status       TEXT NOT NULL DEFAULT 'registered',
  source       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One registration per address per event: a double submit updates rather than
-- creating a second row, which would corrupt the capacity count.
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_event_registrations_unique_idx
  ON ensaar_event_registrations (event_id, email);

CREATE INDEX IF NOT EXISTS ensaar_event_registrations_event_idx
  ON ensaar_event_registrations (event_id, created_at DESC);

-- Who did what. User management without an audit trail is not manageable.
CREATE TABLE IF NOT EXISTS ensaar_audit (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT,
  actor_email TEXT,
  action     TEXT NOT NULL,
  target     TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ensaar_audit_created_idx ON ensaar_audit (created_at DESC);

-- Added after the first release; harmless to re-run.
ALTER TABLE ensaar_events ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- EOR client onboarding. One row per customer hire: Ensaar enters the offer, the
-- customer completes company details, uploads documents and signs through a
-- private link. Only the hash of that link's token is stored, same posture as
-- invitations and sessions.
CREATE TABLE IF NOT EXISTS ensaar_eor_clients (
  id                 TEXT PRIMARY KEY,
  -- invited | in_progress | signed | approved | cancelled
  status             TEXT NOT NULL DEFAULT 'invited',
  token_hash         TEXT NOT NULL UNIQUE,
  token_expires_at   TIMESTAMPTZ NOT NULL,
  -- Entered by Ensaar when inviting.
  company_name       TEXT NOT NULL,
  contact_name       TEXT NOT NULL,
  contact_email      TEXT NOT NULL,
  employee_name      TEXT NOT NULL,
  employee_email     TEXT,
  job_title          TEXT NOT NULL,
  salary_inr         BIGINT NOT NULL,
  start_date         TEXT NOT NULL,
  work_state         TEXT NOT NULL,
  monthly_fee_usd    INTEGER NOT NULL,
  notes              TEXT,
  -- Completed by the customer: legal entity, EIN, address, signatory, declarations.
  company            JSONB,
  -- The exact text the customer signed, so later template edits never change it.
  agreement_version  TEXT,
  agreement_text     TEXT,
  agreement_hash     TEXT,
  signed_name        TEXT,
  signed_title       TEXT,
  signed_at          TIMESTAMPTZ,
  signed_ip          TEXT,
  signed_user_agent  TEXT,
  countersigned_by   TEXT,
  countersigned_at   TIMESTAMPTZ,
  invited_by         TEXT REFERENCES ensaar_users (id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ensaar_eor_clients_created_idx ON ensaar_eor_clients (created_at DESC);

-- Customer uploads. Kept in Postgres rather than a bucket: a handful of small
-- PDFs per client does not justify a second storage service, and it keeps the
-- documents inside the same backup and access boundary as the record.
CREATE TABLE IF NOT EXISTS ensaar_eor_documents (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL REFERENCES ensaar_eor_clients (id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  filename      TEXT NOT NULL,
  content_type  TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  data          BYTEA NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ensaar_eor_documents_client_idx ON ensaar_eor_documents (client_id, created_at);

-- ---------------------------------------------------------------------------
-- 2026-09-29 audit follow-up. Additive only.

-- Contact, careers and advisor leads. Production had no Supabase, so every
-- submission was refused; leads now live beside everything else in Basecamp.
CREATE TABLE IF NOT EXISTS ensaar_leads (
  id          TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'new',
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_leads_created_idx ON ensaar_leads (created_at DESC);

-- Every outgoing email, written in the same transaction as the change that
-- caused it, then delivered. Nothing is sent "fire and forget": staff can see
-- what went out, what failed and why, and retry it. dedupe_key makes enqueueing
-- idempotent; the row id doubles as Resend's Idempotency-Key so a retry never
-- sends twice.
CREATE TABLE IF NOT EXISTS ensaar_outbox (
  id               TEXT PRIMARY KEY,
  kind             TEXT NOT NULL,
  dedupe_key       TEXT UNIQUE,
  related_id       TEXT,
  to_addresses     TEXT[] NOT NULL,
  subject          TEXT NOT NULL,
  text_body        TEXT NOT NULL,
  html_body        TEXT NOT NULL,
  attachments      JSONB,
  -- pending | sent | failed | skipped (email not configured)
  status           TEXT NOT NULL DEFAULT 'pending',
  attempts         INTEGER NOT NULL DEFAULT 0,
  last_error       TEXT,
  next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_outbox_due_idx ON ensaar_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS ensaar_outbox_related_idx ON ensaar_outbox (related_id, created_at DESC);

-- Per-document staff review. Approval needs every required kind accepted.
ALTER TABLE ensaar_eor_documents ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE ensaar_eor_documents ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE ensaar_eor_documents ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE ensaar_eor_documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Corrections, signatory verification, idempotent invites, employee handoff.
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS changes_note TEXT;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMPTZ;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS signatory_verified_email TEXT;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS signatory_verified_at TIMESTAMPTZ;
-- email_code | staff_attested
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS signatory_verified_by TEXT;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS verify_code_hash TEXT;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS verify_code_expires_at TIMESTAMPTZ;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS verify_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS signed_email TEXT;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS signed_verification TEXT;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE ensaar_eor_clients ADD COLUMN IF NOT EXISTS employee_case JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_eor_clients_idempotency_idx
  ON ensaar_eor_clients (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ensaar_eor_clients_status_idx ON ensaar_eor_clients (status, created_at DESC);

-- A signature that was voided because the terms changed. Kept, never
-- overwritten: the customer signed it, so it stays on record.
CREATE TABLE IF NOT EXISTS ensaar_eor_signature_history (
  id                 TEXT PRIMARY KEY,
  client_id          TEXT NOT NULL REFERENCES ensaar_eor_clients (id) ON DELETE CASCADE,
  agreement_version  TEXT,
  agreement_text     TEXT,
  agreement_hash     TEXT,
  signed_name        TEXT,
  signed_title       TEXT,
  signed_email       TEXT,
  signed_at          TIMESTAMPTZ,
  signed_ip          TEXT,
  voided_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_by          TEXT,
  void_reason        TEXT
);
CREATE INDEX IF NOT EXISTS ensaar_eor_signature_history_client_idx ON ensaar_eor_signature_history (client_id, voided_at DESC);

-- Legal sign-off per agreement version. Customers cannot sign a version that
-- has no row here.
CREATE TABLE IF NOT EXISTS ensaar_eor_template_approvals (
  version        TEXT PRIMARY KEY,
  reviewer       TEXT NOT NULL,
  note           TEXT,
  recorded_by    TEXT NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2026-09-29 client model: a client is a company with many employees.
-- Additive only. The single-hire tables above (ensaar_eor_clients and friends)
-- are kept, and any rows in them are copied into this model below.

-- The client company. Verified once, signs one master agreement.
CREATE TABLE IF NOT EXISTS ensaar_eor_companies (
  id                 TEXT PRIMARY KEY,
  -- invited | onboarding | changes_requested | signed | active | cancelled
  status             TEXT NOT NULL DEFAULT 'invited',
  company_name       TEXT NOT NULL,
  contact_name       TEXT NOT NULL,
  contact_email      TEXT NOT NULL,
  default_fee_usd    INTEGER NOT NULL,
  notes              TEXT,
  company            JSONB,
  agreement_version  TEXT,
  agreement_text     TEXT,
  agreement_hash     TEXT,
  signed_name        TEXT,
  signed_title       TEXT,
  signed_email       TEXT,
  signed_at          TIMESTAMPTZ,
  signed_ip          TEXT,
  signed_user_agent  TEXT,
  countersigned_by   TEXT,
  countersigned_at   TIMESTAMPTZ,
  changes_note       TEXT,
  changes_requested_at TIMESTAMPTZ,
  idempotency_key    TEXT,
  invited_by         TEXT REFERENCES ensaar_users (id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Assisted onboarding: the Ensaar person who entered the company details for a
-- customer with no time to. NULL when the customer entered them.
ALTER TABLE ensaar_eor_companies ADD COLUMN IF NOT EXISTS details_entered_by TEXT;
CREATE INDEX IF NOT EXISTS ensaar_eor_companies_status_idx ON ensaar_eor_companies (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_eor_companies_idempotency_idx
  ON ensaar_eor_companies (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS ensaar_eor_company_documents (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES ensaar_eor_companies (id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  filename      TEXT NOT NULL,
  content_type  TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  data          BYTEA NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_note   TEXT,
  reviewed_by   TEXT,
  reviewed_at   TIMESTAMPTZ,
  uploaded_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_eor_company_documents_idx ON ensaar_eor_company_documents (company_id, created_at);

-- One row per person employed for a client. Hundreds per company.
CREATE TABLE IF NOT EXISTS ensaar_eor_employees (
  id                 TEXT PRIMARY KEY,
  company_id         TEXT NOT NULL REFERENCES ensaar_eor_companies (id) ON DELETE CASCADE,
  -- draft | awaiting_signature | signed | onboarding | active | exited | cancelled
  status             TEXT NOT NULL DEFAULT 'draft',
  employee_name      TEXT NOT NULL,
  employee_email     TEXT,
  job_title          TEXT NOT NULL,
  salary_inr         BIGINT NOT NULL,
  start_date         TEXT NOT NULL,
  work_state         TEXT NOT NULL,
  monthly_fee_usd    INTEGER NOT NULL,
  notes              TEXT,
  -- Assigned when first sent to the customer, so drafts leave no gaps.
  schedule_number    INTEGER,
  schedule_version   TEXT,
  schedule_text      TEXT,
  schedule_hash      TEXT,
  signed_name        TEXT,
  signed_email       TEXT,
  signed_at          TIMESTAMPTZ,
  signed_ip          TEXT,
  signed_user_agent  TEXT,
  countersigned_by   TEXT,
  countersigned_at   TIMESTAMPTZ,
  employee_case      JSONB,
  exit_date          TEXT,
  exit_reason        TEXT,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_eor_employees_company_idx ON ensaar_eor_employees (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ensaar_eor_employees_status_idx ON ensaar_eor_employees (status, start_date);
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_eor_employees_schedule_idx
  ON ensaar_eor_employees (company_id, schedule_number) WHERE schedule_number IS NOT NULL;

-- People at the customer who can sign in to the portal.
CREATE TABLE IF NOT EXISTS ensaar_portal_users (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES ensaar_eor_companies (id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,
  -- contact | signatory
  role          TEXT NOT NULL DEFAULT 'contact',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_portal_users_company_email_idx ON ensaar_portal_users (company_id, lower(email));
CREATE INDEX IF NOT EXISTS ensaar_portal_users_email_idx ON ensaar_portal_users (lower(email));

-- One-time sign-in links. Only the hash is stored.
CREATE TABLE IF NOT EXISTS ensaar_portal_login_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES ensaar_portal_users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  purpose     TEXT NOT NULL DEFAULT 'login',
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ensaar_portal_sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES ensaar_portal_users (id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_portal_sessions_user_idx ON ensaar_portal_sessions (user_id);

-- Signatures voided because what they rested on changed. Kept, never overwritten.
CREATE TABLE IF NOT EXISTS ensaar_eor_voided_signatures (
  id                 TEXT PRIMARY KEY,
  company_id         TEXT NOT NULL REFERENCES ensaar_eor_companies (id) ON DELETE CASCADE,
  employee_id        TEXT REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  -- master | schedule
  kind               TEXT NOT NULL,
  agreement_version  TEXT,
  agreement_text     TEXT,
  agreement_hash     TEXT,
  signed_name        TEXT,
  signed_email       TEXT,
  signed_at          TIMESTAMPTZ,
  signed_ip          TEXT,
  voided_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_by          TEXT,
  void_reason        TEXT
);
CREATE INDEX IF NOT EXISTS ensaar_eor_voided_signatures_idx ON ensaar_eor_voided_signatures (company_id, voided_at DESC);

-- Invoices Ensaar has raised for a client. The invoice itself is produced in
-- accounting; it is recorded here so the customer is reminded before it is due
-- and chased when it is late. Reminder emails are de-duplicated in ensaar_outbox.
CREATE TABLE IF NOT EXISTS ensaar_eor_invoices (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES ensaar_eor_companies (id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  -- The month covered, YYYY-MM.
  period      TEXT NOT NULL,
  amount_usd  NUMERIC(12, 2) NOT NULL,
  issued_on   DATE NOT NULL,
  due_on      DATE NOT NULL,
  -- open | paid | void
  status      TEXT NOT NULL DEFAULT 'open',
  paid_on     DATE,
  summary     TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_eor_invoices_number_idx ON ensaar_eor_invoices (lower(number));
CREATE INDEX IF NOT EXISTS ensaar_eor_invoices_company_idx ON ensaar_eor_invoices (company_id, issued_on DESC);
CREATE INDEX IF NOT EXISTS ensaar_eor_invoices_open_idx ON ensaar_eor_invoices (due_on) WHERE status = 'open';

-- Carry over anything created with the single-hire model: the company (with
-- its details and documents) and its one employee, as a draft to be re-sent
-- under the new agreement. Idempotent: rows already copied are skipped.
INSERT INTO ensaar_eor_companies (id, status, company_name, contact_name, contact_email, default_fee_usd, notes,
                                  company, invited_by, created_at, updated_at)
SELECT c.id,
       CASE WHEN c.status = 'cancelled' THEN 'cancelled' WHEN c.company IS NULL THEN 'invited' ELSE 'onboarding' END,
       c.company_name, c.contact_name, c.contact_email, c.monthly_fee_usd, c.notes,
       c.company - 'confirmsHire', c.invited_by, c.created_at, NOW()
FROM ensaar_eor_clients c
WHERE NOT EXISTS (SELECT 1 FROM ensaar_eor_companies x WHERE x.id = c.id);

INSERT INTO ensaar_eor_company_documents (id, company_id, kind, filename, content_type, size_bytes, sha256, data,
                                          review_status, review_note, reviewed_by, reviewed_at, created_at)
SELECT d.id, d.client_id, CASE WHEN d.kind = 'job_description' THEN 'other' ELSE d.kind END, d.filename, d.content_type,
       d.size_bytes, d.sha256, d.data, d.review_status, d.review_note, d.reviewed_by, d.reviewed_at, d.created_at
FROM ensaar_eor_documents d
WHERE NOT EXISTS (SELECT 1 FROM ensaar_eor_company_documents x WHERE x.id = d.id);

INSERT INTO ensaar_eor_employees (id, company_id, status, employee_name, employee_email, job_title, salary_inr,
                                  start_date, work_state, monthly_fee_usd, created_at, updated_at)
SELECT c.id || '-e1', c.id, CASE WHEN c.status = 'cancelled' THEN 'cancelled' ELSE 'draft' END,
       c.employee_name, c.employee_email, c.job_title, c.salary_inr, c.start_date, c.work_state, c.monthly_fee_usd,
       c.created_at, NOW()
FROM ensaar_eor_clients c
WHERE NOT EXISTS (SELECT 1 FROM ensaar_eor_employees x WHERE x.id = c.id || '-e1');

INSERT INTO ensaar_portal_users (id, company_id, email, name, role)
SELECT c.id || '-u1', c.id, lower(c.contact_email), c.contact_name, 'contact'
FROM ensaar_eor_clients c
WHERE c.status <> 'cancelled'
  AND NOT EXISTS (SELECT 1 FROM ensaar_portal_users x WHERE x.company_id = c.id AND lower(x.email) = lower(c.contact_email));
