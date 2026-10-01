import { describe, expect, it } from 'vitest';
import {
  HOLIDAYS_PER_YEAR,
  checkHolidayChoice,
  earliestChoice,
  choicesAllowed,
  holidayCatalogue,
  holidayId,
  indiaNationalHolidays,
  parseHolidayLines,
  usFederalHolidays,
} from '@/lib/eor/holidays';
import { EMPTY_DECLARATIONS, compareRegimes, estimateTax, professionalTaxAnnual, readDeclarations } from '@/lib/eor/tax';

describe('TDS under the new regime (the default)', () => {
  it('Rs 15 lakh: slabs after the Rs 75,000 standard deduction, plus 4% cess', () => {
    const t = estimateTax({ annualGross: 1_500_000, workState: 'Karnataka', regime: 'new' });
    expect(t.taxableIncome).toBe(1_425_000);
    expect(t.taxOnIncome).toBe(93_750);
    expect(t.cess).toBe(3_750);
    expect(t.totalTax).toBe(97_500);
    expect(t.monthlyTds).toBe(8_125);
    expect(t.professionalTax).toBe(2_400);
    expect(t.monthlyTakeHome).toBe(125_000 - 8_125 - 200);
  });

  it('no tax up to Rs 12 lakh taxable, and marginal relief just above it', () => {
    expect(estimateTax({ annualGross: 1_275_000, workState: 'Delhi', regime: 'new' }).totalTax).toBe(0);
    const above = estimateTax({ annualGross: 1_285_000, workState: 'Delhi', regime: 'new' });
    expect(above.taxableIncome).toBe(1_210_000);
    expect(above.totalTax).toBe(10_400); // tax capped at the Rs 10,000 above the limit, plus cess
  });

  it('surcharge above Rs 50 lakh, with marginal relief at the threshold', () => {
    const at = estimateTax({ annualGross: 5_075_000, workState: 'Delhi', regime: 'new' }); // taxable exactly 50 lakh
    const just = estimateTax({ annualGross: 5_085_000, workState: 'Delhi', regime: 'new' }); // 10,000 more
    expect(at.surcharge).toBe(0);
    expect(just.totalTax - at.totalTax).toBeLessThanOrEqual(10_400 + 10); // never more than the extra income, plus cess
  });
});

describe('TDS under the old regime, with declarations', () => {
  const declarations = { ...EMPTY_DECLARATIONS, rentPaidMonthly: 30_000, metroCity: true, section80C: 150_000 };

  it('HRA exemption, professional tax, 80C and the Rs 50,000 standard deduction', () => {
    const t = estimateTax({ annualGross: 1_500_000, workState: 'Karnataka', regime: 'old', declarations });
    expect(t.exemptions).toEqual([expect.objectContaining({ label: 'House rent allowance exemption', amount: 285_000 })]);
    expect(t.deductions.map((d) => [d.label, d.amount])).toEqual([
      ['Standard deduction', 50_000],
      ['Professional tax', 2_400],
      ['Section 80C', 150_000],
    ]);
    expect(t.taxableIncome).toBe(1_012_600);
    expect(t.totalTax).toBe(120_930);
  });

  it('caps each deduction at its limit and says so', () => {
    const t = estimateTax({ annualGross: 1_500_000, workState: 'Delhi', regime: 'old', declarations: { ...EMPTY_DECLARATIONS, section80C: 400_000, healthInsuranceParents: 60_000, seniorParents: true } });
    expect(t.deductions.find((d) => d.label === 'Section 80C')).toMatchObject({ amount: 150_000, note: expect.stringContaining('limit') });
    expect(t.deductions.find((d) => d.label === 'Health insurance (parents)')!.amount).toBe(50_000);
  });

  it('rebate up to Rs 5 lakh taxable', () => {
    expect(estimateTax({ annualGross: 550_000, workState: 'Delhi', regime: 'old' }).totalTax).toBe(0);
  });

  it('compares the regimes and names the cheaper one', () => {
    const big = compareRegimes({ annualGross: 1_500_000, workState: 'Karnataka', declarations: { ...declarations, homeLoanInterest: 200_000, healthInsuranceSelf: 25_000, nps80CCD1B: 50_000 } });
    expect(big.lower).toBe('old');
    const none = compareRegimes({ annualGross: 1_500_000, workState: 'Karnataka' });
    expect(none.lower).toBe('new');
    expect(none.saving).toBe(none.old.totalTax - none.new.totalTax);
  });

  it('reads a form safely: negatives, junk and flags', () => {
    const d = readDeclarations({ section80C: '-5', homeLoanInterest: '1,20,000', metroCity: 'on', seniorSelf: 'no', donations80G: 'abc' });
    expect(d).toMatchObject({ section80C: 0, homeLoanInterest: 120_000, metroCity: true, seniorSelf: false, donations80G: 0 });
  });

  it('professional tax only in the states that levy it, at the top rate', () => {
    expect(professionalTaxAnnual('Maharashtra', 1_200_000)).toBe(2_500);
    expect(professionalTaxAnnual('Delhi', 1_200_000)).toBe(0);
    expect(professionalTaxAnnual('Karnataka', 200_000)).toBe(0);
  });
});

