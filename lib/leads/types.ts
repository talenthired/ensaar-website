export const LEAD_STATUSES = ['new', 'qualified', 'proposal', 'active', 'won', 'lost'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  workType: string;
  audience?: string;
  adoptionStage?: string;
  leadSource?: string;
  currentCost?: string;
  timeline?: string;
  details: string;
  status: LeadStatus;
  owner?: string;
  nextActionAt?: string;
  estimatedValue?: number;
  notes?: string;
  sourcePath?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  calculator?: Record<string, number>;
};

export type NewLead = Pick<Lead, 'name' | 'email' | 'workType' | 'details'> &
  Partial<
    Pick<
      Lead,
      | 'phone'
      | 'company'
      | 'audience'
      | 'adoptionStage'
      | 'leadSource'
      | 'currentCost'
      | 'timeline'
      | 'sourcePath'
      | 'landingPage'
      | 'referrer'
      | 'utmSource'
      | 'utmMedium'
      | 'utmCampaign'
      | 'calculator'
    >
  >;

export type LeadUpdate = Partial<
  Pick<Lead, 'status' | 'owner' | 'nextActionAt' | 'estimatedValue' | 'notes'>
>;
