import type { Currency, PriceModel } from '@/lib/content/pricing';

export type PriceDisplay = {
  amount: string;
  suffix?: string;
  secondary?: string;
};

export function formatAmount(amount: number, currency: Currency): string {
  if (currency === 'INR') {
    return '₹' + amount.toLocaleString('en-IN');
  }
  return '$' + amount.toLocaleString('en-US');
}

/**
 * Single-line price line for cards and headers.
 * Recurring -> monthly amount + "/month" suffix.
 * One-time -> total amount only.
 * Bespoke -> "from <amount>".
 */
export function formatPrice(price: PriceModel, currency: Currency): PriceDisplay {
  if (price.kind === 'recurring') {
    const monthly = currency === 'INR' ? price.inrMonthly : price.usdMonthly;
    return { amount: formatAmount(monthly, currency), suffix: '/month' };
  }
  if (price.kind === 'one-time') {
    const amount = currency === 'INR' ? price.inr : price.usd;
    const display: PriceDisplay = { amount: formatAmount(amount, currency) };
    if (price.payInFull) {
      const payInFull = currency === 'INR' ? price.payInFull.inr : price.payInFull.usd;
      display.secondary = `${formatAmount(payInFull, currency)} pay-in-full`;
    }
    return display;
  }
  // bespoke
  const from = currency === 'INR' ? price.inrFrom : price.usdFrom;
  return { amount: formatAmount(from, currency), suffix: 'starting' };
}

/**
 * The amount used by JSON-LD Offer schema. Always returns the entry price.
 */
export function schemaPriceUsd(price: PriceModel): number {
  if (price.kind === 'recurring') return price.usdMonthly;
  if (price.kind === 'one-time') return price.usd;
  return price.usdFrom;
}

export function schemaPriceInr(price: PriceModel): number {
  if (price.kind === 'recurring') return price.inrMonthly;
  if (price.kind === 'one-time') return price.inr;
  return price.inrFrom;
}