describe('holidays', () => {
  it('US federal holidays for 2026, on the days they are observed', () => {
    expect(usFederalHolidays(2026).map((h) => `${h.date} ${h.name}`)).toEqual([
      "2026-01-01 New Year's Day",
      '2026-01-19 Martin Luther King Jr. Day',
      "2026-02-16 Washington's Birthday (Presidents' Day)",
      '2026-05-25 Memorial Day',
      '2026-06-19 Juneteenth',
      '2026-07-03 Independence Day (United States)', // 4 July 2026 is a Saturday
      '2026-09-07 Labor Day',
      '2026-10-12 Columbus Day',
      '2026-11-11 Veterans Day',
      '2026-11-26 Thanksgiving Day',
      '2026-12-25 Christmas Day',
    ]);
  });

  it('moves Sunday holidays to Monday and keeps a 31 December observance out of the next year', () => {
    expect(usFederalHolidays(2027).find((h) => h.name === 'Christmas Day')!.date).toBe('2027-12-24'); // Saturday
    expect(usFederalHolidays(2022).find((h) => h.name === "New Year's Day")).toBeUndefined(); // observed 31 Dec 2021
    expect(usFederalHolidays(2023).find((h) => h.name === "New Year's Day")!.date).toBe('2023-01-02'); // Sunday
  });

  const calendar = [
    { country: 'IN' as const, date: '2026-11-09', name: 'Diwali (holiday)' },
    { country: 'IN' as const, date: '2027-03-22', name: 'Holi' },
  ];
  const catalogue = holidayCatalogue(2026, 'US', calendar);

  it('the catalogue has India\'s national holidays as fixed, loaded festivals and the client country\'s holidays', () => {
    expect(catalogue.filter((h) => h.mandatory).map((h) => h.name)).toEqual(['Republic Day', 'Independence Day (India)', 'Gandhi Jayanti']);
    expect(catalogue.some((h) => h.name === 'Diwali (holiday)')).toBe(true);
    expect(catalogue.some((h) => h.name === 'Holi')).toBe(false); // another year
    expect(catalogue.filter((h) => h.country === 'US')).toHaveLength(11);
    expect(choicesAllowed(catalogue)).toBe(HOLIDAYS_PER_YEAR - 3);
  });

  it('accepts a valid choice and refuses national, weekend, unknown and too many', () => {
    const optional = catalogue.filter((h) => !h.mandatory && ![0, 6].includes(new Date(`${h.date}T00:00:00Z`).getUTCDay()));
    expect(checkHolidayChoice(catalogue, optional.slice(0, 3).map((h) => h.id))).toEqual({ ok: true, ids: optional.slice(0, 3).map((h) => h.id) });
    expect(checkHolidayChoice(catalogue, [indiaNationalHolidays(2026)[0]!.id]).ok).toBe(false);
    expect(checkHolidayChoice(catalogue, ['IN-2026-01-01-made-up']).ok).toBe(false);
    expect(checkHolidayChoice(catalogue, optional.slice(0, 8).map((h) => h.id))).toEqual({ ok: false, error: 'Choose at most 7 holidays.' });
    const weekendHoliday = holidayCatalogue(2026, 'US', [{ country: 'IN', date: '2026-11-08', name: 'Diwali' }]); // a Sunday
    expect(checkHolidayChoice(weekendHoliday, [holidayId('IN', '2026-11-08', 'Diwali')])).toMatchObject({ ok: false, error: expect.stringContaining('weekend') });
  });

  it('reads the bulk calendar form line by line', () => {
    const parsed = parseHolidayLines('2026-11-09, Diwali\n\n2026-13-01, Bad\nnot a line\n2026-12-25\tChristmas Day');
    expect(parsed.rows).toEqual([{ date: '2026-11-09', name: 'Diwali' }, { date: '2026-12-25', name: 'Christmas Day' }]);
    expect(parsed.errors).toEqual(['Line 3: write it as YYYY-MM-DD, Name.', 'Line 4: write it as YYYY-MM-DD, Name.']);
  });
});

describe('holidays in the past', () => {
  const catalogue = holidayCatalogue(2026, 'US', []);
  const newYear = catalogue.find((h) => h.name === "New Year's Day")!;
  const thanksgiving = catalogue.find((h) => h.name === 'Thanksgiving Day')!;

  it('starts from today, or the start date for someone not yet joined', () => {
    expect(earliestChoice('2026-10-31', '2026-10-01')).toBe('2026-10-31');
    expect(earliestChoice('2026-01-05', '2026-10-01')).toBe('2026-10-01');
  });

  it('refuses a new pick that has already passed', () => {
    const r = checkHolidayChoice(catalogue, [newYear.id, thanksgiving.id], { from: '2026-10-01', keep: [] });
    expect(r.ok).toBe(false);
    expect(checkHolidayChoice(catalogue, [thanksgiving.id], { from: '2026-10-01', keep: [] }).ok).toBe(true);
  });

  it('keeps a past holiday the employee had already chosen', () => {
    expect(checkHolidayChoice(catalogue, [newYear.id, thanksgiving.id], { from: '2026-10-01', keep: [newYear.id] }).ok).toBe(true);
  });
});
