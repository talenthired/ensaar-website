import type { Metadata } from 'next';
import { OnboardingPortal } from '@/components/eor/OnboardingPortal';

export const metadata: Metadata = {
  title: 'Onboarding - Ensaar',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

/**
 * The customer's EOR onboarding, at /onboard#<token>. Outside Basecamp because
 * the customer has no account: the token in the fragment is the credential,
 * read in the browser and checked by every API call.
 */
export default function OnboardPage() {
  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-16 print:bg-white print:pt-0">
      <div className="container-page mx-auto max-w-3xl">
        <OnboardingPortal />
      </div>
    </div>
  );
}
