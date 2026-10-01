import 'server-only';

import { AGREEMENT_VERSION, agreementToText } from './agreement';
import {
  employeeCounts,
  getSignedMasterText,
  getTemplateApproval,
  listCompanyDocuments,
  masterDraft,
  sha256,
  type EorCompany,
} from './companies';
import { getScheduleText, type EorEmployee } from './employees';
import { employeeSteps, missingRequiredDocuments } from './onboarding';
import type { PortalContext } from './portal-auth';

/*
 * What a customer sees. Deliberately a subset of the record: no internal notes,
 * no signer IP addresses, no reviewer or creator identities, and never a draft
 * employee Ensaar has not sent yet.
 */

export async function companyView(company: EorCompany, ctx: PortalContext) {
  const [documents, approval, counts] = await Promise.all([
    listCompanyDocuments(company.id),
    getTemplateApproval(AGREEMENT_VERSION),
    employeeCounts(company.id),
  ]);
  const signed = Boolean(company.signedAt);
  const draft = masterDraft(company);
  const draftText = agreementToText(draft);
  const signatory = company.company ? { name: company.company.signatoryName, email: company.company.signatoryEmail } : null;
  return {
    id: company.id,
    status: company.status,
    name: company.company?.legalName ?? company.companyName,
    details: company.company,
    // Whether, not who: the customer is told to check what Ensaar entered for them.
    enteredByEnsaar: Boolean(company.company && company.detailsEnteredBy),
    changesNote: company.status === 'changes_requested' ? company.changesNote : null,
    me: { email: ctx.user.email, name: ctx.user.name, isSignatory: Boolean(signatory && signatory.email.toLowerCase() === ctx.user.email.toLowerCase()) },
    signatory,
    documents: documents.map((d) => ({
      id: d.id,
      kind: d.kind,
      filename: d.filename,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt,
      reviewStatus: d.reviewStatus,
      reviewNote: d.reviewStatus === 'rejected' ? d.reviewNote : null,
    })),
    missingDocuments: missingRequiredDocuments(documents).map((d) => d.kind),
    // Nobody can sign a version without a recorded legal review.
    readyToSign: Boolean(approval),
    master: {
      draft,
      draftHash: signed ? null : sha256(draftText),
      text: signed ? await getSignedMasterText(company.id) : draftText,
      signature: signed
        ? {
            name: company.signedName,
            title: company.signedTitle,
            at: company.signedAt,
            hash: company.agreementHash,
            countersignedBy: company.countersignedBy,
            countersignedAt: company.countersignedAt,
          }
        : null,
    },
    counts: { ...counts, draft: undefined },
  };
}

export type CompanyView = Awaited<ReturnType<typeof companyView>>;

export function employeeListItem(e: EorEmployee) {
  return {
    id: e.id,
    status: e.status,
    employeeName: e.employeeName,
    jobTitle: e.jobTitle,
    workState: e.workState,
    pricing: e.pricing,
    // Under loaded pricing the customer is shown one amount. The salary and the fee inside it are Ensaar's.
    salaryInr: e.pricing === 'loaded' ? null : e.salaryInr,
    startDate: e.startDate,
    monthlyFeeUsd: e.pricing === 'loaded' ? null : e.monthlyFeeUsd,
    loadedCostUsd: e.pricing === 'loaded' ? e.loadedCostUsd : null,
    depositRequired: e.depositRequired,
    scheduleNumber: e.scheduleNumber,
    scheduleHash: e.status === 'awaiting_signature' ? e.scheduleHash : null,
    progress: e.employeeCase
      ? { done: Object.values(e.employeeCase.steps).filter(Boolean).length, total: employeeSteps(e).length }
      : null,
    exitDate: e.exitDate,
  };
}

export type EmployeeListItem = ReturnType<typeof employeeListItem>;

export async function employeeDetail(e: EorEmployee) {
  return {
    ...employeeListItem(e),
    employeeEmail: e.employeeEmail,
    scheduleText: e.scheduleNumber ? await getScheduleText(e.id) : null,
    signature: e.signedAt
      ? { name: e.signedName, email: e.signedEmail, at: e.signedAt, countersignedBy: e.countersignedBy, countersignedAt: e.countersignedAt, hash: e.scheduleHash }
      : null,
    steps: e.employeeCase ? employeeSteps(e).map((s) => ({ key: s.key, label: s.label, done: Boolean(e.employeeCase?.steps[s.key]) })) : null,
    exitReason: null,
  };
}

export type EmployeeDetail = Awaited<ReturnType<typeof employeeDetail>>;
