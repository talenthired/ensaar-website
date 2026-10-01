import { todayInIndia } from './onboarding';

/** The holiday year asked for: this year in India by default, or the year either side of it. */
export function holidayYear(requested: string | null | undefined, now = new Date()): number {
  const current = Number(todayInIndia(now).slice(0, 4));
  const year = Number(requested);
  return Number.isInteger(year) && Math.abs(year - current) <= 1 ? year : current;
}
