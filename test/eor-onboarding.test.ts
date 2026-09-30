import { describe, expect, it } from 'vitest';
import { AGREEMENT_VERSION, agreementToText, buildMasterAgreement, buildSchedule } from '@/lib/eor/agreement';
import {
  CSV_TEMPLATE,
  INDIA_STATES,
  cleanFilename,
  missingRequiredDocuments,
  normalizeEin,
  parseEmployeesCsv,
  signatureBlockers,
  signatureMatches,
  sniffDocumentType,
  todayInIndia,
  unacceptedRequiredDocuments,
  validateCompany,
  validateCompanyInvite,
  validateDocumentBytes,
  validateEmployee,
  type CompanyDetails,
  type EmployeeInput,
} from '@/lib/eor/onboarding';
import { signRequestEmail } from '@/lib/eor/email';
import { can } from '@/lib/basecamp/roles';
import { sameOriginMutation } from '@/lib/basecamp/guard';
import { EOR_PRICE_USD } from '@/lib/content/india';

const NOW = new Date('2026-09-29T10:00:00Z');

const hire = {
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
  confirmsSanctions: true,
  confirmsNoContracting: true,
};

describe('validateCompanyInvite', () => {
  it('accepts a new client and normalises the email', () => {
    const r = validateCompanyInvite({ companyName: 'Pristinno Tech', contactName: 'Jane Doe', contactEmail: 'Jane@Pristinnotech.com ', defaultFeeUsd: '$199' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.contactEmail).toBe('jane@pristinnotech.com');
      expect(r.value.defaultFeeUsd).toBe(199);
    }
  });

  it('names every missing field', () => {
    const r = validateCompanyInvite({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['companyName', 'contactEmail', 'contactName', 'defaultFeeUsd']);
  });
});

describe('validateEmployee', () => {
  it('accepts a complete offer and normalises it', () => {
    const result = validateEmployee(hire, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Indian digit grouping is how the salary will be typed; it must still parse.
    expect(result.value.salaryInr).toBe(1_800_000);
    expect(result.value.employeeEmail).toBeNull();
    expect(result.value.monthlyFeeUsd).toBe(EOR_PRICE_USD);
  });

  it('fills an empty fee from the client default', () => {
    const result = validateEmployee({ ...hire, monthlyFeeUsd: '' }, { now: NOW, defaultFeeUsd: 249 });
    expect(result.ok && result.value.monthlyFeeUsd).toBe(249);
  });

  it('accepts a work state in any capitalisation and stores the canonical name', () => {
    const result = validateEmployee({ ...hire, workState: 'tamil nadu' }, { now: NOW });
    expect(result.ok && result.value.workState).toBe('Tamil Nadu');
  });

  it('refuses a salary with a slipped digit, a past start date and a non-Indian state', () => {
    const result = validateEmployee({ ...hire, salaryInr: '18000', startDate: '2026-09-01', workState: 'Texas' }, { now: NOW });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['salaryInr', 'startDate', 'workState']);
  });

  it('refuses an impossible calendar date', () => {
    expect(validateEmployee({ ...hire, startDate: '2026-02-30' }, { now: NOW }).ok).toBe(false);
  });
});

describe('parseEmployeesCsv', () => {
  it('maps common header names, honours quotes and reports ignored columns', () => {
    const csv = '\uFEFFFull Name,Email,Designation,CTC,Joining Date,Location,Department\r\n"Rao, Anita",anita@x.com,Engineer,"24,00,000",2026-11-02,karnataka,R&D\r\nRavi Kumar,,QA,1800000,2026-11-09,Telangana,QA\r\n';
    const parsed = parseEmployeesCsv(csv);
    expect(parsed.error).toBeUndefined();
    expect(parsed.unknownHeaders).toEqual(['department']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({ employeeName: 'Rao, Anita', salaryInr: '24,00,000', workState: 'karnataka' });
    const checked = parsed.rows.map((r) => validateEmployee(r, { now: NOW, defaultFeeUsd: 199 }));
    expect(checked.every((c) => c.ok)).toBe(true);
  });

  it('accepts its own downloadable template with every column recognised', () => {
    const parsed = parseEmployeesCsv(CSV_TEMPLATE);
    expect(parsed.error).toBeUndefined();
    expect(parsed.unknownHeaders).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(validateEmployee(parsed.rows[0], { now: NOW }).ok).toBe(true);
  });

  it('refuses a file without a name column or without rows', () => {
    expect(parseEmployeesCsv('Email,Salary\na@b.com,1').error).toMatch(/Name/);
    expect(parseEmployeesCsv('Name,Email\n').error).toMatch(/at least one/);
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

describe('the agreement: master and Schedule A', () => {
  const employee = (validateEmployee(hire, { now: NOW }) as { ok: true; value: EmployeeInput }).value;
  const details = (validateCompany(company) as { ok: true; value: CompanyDetails }).value;

  it('the master names both parties, the published terms, and no individual', () => {
    const text = agreementToText(buildMasterAgreement('Pristinno Tech', details));
    expect(text).toContain('Ensaar Global Pvt. Ltd.');
    expect(text).toContain('Pristinno Tech Inc.');
    expect(text).toContain('EIN 12-3456789');
    expect(text).toContain('Delaware');
    expect(text).toContain('no setup fee, no deposit and no minimum term');
    expect(text).toContain('passed through at cost, with no margin');
    expect(text).toContain('each an "Employee"');
    expect(text).not.toContain('Ravi Kumar');
    expect(text).toContain(`Version ${AGREEMENT_VERSION}`);
  });

  it('makes the Customer pay for assets, and Ensaar\'s costs of handling them plus 5%', () => {
    const doc = buildMasterAgreement('Pristinno Tech', details);
    const fees = doc.sections.find((s) => s.heading === '4. Fees and payment')!.paragraphs.join('\n');
    expect(fees).toContain('whether digital or physical, such as a laptop');
    expect(fees).toContain('reimburses Ensaar the full purchase price');
    expect(fees).toContain('procuring, handling or shipping it');
    expect(fees).toContain('a procurement fee of 5% of the Asset Costs');
    // Salary and statutory costs stay at cost; only assets carry the fee.
    expect(fees).toContain('Employment Costs are passed through at cost, with no margin.');
    expect(fees).toContain('Asset Costs are not Employment Costs');
    expect(fees).toContain('any Asset Costs and Procurement Fee incurred since the last invoice');
  });

  it('a schedule names one employee, their terms, and the master it belongs to', () => {
    const text = agreementToText(buildSchedule({ number: 7, companyName: 'Pristinno Tech', company: details, masterHash: 'a'.repeat(64), employee }));
    expect(text).toContain('SCHEDULE A-7 TO THE EMPLOYER OF RECORD SERVICES AGREEMENT');
    expect(text).toContain('Ravi Kumar');
    expect(text).toContain('₹18,00,000');
    expect(text).toContain(`US$${EOR_PRICE_USD} per month`);
    expect(text).toContain('aaaaaaaaaaaaaaaa');
  });

  it('is deterministic, so the hash at signing identifies the text', () => {
    const a = agreementToText(buildSchedule({ number: 1, companyName: 'X', company: details, masterHash: null, employee }));
    const b = agreementToText(buildSchedule({ number: 1, companyName: 'X', company: { ...details }, masterHash: null, employee: { ...employee } }));
    expect(a).toBe(b);
  });

  it('renders a draft master before the customer has entered company details', () => {
    expect(agreementToText(buildMasterAgreement('Pristinno Tech', null))).toContain('Pristinno Tech,');
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

describe('assisted onboarding: Ensaar enters, the customer signs', () => {
  const details = validateCompany(company);

  it('is not ready for signature until the details and both required documents are in', () => {
    expect(signatureBlockers(null, [])).toEqual([
      'the company details',
      'Certificate of incorporation or formation',
      'EIN confirmation',
    ]);
    expect(details.ok && signatureBlockers(details.value, [{ kind: 'formation', reviewStatus: 'pending' }])).toEqual(['EIN confirmation']);
    expect(
      details.ok &&
        signatureBlockers(details.value, [
          { kind: 'formation', reviewStatus: 'pending' },
          { kind: 'ein', reviewStatus: 'accepted' },
        ]),
    ).toEqual([]);
  });

  it('does not count a rejected document, whoever uploaded it', () => {
    expect(
      details.ok &&
        signatureBlockers(details.value, [
          { kind: 'formation', reviewStatus: 'rejected' },
          { kind: 'ein', reviewStatus: 'accepted' },
        ]),
    ).toEqual(['Certificate of incorporation or formation']);
  });

  it('tells the signatory when Ensaar entered the details they are about to vouch for', () => {
    const link = 'https://ensaar.com/portal/auth#token';
    const assisted = signRequestEmail({ name: 'Jane Doe', companyName: 'Pristinno Tech Inc.', link, assisted: true });
    expect(assisted.text).toContain('Ensaar has entered');
    expect(assisted.text).toContain('check them and sign');
    expect(assisted.text).toContain(link);
    const own = signRequestEmail({ name: 'Jane Doe', companyName: 'Pristinno Tech Inc.', link, assisted: false });
    expect(own.text).not.toContain('Ensaar has entered');
    expect(own.subject).toBe(assisted.subject);
  });
});

describe('work locations (EOR-09)', () => {
  it('accepts every state and union territory, Sikkim included', () => {
    expect(INDIA_STATES).toHaveLength(36);
    for (const place of ['Sikkim', 'Ladakh', 'Lakshadweep', 'Arunachal Pradesh']) {
      expect(validateEmployee({ ...hire, workState: place }, { now: NOW }).ok, place).toBe(true);
    }
  });
});

describe('todayInIndia', () => {
  it('rolls over at Indian midnight, not UTC midnight', () => {
    expect(todayInIndia(new Date('2026-09-29T18:29:00Z'))).toBe('2026-09-29');
    expect(todayInIndia(new Date('2026-09-29T18:31:00Z'))).toBe('2026-09-30');
  });
});
