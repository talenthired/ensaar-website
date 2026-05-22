/**
 * Public surface for the three program tiers (community / cohort / coaching).
 * Re-exports from pricing.ts so callers can import from a name that matches
 * the new product vocabulary instead of the legacy "pricing" file.
 */
export {
  PROGRAMS,
  TIER_COMPARISON,
  getProgram,
  getProgramsByTier,
  getFeaturedPrograms,
} from '@/lib/content/pricing';

export type {
  Program,
  Tier,
  PriceModel,
  Currency,
  Accent,
} from '@/lib/content/pricing';
