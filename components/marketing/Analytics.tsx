import Script from 'next/script';

export function Analytics({ nonce }: { nonce?: string }) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script nonce={nonce} id="ensaar-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
