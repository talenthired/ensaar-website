import { INVOICE_DAY, LATE_INTEREST_PERCENT_PER_MONTH, PAYMENT_DAYS } from './billing';
import {
  entityTypeLabel,
  formatDay,
  formatInr,
  formatUsd,
  usStateName,
  type CompanyDetails,
  type EmployeeInput,
} from './onboarding';

/**
 * The Employer of Record agreement, in two parts:
 *
 *   - the master services agreement, signed once per client company, and
 *   - one Schedule A per employee, which names the person and their terms and
 *     is signed by both parties when they are hired.
 *
 * Both are pure and deterministic: the same inputs always give the same text,
 * so the hash taken at signing identifies exactly what was signed, and the
 * stored snapshot is what is shown afterwards even if this template changes.
 *
 * The commercial terms mirror what ensaar.com publishes (flat monthly fee, no
 * setup fee, no deposit, no minimum term, statutory costs passed through at cost).
 * Assets are the one thing not at cost: the Customer pays for them, and when
 * Ensaar buys, handles or ships one it recovers every cost plus PROCUREMENT_FEE_PERCENT.
 * The invoice date, payment term and late interest come from lib/eor/billing.ts,
 * which the reminder emails also read, so the two cannot drift apart.
 * Bump AGREEMENT_VERSION whenever the wording of either part changes: customers
 * cannot sign a version until an owner records its legal review in Basecamp.
 */
export const AGREEMENT_VERSION = '2026-09-30.1';

export const ENSAAR_PARTY = {
  legalName: 'Ensaar Global Pvt. Ltd.',
  description: 'a private limited company incorporated in India, with its principal office in Hyderabad, Telangana',
};

export const PROBATION_MONTHS = 3;
export const NOTICE_DAYS = 30;
/** Charged on the Asset Costs Ensaar incurs (a purchase price it paid, shipping, handling), on top of those costs. */
export const PROCUREMENT_FEE_PERCENT = 5;

export type AgreementSection = { heading: string; paragraphs: string[] };
export type AgreementDocument = {
  version: string;
  title: string;
  parties: string[];
  sections: AgreementSection[];
  schedule: { label: string; value: string }[];
};

function customerParty(companyName: string, company: CompanyDetails | null): string {
  const name = company?.legalName || companyName;
  const description = company
    ? `a ${entityTypeLabel(company.entityType).toLowerCase()} organised under the laws of ${usStateName(company.incorporationState)}, with its registered address at ${[company.addressLine1, company.addressLine2, company.city, `${company.state} ${company.zip}`].filter(Boolean).join(', ')}, United States (EIN ${company.ein})`
    : 'a company organised in the United States (entity details to be completed during onboarding)';
  return `${name}, ${description} (the "Customer").`;
}

