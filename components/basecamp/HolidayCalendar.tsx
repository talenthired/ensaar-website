'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { HOLIDAYS_PER_YEAR, HOLIDAY_COUNTRIES, isWeekend, type Holiday, type HolidayCountry } from '@/lib/eor/holidays';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, Notice, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

type Entry = { id: string; country: HolidayCountry; date: string; name: string; createdBy: string | null };
type Data = { year: number; calendar: Entry[]; catalogue: Holiday[]; viewer: { bootstrap: boolean } };

/**
 * The holiday list employees choose from. India's national holidays and US
 * federal holidays are built in; India's festival holidays move every year and
 * are loaded here from the official list.
 */
export function HolidayCalendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [country, setCountry] = useState<HolidayCountry>('IN');
  const [lines, setLines] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/basecamp/holidays?year=${year}`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok) return setMessage({ kind: 'error', text: json.error || 'Unable to load.' });
    setData(json);
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const entryFor = (h: Holiday) => data?.calendar.find((c) => c.country === h.country && c.date === h.date && c.name === h.name);
  const named = data ? !data.viewer.bootstrap : false;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/basecamp/employees" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Employees
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-ink-primary">Holiday calendar</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-secondary">
          Each employee has {HOLIDAYS_PER_YEAR} paid holidays a year: India&apos;s three national holidays, and the rest chosen from this list, which their client
          approves. India&apos;s national holidays and US federal holidays are built in. Load India&apos;s festival holidays for each year from the official list
          (for example the central government list, or the state list where the employee works).
        </p>
      </div>
      {message && <Notice kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Notice>}
      <div className="flex gap-1" role="group" aria-label="Year">
        {[year - 1, year, year + 1].map((y) => (
          <button key={y} type="button" aria-pressed={y === year} onClick={() => setYear(y)} className={cn('rounded-lg px-3 py-1.5 text-sm', y === year ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary')}>
            {y}
          </button>
        ))}
      </div>

      {named && (
        <form
          className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy('add');
            setMessage(null);
            const response = await fetch('/api/basecamp/holidays', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ country, lines }) });
            const json = await response.json().catch(() => ({}));
            setBusy(null);
            if (!response.ok) return setMessage({ kind: 'error', text: json.error || 'Unable to add.' });
            setLines('');
            setMessage({ kind: 'ok', text: `${json.added} holiday${json.added === 1 ? '' : 's'} added${json.skipped ? `, ${json.skipped} already on the list` : ''}.` });
            await load();
          }}
        >
          <h2 className="text-sm font-semibold text-ink-primary">Add holidays</h2>
          <label className="block max-w-xs text-sm">
            <span className="mb-1 block text-ink-secondary">Country</span>
            <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value as HolidayCountry)}>
              {Object.entries(HOLIDAY_COUNTRIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">One per line: YYYY-MM-DD, Name</span>
            <textarea id="holiday-lines" className={cn(inputClass, 'min-h-32 font-mono text-xs')} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'2027-03-22, Holi\n2027-10-29, Diwali'} />
          </label>
          <button type="submit" disabled={busy !== null || !lines.trim()} className={primaryButtonClass}>
            {busy === 'add' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Add to the {country === 'IN' ? 'India' : 'United States'} list
          </button>
        </form>
      )}

      {!data ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line-subtle bg-bg-primary">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line-subtle bg-bg-secondary text-xs uppercase tracking-wide text-ink-secondary">
              <tr><th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Holiday</th><th className="px-4 py-2.5 font-medium">Country</th><th className="px-4 py-2.5 font-medium">Source</th><th className="px-2 py-2.5" aria-label="Remove" /></tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {data.catalogue.map((h) => {
                const entry = entryFor(h);
                return (
                  <tr key={h.id}>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDay(h.date)}{isWeekend(h.date) && <span className="ml-1 text-xs text-ink-secondary">(weekend)</span>}</td>
                    <td className="px-4 py-2.5">{h.name}</td>
                    <td className="px-4 py-2.5"><Badge tone={h.country === 'IN' ? 'info' : 'attention'}>{HOLIDAY_COUNTRIES[h.country]}</Badge></td>
                    <td className="px-4 py-2.5 text-xs text-ink-secondary">{h.mandatory ? 'National holiday, for everyone' : entry ? `Loaded by ${entry.createdBy ?? 'Ensaar'}` : 'Built in'}</td>
                    <td className="px-2 py-2.5">
                      {entry && named && (
                        <button
                          type="button"
                          aria-label={`Remove ${h.name}`}
                          disabled={busy !== null}
                          className={cn(buttonClass, 'px-2 py-1 text-xs')}
                          onClick={async () => {
                            if (!window.confirm(`Remove ${h.name} (${formatDay(h.date)})? Employees who chose it will need to choose again.`)) return;
                            setBusy(entry.id);
                            const response = await fetch(`/api/basecamp/holidays/${entry.id}`, { method: 'DELETE' });
                            setBusy(null);
                            if (!response.ok) return setMessage({ kind: 'error', text: (await response.json().catch(() => ({}))).error || 'Unable to remove.' });
                            await load();
                          }}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
