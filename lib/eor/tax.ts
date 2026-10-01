import { salaryBreakup } from './salary';

/**
 * Salary TDS estimate for an employee, under the new regime (the default) or
 * the old regime with the employee's declared investments and payments.
 *
 * An estimate to help the employee choose and to set monthly TDS, not a tax
 * return: it covers salary income only, for a resident individual under 60
 * unless they say otherwise, and takes the whole year at the current salary.
 *
 * RATES: the slabs, rebates and limits below are those of the Finance Act 2025
 * (tax year 2025-26), carried into the Income-tax Act, 2025 from 1 April 2026.
 * Check them against each year's Finance Act before relying on them; they live
 * in one place (TAX_RULES) so a Budget change is a one-line edit.
 */

export type Regime = 'new' | 'old';
export const REGIMES: ReadonlyArray<readonly [Regime, string]> = [
  ['new', 'New regime (default)'],
  ['old', 'Old regime, with deductions'],
];

type Slab = { upTo: number | null; rate: number };

export const TAX_RULES = {
  taxYear: '2026-27',
  cessRate: 0.04,
  new: {
    standardDeduction: 75_000,
    slabs: [
      { upTo: 400_000, rate: 0 },
      { upTo: 800_000, rate: 0.05 },
      { upTo: 1_200_000, rate: 0.1 },
      { upTo: 1_600_000, rate: 0.15 },
      { upTo: 2_000_000, rate: 0.2 },
      { upTo: 2_400_000, rate: 0.25 },
      { upTo: null, rate: 0.3 },
    ] as Slab[],
    /** No tax up to this taxable income; just above it, tax never exceeds the excess. */
    rebateLimit: 1_200_000,
    rebateMax: 60_000,
    surcharge: [
      { above: 5_000_000, rate: 0.1 },
      { above: 10_000_000, rate: 0.15 },
      { above: 20_000_000, rate: 0.25 },
    ],
  },
  old: {
    standardDeduction: 50_000,
    slabs: [
      { upTo: 250_000, rate: 0 },
      { upTo: 500_000, rate: 0.05 },
      { upTo: 1_000_000, rate: 0.2 },
      { upTo: null, rate: 0.3 },
    ] as Slab[],
    rebateLimit: 500_000,
    rebateMax: 12_500,
    surcharge: [
      { above: 5_000_000, rate: 0.1 },
      { above: 10_000_000, rate: 0.15 },
      { above: 20_000_000, rate: 0.25 },
      { above: 50_000_000, rate: 0.37 },
    ],
    limits: {
      section80C: 150_000,
      healthSelf: 25_000,
      healthSelfSenior: 50_000,
      healthParents: 25_000,
      healthParentsSenior: 50_000,
      nps80CCD1B: 50_000,
      homeLoanInterest: 200_000,
      savingsInterest: 10_000,
      professionalTax: 2_500,
    },
  },
} as const;

/** What an employee can declare under the old regime. All amounts are annual rupees except rent, which is monthly. */
export type TaxDeclarations = {
  rentPaidMonthly: number;
  /** Delhi, Mumbai, Kolkata or Chennai: HRA exemption is 50% of basic rather than 40%. */
  metroCity: boolean;
  /** PPF, ELSS, life insurance, tuition fees, home loan principal and the rest of section 80C. */
  section80C: number;
  healthInsuranceSelf: number;
  seniorSelf: boolean;
  healthInsuranceParents: number;
  seniorParents: boolean;
  /** Own NPS contribution over and above 80C. */
  nps80CCD1B: number;
  /** Interest on a loan for a self-occupied home. */
  homeLoanInterest: number;
  /** Interest on an education loan; no upper limit. */
  educationLoanInterest: number;
  /** The deductible amount of qualifying donations. */
  donations80G: number;
  /** Interest from savings bank accounts. */
  savingsInterest: number;
};

export const EMPTY_DECLARATIONS: TaxDeclarations = {
  rentPaidMonthly: 0,
  metroCity: false,
  section80C: 0,
  healthInsuranceSelf: 0,
  seniorSelf: false,
  healthInsuranceParents: 0,
  seniorParents: false,
  nps80CCD1B: 0,
  homeLoanInterest: 0,
  educationLoanInterest: 0,
  donations80G: 0,
  savingsInterest: 0,
};

