import { describe, expect, it } from 'vitest';
import { AGREEMENT_VERSION, agreementToText, buildAgreement } from '@/lib/eor/agreement';
import {
  INDIA_STATES,
  cleanFilename,
  missingRequiredDocuments,
  todayInIndia,
  unacceptedRequiredDocuments,
  validateDocumentBytes,
  normalizeEin,
  signatureMatches,
  sniffDocumentType,
  validateCompany,
  validateHire,
  type CompanyDetails,
  type HireInput,
} from '@/lib/eor/onboarding';
import { can } from '@/lib/basecamp/roles';
import { sameOriginMutation } from '@/lib/basecamp/guard';
import { EOR_PRICE_USD } from '@/lib/content/india';

const NOW = new Date('2026-09-29T10:00:00Z');

const hire = {
  companyName: 'Pristinno Tech',
  contactName: 'Jane Doe',
  contactEmail: 'Jane@Pristinnotech.com ',
  employeeName: 'Ravi Kumar',
  employeeEmail: '',
  jobTitle: 'Software Engineer',
  salaryInr: '18,00,000',
  startDate: '2026-10-15',
  workState: 'Telangana',
  monthlyFeeUsd: String(EOR_PRICE_USD),
  notes: '',
};

const company = {
  legalName: 'Pristinno Tech Inc.',
  entityType: 'c_corp',
  incorporationState: 'de',
  ein: '12 3456789',
  addressLine1: '1 Main Street',
  addressLine2: '',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  website: 'pristinnotech.com',
  signatoryName: 'Jane Doe',
  signatoryTitle: 'CEO',
  signatoryEmail: 'jane@pristinnotech.com',
  billingEmail: 'ap@pristinnotech.com',
  confirmsHire: true,
  confirmsSanctions: true,
  confirmsNoContracting: true,
};

describe('validateHire', () => {
  it('accepts a complete invite and normalises it', () => {
    const result = validateHire(hire, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.contactEmail).toBe('jane@pristinnotech.com');
    // Indian digit grouping is how the salary will be typed; it must still parse.
    expect(result.value.salaryInr).toBe(1_800_000);
    expect(result.value.employeeEmail).toBeNull();
    expect(result.value.monthlyFeeUsd).toBe(EOR_PRICE_USD);
  });

  it('names every missing field', () => {
    const result = validateHire({}, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const key of ['companyName', 'contactName', 'contactEmail', 'employeeName', 'jobTitle', 'salaryInr', 'startDate', 'workState', 'monthlyFeeUsd']) {
      expect(result.errors, key).toHaveProperty(key);
    }
  });

  it('refuses a salary with a slipped digit, a past start date and a non-Indian state', () => {
    const result = validateHire({ ...hire, salaryInr: '18000', startDate: '2026-09-01', workState: 'Texas' }, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['salaryInr', 'startDate', 'workState']);
  });

  it('refuses an impossible calendar date', () => {
    const result = validateHire({ ...hire, startDate: '2026-02-30' }, NOW);
    expect(result.ok).toBe(false);
  });
});

