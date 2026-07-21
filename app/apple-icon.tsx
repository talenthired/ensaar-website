import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS home-screen icon: the Ensaar brand tile with an "E" mark.
export default function AppleIcon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c2343',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 120,
            fontWeight: 800,
            color: '#29E7F2',
            fontFamily: 'sans-serif',
          }}
        >
          E
        </div>
      </div>
    ),
    { ...size },
  );
}
