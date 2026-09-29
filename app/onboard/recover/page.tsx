import type { Metadata } from 'next';
import { RecoverForm } from '@/components/eor/OnboardingPortal';

export const metadata: Metadata = {
  title: 'Get a new onboarding link - Ensaar',
  robots: { index: false, follow: false, nocache: true },
};

/** For a customer whose onboarding link expired or was lost (EOR-07). */
export default function RecoverPage() {
  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-16">
      <div className="container-page mx-auto max-w-xl">
        <div className="rounded-xl border border-line-subtle bg-bg-primary p-8">
          <span className="eyebrow">Ensaar onboarding</span>
          <h1 className="mt-3 text-2xl font-semibold text-ink-primary">Get a new onboarding link</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Links expire for your security. Enter your email and we will send a fresh one. Your saved details, documents
            and any signed agreement are kept.
          </p>
          <RecoverForm />
        </div>
      </div>
    </div>
  );
}