/** Labels for the declaration form, in the order shown. */
export const DECLARATION_FIELDS: ReadonlyArray<{ key: keyof TaxDeclarations; label: string; hint: string; kind: 'amount' | 'flag' }> = [
  { key: 'rentPaidMonthly', label: 'Rent you pay each month', hint: 'For the house rent allowance exemption. Keep rent receipts; above Rs 1 lakh a year, the landlord\'s PAN is needed.', kind: 'amount' },
  { key: 'metroCity', label: 'I live in Delhi, Mumbai, Kolkata or Chennai', hint: 'Raises the HRA exemption limit from 40% to 50% of basic pay.', kind: 'flag' },
  { key: 'section80C', label: 'Section 80C investments and payments (a year)', hint: 'PPF, ELSS funds, life insurance premiums, children\'s tuition fees, home loan principal and the like. Up to Rs 1,50,000.', kind: 'amount' },
  { key: 'healthInsuranceSelf', label: 'Health insurance for you, your spouse and children (a year)', hint: 'Section 80D. Up to Rs 25,000, or Rs 50,000 if you are a senior citizen.', kind: 'amount' },
  { key: 'seniorSelf', label: 'I am 60 or older', hint: '', kind: 'flag' },
  { key: 'healthInsuranceParents', label: 'Health insurance for your parents (a year)', hint: 'Up to Rs 25,000, or Rs 50,000 if a parent is a senior citizen.', kind: 'amount' },
  { key: 'seniorParents', label: 'A parent is 60 or older', hint: '', kind: 'flag' },
  { key: 'nps80CCD1B', label: 'Your own NPS contribution (a year)', hint: 'Section 80CCD(1B), over and above 80C. Up to Rs 50,000.', kind: 'amount' },
  { key: 'homeLoanInterest', label: 'Home loan interest, self-occupied home (a year)', hint: 'Up to Rs 2,00,000.', kind: 'amount' },
  { key: 'educationLoanInterest', label: 'Education loan interest (a year)', hint: 'Section 80E. No upper limit.', kind: 'amount' },
  { key: 'donations80G', label: 'Deductible donations (a year)', hint: 'The deductible amount under section 80G, as on your receipts.', kind: 'amount' },
  { key: 'savingsInterest', label: 'Savings account interest (a year)', hint: 'Section 80TTA. Up to Rs 10,000.', kind: 'amount' },
];

/** Accept what a form sends; anything unreadable is zero or false. Amounts are whole rupees, never negative, and sanity-capped. */
export function readDeclarations(input: unknown): TaxDeclarations {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = { ...EMPTY_DECLARATIONS } as Record<string, number | boolean>;
  for (const field of DECLARATION_FIELDS) {
    const raw = body[field.key];
    if (field.kind === 'flag') out[field.key] = raw === true || raw === 'true' || raw === 'on' || raw === 'yes';
    else {
      const n = Math.floor(Number(String(raw ?? '').replace(/[₹,\s]/g, '')));
      out[field.key] = Number.isFinite(n) && n > 0 ? Math.min(n, 100_000_000) : 0;
    }
  }
  return out as TaxDeclarations;
}

/**
 * Professional tax at the top rate for the states that levy it, as an annual
 * figure. An estimate: thresholds and half-yearly schedules differ by state, so
 * payroll applies the state's own table.
 */
const PROFESSIONAL_TAX_ANNUAL: Record<string, number> = {
  'Andhra Pradesh': 2_400,
  Assam: 2_500,
  Gujarat: 2_400,
  Karnataka: 2_400,
  Kerala: 2_500,
  'Madhya Pradesh': 2_500,
  Maharashtra: 2_500,
  Odisha: 2_500,
  Punjab: 2_400,
  'Tamil Nadu': 2_500,
  Telangana: 2_400,
  'West Bengal': 2_400,
};

export function professionalTaxAnnual(workState: string, annualGross: number): number {
  // Every state's top slab starts well below Rs 25,000 a month.
  return annualGross / 12 >= 25_000 ? (PROFESSIONAL_TAX_ANNUAL[workState] ?? 0) : 0;
}

export type TaxLine = { label: string; amount: number; note?: string };

export type TaxEstimate = {
  regime: Regime;
  taxYear: string;
  grossSalary: number;
  exemptions: TaxLine[];
  deductions: TaxLine[];
  taxableIncome: number;
  taxOnIncome: number;
  rebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  monthlyTds: number;
  professionalTax: number;
  monthlyTakeHome: number;
};

function slabTax(income: number, slabs: readonly Slab[]): number {
  let tax = 0;
  let floor = 0;
  for (const slab of slabs) {
    const ceiling = slab.upTo ?? Infinity;
    if (income > floor) tax += (Math.min(income, ceiling) - floor) * slab.rate;
    floor = ceiling;
  }
  return tax;
}

/** Surcharge, with marginal relief: crossing a threshold never costs more in extra tax than the income above it. */
function surchargeFor(income: number, tax: number, bands: ReadonlyArray<{ above: number; rate: number }>, slabs: readonly Slab[]): number {
  const band = [...bands].reverse().find((b) => income > b.above);
  if (!band) return 0;
  const surcharge = tax * band.rate;
  const below = [...bands].reverse().find((b) => band.above > b.above);
  const atThreshold = slabTax(band.above, slabs) * (1 + (below?.rate ?? 0));
  const relief = Math.max(0, tax + surcharge - (atThreshold + (income - band.above)));
  return Math.max(0, surcharge - relief);
}

