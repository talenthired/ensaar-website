import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BcepTrackPage } from '@/components/sections/BcepTrackPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { getBcepTrack } from '@/lib/content/bcep';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const SLUG = 'professional';
const track = getBcepTrack(SLUG);

export const metadata: Metadata = pageMetadata({
  title: 'Professional Skills — BCEP',
  description:
    track?.description ||
    'Professional skill enhancement — presentation excellence, negotiation, goal setting, critical thinking, and workplace ethics.',
  path: `/bcep/${SLUG}`,
});

export default function Page() {
  if (!track) return notFound();
  const url = `${siteConfig.url}/bcep/${SLUG}`;
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: track.name, description: track.description, url }),
          serviceSchema({
            name: `BCEP: ${track.name}`,
            description: track.description,
            url,
            serviceType: 'Corporate Training',
          }),
        ]}
      />
      <BcepTrackPage track={track} />
    </>
  );
}
