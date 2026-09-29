import {
  entityTypeLabel,
  formatDay,
  formatInr,
  formatUsd,
  usStateName,
  type CompanyDetails,
  type HireInput,
} from './onboarding';

/**
 * The Employer of Record services agreement, generated from the onboarding record.
 *
 * Pure and deterministic: the same inputs always give the same text, so the hash
 * taken at signing identifies exactly what was signed, and the stored snapshot is
 * what Basecamp shows afterwards even if this template changes.
 *
 * The commercial terms mirror what ensaar.com publishes (flat monthly fee, no
 * setup fee, no deposit, no minimum term, statutory costs passed through at cost).
 * Bump AGREEMENT_VERSION whenever the wording changes.
 *
 * This template has not yet had a lawyer's review. Have Indian and US counsel read
 * it before the first customer signs, and record the review by bumping the version.
 */
export const AGREEMENT_VERSION = '2026-09-29';

export const ENSAAR_PARTY = {
  legalName: 'Ensaar Global Pvt. Ltd.',
  description: 'a private limited company incorporated in India, with its principal office in Hyderabad, Telangana',
};

export const PROBATION_MONTHS = 3;
export const NOTICE_DAYS = 30;

export type AgreementSection = { heading: string; paragraphs: string[] };
export type AgreementDocument = {
  version: string;
  title: string;
  parties: string[];
  sections: AgreementSection[];
  schedule: { label: string; value: string }[];
};