const roundTo10 = (n: number) => Math.round(n / 10) * 10;

/**
 * The year's tax on salary, and what it means each month. `basicAnnual` and
 * `hraAnnual` come from the salary breakup and matter only under the old regime.
 */
export function estimateTax(input: {
  annualGross: number;
  workState: string;
  regime: Regime;
  declarations?: TaxDeclarations;
}): TaxEstimate {
  const { annualGross, regime } = input;
  const d = input.declarations ?? EMPTY_DECLARATIONS;
  const breakup = salaryBreakup(annualGross);
  const basic = breakup.lines[0]!.annual;
  const hra = breakup.lines[1]!.annual;
  const pt = professionalTaxAnnual(input.workState, annualGross);
  const exemptions: TaxLine[] = [];
  const deductions: TaxLine[] = [];
  const rules = TAX_RULES[regime];

  deductions.push({ label: 'Standard deduction', amount: rules.standardDeduction });
  if (regime === 'old') {
    const L = TAX_RULES.old.limits;
    const rent = d.rentPaidMonthly * 12;
    if (rent > 0) {
      const hraExempt = Math.max(0, Math.min(hra, basic * (d.metroCity ? 0.5 : 0.4), rent - basic * 0.1));
      exemptions.push({ label: 'House rent allowance exemption', amount: Math.round(hraExempt), note: 'The least of HRA received, the city limit on basic pay, and rent above 10% of basic pay.' });
    }
    if (pt) deductions.push({ label: 'Professional tax', amount: Math.min(pt, L.professionalTax) });
    const capped = (label: string, declared: number, cap: number) => {
      if (declared > 0) deductions.push({ label, amount: Math.min(declared, cap), ...(declared > cap ? { note: `Declared ${declared.toLocaleString('en-IN')}; the limit is ${cap.toLocaleString('en-IN')}.` } : {}) });
    };
    capped('Section 80C', d.section80C, L.section80C);
    capped('Health insurance (self and family)', d.healthInsuranceSelf, d.seniorSelf ? L.healthSelfSenior : L.healthSelf);
    capped('Health insurance (parents)', d.healthInsuranceParents, d.seniorParents ? L.healthParentsSenior : L.healthParents);
    capped('NPS (section 80CCD(1B))', d.nps80CCD1B, L.nps80CCD1B);
    capped('Home loan interest', d.homeLoanInterest, L.homeLoanInterest);
    capped('Education loan interest', d.educationLoanInterest, Infinity);
    capped('Donations (section 80G)', d.donations80G, Infinity);
    capped('Savings account interest', d.savingsInterest, L.savingsInterest);
  }

  const total = (lines: TaxLine[]) => lines.reduce((n, l) => n + l.amount, 0);
  const taxableIncome = Math.max(0, roundTo10(annualGross - total(exemptions) - total(deductions)));
  const taxOnIncome = slabTax(taxableIncome, rules.slabs);
  let rebate = 0;
  if (taxableIncome <= rules.rebateLimit) rebate = Math.min(taxOnIncome, rules.rebateMax);
  else if (regime === 'new') rebate = Math.max(0, taxOnIncome - (taxableIncome - rules.rebateLimit)); // marginal relief just above the limit
  const afterRebate = Math.max(0, taxOnIncome - rebate);
  const surcharge = surchargeFor(taxableIncome, afterRebate, rules.surcharge, rules.slabs);
  const cess = (afterRebate + surcharge) * TAX_RULES.cessRate;
  const totalTax = roundTo10(afterRebate + surcharge + cess);
  const monthlyTds = Math.round(totalTax / 12);

  return {
    regime,
    taxYear: TAX_RULES.taxYear,
    grossSalary: annualGross,
    exemptions,
    deductions,
    taxableIncome,
    taxOnIncome: Math.round(taxOnIncome),
    rebate: Math.round(rebate),
    surcharge: Math.round(surcharge),
    cess: Math.round(cess),
    totalTax,
    monthlyTds,
    professionalTax: pt,
    monthlyTakeHome: Math.round(annualGross / 12 - monthlyTds - pt / 12),
  };
}

/** Both regimes side by side, and which costs less, for the employee to choose. */
export function compareRegimes(input: { annualGross: number; workState: string; declarations?: TaxDeclarations }) {
  const neu = estimateTax({ ...input, regime: 'new' });
  const old = estimateTax({ ...input, regime: 'old' });
  return { new: neu, old, lower: (old.totalTax < neu.totalTax ? 'old' : 'new') as Regime, saving: Math.abs(neu.totalTax - old.totalTax) };
}
