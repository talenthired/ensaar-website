'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { CompanyView } from '@/lib/eor/views';
import { isCompanyEditable, masterSigned } from '@/lib/eor/onboarding';
import { Notice, Tabs, useQueryState } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { CompanyDetailsForm, CompanyDocuments, MasterAgreement, type Say } from './CompanySetup';
import { PortalBar, SignIn } from './PortalChrome';
import { PortalBilling } from './PortalBilling';
import { PortalHolidays } from './PortalHolidays';
import { PortalLeave } from './PortalLeave';
import { PortalConcerns } from './PortalConcerns';
import { OwnershipDeclaration, StillNeeded } from './PortalOutstanding';
import { PortalEmployees } from './PortalEmployees';

function Step({ n, title, done, children, subtitle }: { n: number; title: string; done: boolean; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold', done ? 'bg-emerald-600 text-white' : 'bg-ink-primary text-bg-primary')}>
          {done ? <Check className="h-4 w-4" aria-hidden /> : n}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
          <p className="text-sm text-ink-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * The customer portal: sign in, set the company up once (details, documents,
 * agreement), then see and sign for every employee Ensaar employs for them.
 */
export function PortalApp() {
  const [view, setView] = useState<CompanyView | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [tabState, setTab] = useQueryState({ tab: 'overview' });

  const say: Say = useCallback((kind, text) => {
    setNotice({ kind, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const load = useCallback(async () => {
    const response = await fetch('/api/portal/company', { cache: 'no-store' });
    if (response.status === 401) return setSignedOut(true);
    if (!response.ok) return setNotice({ kind: 'error', text: 'Unable to load your portal. Reload to try again.' });
    setView(await response.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (signedOut) return <SignIn />;
  if (!view) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <PortalBar />
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-ink-secondary" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
        </p>
      </div>
    );
  }

  const signOut = async () => {
    await fetch('/api/portal/session', { method: 'DELETE' });
    setSignedOut(true);
  };

  const editable = isCompanyEditable(view.status);
  const detailsDone = Boolean(view.details);
  const docsDone = view.missingDocuments.length === 0;
  const agreementSigned = masterSigned(view.status);
  const tab = tabState.tab;
  const awaiting = view.counts.awaitingSignature;

  const signBlocked = !view.readyToSign
    ? 'The agreement is being finalised by our legal team. We will email you as soon as it is ready to sign.'
    : editingDetails
      ? 'Save or discard your company details first, then review the agreement.'
      : !detailsDone
        ? 'Finish the company details to sign. Documents can follow.'
        : null;

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PortalBar company={view.name} email={view.me.email} onSignOut={() => void signOut()} />
      <main className="container-page space-y-6 pt-8 pb-16">
        <div aria-live="polite">{notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}</div>

        {view.changesNote && (
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden /> Ensaar asked for changes
            </p>
            <p className="mt-1 whitespace-pre-line">{view.changesNote}</p>
          </div>
        )}

        <Tabs
          value={tab}
          onChange={(t) => setTab({ tab: t })}
          tabs={[
            { key: 'overview', label: 'Overview' },
            { key: 'employees', label: 'Employees', count: awaiting },
            { key: 'agreement', label: 'Agreement' },
            { key: 'documents', label: 'Documents' },
            { key: 'leave', label: 'Leave' },
            { key: 'holidays', label: 'Holidays' },
            { key: 'billing', label: 'Billing' },
          ]}
        />

        {tab === 'overview' && (
          <div className="space-y-6">
            <StillNeeded view={view} onSaved={setView} onOpenDocuments={() => setTab({ tab: 'documents' })} say={say} />
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ['Active', view.counts.active],
                ['Onboarding', view.counts.onboarding + view.counts.toCountersign],
                ['Awaiting signature', awaiting],
                ['Left', view.counts.exited],
              ].map(([label, value]) => (
                <button key={label} type="button" onClick={() => setTab({ tab: 'employees' })} className="rounded-xl border border-line-subtle bg-bg-primary p-4 text-left hover:bg-bg-tertiary">
                  <span className="block text-xs text-ink-secondary">{label}</span>
                  <span className="mt-1 block text-2xl font-semibold text-ink-primary">{value}</span>
                </button>
              ))}
            </div>

            {view.status === 'active' ? (
              <Notice kind="ok">
                Your agreement with Ensaar is in place. {awaiting ? `${awaiting} schedule${awaiting === 1 ? ' is' : 's are'} waiting for ${view.me.isSignatory ? 'your' : `${view.signatory?.name}'s`} signature in Employees.` : 'Each new employee appears in Employees with a schedule to sign.'}
              </Notice>
            ) : (
              <>
                {view.enteredByEnsaar && editable ? (
                  <Notice kind="warn">
                    To save you time, Ensaar entered {view.name}&apos;s company details{docsDone ? ' and uploaded its documents' : ''} from what you gave us.
                    Please check them, correct anything that is wrong, and then {view.me.isSignatory ? 'sign the agreement' : `${view.signatory?.name} signs the agreement`}. About two minutes.
                  </Notice>
                ) : (
                  <p className="text-sm text-ink-secondary">Three steps, once, before Ensaar can employ anyone for {view.name}. About ten minutes.</p>
                )}
                <Step n={1} title="Company details" done={detailsDone && !editingDetails} subtitle="Who we are contracting with, and who signs.">
                  <CompanyDetailsForm view={view} editable={editable} onSaved={setView} say={say} onEditing={setEditingDetails} />
                </Step>
                <Step n={2} title="Documents" done={docsDone} subtitle="PDF, PNG or JPEG, up to 10 MB each. If you do not have one yet, sign anyway and upload it later.">
                  <CompanyDocuments view={view} editable={editable} onChanged={load} say={say} />
                </Step>
                <Step
                  n={3}
                  title={agreementSigned ? 'Agreement signed' : 'Sign the agreement'}
                  done={agreementSigned}
                  subtitle={agreementSigned ? 'Ensaar is reviewing your documents and will countersign, usually within one working day.' :'The Employer of Record services agreement. Each employee is then added with a one-page Schedule A.'}
                >
                  <MasterAgreement view={view} blocked={signBlocked} onSigned={(v) => { setView(v); }} say={say} />
                </Step>
              </>
            )}
          </div>
        )}

        {tab === 'employees' && (
          <div className="space-y-6">
            <PortalEmployees view={view} say={say} onSigned={() => void load()} />
            {masterSigned(view.status) && <PortalConcerns say={say} />}
          </div>
        )}

        {tab === 'agreement' && (
          <section className="space-y-4">
            <p className="text-sm text-ink-secondary">
              {agreementSigned
                ? 'Your Employer of Record services agreement. Each employee\'s Schedule A is in Employees; open a person to read theirs.'
                : 'Your Employer of Record services agreement. Sign it from Overview once your details and documents are in.'}
            </p>
            <MasterAgreement view={view} blocked={signBlocked} onSigned={setView} say={say} />
          </section>
        )}

        {tab === 'leave' && <PortalLeave say={say} />}
        {tab === 'holidays' && <PortalHolidays say={say} />}

        {tab === 'billing' && <PortalBilling say={say} />}

        {tab === 'documents' && (
          <section className="space-y-3">
            <p className="text-sm text-ink-secondary">
              {editable ? 'Upload or replace your company documents.' : 'Your company documents, as reviewed by Ensaar. You can add one Ensaar still needs; to change one, write to Ensaar.'}
            </p>
            <CompanyDocuments view={view} editable={editable} onChanged={load} say={say} />
            <h2 className="pt-4 text-sm font-semibold text-ink-primary">Beneficial ownership</h2>
            <OwnershipDeclaration view={view} onSaved={setView} say={say} />
          </section>
        )}
      </main>
    </div>
  );
}