export function buildAgreement(hire: HireInput, company: CompanyDetails | null): AgreementDocument {
  const customerName = company?.legalName || hire.companyName;
  const customerDescription = company
    ? `a ${entityTypeLabel(company.entityType).toLowerCase()} organised under the laws of ${usStateName(company.incorporationState)}, with its registered address at ${[company.addressLine1, company.addressLine2, company.city, `${company.state} ${company.zip}`].filter(Boolean).join(', ')}, United States (EIN ${company.ein})`
    : 'a company organised in the United States (entity details to be completed during onboarding)';
  const fee = formatUsd(hire.monthlyFeeUsd);

  return {
    version: AGREEMENT_VERSION,
    title: 'Employer of Record Services Agreement',
    parties: [
      `${ENSAAR_PARTY.legalName}, ${ENSAAR_PARTY.description} ("Ensaar").`,
      `${customerName}, ${customerDescription} (the "Customer").`,
    ],
    sections: [
      {
        heading: '1. What this agreement does',
        paragraphs: [
          'The Customer wants the individual named in Schedule A (the "Employee") to work for it in India. Ensaar will employ the Employee in India as the legal employer, and the Employee will perform services for the Customer. Ensaar provides this service in India only.',
          'This agreement starts on the date the Customer signs it (the "Effective Date"). Further employees can be added by a new Schedule A signed by both parties, on the same terms.',
        ],
      },
      {
        heading: '2. What Ensaar does',
        paragraphs: [
          `Ensaar will: issue the Employee a written employment contract that complies with Indian law and carries the Customer's confidentiality and intellectual property terms; run monthly payroll and pay salary in Indian rupees; deduct, file and pay provident fund, employees' state insurance where it applies, professional tax and income tax (TDS); issue payslips and Form 16; maintain the statutory policies and registers an Indian employer must keep; and handle the Employee's onboarding and lawful exit. Unless agreed otherwise in Schedule A, the Employee will serve a probation period of ${PROBATION_MONTHS} months and either side may end employment on ${NOTICE_DAYS} days' notice, subject to Indian law.`,
          'Before the Employee starts, Ensaar will verify their identity, PAN and right to work in India, and keep those records for audit. Ensaar will give the Customer copies of payslips, challans and filing acknowledgements on request.',
        ],
      },
      {
        heading: '3. What the Customer does',
        paragraphs: [
          'The Customer directs the Employee\'s day-to-day work, sets their tasks and reviews their output. The Customer will not ask the Employee to do anything unlawful, and will tell Ensaar promptly about any performance, conduct or safety concern so that Ensaar, as employer, can deal with it lawfully. Decisions about pay changes, discipline or ending the employment are made by Ensaar on the Customer\'s instruction, in line with Indian law.',
          'The Customer will not authorise the Employee to negotiate or conclude contracts in the Customer\'s name, and will not treat any place in India as its own fixed place of business, without first agreeing it with Ensaar in writing. This is to avoid creating a permanent establishment of the Customer in India. Responsibility for the Customer\'s own tax position remains with the Customer.',
        ],
      },
      {
        heading: '4. Fees and payment',
        paragraphs: [
          `The Customer pays Ensaar a service fee of ${fee} per Employee per month (the "Service Fee"). There is no setup fee, no deposit and no minimum term. The Service Fee for a part month is pro-rated by calendar days.`,
          'The Customer also pays the Employment Costs: the Employee\'s gross salary and any bonus or allowance the Customer approves, the employer\'s statutory contributions (including provident fund, employees\' state insurance where it applies and gratuity accrual), and expenses the Customer approves. Employment Costs are passed through at cost, with no margin.',
          'Ensaar will invoice in US dollars by the 20th of each month for that month\'s Service Fee and Employment Costs, converting rupee amounts at the rate on the invoice date. Invoices are payable within 7 days, and in any case before the payroll date, by bank transfer. Each party bears its own bank charges. The services are an export of services from India and are invoiced without Indian GST where the law allows.',
        ],
      },
      {
        heading: '5. Intellectual property and confidentiality',
        paragraphs: [
          'Everything the Employee creates in the course of work for the Customer, including software, documents, designs and inventions, belongs to the Customer from the moment it is created. Ensaar assigns to the Customer, and will ensure the Employee\'s employment contract assigns to Ensaar for onward assignment, all rights in that work, and will sign any further document reasonably needed to record it.',
          'Each party will keep the other\'s confidential information confidential, use it only for this agreement, and protect it with at least reasonable care. This survives the end of the agreement.',
        ],
      },
      {
        heading: '6. Personal data',
        paragraphs: [
          'Ensaar processes the Employee\'s personal data as their employer, in line with India\'s Digital Personal Data Protection Act, 2023. It shares with the Customer only what the Customer needs to direct the work. The Customer will protect any personal data it receives, use it only for this engagement, and tell Ensaar promptly about any breach involving it.',
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
          'On ending, the Customer pays the Service Fee up to the Employee\'s last working day and all Employment Costs of a lawful exit, including notice pay, encashment of accrued leave and gratuity where it is payable. If the Customer wants to employ the Employee directly or through its own Indian entity, Ensaar will co-operate with the transfer and charges no conversion fee.',
        ],
      },
      {
        heading: '9. Liability',
        paragraphs: [
          'Neither party is liable for indirect or consequential loss, or loss of profit. Apart from the Customer\'s obligation to pay invoices, each party\'s total liability under this agreement is limited to the Service Fees paid or payable in the 12 months before the claim. None of these limits applies to fraud, to breach of confidentiality, or to a party\'s liability for its own breach of law.',
          'The Customer indemnifies Ensaar against claims caused by the Customer\'s instructions to the Employee. Ensaar indemnifies the Customer against penalties caused by Ensaar\'s failure to meet its statutory obligations as employer.',
        ],
      },
      {
        heading: '10. General',
        paragraphs: [
          'This agreement is governed by the laws of India. Any dispute that the parties cannot settle within 30 days will be resolved by arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator, seated in Hyderabad, conducted in English. This agreement, with its schedules, is the whole agreement on its subject. Changes must be in writing and signed by both parties.',
          'The parties agree that this agreement may be signed electronically, and that an electronic signature has the same effect as a handwritten one under India\'s Information Technology Act, 2000 and the United States ESIGN Act.',
        ],
      },
    ],
    schedule: [
      { label: 'Employee', value: hire.employeeName },
      { label: 'Job title', value: hire.jobTitle },
      { label: 'Place of work', value: `${hire.workState}, India` },
      { label: 'Start date', value: formatDay(hire.startDate) },
      { label: 'Annual gross salary', value: `${formatInr(hire.salaryInr)} (Indian rupees)` },
      { label: 'Service Fee', value: `${fee} per month` },
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
    'SCHEDULE A: EMPLOYEE',
    ...doc.schedule.map((row) => `${row.label}: ${row.value}`),
  ].join('\n');
}
