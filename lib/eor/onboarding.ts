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

/*
 * A client is a company. It is verified once (details, documents, signatory)
 * and signs one master agreement. Each employee hired for it then has their
 * own Schedule A, signed by the customer's signatory and countersigned by
 * Ensaar, and their own onboarding checklist.
 */

export const COMPANY_STATUSES = ['invited', 'onboarding', 'changes_requested', 'signed', 'active', 'cancelled'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  invited: 'Invited',
  onboarding: 'Setting up',
  changes_requested: 'Changes requested',
  signed: 'Agreement signed, awaiting review',
  active: 'Active',
  cancelled: 'Cancelled',
};

/** The customer can change company details and documents only before the master agreement is signed. */
export function isCompanyEditable(status: CompanyStatus): boolean {
  return status === 'invited' || status === 'onboarding' || status === 'changes_requested';
}

/** The master agreement is signed (and possibly countersigned), so schedules can be signed. */
export function masterSigned(status: CompanyStatus): boolean {
  return status === 'signed' || status === 'active';
}

export const EMPLOYEE_STATUSES = ['draft', 'awaiting_signature', 'signed', 'onboarding', 'active', 'exited', 'cancelled'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/** As Ensaar staff see it. */
export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  draft: 'Draft',
  awaiting_signature: 'Awaiting customer signature',
  signed: 'Signed, to countersign',
  onboarding: 'Onboarding',
  active: 'Active',
  exited: 'Exited',
  cancelled: 'Cancelled',
};

/** As the customer sees it. Drafts are never shown to them. */
export const EMPLOYEE_STATUS_LABELS_CUSTOMER: Record<EmployeeStatus, string> = {
  draft: 'Being prepared',
  awaiting_signature: 'Awaiting your signature',
  signed: 'Signed, Ensaar reviewing',
  onboarding: 'Onboarding',
  active: 'Active',
  exited: 'Left',
  cancelled: 'Cancelled',
};

export function isEmployeeStatus(value: unknown): value is EmployeeStatus {
  return typeof value === 'string' && (EMPLOYEE_STATUSES as readonly string[]).includes(value);
}

/** Portal sign-in: a one-time link for signing in, a longer one for a first invitation. */
export const LOGIN_LINK_TTL_MINUTES = 30;
export const INVITE_LINK_TTL_DAYS = 14;
export const PORTAL_SESSION_DAYS = 14;

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
  // States
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
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
    kind: 'other',
    label: 'Anything else',
    hint: 'Optional. A certificate of good standing, or anything you want us to have.',
    required: false,
  },
];

export function isDocumentKind(value: unknown): boolean {
  return typeof value === 'string' && DOCUMENT_KINDS.some((d) => d.kind === value);
}

export const DOCUMENT_REVIEW = ['pending', 'accepted', 'rejected'] as const;
export type DocumentReview = (typeof DOCUMENT_REVIEW)[number];

/**
 * Required kinds with no usable file. A rejected file does not count: the
 * customer has to replace it. Pass plain kind strings (legacy callers) or
 * documents with a review status.
 */
export function missingRequiredDocuments(
  uploaded: Array<string | { kind: string; reviewStatus?: DocumentReview }>,
): DocumentKind[] {
  const have = new Set(
    uploaded
      .filter((d) => typeof d === 'string' || d.reviewStatus !== 'rejected')
      .map((d) => (typeof d === 'string' ? d : d.kind)),
  );
  return DOCUMENT_KINDS.filter((d) => d.required && !have.has(d.kind));
}

/** Required kinds that staff have not yet accepted. Approval needs this empty. */
export function unacceptedRequiredDocuments(uploaded: Array<{ kind: string; reviewStatus: DocumentReview }>): DocumentKind[] {
  const accepted = new Set(uploaded.filter((d) => d.reviewStatus === 'accepted').map((d) => d.kind));
  return DOCUMENT_KINDS.filter((d) => d.required && !accepted.has(d.kind));
}

/**
 * What still stands between a company and its signatory being asked to sign,
 * in words that finish "Still needed: ...". Empty means ready. Shared by
 * Basecamp (to offer "Send for signature") and the server (to refuse it).
 */
export function signatureBlockers(
  details: unknown,
  uploaded: Array<{ kind: string; reviewStatus?: DocumentReview }>,
): string[] {
  return [...(details ? [] : ['the company details']), ...missingRequiredDocuments(uploaded).map((d) => d.label)];
}

/**
 * What happens after countersignature. Approval opens this checklist so "the
 * agreement is signed" and "the employee is ready to start" are never confused.
 */
