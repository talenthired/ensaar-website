type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
  nonce?: string;
};

export function JsonLd({ data, nonce }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          nonce={nonce}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