describe('validateCompany', () => {
  it('accepts a complete company and normalises EIN, state and website', () => {
    const result = validateCompany(company);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ein).toBe('12-3456789');
    expect(result.value.incorporationState).toBe('DE');
    expect(result.value.website).toBe('https://pristinnotech.com');
    expect(result.value.addressLine2).toBeNull();
  });

  it('requires every declaration to be explicitly true', () => {
    const result = validateCompany({ ...company, confirmsSanctions: 'true', confirmsNoContracting: false });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveProperty('confirmsSanctions');
    expect(result.errors).toHaveProperty('confirmsNoContracting');
  });

  it('refuses a malformed EIN and ZIP', () => {
    const result = validateCompany({ ...company, ein: '1234', zip: '7870' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveProperty('ein');
    expect(result.errors).toHaveProperty('zip');
  });

  it('normalises EINs', () => {
    expect(normalizeEin('123456789')).toBe('12-3456789');
    expect(normalizeEin('12-3456789')).toBe('12-3456789');
    expect(normalizeEin('00-1234567')).toBeNull();
    expect(normalizeEin('12-345678')).toBeNull();
  });
});

describe('documents', () => {
  it('requires the formation certificate and the EIN confirmation', () => {
    expect(missingRequiredDocuments([]).map((d) => d.kind)).toEqual(['formation', 'ein']);
    expect(missingRequiredDocuments(['formation', 'other'])).toHaveLength(1);
    expect(missingRequiredDocuments(['formation', 'ein'])).toHaveLength(0);
  });

  it('identifies files by content, not by name', () => {
    expect(sniffDocumentType(new TextEncoder().encode('%PDF-1.7 ...'))).toBe('application/pdf');
    expect(sniffDocumentType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(sniffDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    // An HTML file renamed to .pdf must not get through.
    expect(sniffDocumentType(new TextEncoder().encode('<html><script>'))).toBeNull();
  });

  it('keeps filenames safe for a Content-Disposition header', () => {
    expect(cleanFilename('C:\\fakepath\\cert "final".pdf')).toBe('cert _final_.pdf');
    expect(cleanFilename('../../etc/passwd')).toBe('passwd');
    expect(cleanFilename('')).toBe('document');
  });
});

describe('signatureMatches', () => {
  it('accepts the signatory name loosely', () => {
    expect(signatureMatches('  jane   doe ', 'Jane Doe')).toBe(true);
    expect(signatureMatches('Jane Doe.', 'Jane Doe')).toBe(true);
  });

  it('refuses anyone else, and an empty signature', () => {
    expect(signatureMatches('John Doe', 'Jane Doe')).toBe(false);
    expect(signatureMatches('', '')).toBe(false);
  });
});

describe('buildAgreement', () => {
  const validHire = (validateHire(hire, NOW) as { ok: true; value: HireInput }).value;
  const validCompany = (validateCompany(company) as { ok: true; value: CompanyDetails }).value;

  it('names both parties and carries the offer into Schedule A', () => {
    const text = agreementToText(buildAgreement(validHire, validCompany));
    expect(text).toContain('Ensaar Global Pvt. Ltd.');
    expect(text).toContain('Pristinno Tech Inc.');
    expect(text).toContain('EIN 12-3456789');
    expect(text).toContain('Delaware');
    expect(text).toContain('Ravi Kumar');
    expect(text).toContain('₹18,00,000');
    expect(text).toContain(`US$${EOR_PRICE_USD} per Employee per month`);
    expect(text).toContain(`Version ${AGREEMENT_VERSION}`);
  });

  it('matches the published commercial terms', () => {
    const text = agreementToText(buildAgreement(validHire, validCompany));
    expect(text).toContain('no setup fee, no deposit and no minimum term');
    expect(text).toContain('passed through at cost, with no margin');
  });

  it('is deterministic, so the hash at signing identifies the text', () => {
    const a = agreementToText(buildAgreement(validHire, validCompany));
    const b = agreementToText(buildAgreement({ ...validHire }, { ...validCompany }));
    expect(a).toBe(b);
  });

  it('renders a draft before the customer has entered company details', () => {
    const text = agreementToText(buildAgreement(validHire, null));
    expect(text).toContain('Pristinno Tech,');
  });
});

describe('client permissions', () => {
  it('limits EOR client data to owners and admins', () => {
    expect(can('owner', 'clients:write')).toBe(true);
    expect(can('admin', 'clients:write')).toBe(true);
    expect(can('editor', 'clients:read')).toBe(false);
    expect(can('viewer', 'clients:read')).toBe(false);
  });
});

describe('sameOriginMutation', () => {
  const req = (method: string, headers: Record<string, string>) => ({
    method,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  });

  it('lets reads through without an Origin', () => {
    expect(sameOriginMutation(req('GET', {}))).toBe(true);
  });

  it('accepts a change from the same host or the canonical site', () => {
    expect(sameOriginMutation(req('POST', { origin: 'http://localhost:3000', host: 'localhost:3000' }))).toBe(true);
    expect(sameOriginMutation(req('POST', { origin: 'https://ensaar.com', host: 'internal:8080' }))).toBe(true);
  });

  it('refuses a change from a sibling subdomain, another site, or with no Origin', () => {
    expect(sameOriginMutation(req('POST', { origin: 'https://verify.ensaar.com', host: 'ensaar.com' }))).toBe(false);
    expect(sameOriginMutation(req('DELETE', { origin: 'https://evil.example', host: 'ensaar.com' }))).toBe(false);
    expect(sameOriginMutation(req('PATCH', { host: 'ensaar.com' }))).toBe(false);
    expect(sameOriginMutation(req('POST', { origin: 'null', host: 'ensaar.com' }))).toBe(false);
  });
});

describe('lead permissions', () => {
  it('keeps a viewer from changing leads', () => {
    expect(can('viewer', 'leads:write')).toBe(false);
    expect(can('editor', 'leads:write')).toBe(true);
  });
});

describe('validateDocumentBytes (EOR-03)', () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  const pdf = (body = '1 0 obj\n<< /Type /Catalog >>\nendobj\n') =>
    enc(`%PDF-1.7\n${body}xref\n0 1\ntrailer\n<< /Root 1 0 R >>\nstartxref\n9\n%%EOF\n`);

  it('accepts a structurally complete PDF', () => {
    expect(validateDocumentBytes(pdf())).toEqual({ ok: true, contentType: 'application/pdf' });
  });

  it('rejects the corrupt file the audit used', () => {
    expect(validateDocumentBytes(enc('%PDF-not-a-document')).ok).toBe(false);
  });

  it('rejects a truncated PDF and a password-protected one', () => {
    const whole = pdf();
    expect(validateDocumentBytes(whole.subarray(0, whole.length - 10)).ok).toBe(false);
    const locked = validateDocumentBytes(pdf('1 0 obj\n<< /Encrypt 2 0 R >>\nendobj\n'));
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.reason).toMatch(/password/);
  });

  it('rejects a PNG without its end chunk and a JPEG without its end marker', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...new Array(40).fill(0)]);
    expect(validateDocumentBytes(png).ok).toBe(false);
    const withEnd = new Uint8Array([...png, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    expect(validateDocumentBytes(withEnd).ok).toBe(true);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(1)]);
    expect(validateDocumentBytes(jpeg).ok).toBe(false);
    expect(validateDocumentBytes(new Uint8Array([...jpeg, 0xff, 0xd9])).ok).toBe(true);
  });
});

