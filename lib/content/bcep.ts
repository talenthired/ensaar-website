export type BcepTrack = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  modules: string[];
  audience: string;
};

export const BCEP_ADVANTAGES = [
  {
    num: '01',
    title: 'Highly Practical',
    description: 'Rooted in genuine workplace scenarios — never abstract theory.',
  },
  {
    num: '02',
    title: 'Structured & Scalable',
    description: 'Effective for diverse roles across the organization.',
  },
  {
    num: '03',
    title: 'Outcome-Focused',
    description: 'Delivering tangible, measurable improvement.',
  },
  {
    num: '04',
    title: 'Deeply Personalized',
    description: 'Tailored to both individual and organizational needs.',
  },
] as const;

export const BCEP_OUTCOMES = [
  'Building confidence in communication',
  'Enhancing clarity in thought and action',
  'Fostering professional presence',
  'Driving accountability and ownership',
] as const;

export const BCEP_TRACKS: BcepTrack[] = [
  {
    slug: 'leadership',
    name: 'Leadership Development',
    tagline: 'Programs that build the leaders your business needs next',
    description:
      'Structured leadership development for emerging and established leaders — blending executive presence, emotional intelligence, change readiness, and strategic thinking.',
    modules: [
      'Emerging Leader Programs',
      'Emotional Intelligence for Leaders',
      'Change and Transformation Readiness',
      'Coaching and Mentorship Programs',
      'Strategic Thinking and Decision-Making',
    ],
    audience: 'First-time managers, mid-level leaders, senior leaders in transition.',
  },
  {
    slug: 'soft-skills',
    name: 'Soft Skills & Personality',
    tagline: 'The human skills that shape everyday performance',
    description:
      'Practical development in the skills that shape every workday — time management, resilience, communication, and confidence — delivered through scenarios that mirror real workplaces.',
    modules: [
      'Time and Priority Management',
      'Stress Handling and Resilience',
      'Business Communication',
      'Confidence Building and Personality',
      'Decision Making Skills',
    ],
    audience: 'All professionals, early-career through experienced individual contributors.',
  },
  {
    slug: 'professional',
    name: 'Professional Skills',
    tagline: 'Sharpen the skills that drive professional outcomes',
    description:
      'Professional skill enhancement focused on the moments that matter: presentations, negotiations, goal execution, and ethical decision-making.',
    modules: [
      'Communication and Presentation Excellence',
      'Negotiation and Conflict Resolution',
      'Goal Setting and Execution',
      'Critical Thinking',
      'Workplace Ethics and Accountability',
    ],
    audience: 'Client-facing professionals, project leads, business development teams.',
  },
  {
    slug: 'train-the-trainer',
    name: 'Train-the-Trainer',
    tagline: 'Build internal training capability that scales',
    description:
      'Equip your internal team to design, deliver, and assess learning programs — so capability development becomes a repeatable, owned capability rather than a vendor dependency.',
    modules: [
      'Fast-Tracking Proven Learning Systems',
      'Workshop Planning and Long-Form Interventions',
      'Training Needs Assessment and Consulting',
      'Repeatable, Scalable Program Design',
      'Research-Learning-Results Loop',
    ],
    audience: 'L&D teams, internal trainers, HR business partners.',
  },
];

export function getBcepTrack(slug: string) {
  return BCEP_TRACKS.find((t) => t.slug === slug);
}
