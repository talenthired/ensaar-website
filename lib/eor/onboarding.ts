/**
 * EOR client onboarding: the fields, rules and labels shared by Basecamp, the
 * customer portal and the API.
 *
 * No 'server-only' import: the portal renders these labels and runs the same
 * checks for instant feedback. The server re-runs every check, so the client copy
 * is convenience, never the boundary.
 *
 * Scope is deliberately the minimum Ensaar needs to contract with a US company
 * and employ someone for it in India:
 *   - who the customer is (legal entity, EIN, registered address), for KYB,
 *     invoicing and the zero-rated export-of-services position under GST;
 *   - who may bind it (the signatory), so the agreement is enforceable;
 *   - sanctions and permanent-establishment declarations, which are the two
 *     ways an otherwise clean engagement becomes Ensaar's problem;
 *   - the offer itself, which Ensaar enters and the customer confirms.
 */

export const ONBOARDING_TTL_DAYS = 30;

export const CLIENT_STATUSES = ['invited', 'in_progress', 'signed', 'approved', 'cancelled'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const STATUS_LABELS: Record<ClientStatus, string> = {
  invited: 'Invited',
  in_progress: 'In progress',
  signed: 'Signed, awaiting review',
  approved: 'Approved',
  cancelled: 'Cancelled',
};

/** The customer can still change answers and documents only before signing. */
export function isEditable(status: ClientStatus): boolean {
  return status === 'invited' || status === 'in_progress';
}

export const US_STATES: ReadonlyArray<readonly [code: string, name: string]> = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

const US_STATE_CODES = new Set(US_STATES.map(([code]) => code));

export function usStateName(code: string): string {
  return US_STATES.find(([c]) => c === code)?.[1] ?? code;
}

/**
 * Where the employee works decides professional tax and which Shops and
 * Establishments Act governs leave and notice, so it is asked up front.
 */
export const INDIA_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;

export const ENTITY_TYPES = [
  ['c_corp', 'C corporation'],
  ['s_corp', 'S corporation'],
  ['llc', 'Limited liability company (LLC)'],
  ['partnership', 'Partnership'],
  ['other', 'Other'],
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number][0];

export function entityTypeLabel(value: string): string {
  return ENTITY_TYPES.find(([key]) => key === value)?.[1] ?? value;
}

export type DocumentKind = {
  kind: string;
  label: string;
  hint: string;
  required: boolean;
};

export const DOCUMENT_KINDS: DocumentKind[] = [
  {
    kind: 'formation',
    label: 'Certificate of incorporation or formation',
    hint: 'Articles of incorporation for a corporation, or the certificate of formation for an LLC.',
    required: true,
  },
  {
    kind: 'ein',
    label: 'EIN confirmation',
    hint: 'The IRS letter (CP 575 or 147C), or a signed W-9 showing the same EIN.',
    required: true,
  },
  {
    kind: 'job_description',
    label: 'Job description',
    hint: 'Optional. Helps us write the employment contract to match the role.',
    required: false,
  },
  {
    kind: 'other',
    label: 'Anything else',
    hint: 'Optional. A certificate of good standing, or anything you want us to have.',
    required: false,
  },
];

export function isDocumentKind(value: unknown): boolean {
  return typeof value === 'string' && DOCUMENT_KINDS.some((d) => d.kind === value);
}

export function missingRequiredDocuments(uploadedKinds: string[]): DocumentKind[] {
  const have = new Set(uploadedKinds);
  return DOCUMENT_KINDS.filter((d) => d.required && !have.has(d.kind));
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS = 12;

/**
 * Identify a file by its first bytes rather than trusting the browser's type or
 * the extension. These files are opened by Ensaar staff, so anything that is not
 * plainly a PDF or an image is refused.
 */
export function sniffDocumentType(bytes: Uint8Array): 'application/pdf' | 'image/png' | 'image/jpeg' | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg';
  return null;
}

/** Keep a filename displayable and safe inside a Content-Disposition header. */
export function cleanFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[^\w.\- ()]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120);
  return cleaned || 'document';
}

