import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { siteConfig } from '@/lib/utils';

export const runtime = 'nodejs';

// Social share image (1200x630). Referenced by every page's metadata via ogImageFor(),
// which passes the page title so each URL gets a distinct card instead of the whole
// site sharing one image. No params falls back to the site-wide default.
export function GET(request: NextRequest): ImageResponse {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || siteConfig.tagline).slice(0, 110);
  const eyebrow = (searchParams.get('eyebrow') || '').slice(0, 42);
  const subtitle =
    searchParams.get('subtitle') ||
    'Enterprise AI implementation, practical enablement, and the DailyByte™ platform.';

  // Long titles need to step down a size or they overflow the 630px canvas.
  const titleSize = title.length > 78 ? 46 : title.length > 46 ? 56 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0c2343',
          color: '#ffffff',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>
          <span style={{ color: '#29E7F2' }}>Ensaar</span>
          <span style={{ marginLeft: 12, color: '#ffffff' }}>Global</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#f5a623',
                marginBottom: 20,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 28, color: '#9fb3c8', marginTop: 24 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', width: 240, height: 14, background: '#29E7F2', borderRadius: 7 }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
