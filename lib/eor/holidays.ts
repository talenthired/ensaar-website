import { formatDay } from './onboarding';

/**
 * Public holidays an employee can take. Shared by the employee portal, the
 * client portal (which approves the choice), Basecamp (which can override it)
 * and the server (which checks every choice).
 *
 * Each employee gets HOLIDAYS_PER_YEAR paid holidays a year. India's three
 * national holidays are fixed and always included; the rest the employee
 * chooses from India's festival holidays (which Ensaar loads into the holiday
 * calendar each year from the official list, because their dates move with the
 * lunar calendar) and the public holidays of the client's country, so their
 * days off can line up with the team they work with.
 *
 * Client countries: the United States today (every client is a US company).
 * Another country needs its own rules here before a client from it signs.
 */

export const HOLIDAYS_PER_YEAR = 10;

export const HOLIDAY_COUNTRIES = { IN: 'India', US: 'United States' } as const;
export type HolidayCountry = keyof typeof HOLIDAY_COUNTRIES;

export type Holiday = {
  /** Stable for a given country, date and name: what a choice refers to. */
  id: string;
  country: HolidayCountry;
  /** YYYY-MM-DD. */
  date: string;
  name: string;
  /** India's national holidays: everyone has them, nobody chooses them. */
  mandatory: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const holidayId = (country: HolidayCountry, date: string, name: string) => `${country}-${date}-${slug(name)}`;

/** 0 = Sunday. */
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
export const isWeekend = (date: string) => [0, 6].includes(weekday(date));

/** The nth given weekday of a month (n = -1 for the last). */
function nthWeekday(year: number, month: number, dow: number, n: number): string {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    return iso(year, month, 1 + ((dow - first + 7) % 7) + (n - 1) * 7);
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  return iso(year, month, lastDay - ((last - dow + 7) % 7));
}

/** A fixed-date US holiday on a weekend is observed on the Friday before or the Monday after. */
function observed(date: string): string {
  const day = weekday(date);
  const shift = day === 6 ? -1 : day === 0 ? 1 : 0;
  return new Date(Date.parse(`${date}T00:00:00Z`) + shift * 86_400_000).toISOString().slice(0, 10);
}

/** The eleven US federal holidays, on the days they are observed. */
export function usFederalHolidays(year: number): Holiday[] {
  const days: Array<[string, string]> = [
    [observed(iso(year, 1, 1)), "New Year's Day"],
    [nthWeekday(year, 1, 1, 3), 'Martin Luther King Jr. Day'],
    [nthWeekday(year, 2, 1, 3), "Washington's Birthday (Presidents' Day)"],
    [nthWeekday(year, 5, 1, -1), 'Memorial Day'],
    [observed(iso(year, 6, 19)), 'Juneteenth'],
    [observed(iso(year, 7, 4)), 'Independence Day (United States)'],
    [nthWeekday(year, 9, 1, 1), 'Labor Day'],
    [nthWeekday(year, 10, 1, 2), 'Columbus Day'],
    [observed(iso(year, 11, 11)), 'Veterans Day'],
    [nthWeekday(year, 11, 4, 4), 'Thanksgiving Day'],
    [observed(iso(year, 12, 25)), 'Christmas Day'],
  ];
  return days
    .filter(([date]) => date.startsWith(String(year))) // New Year's Day observed on 31 December belongs to the previous year
    .map(([date, name]) => ({ id: holidayId('US', date, name), country: 'US', date, name, mandatory: false }));
}

/** India's three national holidays, the same date every year. */
export function indiaNationalHolidays(year: number): Holiday[] {
  return ([
    [iso(year, 1, 26), 'Republic Day'],
    [iso(year, 8, 15), 'Independence Day (India)'],
    [iso(year, 10, 2), 'Gandhi Jayanti'],
  ] as const).map(([date, name]) => ({ id: holidayId('IN', date, name), country: 'IN', date, name, mandatory: true }));
}

/**
 * Every holiday an employee of a client from `clientCountry` can see for a
 * year: India's national holidays, the calendar entries Ensaar has loaded (for
 * India and the client's country), and the client country's computed holidays.
 */
export function holidayCatalogue(year: number, clientCountry: HolidayCountry, calendar: Array<Pick<Holiday, 'country' | 'date' | 'name'>>): Holiday[] {
  const loaded = calendar
    .filter((h) => h.date.startsWith(String(year)) && (h.country === 'IN' || h.country === clientCountry))
    .map((h) => ({ ...h, id: holidayId(h.country, h.date, h.name), mandatory: false }));
  const computed = clientCountry === 'US' ? usFederalHolidays(year) : [];
  const seen = new Set<string>();
  return [...indiaNationalHolidays(year), ...loaded, ...computed]
    .filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.country.localeCompare(b.country));
}

