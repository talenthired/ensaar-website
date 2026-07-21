export type EnsaarEvent = {
  id: string;
  title: string;
  date: string;          // ISO date
  type: 'webinar' | 'workshop' | 'meetup' | 'conference';
  location: string;
  status: 'upcoming' | 'past';
  summary: string;
  href?: string;
  speakers?: string[];
};

const today = new Date().toISOString().split('T')[0];

export const EVENTS: EnsaarEvent[] = [
  {
    id: 'claude-code-meetup-hyd-2026-05',
    title: 'Claude Code in the Real World - Hyderabad Meetup',
    date: '2026-05-22',
    type: 'meetup',
    location: 'Hyderabad, Telangana',
    status: 'upcoming',
    summary:
      'A practitioner-only meetup with live demonstrations of Claude Code skills, plugins, and MCP servers from teams shipping AI in production. Hosted in Hyderabad.',
    speakers: ['Ensaar AI Team', 'Invited practitioners'],
  },
  {
    id: 'ai-staffing-webinar-2026-06',
    title: 'Staffing for the AI Era - What CTOs Should Hire For',
    date: '2026-06-12',
    type: 'webinar',
    location: 'Online',
    status: 'upcoming',
    summary:
      'A 45-minute live discussion on what changes when your engineers ship with AI. Skill profiles, hiring rubrics, and red flags. Free to attend.',
    speakers: ['Ensaar Leadership'],
  },
  {
    id: 'bcep-leadership-workshop-2026-07',
    title: 'BCEP Workshop: Leadership in the AI Era',
    date: '2026-07-18',
    type: 'workshop',
    location: 'Hyderabad, Telangana',
    status: 'upcoming',
    summary:
      'A one-day BCEP workshop helping mid-level leaders build AI readiness, emotional intelligence, communication, and sound judgment while leading increasingly AI-augmented teams.',
    speakers: ['BCEP Faculty'],
  },
  {
    id: 'global-ai-summit-bangalore-2026-09',
    title: 'Global AI Summit - Bangalore (Speaking)',
    date: '2026-09-04',
    type: 'conference',
    location: 'Bangalore, India',
    status: 'upcoming',
    summary:
      'Ensaar will be speaking on agentic workflows in production - what works, what breaks, and how to ship AI that survives contact with real users.',
  },
  {
    id: 'past-bcep-soft-skills-2026-03',
    title: 'BCEP Workshop: AI-Ready Communication and Presentation',
    date: '2026-03-15',
    type: 'workshop',
    location: 'Hyderabad, Telangana',
    status: 'past',
    summary:
      'A two-day BCEP intervention covering AI readiness, emotional intelligence, presentation excellence, and stakeholder communication for an enterprise cohort.',
  },
];

export function upcomingEvents() {
  return EVENTS.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function pastEvents() {
  return EVENTS.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
}