// --- Validation ---------------------------------------------------------------

export type Errors = Record<string, string>;
export type Result<T> = { ok: true; value: T } | { ok: false; errors: Errors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(body: Record<string, unknown>, key: string, max = 200): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function email(body: Record<string, unknown>, key: string): string {
  return text(body, key, 254).toLowerCase();
}

function isEmail(value: string): boolean {
  return EMAIL.test(value) && value.length <= 254;
}

export type HireInput = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  employeeName: string;
  employeeEmail: string | null;
  jobTitle: string;
  /** Annual gross, in whole rupees. */
  salaryInr: number;
  /** YYYY-MM-DD. */
  startDate: string;
  workState: string;
  monthlyFeeUsd: number;
  notes: string | null;
};

/** Salary floor and ceiling are sanity bounds against a slipped digit, not policy. */
export const MIN_SALARY_INR = 100_000;
export const MAX_SALARY_INR = 100_000_000;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** What Ensaar enters to start an onboarding. */
export function validateHire(input: unknown, now = new Date()): Result<HireInput> {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Errors = {};

  const companyName = text(body, 'companyName');
  const contactName = text(body, 'contactName', 120);
  const contactEmail = email(body, 'contactEmail');
  const employeeName = text(body, 'employeeName', 120);
  const employeeEmail = email(body, 'employeeEmail');
  const jobTitle = text(body, 'jobTitle', 120);
  const startDate = text(body, 'startDate', 10);
  const workState = text(body, 'workState', 60);
  const notes = text(body, 'notes', 1000);

  if (companyName.length < 2) errors.companyName = 'Enter the customer company name.';
  if (contactName.length < 2) errors.contactName = 'Enter the contact person’s name.';
  if (!isEmail(contactEmail)) errors.contactEmail = 'Enter a valid email address.';
  if (employeeName.length < 2) errors.employeeName = 'Enter the employee’s full name.';
  if (employeeEmail && !isEmail(employeeEmail)) errors.employeeEmail = 'Enter a valid email address, or leave it blank.';
  if (jobTitle.length < 2) errors.jobTitle = 'Enter the job title.';

  const salaryInr = Number(String(body.salaryInr ?? '').replace(/[,\s]/g, ''));
  if (!Number.isInteger(salaryInr) || salaryInr < MIN_SALARY_INR || salaryInr > MAX_SALARY_INR) {
    errors.salaryInr = 'Enter the annual gross salary in rupees, in whole numbers (for example 1800000).';
  }

  const monthlyFeeUsd = Number(body.monthlyFeeUsd);
  if (!Number.isInteger(monthlyFeeUsd) || monthlyFeeUsd < 1 || monthlyFeeUsd > 10_000) {
    errors.monthlyFeeUsd = 'Enter the monthly fee in whole US dollars.';
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? new Date(`${startDate}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || isoDay(parsed) !== startDate) {
    errors.startDate = 'Choose a start date.';
  } else {
    const latest = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (startDate < isoDay(now)) errors.startDate = 'The start date cannot be in the past.';
    else if (parsed > latest) errors.startDate = 'The start date must be within the next year.';
  }

  if (!(INDIA_STATES as readonly string[]).includes(workState)) errors.workState = 'Choose the state the employee will work from.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      companyName,
      contactName,
      contactEmail,
      employeeName,
      employeeEmail: employeeEmail || null,
      jobTitle,
      salaryInr,
      startDate,
      workState,
      monthlyFeeUsd,
      notes: notes || null,
    },
  };
}

export type CompanyDetails = {
  legalName: string;
  entityType: EntityType;
  incorporationState: string;
  /** Normalised to NN-NNNNNNN. */
  ein: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  website: string | null;
  signatoryName: string;
  signatoryTitle: string;
  signatoryEmail: string;
  billingEmail: string;
  /** The offer Ensaar entered is right. */
  confirmsHire: true;
  /** Not sanctioned, not owned or controlled by anyone who is. */
  confirmsSanctions: true;
  /** The employee will not habitually conclude contracts in the customer's name. */
  confirmsNoContracting: true;
};

/** Normalise an EIN to NN-NNNNNNN, or null if it cannot be one. */
export function normalizeEin(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{9}$/.test(digits) || digits.startsWith('00')) return null;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/** What the customer completes in the portal. */
export function validateCompany(input: unknown): Result<CompanyDetails> {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Errors = {};

  const legalName = text(body, 'legalName');
  const entityType = text(body, 'entityType', 20);
  const incorporationState = text(body, 'incorporationState', 2).toUpperCase();
  const ein = normalizeEin(text(body, 'ein', 20));
  const addressLine1 = text(body, 'addressLine1');
  const addressLine2 = text(body, 'addressLine2');
  const city = text(body, 'city', 100);
  const state = text(body, 'state', 2).toUpperCase();
  const zip = text(body, 'zip', 10);
  let website = text(body, 'website', 200);
  const signatoryName = text(body, 'signatoryName', 120);
  const signatoryTitle = text(body, 'signatoryTitle', 120);
  const signatoryEmail = email(body, 'signatoryEmail');
  const billingEmail = email(body, 'billingEmail');

  if (legalName.length < 2) errors.legalName = 'Enter the company’s legal name, exactly as registered.';
  if (!ENTITY_TYPES.some(([key]) => key === entityType)) errors.entityType = 'Choose the type of entity.';
  if (!US_STATE_CODES.has(incorporationState)) errors.incorporationState = 'Choose the state of incorporation.';
  if (!ein) errors.ein = 'Enter the 9-digit EIN, for example 12-3456789.';
  if (addressLine1.length < 3) errors.addressLine1 = 'Enter the registered street address.';
  if (city.length < 2) errors.city = 'Enter the city.';
  if (!US_STATE_CODES.has(state)) errors.state = 'Choose the state.';
  if (!/^\d{5}(-\d{4})?$/.test(zip)) errors.zip = 'Enter a 5-digit ZIP code.';
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try {
      const url = new URL(website);
      if (!url.hostname.includes('.')) throw new Error('no tld');
    } catch {
      errors.website = 'Enter a valid website, or leave it blank.';
    }
  }
  if (signatoryName.length < 2) errors.signatoryName = 'Enter the name of the person signing.';
  if (signatoryTitle.length < 2) errors.signatoryTitle = 'Enter their title, for example CEO.';
  if (!isEmail(signatoryEmail)) errors.signatoryEmail = 'Enter a valid email address.';
  if (!isEmail(billingEmail)) errors.billingEmail = 'Enter a valid email address for invoices.';
  if (body.confirmsHire !== true) errors.confirmsHire = 'Confirm the hire details, or tell us what is wrong.';
  if (body.confirmsSanctions !== true) errors.confirmsSanctions = 'This confirmation is required.';
  if (body.confirmsNoContracting !== true) errors.confirmsNoContracting = 'This confirmation is required.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      legalName,
      entityType: entityType as EntityType,
      incorporationState,
      ein: ein!,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      zip,
      website: website || null,
      signatoryName,
      signatoryTitle,
      signatoryEmail,
      billingEmail,
      confirmsHire: true,
      confirmsSanctions: true,
      confirmsNoContracting: true,
    },
  };
}

/**
 * The typed signature must be the signatory's name. Compared loosely (case,
 * spacing, punctuation) because the point is intent to sign as that person, not
 * a typing test.
 */
export function signatureMatches(typed: string, signatoryName: string): boolean {
  const norm = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return Boolean(norm(typed)) && norm(typed) === norm(signatoryName);
}

// --- Formatting -----------------------------------------------------------------

export function formatInr(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatUsd(value: number): string {
  return `US$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatDay(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
