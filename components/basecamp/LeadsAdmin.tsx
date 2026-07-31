'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Mail,
  RefreshCw,
  Search,
  Target,
  CalendarDays,
  Users,
  X,
} from 'lucide-react';
import { LEAD_STATUSES, type Lead, type LeadStatus, type LeadUpdate } from '@/lib/leads/types';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  active: 'Active',
  won: 'Won',
  lost: 'Lost',
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  qualified: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  proposal: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  active: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  won: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  lost: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

export function LeadsAdmin() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LeadStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/leads', { cache: 'no-store' });
      if (response.status === 401) {
        router.push('/basecamp/login');
        return;
      }
      const result = (await response.json()) as { leads?: Lead[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to load leads.');
      setLeads(result.leads || []);
      setSelected((current) =>
        current ? (result.leads || []).find((lead) => lead.id === current.id) || null : null,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load leads.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesStatus = status === 'all' || lead.status === status;
      const haystack = `${lead.name} ${lead.email} ${lead.company || ''} ${lead.workType} ${lead.audience || ''} ${lead.leadSource || ''} ${lead.utmCampaign || ''}`.toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [leads, query, status]);

  const openLeads = leads.filter((lead) => !['won', 'lost'].includes(lead.status));
  const today = new Date().toDateString();
  const leadsToday = leads.filter((lead) => new Date(lead.createdAt).toDateString() === today).length;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const leadsThisWeek = leads.filter((lead) => new Date(lead.createdAt) >= weekStart).length;
  const qualifiedLeads = leads.filter((lead) => !['new', 'lost'].includes(lead.status)).length;
  const pipelineValue = openLeads.reduce((total, lead) => total + (lead.estimatedValue || 0), 0);
  const dueActions = openLeads.filter(
    (lead) => lead.nextActionAt && new Date(lead.nextActionAt) <= new Date(),
  ).length;

  async function saveLead(id: string, update: LeadUpdate) {
    const response = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    const result = (await response.json()) as { lead?: Lead; error?: string };
    if (!response.ok || !result.lead) throw new Error(result.error || 'Unable to save lead.');
    setLeads((current) => current.map((lead) => (lead.id === id ? result.lead! : lead)));
    setSelected(result.lead);
  }

  return (
    <section>
      <div>
        <div className="flex flex-col gap-5 border-b border-line-subtle pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Contact submissions</span>
            <h1 className="mt-4 text-3xl md:text-4xl">Request pipeline</h1>
            <p className="mt-2 text-sm text-ink-secondary">
              Intake, attribution, qualification, ownership, and follow-up in one view.
            </p>
          </div>
          <IconButton label="Refresh submissions" onClick={() => void load()}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          </IconButton>
        </div>

        <div className="grid grid-cols-2 border-x border-b border-line-subtle lg:grid-cols-3 xl:grid-cols-6">
          <Metric icon={Target} label="Inbound today" value={`${leadsToday} / 10`} />
          <Metric icon={CalendarDays} label="Last 7 days" value={String(leadsThisWeek)} />
          <Metric icon={Users} label="Open requests" value={String(openLeads.length)} />
          <Metric icon={CircleDollarSign} label="Open pipeline" value={formatCurrency(pipelineValue)} />
          <Metric icon={CalendarClock} label="Actions due" value={String(dueActions)} alert={dueActions > 0} />
          <Metric
            icon={ArrowUpRight}
            label="Qualified or further"
            value={formatPercent(qualifiedLeads, leads.length)}
          />
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Filter by status">
            {(['all', ...LEAD_STATUSES] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
                  status === item
                    ? 'bg-ink-primary text-bg-primary'
                    : 'text-ink-secondary hover:bg-bg-tertiary hover:text-ink-primary',
                )}
              >
                {item === 'all' ? 'All' : STATUS_LABELS[item]}
              </button>
            ))}
          </div>
          <label className="relative block w-full md:w-72">
            <span className="sr-only">Search leads</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, email, campaign"
              className="w-full rounded-lg border border-line-subtle bg-bg-primary py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            />
          </label>
        </div>

        {error && <p className="mt-5 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 overflow-hidden rounded-xl border border-line-subtle bg-bg-primary">
          <div className="hidden grid-cols-[1.35fr_1.2fr_.8fr_.7fr_.8fr] gap-4 border-b border-line-subtle bg-bg-tertiary px-5 py-3 text-[0.6875rem] font-mono uppercase tracking-[0.12em] text-ink-muted lg:grid">
            <span>Prospect</span><span>Request</span><span>Source</span><span>Value</span><span>Status</span>
          </div>
          {loading && !leads.length ? (
            <div className="p-12 text-center text-sm text-ink-muted">Loading requests...</div>
          ) : filtered.length ? (
            filtered.map((lead) => (
              <button
                type="button"
                key={lead.id}
                onClick={() => setSelected(lead)}
                className="grid w-full gap-3 border-b border-line-subtle px-5 py-4 text-left transition last:border-b-0 hover:bg-bg-secondary lg:grid-cols-[1.35fr_1.2fr_.8fr_.7fr_.8fr] lg:items-center lg:gap-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink-primary">{lead.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{lead.company || lead.email}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink-primary">{lead.workType}</span>
                  <span className="block text-xs text-ink-muted">{relativeDate(lead.createdAt)}</span>
                </span>
                <span className="text-sm text-ink-secondary">{lead.utmCampaign || lead.utmSource || 'Direct'}</span>
                <span className="text-sm font-semibold text-ink-primary">{formatCurrency(lead.estimatedValue || 0)}</span>
                <span className={cn('w-fit rounded-md px-2.5 py-1 text-xs font-semibold', STATUS_STYLE[lead.status])}>
                  {STATUS_LABELS[lead.status]}
                </span>
              </button>
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="font-semibold text-ink-primary">No requests in this view</p>
              <p className="mt-1 text-sm text-ink-muted">New website submissions will appear here automatically.</p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <LeadPanel
          lead={selected}
          onClose={() => setSelected(null)}
          onSave={(update) => saveLead(selected.id, update)}
        />
      )}
    </section>
  );
}

function LeadPanel({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (update: LeadUpdate) => Promise<void> }) {
  const [draft, setDraft] = useState<LeadUpdate>({
    status: lead.status,
    owner: lead.owner || '',
    nextActionAt: lead.nextActionAt?.slice(0, 10) || '',
    estimatedValue: lead.estimatedValue || 0,
    notes: lead.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft({
      status: lead.status,
      owner: lead.owner || '',
      nextActionAt: lead.nextActionAt?.slice(0, 10) || '',
      estimatedValue: lead.estimatedValue || 0,
      notes: lead.notes || '',
    });
  }, [lead]);

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Lead details for ${lead.name}`}>
      <button type="button" aria-label="Close lead details" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-line-subtle bg-bg-primary shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-subtle bg-bg-primary/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">Request {lead.id.slice(0, 8).toUpperCase()}</div>
            <h2 className="mt-1 text-xl">{lead.name}</h2>
          </div>
          <IconButton label="Close" onClick={onClose}><X className="h-4 w-4" aria-hidden /></IconButton>
        </div>

        <div className="space-y-8 p-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <Detail label="Email"><a className="inline-flex items-center gap-1.5 text-accent-primary hover:underline" href={`mailto:${lead.email}`}><Mail className="h-3.5 w-3.5" />{lead.email}</a></Detail>
            <Detail label="Company">{lead.company || 'Not provided'}</Detail>
            <Detail label="Phone">{lead.phone || 'Not provided'}</Detail>
            <Detail label="Timeline">{lead.timeline || 'Not provided'}</Detail>
            <Detail label="Audience">{lead.audience || 'Not provided'}</Detail>
            <Detail label="AI stage">{lead.adoptionStage || 'Not provided'}</Detail>
            <Detail label="Capture method">{lead.leadSource || 'Website form'}</Detail>
            <Detail label="Source">{lead.utmCampaign || lead.utmSource || lead.landingPage || lead.sourcePath || 'Direct'}</Detail>
          </section>

          <section>
            <div className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">Work requested</div>
            <h3 className="mt-2 text-lg">{lead.workType}</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">{lead.details}</p>
          </section>

          <section className="grid gap-4 border-y border-line-subtle py-6 sm:grid-cols-2">
            <WorkspaceField label="Stage">
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as LeadStatus })} className="workspace-input">
                {LEAD_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
              </select>
            </WorkspaceField>
            <WorkspaceField label="Owner">
              <input value={draft.owner || ''} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} className="workspace-input" placeholder="Name" />
            </WorkspaceField>
            <WorkspaceField label="Next action">
              <input type="date" value={draft.nextActionAt || ''} onChange={(event) => setDraft({ ...draft, nextActionAt: event.target.value })} className="workspace-input" />
            </WorkspaceField>
            <WorkspaceField label="Estimated value (USD)">
              <input type="number" min="0" step="100" value={draft.estimatedValue || 0} onChange={(event) => setDraft({ ...draft, estimatedValue: Number(event.target.value) })} className="workspace-input" />
            </WorkspaceField>
          </section>

          <WorkspaceField label="Internal notes">
            <textarea value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={7} className="workspace-input resize-y" placeholder="Qualification notes, objections, decision criteria, and next steps" />
          </WorkspaceField>

          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button type="button" disabled={saving} onClick={() => void submit()} className="w-full rounded-xl bg-ink-primary px-5 py-3.5 font-semibold text-bg-primary transition hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save lead'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Metric({ icon: Icon, label, value, alert = false }: { icon: typeof Users; label: string; value: string; alert?: boolean }) {
  return (
    <div className="min-w-0 border-b border-r border-line-subtle p-5 xl:border-b-0 xl:last:border-r-0">
      <div className="flex items-center gap-2 text-xs text-ink-muted"><Icon className="h-4 w-4" aria-hidden />{label}</div>
      <div className={cn('mt-3 truncate font-display text-2xl', alert ? 'text-rose-500' : 'text-ink-primary')}>{value}</div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-muted">{label}</div><div className="mt-1 text-sm text-ink-primary">{children}</div></div>;
}

function WorkspaceField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-ink-primary"><span className="mb-2 block">{label}</span>{children}</label>;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-subtle bg-bg-primary text-ink-secondary transition hover:bg-bg-tertiary hover:text-ink-primary">{children}</button>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(won: number, closed: number) {
  return closed ? `${Math.round((won / closed) * 100)}%` : '0%';
}

function relativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