export const EMPLOYEE_STEPS = [
  { key: 'contract_issued', label: 'Employment contract issued to the employee' },
  { key: 'contract_signed', label: 'Employee signed the employment contract' },
  { key: 'identity', label: 'Identity, PAN and right to work verified' },
  { key: 'bank_tax', label: 'Bank and tax details collected' },
  { key: 'uan', label: 'Provident fund (UAN) linked' },
  { key: 'payroll', label: 'Added to payroll' },
  { key: 'equipment', label: 'Equipment and access arranged' },
  { key: 'first_day', label: 'First working day confirmed' },
] as const;
export type EmployeeStepKey = (typeof EMPLOYEE_STEPS)[number]['key'];
export type EmployeeCase = {
  owner: string | null;
  dueDate: string;
  steps: Record<string, { doneAt: string; doneBy: string } | null>;
};

export function isEmployeeStep(value: unknown): value is EmployeeStepKey {
  return typeof value === 'string' && EMPLOYEE_STEPS.some((s) => s.key === value);
}

/** Today's date in India, where the employment happens, as YYYY-MM-DD. */
export function todayInIndia(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

/**
 * Check that a file is structurally complete, not just correctly labelled.
 *
 * A file that merely starts with "%PDF-" used to count as a certificate. These
 * checks catch truncated, corrupt and password-protected files at upload, which
 * are the ones staff cannot open. They do not prove the file is the right
 * evidence: that is what the per-document staff review is for.
 */
export function validateDocumentBytes(
  bytes: Uint8Array,
): { ok: true; contentType: 'application/pdf' | 'image/png' | 'image/jpeg' } | { ok: false; reason: string } {
  const type = sniffDocumentType(bytes);
  if (!type) return { ok: false, reason: 'Upload a PDF, PNG or JPEG file.' };
  const tail = (n: number) => bytes.subarray(Math.max(0, bytes.length - n));
  // TextDecoder rather than Buffer: this module also runs in the browser. Only ASCII markers are checked.
  const latin1 = (b: Uint8Array) => new TextDecoder('latin1').decode(b);

  if (type === 'application/pdf') {
    const text = latin1(bytes);
    if (!latin1(tail(2048)).includes('%%EOF')) return { ok: false, reason: 'That PDF looks incomplete or damaged. Please export it again.' };
    if (!/\d+\s+\d+\s+obj\b/.test(text) || !/startxref/.test(text)) {
      return { ok: false, reason: 'That PDF looks incomplete or damaged. Please export it again.' };
    }
    if (/\/Encrypt\b/.test(text)) return { ok: false, reason: 'That PDF is password-protected. Please upload an unprotected copy.' };
    return { ok: true, contentType: type };
  }
  if (type === 'image/png') {
    const ihdr = latin1(bytes.subarray(12, 16)) === 'IHDR';
    if (!ihdr || !latin1(tail(12)).includes('IEND')) return { ok: false, reason: 'That image looks incomplete or damaged.' };
    return { ok: true, contentType: type };
  }
  // JPEG: must end with an end-of-image marker (allowing a little trailing padding).
  const end = tail(64);
  let hasEoi = false;
  for (let i = 0; i < end.length - 1; i++) if (end[i] === 0xff && end[i + 1] === 0xd9) hasEoi = true;
  if (!hasEoi || bytes.length < 128) return { ok: false, reason: 'That image looks incomplete or damaged.' };
  return { ok: true, contentType: type };
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

/** Salary floor and ceiling are sanity bounds against a slipped digit, not policy. */
export const MIN_SALARY_INR = 100_000;
export const MAX_SALARY_INR = 100_000_000;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fee(body: Record<string, unknown>, key: string, errors: Errors): number {
  const value = Number(String(body[key] ?? '').replace(/[$,\s]/g, ''));
  if (!Number.isInteger(value) || value < 1 || value > 10_000) errors[key] = 'Enter the monthly fee in whole US dollars.';
  return value;
}

export type CompanyInvite = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  /** The fee each new employee starts with; a hire can override it. */
  defaultFeeUsd: number;
  notes: string | null;
};

/** What Ensaar enters to invite a new client company. */
export function validateCompanyInvite(input: unknown): Result<CompanyInvite> {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Errors = {};
  const companyName = text(body, 'companyName');
  const contactName = text(body, 'contactName', 120);
  const contactEmail = email(body, 'contactEmail');
  const notes = text(body, 'notes', 1000);
  if (companyName.length < 2) errors.companyName = 'Enter the customer company name.';
  if (contactName.length < 2) errors.contactName = 'Enter the contact person’s name.';
  if (!isEmail(contactEmail)) errors.contactEmail = 'Enter a valid email address.';
  const defaultFeeUsd = fee(body, 'defaultFeeUsd', errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { companyName, contactName, contactEmail, defaultFeeUsd, notes: notes || null } };
}

export type EmployeeInput = {
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

/**
 * One employee's offer. `defaultFeeUsd` fills an empty fee, so a bulk import
 * of a hundred people does not need the fee on every row.
 */
export function validateEmployee(input: unknown, options: { now?: Date; defaultFeeUsd?: number } = {}): Result<EmployeeInput> {
  const now = options.now ?? new Date();
  const body = { ...((input && typeof input === 'object' ? input : {}) as Record<string, unknown>) };
  if ((body.monthlyFeeUsd === undefined || body.monthlyFeeUsd === '') && options.defaultFeeUsd) body.monthlyFeeUsd = options.defaultFeeUsd;
  const errors: Errors = {};

  const employeeName = text(body, 'employeeName', 120);
  const employeeEmail = email(body, 'employeeEmail');
  const jobTitle = text(body, 'jobTitle', 120);
  const startDate = text(body, 'startDate', 10);
  const workStateRaw = text(body, 'workState', 60);
  // Accept any capitalisation from a spreadsheet, store the canonical name.
  const workState = (INDIA_STATES as readonly string[]).find((s) => s.toLowerCase() === workStateRaw.toLowerCase()) ?? workStateRaw;
  const notes = text(body, 'notes', 1000);

  if (employeeName.length < 2) errors.employeeName = 'Enter the employee’s full name.';
  if (employeeEmail && !isEmail(employeeEmail)) errors.employeeEmail = 'Enter a valid email address, or leave it blank.';
  if (jobTitle.length < 2) errors.jobTitle = 'Enter the job title.';

  const salaryInr = Number(String(body.salaryInr ?? '').replace(/[₹,\s]/g, ''));
  if (!Number.isInteger(salaryInr) || salaryInr < MIN_SALARY_INR || salaryInr > MAX_SALARY_INR) {
    errors.salaryInr = 'Enter the annual gross salary in rupees, in whole numbers (for example 1800000).';
  }
  const monthlyFeeUsd = fee(body, 'monthlyFeeUsd', errors);

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? new Date(`${startDate}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || isoDay(parsed) !== startDate) {
    errors.startDate = 'Enter the start date as YYYY-MM-DD.';
  } else {
    const latest = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (startDate < todayInIndia(now)) errors.startDate = 'The start date cannot be in the past.';
    else if (parsed > latest) errors.startDate = 'The start date must be within the next year.';
  }

  if (!(INDIA_STATES as readonly string[]).includes(workState)) errors.workState = 'Choose the state or union territory the employee will work from.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { employeeName, employeeEmail: employeeEmail || null, jobTitle, salaryInr, startDate, workState, monthlyFeeUsd, notes: notes || null },
  };
}

/** Column names a spreadsheet might use, mapped to employee fields. */
const CSV_COLUMNS: Record<string, keyof EmployeeInput> = {
  name: 'employeeName', 'employee name': 'employeeName', 'full name': 'employeeName', employee: 'employeeName',
  email: 'employeeEmail', 'employee email': 'employeeEmail',
  title: 'jobTitle', 'job title': 'jobTitle', role: 'jobTitle', designation: 'jobTitle',
  salary: 'salaryInr', 'salary inr': 'salaryInr', 'annual salary': 'salaryInr', 'annual salary inr': 'salaryInr',
  'annual gross salary': 'salaryInr', 'annual gross salary inr': 'salaryInr', ctc: 'salaryInr', 'ctc inr': 'salaryInr',
  'start date': 'startDate', start: 'startDate', 'joining date': 'startDate', doj: 'startDate',
  state: 'workState', 'work state': 'workState', location: 'workState', 'works from': 'workState',
  fee: 'monthlyFeeUsd', 'monthly fee': 'monthlyFeeUsd', 'fee usd': 'monthlyFeeUsd', 'monthly fee usd': 'monthlyFeeUsd',
  notes: 'notes',
};

export const CSV_TEMPLATE = 'Name,Email,Job title,Annual salary INR,Start date,Work state,Monthly fee USD\nAnita Rao,anita@example.com,Senior Engineer,2400000,2026-11-02,Karnataka,199\n';

/** Split one CSV line, honouring double quotes (a comma inside "Rao, Anita" stays in the field). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/**
 * Parse an employee spreadsheet exported as CSV. Returns raw rows keyed by
 * employee field (validate each with validateEmployee) and the headers that
 * were not recognised, so the admin sees what was ignored.
 */
export function parseEmployeesCsv(csv: string): { rows: Array<Partial<Record<keyof EmployeeInput, string>>>; unknownHeaders: string[]; error?: string } {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], unknownHeaders: [], error: 'The file needs a header row and at least one employee.' };
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ').trim());
  const mapped = headers.map((h) => CSV_COLUMNS[h] ?? null);
  if (!mapped.includes('employeeName')) return { rows: [], unknownHeaders: [], error: 'No "Name" column found. Download the template to see the expected columns.' };
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Partial<Record<keyof EmployeeInput, string>> = {};
    mapped.forEach((key, i) => { if (key && cells[i] !== undefined && cells[i] !== '') row[key] = cells[i]; });
    return row;
  });
  return { rows, unknownHeaders: headers.filter((_, i) => !mapped[i]) };
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
  /** Not sanctioned, not owned or controlled by anyone who is. */
  confirmsSanctions: true;
  /** Employees hired through Ensaar will not habitually conclude contracts in the customer's name. */
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
