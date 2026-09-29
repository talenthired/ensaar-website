'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, Mail, ShieldAlert, UserPlus } from 'lucide-react';
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from '@/lib/basecamp/roles';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  role: Role;
  invitedByEmail: string | null;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
};

type Viewer = { userId: string | null; email: string | null; role: Role; bootstrap: boolean };

function when(value: string | null) {
  if (!value) return 'never';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PeopleAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [inviteLink, setInviteLink] = useState<{ link: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/basecamp/users', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load people.');
      setUsers(data.users ?? []);
      setInvitations(data.invitations ?? []);
      setViewer(data.viewer ?? null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load people.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy('invite');
    setInviteLink(null);
    try {
      const response = await fetch('/api/basecamp/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to invite.');
      setInviteLink({ link: data.link, emailed: Boolean(data.emailed) });
      setEmail('');
      setError(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to invite.');
    } finally {
      setBusy(null);
    }
  }

  async function updateUser(id: string, patch: { role?: Role; active?: boolean }) {
    setBusy(id);
    try {
      const response = await fetch(`/api/basecamp/users/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update.');
      setError(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update.');
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/basecamp/invitations/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const canInvite = viewer?.role === 'owner' || viewer?.role === 'admin';
  const pending = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink-primary">People</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Access is invitation only. Everyone signs in with their own email and password, and every
          change here is written to the audit log.
        </p>
      </header>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {viewer?.bootstrap && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You are signed in with the shared password. Invite yourself as an owner and use that account
          from now on, so actions are attributable to a person.
        </p>
      )}

      {canInvite && (
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
            <UserPlus className="h-4 w-4" aria-hidden /> Invite someone
          </h2>
          <form onSubmit={invite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-ink-secondary">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
              />
            </label>
            <label className="text-sm sm:w-48">
              <span className="mb-1 block text-ink-secondary">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
              >
                {ROLES.filter((r) => r !== 'owner' || viewer?.role === 'owner').map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy === 'invite'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-60"
            >
              {busy === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
              Send invite
            </button>
          </form>
          <p className="mt-2 text-xs text-ink-secondary">{ROLE_DESCRIPTIONS[role]}</p>

          {inviteLink && (
            <div className="mt-4 rounded-lg border border-line-subtle bg-bg-secondary p-3">
              <p className="text-sm text-ink-primary">
                {inviteLink.emailed
                  ? 'Invitation sent by email. The link is also here if you want to pass it on directly.'
                  : 'Email is not configured, so send this link yourself. It expires in seven days.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  readOnly
                  value={inviteLink.link}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 font-mono text-xs text-ink-primary"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink.link).catch(() => undefined);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-line-subtle px-3 py-2 text-sm"
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink-primary">
          People {users.length > 0 && <span className="text-ink-secondary">({users.length})</span>}
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-ink-secondary">Loading…</p>
        ) : users.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line-subtle bg-bg-primary px-4 py-6 text-sm text-ink-secondary">
            Nobody has accepted an invitation yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 rounded-lg border border-line-subtle bg-bg-primary p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {user.name || user.email}
                    {!user.active && (
                      <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">deactivated</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-secondary">
                    {user.email} · last signed in {when(user.lastLoginAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={user.role}
                    disabled={busy === user.id || user.id === viewer?.userId}
                    onChange={(e) => void updateUser(user.id, { role: e.target.value as Role })}
                    className="rounded-lg border border-line-subtle bg-bg-primary px-2.5 py-1.5 text-sm text-ink-primary disabled:opacity-60"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy === user.id || user.id === viewer?.userId}
                    onClick={() => void updateUser(user.id, { active: !user.active })}
                    className="rounded-lg border border-line-subtle px-2.5 py-1.5 text-sm text-ink-secondary disabled:opacity-40"
                  >
                    {user.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-primary">Pending invitations ({pending.length})</h2>
          <ul className="mt-3 space-y-2">
            {pending.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-2 rounded-lg border border-line-subtle bg-bg-primary p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-primary">{invitation.email}</p>
                  <p className="text-xs text-ink-secondary">
                    {ROLE_LABELS[invitation.role]} · expires {when(invitation.expiresAt)}
                    {invitation.invitedByEmail ? ` · invited by ${invitation.invitedByEmail}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === invitation.id}
                  onClick={() => void revoke(invitation.id)}
                  className="w-fit rounded-lg border border-line-subtle px-2.5 py-1.5 text-sm text-ink-secondary disabled:opacity-40"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
