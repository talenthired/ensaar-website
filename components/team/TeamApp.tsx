'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ExternalLink, FileText, Loader2, LogOut, MailCheck, PenLine, ShieldAlert } from 'lucide-react';
import type { EmploymentDocument } from '@/lib/eor/employment-docs';
import { HOLIDAY_COUNTRIES, HOLIDAY_PLAN_LABELS, isWeekend, type Holiday, type HolidayPlanStatus } from '@/lib/eor/holidays';
import { formatDay, formatInr, signatureMatches } from '@/lib/eor/onboarding';
import type { SalaryLine } from '@/lib/eor/salary';
import { REGIMES, compareRegimes, readDeclarations, type Regime, type TaxDeclarations, type TaxEstimate } from '@/lib/eor/tax';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Badge, Notice, Tabs, buttonClass, inputClass, primaryButtonClass, useQueryState } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { YourDetails, type Records } from './YourDetails';

type DocSummary = { id: string; kind: 'offer' | 'agreement'; status: 'sent' | 'signed' | 'void'; hash: string; issuedAt: string; signedAt: string | null };
type Me = {
  employee: { name: string; knownAs: string; email: string; jobTitle: string; companyName: string | null; startDate: string; workState: string; status: string };
  documents: DocSummary[];
  records: Records;
  pay: { salaryInr: number; breakup: { lines: SalaryLine[]; gross: SalaryLine } };
  tax: { taxYear: string; regime: Regime; declarations: TaxDeclarations; updatedAt: string | null; fields: Array<{ key: keyof TaxDeclarations; label: string; hint: string; kind: 'amount' | 'flag' }> };
  holidays: {
    year: number;
    catalogue: Holiday[];
    allowed: number;
    perYear: number;
    from: string;
    plan: { chosen: string[]; status: HolidayPlanStatus; note: string | null; proposedName: string | null; decidedRole: 'client' | 'ensaar' | null; decidedAt: string | null };
    chosen: Holiday[];
  };
};

const DOC_LABEL = { offer: 'Offer letter', agreement: 'Employment agreement' } as const;
type Say = (kind: 'ok' | 'error', text: string) => void;

async function apiError(response: Response, fallback: string) {
  if (response.status === 401) return 'Your session ended. Reload the page to sign in again.';
  return ((await response.json().catch(() => ({}))) as { error?: string }).error || fallback;
}

