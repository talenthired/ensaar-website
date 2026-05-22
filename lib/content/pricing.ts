export type Currency = 'USD' | 'INR';
export type Tier = 'community' | 'cohort' | 'coaching';
export type Accent = 'indigo' | 'cyan' | 'violet' | 'emerald' | 'amber';

export type PriceModel =
  | {
      kind: 'recurring';
      usdMonthly: number;
      inrMonthly: number;
      usdAnnual?: number;
      inrAnnual?: number;
    }
  | {
      kind: 'one-time';
      usd: number;
      inr: number;
      payInFull?: { usd: number; inr: number };
      installments?: { count: number; usd: number; inr: number };
    }
  | {
      kind: 'bespoke';
      usdFrom: number;
      inrFrom: number;
    };

export type Program = {
  slug: string;
  tier: Tier;
  name: string;
  headline: string;
  description: string;
  price: PriceModel;
  duration: string;
  format: 'self-paced-community' | 'live-cohort' | 'one-on-one';
  cohortNumber?: number;
  startDate?: string;
  seatsTotal?: number;
  seatsLeft?: number;
  deliverables: string[];
  whatsIncluded: string[];
  whatsNotIncluded: string[];
  bestFor: string;
  featured: boolean;
  guarantee?: string;
  cta: string;
  accent: Accent;
};

export const PROGRAMS: Program[] = [
  {
    slug: 'community',
    tier: 'community',
    name: 'Builder Community',
    headline: 'The community of builders shipping AI businesses.',
    description:
      'A paid community of founders, side-hustlers, and students building AI products. Weekly build-alongs, monthly office hours, a vetted opportunity board, and direct access to operators who have shipped AI at scale.',
    price: {
      kind: 'recurring',
      usdMonthly: 19,
      inrMonthly: 999,
      usdAnnual: 190,
      inrAnnual: 9990,
    },
    duration: 'Monthly or annual',
    format: 'self-paced-community',
    deliverables: [
      'Weekly live build-along sessions',
      'Monthly group office hours with senior operators',
      'Private Slack/Discord with active builders',
      'Prompt, code, and launch-playbook library',
      'Curated opportunity and customer board',
    ],
    whatsIncluded: [
      'Recurring monthly or discounted annual billing',
      '14-day refund if it is not the right fit',
      'Access to all archived sessions',
    ],
    whatsNotIncluded: [
      '1:1 mentorship or code review',
      'Cohort enrollment (a separate program)',
    ],
    bestFor: 'Builders who want momentum, accountability, and a peer group without committing to a cohort yet.',
    featured: true,
    guarantee: '14-day refund',
    cta: 'Join the community',
    accent: 'cyan',
  },
  {
    slug: 'ai-business-cohort',
    tier: 'cohort',
    name: 'AI Business Cohort',
    headline: 'Eight weeks. One AI product shipped. With a senior operator at your side.',
    description:
      'A live, eight-week cohort. By the end you have shipped a working AI product (SaaS, automation, content tool, agency, or no-code app) and have a paying customer or a real launch plan.',
    price: {
      kind: 'one-time',
      usd: 1499,
      inr: 49999,
      payInFull: { usd: 1299, inr: 44999 },
      installments: { count: 3, usd: 549, inr: 18333 },
    },
    duration: '8 weeks, live',
    format: 'live-cohort',
    cohortNumber: 1,
    seatsTotal: 25,
    seatsLeft: 25,
    deliverables: [
      'Two live sessions per week with a senior operator',
      'Weekly small-group accountability pods',
      'Capstone: a working AI product shipped publicly',
      'Launch playbook: distribution, pricing, retention',
      'Cohort alumni Slack with operator access',
    ],
    whatsIncluded: [
      'Pay-in-full discount or 3-installment plan',
      'Full refund within first 14 days',
      'Completion-based refund after week 2 (followed program, did not ship: 100% back)',
    ],
    whatsNotIncluded: [
      '1:1 weekly coaching (separate program)',
      'Guaranteed revenue or income outcomes',
    ],
    bestFor: 'Builders with 8 to 12 hours a week who want a real product live by the end of the program.',
    featured: true,
    guarantee: 'Full refund first 14 days, then completion-based',
    cta: 'Apply to Cohort 01',
    accent: 'indigo',
  },
  {
    slug: 'coaching',
    tier: 'coaching',
    name: '1:1 AI Operator Coaching',
    headline: 'Direct access to a senior operator. For founders building AI businesses that need real revenue.',
    description:
      'A three-month minimum 1:1 engagement with a senior AI operator. Weekly 90-minute calls, async review of code and decks, hands-on debugging, and curated intros to hires and customers. For founders already building.',
    price: {
      kind: 'bespoke',
      usdFrom: 6000,
      inrFrom: 499000,
    },
    duration: '3-month minimum',
    format: 'one-on-one',
    deliverables: [
      'Weekly 90-minute strategy and build calls',
      'Async access for code, deck, and prompt review',
      'Quarterly board-style milestone review',
      'Curated intros from the operator network',
    ],
    whatsIncluded: [
      'Direct Slack/email channel during business hours',
      'Pro-rated refund after the first 30 days',
      'Confidential, founder-to-founder engagement',
    ],
    whatsNotIncluded: [
      'Done-for-you implementation work',
      'Guaranteed funding, revenue, or hiring outcomes',
    ],
    bestFor: 'Founders already shipping who need a sparring partner with real AI operator experience.',
    featured: false,
    guarantee: 'Pro-rated refund after 30 days',
    cta: 'Request a coaching call',
    accent: 'violet',
  },
];

export function getProgram(slug: string): Program | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}

export function getFeaturedPrograms(): Program[] {
  return PROGRAMS.filter((p) => p.featured);
}

export function getProgramsByTier(tier: Tier): Program[] {
  return PROGRAMS.filter((p) => p.tier === tier);
}

/**
 * Tier comparison metadata for the "Which is right for you?" table.
 * Kept here next to the program data so the comparison and the offer stay in sync.
 */
export const TIER_COMPARISON = {
  rows: [
    {
      label: 'Time commitment',
      community: '2-5 hrs/week (optional)',
      cohort: '8-12 hrs/week (required)',
      coaching: '4-8 hrs/week (your call)',
    },
    {
      label: 'Support level',
      community: 'Peer + monthly office hours',
      cohort: 'Live sessions + group accountability',
      coaching: '1:1 senior operator',
    },
    {
      label: 'Price band (USD)',
      community: '$19/mo',
      cohort: '$1,499 (one-time)',
      coaching: 'from $6,000',
    },
    {
      label: 'Refund policy',
      community: '14-day refund',
      cohort: '14-day refund, then completion-based',
      coaching: 'Pro-rated after 30 days',
    },
    {
      label: 'Best for',
      community: 'Momentum + peers',
      cohort: 'Ship a product in 8 weeks',
      coaching: 'Already building, need a sparring partner',
    },
  ],
} as const;
