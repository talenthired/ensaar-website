import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/utils';

export const runtime = 'nodejs';

// Site-wide social share image (1200x630). Referenced as siteConfig.url + "/og"
// by the metadata, so every page has a valid Open Graph / Twitter card image.
export function GET(): ImageResponse {
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
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05 }}>{siteConfig.tagline}</div>
          <div style={{ fontSize: 30, color: '#9fb3c8', marginTop: 26 }}>
            Enterprise AI implementation, practical enablement, and the DailyByte™ platform.
          </div>
        </div>
        <div style={{ display: 'flex', width: 240, height: 14, background: '#29E7F2', borderRadius: 7 }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
