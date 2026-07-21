export type AdvisorIntent = 'enterprise' | 'individual' | 'institution';

type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, AnalyticsValue>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, properties: Record<string, AnalyticsValue> = {}) {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...properties });
  window.gtag?.('event', event, properties);
}

export function openAdvisor(intent?: AdvisorIntent, source = 'website') {
  if (typeof window === 'undefined') return;
  trackEvent('advisor_open_requested', { intent, source });
  window.dispatchEvent(
    new CustomEvent('ensaar:open-advisor', {
      detail: { intent, source },
    }),
  );
}

