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