describe('document review rules (EOR-02, GAP-01)', () => {
  it('does not count a rejected document as provided', () => {
    const docs = [
      { kind: 'formation', reviewStatus: 'rejected' as const },
      { kind: 'ein', reviewStatus: 'pending' as const },
    ];
    expect(missingRequiredDocuments(docs).map((d) => d.kind)).toEqual(['formation']);
  });

  it('requires staff to accept every required kind before approval', () => {
    expect(
      unacceptedRequiredDocuments([
        { kind: 'formation', reviewStatus: 'accepted' },
        { kind: 'ein', reviewStatus: 'pending' },
      ]).map((d) => d.kind),
    ).toEqual(['ein']);
    expect(
      unacceptedRequiredDocuments([
        { kind: 'formation', reviewStatus: 'accepted' },
        { kind: 'ein', reviewStatus: 'accepted' },
      ]),
    ).toHaveLength(0);
  });
});

describe('work locations (EOR-09)', () => {
  it('accepts every state and union territory, Sikkim included', () => {
    expect(INDIA_STATES).toHaveLength(36);
    for (const place of ['Sikkim', 'Ladakh', 'Lakshadweep', 'Arunachal Pradesh']) {
      expect(validateHire({ ...hire, workState: place }, NOW).ok, place).toBe(true);
    }
  });
});

describe('todayInIndia', () => {
  it('rolls over at Indian midnight, not UTC midnight', () => {
    expect(todayInIndia(new Date('2026-09-29T18:29:00Z'))).toBe('2026-09-29');
    expect(todayInIndia(new Date('2026-09-29T18:31:00Z'))).toBe('2026-09-30');
  });
});