/** How many holidays the employee chooses, after the national ones. */
export function choicesAllowed(catalogue: Holiday[]): number {
  return Math.max(0, HOLIDAYS_PER_YEAR - catalogue.filter((h) => h.mandatory).length);
}

/** The first day a new choice can fall on: today, or the start date for someone who has not joined yet. */
export function earliestChoice(startDate: string, today: string): string {
  return startDate > today ? startDate : today;
}

/**
 * Check a choice against the catalogue: known, optional, on a weekday, no
 * repeats, within the allowance, and not in the past. A holiday already in the
 * employee's plan stays allowed after its date, so later edits keep it.
 */
export function checkHolidayChoice(
  catalogue: Holiday[],
  chosen: unknown,
  timing?: { from: string; keep: string[] },
): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (!Array.isArray(chosen) || !chosen.every((id) => typeof id === 'string')) return { ok: false, error: 'Choose holidays from the list.' };
  const ids = [...new Set(chosen as string[])];
  const byId = new Map(catalogue.map((h) => [h.id, h]));
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length) return { ok: false, error: 'One of those holidays is no longer on the list. Reload and choose again.' };
  if (ids.some((id) => byId.get(id)!.mandatory)) return { ok: false, error: 'National holidays are already included; choose from the others.' };
  const weekend = ids.map((id) => byId.get(id)!).filter((h) => isWeekend(h.date));
  if (weekend.length) return { ok: false, error: `${weekend[0]!.name} falls on a weekend, so it would not give you a day off. Choose another.` };
  if (timing) {
    const past = ids.map((id) => byId.get(id)!).find((h) => h.date < timing.from && !timing.keep.includes(h.id));
    if (past) return { ok: false, error: `${past.name} is before ${formatDay(timing.from)} (today, or your start date if later), so it would not give you a day off. Choose another.` };
  }
  const allowed = choicesAllowed(catalogue);
  if (ids.length > allowed) return { ok: false, error: `Choose at most ${allowed} holidays.` };
  return { ok: true, ids };
}

/** Parse the bulk calendar form: one "YYYY-MM-DD, Name" per line. */
export function parseHolidayLines(text: string): { rows: Array<{ date: string; name: string }>; errors: string[] } {
  const rows: Array<{ date: string; name: string }> = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const m = /^(\d{4}-\d{2}-\d{2})\s*[,;\t]\s*(.{2,80})$/.exec(line);
    const parsed = m ? new Date(`${m[1]}T00:00:00Z`) : null;
    // An impossible date (2026-13-01, 2026-02-30) is not quietly rolled over.
    const valid = parsed && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === m![1];
    if (!m || !valid) errors.push(`Line ${i + 1}: write it as YYYY-MM-DD, Name.`);
    else rows.push({ date: m[1]!, name: m[2]!.trim() });
  });
  return { rows, errors };
}

export const HOLIDAY_PLAN_STATUSES = ['draft', 'submitted', 'approved', 'rejected'] as const;
export type HolidayPlanStatus = (typeof HOLIDAY_PLAN_STATUSES)[number];

export const HOLIDAY_PLAN_LABELS: Record<HolidayPlanStatus, string> = {
  draft: 'Not submitted',
  submitted: 'Waiting for the client to approve',
  approved: 'Approved',
  rejected: 'Changes requested',
};
