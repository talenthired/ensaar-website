export type Industry = {
  id: string;
  name: string;
  description: string;
};

export const INDUSTRIES: Industry[] = [
  {
    id: 'fintech',
    name: 'Fintech & Trading',
    description: 'Trading platforms, market intelligence, compliance-aware AI assistants.',
  },
  {
    id: 'mobility',
    name: 'Mobility & Logistics',
    description: 'Ride-hailing, dispatch optimization, business communications training for global supply chains.',
  },
  {
    id: 'edtech',
    name: 'EdTech & Language',
    description: 'AI tutors, voice-aware feedback, personalized learning at community scale.',
  },
  {
    id: 'retail',
    name: 'Retail & Marketing',
    description: 'Direct-selling platforms, recommender systems, AI-personalized content.',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Triage assistants, multilingual patient interaction, audit-ready clinical RAG.',
  },
  {
    id: 'hospitality',
    name: 'Hospitality',
    description: 'Conversational concierge, allergy-aware menu intelligence, bilingual booking.',
  },
  {
    id: 'proptech',
    name: 'PropTech',
    description: 'Natural-language property discovery, AI-generated neighborhood briefs.',
  },
  {
    id: 'education',
    name: 'STEM Education',
    description: 'Hands-on robotics programs introducing children to computational thinking.',
  },
];

export type Testimonial = {
  id: string;
  quote: string;
  attribution: string;       // anonymized title
  organisation: string;      // anonymized organization descriptor
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    quote:
      'Ensaar didn\'t just deliver code - they shipped a working AI capability our team could keep building on. That changed how we think about software partners.',
    attribution: 'Director of Engineering',
    organisation: 'Fortune-scale Logistics Leader',
  },
  {
    id: 't2',
    quote:
      'The team was AI-native from day one. Prompt caching, evals, agentic workflows - they brought patterns we hadn\'t seen anywhere else in the region.',
    attribution: 'Head of Product',
    organisation: 'Singapore Trading Platform',
  },
  {
    id: 't3',
    quote:
      'BCEP turned a generic communications training brief into something our people actually applied on Monday morning. Behavioral, not theoretical.',
    attribution: 'Chief People Officer',
    organisation: 'Global Supply Chain Enterprise',
  },
];
