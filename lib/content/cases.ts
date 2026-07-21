export type AICase = {
  id: string;
  client: string;          // anonymized client framing
  region: string;          // country / region
  flag: string;            // emoji or short code (used as accent)
  title: string;
  summary: string;
  highlights: string[];
  tech: string[];
  illustration: 'trading' | 'language' | 'marketing' | 'taxi' | 'health' | 'restaurant' | 'realestate';
};

export const AI_CASES: AICase[] = [
  {
    id: 'trading-sg',
    client: 'Fintech / Trading Platform',
    region: 'Singapore',
    flag: 'SG',
    title: 'AI-Powered Trading Platform',
    summary:
      'Built an AI-augmented trading platform for a Singapore-based financial services client. Integrated LLM reasoning into market analysis, signal generation, and customer insights - reducing time-to-decision for traders by an order of magnitude.',
    highlights: [
      'LLM-driven market sentiment analysis on real-time news and filings',
      'Conversational research assistant for traders and PMs',
      'Auto-summarized daily briefings tailored to each user portfolio',
      'Compliance-aware response filtering with audit trail',
    ],
    tech: ['Claude', 'Prompt Caching', 'RAG', 'Real-time pipelines'],
    illustration: 'trading',
  },
  {
    id: 'langlearn-cn',
    client: 'EdTech / Language Learning',
    region: 'China',
    flag: 'CN',
    title: 'AI-Native Language Learning Community',
    summary:
      'Designed and shipped an AI-integrated language learning community for a China-based EdTech client. Conversational AI tutors, voice-aware feedback, and personalized learning paths drive engagement and outcomes.',
    highlights: [
      'AI conversation partners with adaptive difficulty',
      'Pronunciation analysis with targeted correction prompts',
      'Personalized weekly learning plans generated per learner',
      'Community moderation assistant for instructor support',
    ],
    tech: ['LLM tutors', 'Voice AI', 'Personalization', 'Community moderation'],
    illustration: 'language',
  },
  {
    id: 'marketing-in',
    client: 'Direct Selling / Marketing Platform',
    region: 'India',
    flag: 'IN',
    title: 'AI-Driven Distribution & Marketing Platform',
    summary:
      'Built a direct-selling and marketing distribution platform for a leading India-based client. AI underpins distributor matching, content personalization, sales enablement, and territory analytics.',
    highlights: [
      'AI-powered distributor recommendations and matching',
      'Personalized marketing content generation per region',
      'Sales enablement assistant for distributor onboarding',
      'Predictive analytics for territory and product performance',
    ],
    tech: ['LLM personalization', 'Recommender systems', 'Enablement agents'],
    illustration: 'marketing',
  },
  {
    id: 'taxi-uae',
    client: 'Mobility / Ride-Hailing',
    region: 'United Arab Emirates',
    flag: 'AE',
    title: 'Intelligent Taxi Booking App',
    summary:
      'Delivered a taxi booking experience for a UAE-based mobility client with AI threaded through the experience - smarter dispatch, sharper ETAs, and a conversational support agent that handles the long tail of customer queries.',
    highlights: [
      'AI dispatch optimization considering traffic and demand',
      'Conversational customer support agent (multilingual)',
      'Surge pricing with explainability for both rider and driver',
      'Driver performance guidance with feedback loops',
    ],
    tech: ['Optimization', 'Multilingual LLMs', 'Pricing intelligence'],
    illustration: 'taxi',
  },
  {
    id: 'health-sa',
    client: 'Healthcare / Diagnostics',
    region: 'Saudi Arabia',
    flag: 'SA',
    title: 'AI Diagnostics Triage Assistant',
    summary:
      'Partnered with a healthcare network in Saudi Arabia to deliver an AI triage and clinical-summary assistant - supporting front-line clinicians with structured intake summaries and decision-support prompts.',
    highlights: [
      'Structured patient intake and history summarization',
      'Clinical-decision support prompts surfaced contextually',
      'Multilingual (Arabic / English) patient interaction',
      'Audit-ready logging for clinical compliance',
    ],
    tech: ['Multilingual LLMs', 'Clinical RAG', 'Compliance logging'],
    illustration: 'health',
  },
  {
    id: 'restaurant-jp',
    client: 'Hospitality / Restaurants',
    region: 'Japan',
    flag: 'JP',
    title: 'Conversational Restaurant Concierge',
    summary:
      'Built an AI concierge for a Japanese restaurant group - guests browse menus, ask about ingredients, allergies, and chef recommendations through natural conversation, in Japanese or English.',
    highlights: [
      'Voice and text concierge in Japanese and English',
      'Allergy-aware menu recommendations',
      'Reservation flow with context retention across sessions',
      'Chef-of-the-day storytelling for guest experience',
    ],
    tech: ['Bilingual voice', 'Context-aware booking', 'Generative storytelling'],
    illustration: 'restaurant',
  },
  {
    id: 'realestate-au',
    client: 'PropTech / Real Estate',
    region: 'Australia',
    flag: 'AU',
    title: 'AI Property Discovery Engine',
    summary:
      'Designed a property discovery engine for an Australian real estate client - buyers describe what they want in natural language, and an AI agent returns ranked matches with explanations.',
    highlights: [
      'Natural-language property search with negotiation cues',
      'Personalized buyer journeys based on prior interactions',
      'AI-generated neighborhood and listing summaries',
      'Agent-side dashboard for high-intent lead surfacing',
    ],
    tech: ['Semantic search', 'LLM ranking', 'Lead scoring'],
    illustration: 'realestate',
  },
];