export function TeamBar({ email, onSignOut }: { email?: string; onSignOut?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle border-t-[3px] border-t-accent-primary bg-bg-primary/95 backdrop-blur print:hidden">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/team" className="flex min-w-0 items-center gap-3" aria-label="Employee portal home">
          <Image src="/ensaar-logo.png" alt="Ensaar Global" width={938} height={259} priority className="h-7 w-auto shrink-0" />
          <span className="truncate border-l border-line-subtle pl-3 text-sm font-semibold text-ink-primary">Employee portal</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {email && <span className="hidden text-xs text-ink-secondary md:inline">{email}</span>}
          <ThemeToggle />
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-secondary hover:bg-bg-tertiary hover:text-ink-primary">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/** Email in, one-time link out. The answer is the same whether or not the address is known. */
export function TeamSignIn({ notice }: { notice?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'sent' | 'error'; text?: string }>({ kind: 'idle' });
  return (
    <div className="min-h-screen bg-bg-secondary">
      <TeamBar />
      <div className="container-page flex min-h-[calc(100vh-4.25rem)] items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-line-subtle bg-bg-primary p-8">
          <span className="eyebrow">Ensaar employee portal</span>
          <h1 className="mt-3 text-2xl font-semibold text-ink-primary">Sign in</h1>
          <p className="mt-2 text-sm text-ink-secondary">Your offer letter and employment agreement, your pay and tax, and your holidays. We email you a one-time sign-in link; there is no password.</p>
          {notice && (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {notice}
            </p>
          )}
          {state.kind === 'sent' ? (
            <p role="status" className="mt-6 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {state.text}
            </p>
          ) : (
            <form
              className="mt-6 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setState({ kind: 'busy' });
                const response = await fetch('/api/team/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
                const json = await response.json().catch(() => ({}));
                setState(response.ok ? { kind: 'sent', text: json.message } : { kind: 'error', text: json.error || 'Please try again.' });
              }}
            >
              <label htmlFor="team-email" className="block text-sm font-medium text-ink-primary">Your email address</label>
              <input id="team-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              {state.kind === 'error' && <p className="text-sm text-red-600">{state.text}</p>}
              <button type="submit" disabled={state.kind === 'busy'} className={`${primaryButtonClass} w-full py-2.5`}>
                {state.kind === 'busy' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Email me a sign-in link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** The landing page for a sign-in link: exchange the token in the fragment for a session. */
export function TeamAuth() {
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    const token = window.location.hash.replace(/^#/, '');
    window.history.replaceState(null, '', window.location.pathname);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return setFailed('That sign-in link is incomplete. Request a new one below.');
    (async () => {
      const response = await fetch('/api/team/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
      if (response.ok) return window.location.replace('/team');
      setFailed((await response.json().catch(() => ({}))).error || 'That sign-in link has expired. Request a new one below.');
    })();
  }, []);
  if (failed) return <TeamSignIn notice={failed} />;
  return (
    <div className="min-h-screen bg-bg-secondary">
      <TeamBar />
      <p className="flex items-center justify-center gap-2 py-24 text-sm text-ink-secondary" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Signing you in…
      </p>
    </div>
  );
}

/** The employee portal. */
export function TeamApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useQueryState({ tab: 'documents', year: '' });

  const say: Say = useCallback((kind, text) => {
    setNotice({ kind, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const load = useCallback(async () => {
    const response = await fetch(`/api/team/me${query.year ? `?year=${query.year}` : ''}`, { cache: 'no-store' });
    if (response.status === 401) return setSignedOut(true);
    if (!response.ok) return setNotice({ kind: 'error', text: 'Unable to load the portal. Reload to try again.' });
    setMe(await response.json());
  }, [query.year]);

  useEffect(() => {
    void load();
  }, [load]);

  if (signedOut) return <TeamSignIn />;
  if (!me) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <TeamBar />
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-ink-secondary" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
        </p>
      </div>
    );
  }

  const toSign = me.documents.filter((d) => d.status === 'sent').length;
  const e = me.employee;
  return (
    <div className="min-h-screen bg-bg-secondary">
      <TeamBar
        email={e.email}
        onSignOut={async () => {
          await fetch('/api/team/session', { method: 'DELETE' });
          setSignedOut(true);
        }}
      />
      <main className="container-page space-y-6 pt-8 pb-16">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">Hi {e.knownAs.split(/\s+/)[0]}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {e.jobTitle}
            {e.companyName ? ` for ${e.companyName}` : ''}, employed by Ensaar · starts {formatDay(e.startDate)} · {e.workState}, India
          </p>
        </div>
        <div aria-live="polite">{notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}</div>
        <Tabs
          value={query.tab}
          onChange={(tab) => setQuery({ tab })}
          tabs={[
            { key: 'documents', label: 'Documents', count: toSign },
            { key: 'details', label: 'Your details', count: me.records.outstanding.needed.length },
            { key: 'tax', label: 'Pay and tax' },
            { key: 'holidays', label: 'Holidays' },
          ]}
        />
        {query.tab === 'documents' && <Documents me={me} say={say} onChanged={load} />}
        {query.tab === 'details' && <YourDetails records={me.records} legalName={e.name} say={say} onChanged={(records) => setMe({ ...me, records })} />}
        {query.tab === 'tax' && <PayAndTax me={me} say={say} onSaved={load} />}
        {query.tab === 'holidays' && <Holidays me={me} say={say} onChanged={load} onYear={(year) => setQuery({ year: String(year) })} />}
      </main>
    </div>
  );
}

// --- Documents ---------------------------------------------------------------------------------

function Documents({ me, say, onChanged }: { me: Me; say: Say; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState<string | null>(me.documents.find((d) => d.status === 'sent')?.id ?? null);
  if (me.documents.length === 0) {
    return <p className="rounded-xl border border-dashed border-line-subtle bg-bg-primary p-6 text-sm text-ink-secondary">Ensaar has not issued your documents yet. We will email you when they are ready to sign.</p>;
  }
  return (
    <ul className="space-y-3">
      {me.documents.map((d) => (
        <li key={d.id} className="rounded-xl border border-line-subtle bg-bg-primary">
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ink-secondary" aria-hidden />
              <span className="font-medium text-ink-primary">{DOC_LABEL[d.kind]}</span>
              {d.status === 'signed' ? <Badge tone="good">Signed {formatDay(d.signedAt!)}</Badge> : <Badge tone="attention">Ready to sign</Badge>}
            </span>
            <span className="flex gap-2">
              <a href={`/api/team/documents/${d.id}`} target="_blank" rel="noopener" className={cn(buttonClass, 'px-3 py-1.5')}>
                <ExternalLink className="h-4 w-4" aria-hidden /> {d.status === 'signed' ? 'Signed copy' : 'Printable copy'}
              </a>
              {d.status === 'sent' && (
                <button type="button" className={cn(primaryButtonClass, 'px-3 py-1.5')} onClick={() => setOpen(open === d.id ? null : d.id)}>
                  <PenLine className="h-4 w-4" aria-hidden /> Read and sign
                </button>
              )}
            </span>
          </div>
          {open === d.id && d.status === 'sent' && <SignDocument doc={d} name={me.employee.name} say={say} onSigned={onChanged} />}
        </li>
      ))}
    </ul>
  );
}

function SignDocument({ doc, name, say, onSigned }: { doc: DocSummary; name: string; say: Say; onSigned: () => Promise<void> }) {
  const [content, setContent] = useState<EmploymentDocument | null>(null);
  const [typed, setTyped] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/team/documents/${doc.id}?format=json`, { cache: 'no-store' });
      if (!response.ok) return say('error', await apiError(response, 'Unable to load the document.'));
      setContent((await response.json()).document);
    })();
  }, [doc.id, say]);
  if (!content) return <p className="border-t border-line-subtle p-4 text-sm text-ink-secondary">Loading…</p>;
  return (
    <div className="space-y-4 border-t border-line-subtle p-4">
      <article className="max-h-[32rem] overflow-y-auto rounded-lg border border-line-subtle bg-bg-secondary p-5 text-sm leading-relaxed text-ink-primary">
        <h2 className="text-lg font-semibold">{content.title}</h2>
        {content.preamble.map((l) => <p key={l} className="mt-1">{l}</p>)}
        {[...content.sections, ...content.annexures.flatMap((a) => [{ heading: a.title, paragraphs: [] as string[] }, ...a.sections])].map((s, i) => (
          <section key={i} className="mt-4">
            {s.heading && <h3 className="font-semibold">{s.heading}</h3>}
            {s.paragraphs.map((p, j) => <p key={j} className="mt-1">{p}</p>)}
            {'list' in s && s.list && <ul className="mt-1 list-disc pl-5">{s.list.map((l) => <li key={l}>{l}</li>)}</ul>}
            {'table' in s && s.table && (
              <table className="mt-2 w-full text-left text-xs">
                <tbody>
                  {[...s.table.rows, ...(s.table.foot ? [s.table.foot] : [])].map((r, k) => (
                    <tr key={k} className="border-b border-line-subtle">{r.map((c, m) => <td key={m} className={cn('py-1 pr-3', m && 'text-right')}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </article>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            const response = await fetch(`/api/team/documents/${doc.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: typed, consent, hash: doc.hash }) });
            if (!response.ok) throw new Error(await apiError(response, 'Unable to sign.'));
            say('ok', `${DOC_LABEL[doc.kind]} signed. A copy is on its way to your email.`);
            await onSigned();
          } catch (cause) {
            setConsent(false);
            say('error', cause instanceof Error ? cause.message : 'Unable to sign.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink-primary">Type your legal name, {name}, to sign</span>
          <input id="sign-name" className={cn(inputClass, 'font-serif text-lg italic')} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} autoComplete="off" />
        </label>
        <label className="flex items-start gap-3 text-sm text-ink-primary">
          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I have read this {DOC_LABEL[doc.kind].toLowerCase()}, I accept it, and I agree to sign it electronically.</span>
        </label>
        <button type="submit" disabled={busy || !consent || !signatureMatches(typed, name)} className={primaryButtonClass}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Sign {DOC_LABEL[doc.kind].toLowerCase()}
        </button>
      </form>
    </div>
  );
}

// --- Pay and tax ------------------------------------------------------------------------------

function EstimateCard({ t, chosen, lower }: { t: TaxEstimate; chosen: boolean; lower: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-bg-primary p-4', chosen ? 'border-ink-primary' : 'border-line-subtle')}>
      <p className="flex items-center justify-between gap-2 text-sm font-semibold text-ink-primary">
        {t.regime === 'new' ? 'New regime' : 'Old regime'}
        <span className="flex gap-1">
          {lower && <Badge tone="good">Lower tax</Badge>}
          {chosen && <Badge tone="attention">Your choice</Badge>}
        </span>
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        {[
          ['Taxable income', formatInr(t.taxableIncome)],
          ['Tax for the year (incl. cess)', formatInr(t.totalTax)],
          ['Monthly TDS', formatInr(t.monthlyTds)],
          ['Monthly take-home, estimated', formatInr(t.monthlyTakeHome)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="text-ink-secondary">{k}</dt><dd className="font-medium text-ink-primary">{v}</dd></div>
        ))}
      </dl>
      {[...t.exemptions, ...t.deductions].length > 0 && (
        <details className="mt-3 text-xs text-ink-secondary">
          <summary className="cursor-pointer">Exemptions and deductions</summary>
          <ul className="mt-1 space-y-0.5">
            {[...t.exemptions, ...t.deductions].map((l) => <li key={l.label}>{l.label}: {formatInr(l.amount)}{l.note ? ` (${l.note})` : ''}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

function PayAndTax({ me, say, onSaved }: { me: Me; say: Say; onSaved: () => Promise<void> }) {
  const [regime, setRegime] = useState<Regime>(me.tax.regime);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => Object.fromEntries(me.tax.fields.map((f) => [f.key, f.kind === 'flag' ? Boolean(me.tax.declarations[f.key]) : me.tax.declarations[f.key] ? String(me.tax.declarations[f.key]) : ''])));
  const [busy, setBusy] = useState(false);
  // Worked out as they type, with the same rules the server uses.
  const comparison = useMemo(() => compareRegimes({ annualGross: me.pay.salaryInr, workState: me.employee.workState, declarations: readDeclarations(form) }), [form, me.pay.salaryInr, me.employee.workState]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
        <h2 className="text-sm font-semibold text-ink-primary">Your salary</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-ink-secondary"><tr><th className="py-1">Component</th><th className="py-1 text-right">Monthly</th><th className="py-1 text-right">Annual</th></tr></thead>
          <tbody>
            {[...me.pay.breakup.lines, me.pay.breakup.gross].map((l, i, all) => (
              <tr key={l.label} className={cn('border-t border-line-subtle', i === all.length - 1 && 'font-semibold')}>
                <td className="py-1.5">{l.label}</td><td className="py-1.5 text-right">{formatInr(l.monthly)}</td><td className="py-1.5 text-right">{formatInr(l.annual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-secondary">Provident fund is not currently deducted: Ensaar does not yet operate it, and will tell you before that changes.</p>
      </section>

      <section className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink-primary">Income tax for {me.tax.taxYear}</h2>
          <p className="mt-1 text-xs text-ink-secondary">
            The new regime applies unless you choose the old one. The old regime lets you deduct the investments and payments you declare below; keep
            the proofs, as Ensaar will ask for them before the year ends. These are estimates on your salary alone.
          </p>
        </div>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="sr-only">Tax regime</legend>
          {REGIMES.map(([value, label]) => (
            <label key={value} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', regime === value ? 'border-ink-primary' : 'border-line-subtle')}>
              <input type="radio" name="regime" value={value} checked={regime === value} onChange={() => setRegime(value)} /> {label}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-3 md:grid-cols-2">
          <EstimateCard t={comparison.new} chosen={regime === 'new'} lower={comparison.lower === 'new' && comparison.saving > 0} />
          <EstimateCard t={comparison.old} chosen={regime === 'old'} lower={comparison.lower === 'old' && comparison.saving > 0} />
        </div>
        {comparison.saving > 0 && comparison.lower !== regime && (
          <Notice kind="warn">The {comparison.lower} regime would cost you {formatInr(comparison.saving)} less this year on these figures.</Notice>
        )}
        {regime === 'old' && (
          <fieldset className="grid gap-4 border-t border-line-subtle pt-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-ink-primary">Your declarations (old regime)</legend>
            {me.tax.fields.map((f) =>
              f.kind === 'flag' ? (
                <label key={f.key} className="flex items-start gap-3 text-sm text-ink-primary sm:col-span-2">
                  <input id={`tax-${f.key}`} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={Boolean(form[f.key])} onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.checked }))} />
                  <span>{f.label}{f.hint && <span className="block text-xs text-ink-secondary">{f.hint}</span>}</span>
                </label>
              ) : (
                <label key={f.key} className="block text-sm">
                  <span className="mb-1 block text-ink-primary">{f.label}</span>
                  <input id={`tax-${f.key}`} inputMode="numeric" className={inputClass} value={String(form[f.key] ?? '')} onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))} placeholder="0" />
                  <span className="mt-1 block text-xs text-ink-secondary">{f.hint}</span>
                </label>
              ),
            )}
          </fieldset>
        )}
        <button
          type="button"
          disabled={busy}
          className={primaryButtonClass}
          onClick={async () => {
            setBusy(true);
            try {
              const response = await fetch('/api/team/tax', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ regime, declarations: form }) });
              if (!response.ok) throw new Error(await apiError(response, 'Unable to save.'));
              say('ok', `Saved: the ${regime} regime${regime === 'old' ? ' with your declarations' : ''}. Payroll uses this from the next month.`);
              await onSaved();
            } catch (cause) {
              say('error', cause instanceof Error ? cause.message : 'Unable to save.');
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save my tax choice
        </button>
        {me.tax.updatedAt && <p className="text-xs text-ink-secondary">Last saved {new Date(me.tax.updatedAt).toLocaleString()}.</p>}
      </section>
    </div>
  );
}

// --- Holidays ---------------------------------------------------------------------------------

function Holidays({ me, say, onChanged, onYear }: { me: Me; say: Say; onChanged: () => Promise<void>; onYear: (year: number) => void }) {
  const { year, catalogue, allowed, plan } = me.holidays;
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(plan.chosen));
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => setChosen(new Set(plan.chosen)), [plan.chosen]);
  const thisYear = new Date().getFullYear();
  const national = catalogue.filter((h) => h.mandatory);
  const optional = catalogue.filter((h) => !h.mandatory);
  const client = me.employee.companyName ?? 'your client';
  // One calendar per client: fixed while the client reviews it, and once approved.
  const locked = plan.status === 'submitted' || plan.status === 'approved';
  const decider = plan.decidedRole === 'ensaar' ? 'Ensaar' : client;

  async function save(submit: boolean) {
    setBusy(submit ? 'submit' : 'save');
    try {
      const response = await fetch('/api/team/holidays', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ year, chosen: [...chosen], submit }) });
      if (!response.ok) throw new Error(await apiError(response, 'Unable to save.'));
      say('ok', submit ? `Sent to ${client} for approval. Everyone is emailed once it is approved.` : 'Saved as a draft. Your colleagues see it too; submit it when it is ready.');
      await onChanged();
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Year">
          {[thisYear, thisYear + 1].map((y) => (
            <button key={y} type="button" aria-pressed={y === year} onClick={() => onYear(y)} className={cn('rounded-lg px-3 py-1.5 text-sm', y === year ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary')}>
              {y}
            </button>
          ))}
        </div>
        <Badge tone={plan.status === 'approved' ? 'good' : plan.status === 'rejected' ? 'bad' : plan.status === 'submitted' ? 'info' : 'neutral'}>{HOLIDAY_PLAN_LABELS[plan.status]}</Badge>
      </div>
      {plan.status === 'rejected' && plan.note && <Notice kind="warn">{decider} asked for a change: {plan.note}</Notice>}
      {plan.status === 'approved' && <Notice kind="ok">Approved by {decider}{plan.note ? `: ${plan.note}` : '.'} These are the {year} holidays for everyone at {client}; if something needs to change, ask Ensaar.</Notice>}
      {plan.status === 'submitted' && <p className="rounded-lg border border-line-subtle bg-bg-primary px-4 py-3 text-sm text-ink-secondary">{plan.proposedName ?? 'A colleague'} sent this calendar to {client} for approval. You will be emailed when it is decided.</p>}
      {plan.status === 'draft' && plan.proposedName && <p className="rounded-lg border border-line-subtle bg-bg-primary px-4 py-3 text-sm text-ink-secondary">{plan.proposedName} started this calendar. Change it if you need to, then submit it.</p>}
      <p className="text-sm text-ink-secondary">
        Everyone Ensaar employs for {client} has the same {me.holidays.perYear} paid holidays in {year}: India&apos;s {national.length} national holidays, and {allowed} chosen
        once for the whole team from India&apos;s festival holidays and {HOLIDAY_COUNTRIES.US} public holidays, so days off line up with your team. One of you proposes
        the calendar and {client} approves it.
      </p>
      <section className="rounded-xl border border-line-subtle bg-bg-primary p-4">
        <h2 className="text-sm font-semibold text-ink-primary">Included for everyone</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-3">{national.map((h) => <li key={h.id} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" aria-hidden /> {h.name}, {formatDay(h.date)}</li>)}</ul>
      </section>
      {locked ? (
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-4">
          <h2 className="text-sm font-semibold text-ink-primary">{plan.status === 'approved' ? "Your team's holidays" : 'Proposed holidays'}</h2>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {me.holidays.chosen.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden /> {h.name}, {formatDay(h.date)}
                <Badge tone={h.country === 'IN' ? 'info' : 'attention'}>{h.country === 'IN' ? 'India' : 'US'}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : (
      <>
      <section className="rounded-xl border border-line-subtle bg-bg-primary p-4">
        <h2 className="flex items-center justify-between text-sm font-semibold text-ink-primary">
          Choose {allowed} <span className={cn('text-xs font-normal', chosen.size > allowed ? 'text-red-600' : 'text-ink-secondary')}>{chosen.size} of {allowed} chosen</span>
        </h2>
        {optional.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">The {year} list is not ready yet. Ensaar will email you when it is.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line-subtle">
            {optional.map((h) => {
              const weekend = isWeekend(h.date);
              // Already chosen stays chosen; a new pick has to be today or later.
              const gone = h.date < me.holidays.from && !plan.chosen.includes(h.id);
              return (
                <li key={h.id}>
                  <label className={cn('flex items-center gap-3 py-2 text-sm', (weekend || gone) && 'opacity-60')}>
                    <input
                      type="checkbox"
                      aria-label={h.name}
                      disabled={weekend || gone}
                      checked={chosen.has(h.id)}
                      onChange={(e) => setChosen((s) => { const next = new Set(s); if (e.target.checked) next.add(h.id); else next.delete(h.id); return next; })}
                    />
                    <CalendarDays className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden />
                    <span className="min-w-0 flex-1">{h.name}</span>
                    <span className="shrink-0 text-xs text-ink-secondary">{formatDay(h.date)}{weekend ? ' · weekend' : gone ? ' · passed' : ''}</span>
                    <Badge tone={h.country === 'IN' ? 'info' : 'attention'}>{h.country === 'IN' ? 'India' : 'US'}</Badge>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null || chosen.size === 0 || chosen.size > allowed} onClick={() => void save(true)} className={primaryButtonClass}>
          {busy === 'submit' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Submit for approval
        </button>
        <button type="button" disabled={busy !== null || chosen.size > allowed} onClick={() => void save(false)} className={buttonClass}>
          {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save without submitting
        </button>
      </div>
      </>
      )}
    </div>
  );
}
