import 'server-only';

import { siteConfig } from '@/lib/utils';

/*
 * What Ensaar prints on every invoice, in the format its accounts team uses.
 * The bank account and the Letter of Undertaking come from the environment,
 * not the code: this repository is public, and the LUT changes every financial
 * year. Until they are set, invoices cannot be issued.
 *
 *   INVOICE_BANK_ACCOUNT   account number
 *   INVOICE_BANK_IFSC      IFSC
 *   INVOICE_BANK_SWIFT     SWIFT code, no spaces (an international wire needs it exactly)
 *   INVOICE_BANK_NAME      bank name (default ICICI Bank)
 *   INVOICE_LUT_ARN        the LUT ARN for the current financial year
 *   INVOICE_LUT_FY         that financial year, e.g. 2026-27
 */

export const INVOICE_ISSUER = {
  name: 'ENSAAR GLOBAL PRIVATE LIMITED',
  addressLines: ['H NO 16-11-20/G/204, BHAVANI APARTMENTS,', 'SECOND FLOOR, SALEEM NAGAR', 'MALAKPET, HYDERABAD – 500036', 'TELANGANA, INDIA'],
  /** The PAN is the middle of the GSTIN, so it is public already. */
  pan: siteConfig.gstin.slice(2, 12),
  /** GST law requires the GSTIN on a tax invoice, including an export under LUT. */
  gstin: siteConfig.gstin,
  /** Company law requires the CIN on invoices and other business documents. */
  cin: siteConfig.cin,
  /** Long-term staffing (payroll) services: what an Employer of Record supplies. */
  sac: '998515',
  accountsEmail: 'accounts@ensaar.com',
} as const;

export type InvoiceBank = { accountName: string; bankName: string; accountNumber: string; ifsc: string; swift: string; address: string };
export type InvoiceSettings = { bank: InvoiceBank; lut: { arn: string; financialYear: string } };

/** The settings, or what is missing. A SWIFT code with spaces in it is treated as missing: a wire would bounce. */
export function invoiceSettings(): { ok: true; value: InvoiceSettings } | { ok: false; missing: string[] } {
  const env = (k: string) => process.env[k]?.trim() ?? '';
  const accountNumber = env('INVOICE_BANK_ACCOUNT');
  const ifsc = env('INVOICE_BANK_IFSC').toUpperCase();
  const swift = env('INVOICE_BANK_SWIFT').toUpperCase();
  const arn = env('INVOICE_LUT_ARN').toUpperCase();
  const financialYear = env('INVOICE_LUT_FY');
  const missing = [
    ...(!/^\d{9,18}$/.test(accountNumber) ? ['the bank account number (INVOICE_BANK_ACCOUNT)'] : []),
    ...(!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ? ['the IFSC (INVOICE_BANK_IFSC)'] : []),
    ...(!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift) ? ['the SWIFT code, without spaces (INVOICE_BANK_SWIFT)'] : []),
    ...(!/^[A-Z0-9]{10,20}$/.test(arn) ? ['the LUT ARN for this financial year (INVOICE_LUT_ARN)'] : []),
    ...(!/^\d{4}-\d{2}$/.test(financialYear) ? ['the LUT financial year, e.g. 2026-27 (INVOICE_LUT_FY)'] : []),
  ];
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    value: {
      bank: {
        accountName: INVOICE_ISSUER.name,
        bankName: env('INVOICE_BANK_NAME') || 'ICICI Bank',
        accountNumber,
        ifsc,
        swift,
        address: 'H.NO. 16-11-20/G/204, BHAVANI APARTMENTS, SECOND FLOOR, SALEEM NAGAR, MALAKPET, HYDERABAD – 500036, TELANGANA, INDIA',
      },
      lut: { arn, financialYear },
    },
  };
}

/** How the client pays, in one sentence. ACH is US-only, so it cannot reach an account in India. */
export const PAYMENT_METHOD_LINE = 'Pay by international wire (SWIFT). ACH is not available, because the account is held in India.';
