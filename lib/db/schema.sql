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

-- How the customer is charged is chosen per employee: 'fee' (the salary and
-- Ensaar's monthly fee, shown separately) or 'loaded' (one all-in monthly US
-- dollar amount; the salary is recorded but not shown to the customer).
ALTER TABLE ensaar_eor_employees ADD COLUMN IF NOT EXISTS pricing TEXT NOT NULL DEFAULT 'fee';
ALTER TABLE ensaar_eor_employees ADD COLUMN IF NOT EXISTS loaded_cost_usd INTEGER;
ALTER TABLE ensaar_eor_employees ALTER COLUMN monthly_fee_usd DROP NOT NULL;
-- The one-month deposit is Ensaar's choice per employee (a safety net for a high salary, say).
ALTER TABLE ensaar_eor_employees ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT FALSE;
-- There is no client-level fee any more. The column stays for rows that have one.
ALTER TABLE ensaar_eor_companies ALTER COLUMN default_fee_usd DROP NOT NULL;

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

-- ---------------------------------------------------------------------------
-- 2026-10-01 the employee portal (/team). An employee signs in by email link,
-- signs their offer letter and employment agreement, chooses a tax regime and
-- declares investments, and chooses holidays for the client to approve.

CREATE TABLE IF NOT EXISTS ensaar_team_login_tokens (
  id           TEXT PRIMARY KEY,
  employee_id  TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  -- invite | login
  purpose      TEXT NOT NULL DEFAULT 'login',
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ensaar_team_sessions (
  id           TEXT PRIMARY KEY,
  employee_id  TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_team_sessions_employee_idx ON ensaar_team_sessions (employee_id);

-- Offer letters and employment agreements as issued: the exact text and its
-- fingerprint are frozen at issue, and the employee signs that text.
CREATE TABLE IF NOT EXISTS ensaar_employee_documents (
  id                 TEXT PRIMARY KEY,
  employee_id        TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  -- offer | agreement
  kind               TEXT NOT NULL,
  -- sent | signed | void
  status             TEXT NOT NULL DEFAULT 'sent',
  document           JSONB NOT NULL,
  text               TEXT NOT NULL,
  hash               TEXT NOT NULL,
  issued_by          TEXT,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_name        TEXT,
  signed_email       TEXT,
  signed_at          TIMESTAMPTZ,
  signed_ip          TEXT,
  signed_user_agent  TEXT,
  voided_at          TIMESTAMPTZ,
  void_reason        TEXT
);
CREATE INDEX IF NOT EXISTS ensaar_employee_documents_idx ON ensaar_employee_documents (employee_id, kind, issued_at DESC);

-- The employee's tax regime and old-regime declarations, per tax year.
CREATE TABLE IF NOT EXISTS ensaar_employee_tax (
  employee_id   TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  tax_year      TEXT NOT NULL,
  -- new | old
  regime        TEXT NOT NULL DEFAULT 'new',
  declarations  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, tax_year)
);

-- Holidays Ensaar loads each year: India's festival holidays from the official
-- list, and anything else. US federal holidays are computed, not stored.
CREATE TABLE IF NOT EXISTS ensaar_holiday_calendar (
  id          TEXT PRIMARY KEY,
  -- IN | US
  country     TEXT NOT NULL,
  day         DATE NOT NULL,
  name        TEXT NOT NULL,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_holiday_calendar_unique_idx ON ensaar_holiday_calendar (country, day, lower(name));

-- A client's holiday calendar for a year: one per client, the same for all its
-- employees. An employee proposes it, the client approves it (or Ensaar decides).
-- It replaced a per-employee table that never held data in production.
DROP TABLE IF EXISTS ensaar_holiday_plans;
CREATE TABLE IF NOT EXISTS ensaar_company_holidays (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES ensaar_eor_companies (id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  chosen        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- draft | submitted | approved | rejected
  status        TEXT NOT NULL DEFAULT 'draft',
  -- The employee who last changed the proposal.
  proposed_by   TEXT REFERENCES ensaar_eor_employees (id) ON DELETE SET NULL,
  proposed_name TEXT,
  submitted_at  TIMESTAMPTZ,
  decided_by    TEXT,
  -- client | ensaar
  decided_role  TEXT,
  decided_at    TIMESTAMPTZ,
  note          TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ensaar_company_holidays_unique_idx ON ensaar_company_holidays (company_id, year);

-- The name an employee works under with the client, when it differs from the
-- legal name on their PAN and Aadhaar. Shown to the client and used to greet them.
ALTER TABLE ensaar_eor_employees ADD COLUMN IF NOT EXISTS business_name TEXT;
-- The employee says they have no previous employer, so no relieving letter is due.
ALTER TABLE ensaar_eor_employees ADD COLUMN IF NOT EXISTS no_previous_employer BOOLEAN NOT NULL DEFAULT FALSE;

-- Who owns or controls a client company (25% or more), declared and signed in
-- the client portal. Frozen text and fingerprint, like the agreement.
CREATE TABLE IF NOT EXISTS ensaar_eor_ownership (
  company_id     TEXT PRIMARY KEY REFERENCES ensaar_eor_companies (id) ON DELETE CASCADE,
  owners         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Nobody owns or controls 25% or more; then the controller is named instead.
  no_large_owner BOOLEAN NOT NULL DEFAULT FALSE,
  controller     JSONB,
  declared_name  TEXT NOT NULL,
  declared_email TEXT NOT NULL,
  declared_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  text           TEXT NOT NULL,
  hash           TEXT NOT NULL
);

-- The account an employee's salary is paid into.
CREATE TABLE IF NOT EXISTS ensaar_employee_bank (
  employee_id    TEXT PRIMARY KEY REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  holder_name    TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc           TEXT NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Files an employee gives Ensaar: proof of the bank account, a relieving letter.
CREATE TABLE IF NOT EXISTS ensaar_employee_files (
  id           TEXT PRIMARY KEY,
  employee_id  TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  -- bank_proof | relieving_letter
  kind         TEXT NOT NULL,
  filename     TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  content      BYTEA NOT NULL,
  uploaded_by  TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_employee_files_idx ON ensaar_employee_files (employee_id, kind);

-- The employee's given name, to greet them in their documents ("Dear Lakshmi" for
-- Pulla Lakshmi), when it is not the first word of the legal name. Null: the first word.
ALTER TABLE ensaar_eor_employees ADD COLUMN IF NOT EXISTS given_name TEXT;

-- The Employee Handbook as published: each version's text frozen and fingerprinted
-- once, so every employee acknowledges exactly the same words. Publishing needs the
-- owner's sign-off recorded in ensaar_eor_template_approvals as 'handbook:<version>'.
CREATE TABLE IF NOT EXISTS ensaar_policy_versions (
  version       TEXT PRIMARY KEY,
  text          TEXT NOT NULL,
  hash          TEXT NOT NULL,
  issued_by     TEXT NOT NULL,
  published_by  TEXT NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- An employee's acknowledgement of a handbook version: received, read, will follow it.
-- Not a contract signature.
CREATE TABLE IF NOT EXISTS ensaar_policy_acknowledgements (
  id               TEXT PRIMARY KEY,
  employee_id      TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  version          TEXT NOT NULL REFERENCES ensaar_policy_versions (version),
  hash             TEXT NOT NULL,
  typed_name       TEXT NOT NULL,
  acknowledged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip               TEXT,
  user_agent       TEXT,
  UNIQUE (employee_id, version)
);

-- Consent to work after 8:30 pm India time (from home). Withdrawable; the latest row counts.
CREATE TABLE IF NOT EXISTS ensaar_night_work_consents (
  employee_id   TEXT PRIMARY KEY REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  consented     BOOLEAN NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leave an employee asks for (or records, for sickness). The client approves
-- planned leave; Ensaar sees everything and can decide instead. Days are working
-- days (calendar days for maternity), split into paid (from the paid-leave
-- balance) and unpaid (loss of pay, for payroll).
CREATE TABLE IF NOT EXISTS ensaar_leave_requests (
  id            TEXT PRIMARY KEY,
  employee_id   TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  -- pto | sick | maternity | paternity | unpaid
  type          TEXT NOT NULL,
  from_day      DATE NOT NULL,
  to_day        DATE NOT NULL,
  half_start    BOOLEAN NOT NULL DEFAULT FALSE,
  half_end      BOOLEAN NOT NULL DEFAULT FALSE,
  days          NUMERIC(6,1) NOT NULL,
  paid_days     NUMERIC(6,1) NOT NULL,
  unpaid_days   NUMERIC(6,1) NOT NULL,
  reason        TEXT,
  -- pending | approved | declined | cancelled
  status        TEXT NOT NULL DEFAULT 'pending',
  decided_by    TEXT,
  -- client | ensaar
  decided_as    TEXT,
  decided_at    TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_leave_requests_employee_idx ON ensaar_leave_requests (employee_id, from_day DESC);
CREATE INDEX IF NOT EXISTS ensaar_leave_requests_pending_idx ON ensaar_leave_requests (status, created_at) WHERE status = 'pending';

-- Changes to a paid-leave balance that are not requests: an opening balance,
-- encashment at year end, a correction. Always with a reason and who made it.
CREATE TABLE IF NOT EXISTS ensaar_leave_adjustments (
  id            TEXT PRIMARY KEY,
  employee_id   TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  days          NUMERIC(6,1) NOT NULL,
  reason        TEXT NOT NULL,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ensaar_leave_adjustments_idx ON ensaar_leave_adjustments (employee_id, year);

-- Corrective action (Employee Handbook section 14). A case per matter; every step
-- is an event. Letters to the employee are frozen and fingerprinted like other
-- documents; notes and client reports stay with Ensaar.
CREATE TABLE IF NOT EXISTS ensaar_conduct_cases (
  id               TEXT PRIMARY KEY,
  employee_id      TEXT NOT NULL REFERENCES ensaar_eor_employees (id) ON DELETE CASCADE,
  -- performance | attendance | conduct
  reason           TEXT NOT NULL,
  -- client | ensaar
  source           TEXT NOT NULL,
  summary          TEXT NOT NULL,
  -- open | closed
  status           TEXT NOT NULL DEFAULT 'open',
  -- What the client is told when it is closed (they never see letters or replies).
  client_outcome   TEXT,
  opened_by        TEXT NOT NULL,
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by        TEXT,
  closed_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ensaar_conduct_cases_employee_idx ON ensaar_conduct_cases (employee_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS ensaar_conduct_events (
  id               TEXT PRIMARY KEY,
  case_id          TEXT NOT NULL REFERENCES ensaar_conduct_cases (id) ON DELETE CASCADE,
  -- client_report | note | verbal_warning | written_warning | final_warning | show_cause | suspension | abandonment | termination | closed
  step             TEXT NOT NULL,
  text             TEXT NOT NULL,
  hash             TEXT,
  issued_by        TEXT NOT NULL,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_due     DATE,
  acknowledged_at  TIMESTAMPTZ,
  reply_text       TEXT,
  replied_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ensaar_conduct_events_case_idx ON ensaar_conduct_events (case_id, issued_at);
