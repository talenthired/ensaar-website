/**
 * How an annual gross salary is split into components. Shared by the offer
 * letter, the tax estimate and the employee portal.
 */

/** Basic pay as a share of gross. Keeping it at half keeps "wages" under the labour codes at least half of pay. */
export const BASIC_SHARE = 0.5;
/** House rent allowance as a share of basic. */
export const HRA_SHARE_OF_BASIC = 0.5;
export type SalaryLine = { label: string; annual: number; monthly: number };

/**
 * The annual gross salary split into components. Annual figures add up exactly
 * to the gross; monthly figures are the annual ones divided by twelve and
 * rounded, so they may differ from a twelfth of the gross by a rupee.
 */
export function salaryBreakup(annualGross: number): { lines: SalaryLine[]; gross: SalaryLine } {
  const basic = Math.round(annualGross * BASIC_SHARE);
  const hra = Math.round(basic * HRA_SHARE_OF_BASIC);
  const special = annualGross - basic - hra;
  const line = (label: string, annual: number): SalaryLine => ({ label, annual, monthly: Math.round(annual / 12) });
  return {
    lines: [line('Basic pay', basic), line('House rent allowance', hra), line('Special allowance', special)],
    gross: line('Gross salary', annualGross),
  };
}
