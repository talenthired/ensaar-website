export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  const devEval = isDevelopment ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${devEval} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://verify.ensaar.com https://www.googletagmanager.com https://www.google-analytics.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}