/** The master services agreement, signed once per client company. */
export function buildMasterAgreement(companyName: string, company: CompanyDetails | null): AgreementDocument {
  return {
    version: AGREEMENT_VERSION,
    title: 'Employer of Record Services Agreement',
    parties: [`${ENSAAR_PARTY.legalName}, ${ENSAAR_PARTY.description} ("Ensaar").`, customerParty(companyName, company)],
    sections: [
      {
        heading: '1. What this agreement does',
        paragraphs: [
          'The Customer wants individuals to work for it in India. For each individual named in a Schedule A to this agreement signed by both parties (each an "Employee"), Ensaar will employ the Employee in India as the legal employer, and the Employee will perform services for the Customer. Ensaar provides this service in India only.',
          'This agreement starts on the date the Customer signs it (the "Effective Date"). Each Schedule A forms part of this agreement from the date both parties have signed it, and sets out that Employee\'s role, place of work, start date, salary and Service Fee.',
        ],
      },
      {
        heading: '2. What Ensaar does',
        paragraphs: [
          `For each Employee, Ensaar will: issue a written employment contract that complies with Indian law and carries the Customer's confidentiality and intellectual property terms; run monthly payroll and pay salary in Indian rupees; deduct, file and pay provident fund, employees' state insurance where it applies, professional tax and income tax (TDS); issue payslips and Form 16; maintain the statutory policies and registers an Indian employer must keep; and handle onboarding and lawful exit. Unless a Schedule A says otherwise, each Employee serves a probation period of ${PROBATION_MONTHS} months and either side may end employment on ${NOTICE_DAYS} days' notice, subject to Indian law.`,
          'Before an Employee starts, Ensaar will verify their identity, PAN and right to work in India, and keep those records for audit. Ensaar will give the Customer copies of payslips, challans and filing acknowledgements on request.',
        ],
      },
      {
        heading: '3. What the Customer does',
        paragraphs: [
          'The Customer directs each Employee\'s day-to-day work, sets their tasks and reviews their output. The Customer will not ask an Employee to do anything unlawful, and will tell Ensaar promptly about any performance, conduct or safety concern so that Ensaar, as employer, can deal with it lawfully. Decisions about pay changes, discipline or ending an employment are made by Ensaar on the Customer\'s instruction, in line with Indian law.',
          'The Customer will not authorise any Employee to negotiate or conclude contracts in the Customer\'s name, and will not treat any place in India as its own fixed place of business, without first agreeing it with Ensaar in writing. This is to avoid creating a permanent establishment of the Customer in India. Responsibility for the Customer\'s own tax position remains with the Customer.',
        ],
      },
      {
        heading: '4. Fees and payment',
        paragraphs: [
          'For each Employee the Customer pays Ensaar the monthly service fee stated in that Employee\'s Schedule A (the "Service Fee"). There is no setup fee, no deposit and no minimum term. The Service Fee for a part month is pro-rated by calendar days.',
          'The Customer also pays the Employment Costs of each Employee: gross salary and any bonus or allowance the Customer approves, the employer\'s statutory contributions (including provident fund, employees\' state insurance where it applies and gratuity accrual), and expenses the Customer approves. Employment Costs are passed through at cost, with no margin.',
          `The Customer pays for every asset an Employee needs for the work, whether digital or physical, such as a laptop (each an "Asset"). If the Customer asks Ensaar to arrange the purchase of an Asset, the Customer reimburses Ensaar the full purchase price. Whether the Customer or Ensaar buys an Asset, the Customer also reimburses every cost Ensaar incurs in procuring, handling or shipping it, including shipping costs and any other administrative or miscellaneous cost. The purchase price Ensaar pays and those other costs are together the "Asset Costs". Asset Costs are not Employment Costs: in addition to reimbursing them, the Customer pays Ensaar a procurement fee of ${PROCUREMENT_FEE_PERCENT}% of the Asset Costs (the "Procurement Fee").`,
          `Ensaar will invoice in US dollars on the ${INVOICE_DAY}th of each month for that month's Service Fees and Employment Costs, and for any Asset Costs and Procurement Fee incurred since the last invoice, converting rupee amounts at the rate on the invoice date. Each invoice is payable within ${PAYMENT_DAYS} days of its date, by bank transfer. Each party bears its own bank charges. The services are an export of services from India and are invoiced without Indian GST where the law allows.`,
          `Ensaar pays each month's salaries and statutory dues out of the Customer's payment, and is not obliged to advance or fund any Employment Cost. The Customer acknowledges that until an invoice is paid in full the Employees' salaries for that month cannot be paid, so a late payment by the Customer delays its Employees' pay. Any amount not paid by its due date carries interest at ${LATE_INTEREST_PERCENT_PER_MONTH}% per month, calculated daily from the due date until it is paid, which Ensaar adds to the next invoice. The Customer indemnifies Ensaar against any interest, penalty, damages or claim that arises because salary or statutory dues were paid late as a result of the Customer's late payment.`,
        ],
      },
      {
        heading: '5. Intellectual property and confidentiality',
        paragraphs: [
          'Everything an Employee creates in the course of work for the Customer, including software, documents, designs and inventions, belongs to the Customer from the moment it is created. Ensaar assigns to the Customer, and will ensure each employment contract assigns to Ensaar for onward assignment, all rights in that work, and will sign any further document reasonably needed to record it.',
          'Each party will keep the other\'s confidential information confidential, use it only for this agreement, and protect it with at least reasonable care. This survives the end of the agreement.',
        ],
      },
      {
        heading: '6. Personal data',
        paragraphs: [
          'Ensaar processes each Employee\'s personal data as their employer, in line with India\'s Digital Personal Data Protection Act, 2023. It shares with the Customer only what the Customer needs to direct the work. The Customer will protect any personal data it receives, use it only for this engagement, and tell Ensaar promptly about any breach involving it.',
        ],
      },
      {
        heading: '7. Compliance',
        paragraphs: [
          'Ensaar will comply with the Indian employment, payroll and tax laws that apply to it as employer. The Customer confirms that it, and anyone who owns or controls it, is not the subject of sanctions administered by the United States, the United Nations, the European Union, the United Kingdom or India, and that the engagement does not break any export control or sanctions law. Each party will comply with applicable anti-bribery laws.',
        ],
      },
      {
        heading: '8. Ending the agreement',
        paragraphs: [
          `Either party may end this agreement, or the arrangement for any one Employee, on ${NOTICE_DAYS} days' written notice. Either party may end it immediately by notice if the other materially breaches it and does not fix the breach within 15 days of being told, or if an invoice remains unpaid 15 days after it was due.`,
          'When an Employee\'s arrangement ends, the Customer pays the Service Fee up to that Employee\'s last working day and all Employment Costs of a lawful exit, including notice pay, encashment of accrued leave and gratuity where it is payable. If the Customer wants to employ an Employee directly or through its own Indian entity, Ensaar will co-operate with the transfer and charges no conversion fee.',
        ],
      },
      {
        heading: '9. Liability',
        paragraphs: [
          'Neither party is liable for indirect or consequential loss, or loss of profit. Apart from the Customer\'s obligation to pay invoices, each party\'s total liability under this agreement is limited to the Service Fees paid or payable in the 12 months before the claim. None of these limits applies to fraud, to breach of confidentiality, or to a party\'s liability for its own breach of law.',
          'The Customer indemnifies Ensaar against claims caused by the Customer\'s instructions to an Employee. Ensaar indemnifies the Customer against penalties caused by Ensaar\'s failure to meet its statutory obligations as employer.',
        ],
      },
      {
        heading: '10. General',
        paragraphs: [
          'This agreement is governed by the laws of India. Any dispute that the parties cannot settle within 30 days will be resolved by arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator, seated in Hyderabad, conducted in English. This agreement, with its Schedules, is the whole agreement on its subject. Changes must be in writing and signed by both parties.',
          'The parties agree that this agreement and each Schedule may be signed electronically, and that an electronic signature has the same effect as a handwritten one under India\'s Information Technology Act, 2000 and the United States ESIGN Act.',
        ],
      },
    ],
    schedule: [],
  };
}

