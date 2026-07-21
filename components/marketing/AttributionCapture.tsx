'use client';

import { useEffect } from 'react';

export const ATTRIBUTION_KEY = 'ensaar-attribution';

export type Attribution = {
  landingPage: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

export function AttributionCapture() {
  useEffect(() => {
    if (window.sessionStorage.getItem(ATTRIBUTION_KEY)) return;
    const query = new URLSearchParams(window.location.search);
    const attribution: Attribution = {
      landingPage: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer,
      utmSource: query.get('utm_source') || '',
      utmMedium: query.get('utm_medium') || '',
      utmCampaign: query.get('utm_campaign') || '',
    };
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  }, []);

  return null;
}

export function readAttribution(): Attribution {
  try {
    return JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || '{}') as Attribution;
  } catch {
    return {} as Attribution;
  }
}
