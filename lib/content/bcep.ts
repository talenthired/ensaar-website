export type BcepTrack = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  modules: string[];
  audience: string;
  credential: string;
  assessment: string;
};

export const BCEP_ADVANTAGES = [
  {
    num: '01',
    title: 'Learn',
    description: 'Build the frameworks and working methods required for the selected certification track, including AI readiness where the role demands it.',
  },
  {
    num: '02',
    title: 'Apply',
    description: 'Use the methods on realistic workplace scenarios, AI-assisted work situations, and role-relevant assignments.',
  },
  {
    num: '03',
    title: 'Demonstrate',
    description: 'Complete an applied assessment against a defined capability rubric.',
  },
  {
    num: '04',
    title: 'Certify',
    description: 'Receive the relevant Ensaar BCEP credential after meeting the assessment standard.',
  },
] as const;

export const BCEP_OUTCOMES = [
  'Evidence of applied workplace capability',
  'AI readiness for modern workplace execution',
  'Stronger emotional intelligence and self-awareness',
  'A defined assessment and completion standard',
  'An Ensaar-issued BCEP credential',
  'Enterprise cohort reporting when required',
] as const;

export const BCEP_TRACKS: BcepTrack[] = [
  {
    slug: 'leadership',
    name: 'Leadership Execution',
    tagline: 'Turn leadership intent into clear decisions and accountable execution',
    description:
      'An applied certification pathway for managers and leaders responsible for decisions, change, team alignment, and measurable delivery.',
    modules: [
      'Emotional intelligence and self-aware leadership',
      'AI readiness for leaders and managers',
      'Leadership communication and alignment',
      'Decision quality and strategic thinking',
      'Leading AI-augmented teams',
      'Leading change and transformation',
      'Accountability and operating cadence',
      'Stakeholder influence and executive presence',
    ],
    audience: 'First-time managers, mid-level leaders, and senior leaders in transition.',
    credential: 'BCEP Certificate in Leadership Execution',
    assessment: 'Scenario-based leadership review and an applied workplace action plan.',
  },
  {
    slug: 'business-communication',
    name: 'Business Communication',
    tagline: 'Communicate with clarity when business outcomes depend on it',
    description:
      'A professional certification pathway focused on high-stakes workplace communication, structured thinking, presentations, and stakeholder alignment.',
    modules: [
      'Emotional intelligence in workplace communication',
      'Communicating AI-assisted work clearly',
      'Structured business communication',
      'Executive writing and message design',
      'Presentations and decision narratives',
      'AI-era stakeholder alignment',
      'Cross-functional and client communication',
      'Difficult conversations and issue resolution',
    ],
    audience: 'Professionals, client-facing teams, project leads, and cross-functional managers.',
    credential: 'BCEP Certificate in Business Communication',
    assessment: 'Written and live communication assignments evaluated against a capability rubric.',
  },
  {
    slug: 'professional',
    name: 'Professional Excellence',
    tagline: 'Build the operating disciplines behind dependable performance',
    description:
      'An assessed pathway for professionals who need stronger execution, prioritization, negotiation, critical thinking, and commercial effectiveness.',
    modules: [
      'Emotional intelligence and professional self-management',
      'AI readiness and responsible tool use',
      'Priority management and execution',
      'Negotiation and conflict resolution',
      'Critical thinking and problem framing',
      'Verification habits for AI-assisted output',
      'Commercial awareness and stakeholder value',
      'Workplace ethics and accountability',
    ],
    audience: 'Individual contributors, project owners, business teams, and emerging managers.',
    credential: 'BCEP Certificate in Professional Excellence',
    assessment: 'A role-relevant business case and evidence-based execution review.',
  },
  {
    slug: 'facilitator',
    name: 'Enterprise Facilitator',
    tagline: 'Create internal capability programs that are rigorous and repeatable',
    description:
      'A certification pathway for internal facilitators and capability leaders who design, deliver, measure, and improve enterprise learning programs.',
    modules: [
      'Emotionally intelligent facilitation',
      'AI readiness program design',
      'Capability needs diagnosis',
      'Program architecture and outcome design',
      'Enterprise facilitation methods',
      'Assessment and evidence collection',
      'Measuring AI capability across cohorts',
      'Program measurement and continuous improvement',
    ],
    audience: 'Capability teams, internal facilitators, functional leaders, and HR business partners.',
    credential: 'BCEP Certified Enterprise Facilitator',
    assessment: 'Design and delivery of an assessed capability intervention for a defined audience.',
  },
];

export function getBcepTrack(slug: string) {
  return BCEP_TRACKS.find((track) => track.slug === slug);
}