/**
 * One employee's Schedule A. It names the master agreement it belongs to by
 * version and fingerprint, so a schedule can never be read against a different
 * master text than the one the Customer signed.
 */
export function buildSchedule(input: {
  number: number;
  companyName: string;
  company: CompanyDetails | null;
  masterHash: string | null;
  employee: EmployeeInput;
}): AgreementDocument {
  const { employee } = input;
  const customer = input.company?.legalName || input.companyName;
  return {
    version: AGREEMENT_VERSION,
    title: `Schedule A-${input.number} to the Employer of Record Services Agreement`,
    parties: [`${ENSAAR_PARTY.legalName} ("Ensaar") and ${customer} (the "Customer").`],
    sections: [
      {
        heading: 'This Schedule',
        paragraphs: [
          `This Schedule A-${input.number} forms part of the Employer of Record Services Agreement between Ensaar and the Customer${input.masterHash ? ` (document fingerprint ${input.masterHash.slice(0, 16)})` : ''}, from the date both parties have signed it. The individual named below is an "Employee" under that agreement, on the terms below and otherwise on the terms of the agreement.`,
        ],
      },
    ],
    schedule: [
      { label: 'Employee', value: employee.employeeName },
      { label: 'Job title', value: employee.jobTitle },
      { label: 'Place of work', value: `${employee.workState}, India` },
      { label: 'Start date', value: formatDay(employee.startDate) },
      { label: 'Annual gross salary', value: `${formatInr(employee.salaryInr)} (Indian rupees)` },
      { label: 'Service Fee', value: `${formatUsd(employee.monthlyFeeUsd)} per month` },
      { label: 'Probation', value: `${PROBATION_MONTHS} months` },
      { label: 'Notice period', value: `${NOTICE_DAYS} days` },
    ],
  };
}

/** The canonical plain text, which is what is hashed and stored at signing. */
export function agreementToText(doc: AgreementDocument): string {
  return [
    doc.title.toUpperCase(),
    `Version ${doc.version}`,
    '',
    'BETWEEN',
    ...doc.parties,
    '',
    ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs, '']),
    ...(doc.schedule.length ? ['EMPLOYEE', ...doc.schedule.map((row) => `${row.label}: ${row.value}`)] : []),
  ].join('\n');
}
