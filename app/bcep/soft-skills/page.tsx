import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BcepTrackPage } from '@/components/sections/BcepTrackPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { getBcepTrack } from '@/lib/content/bcep';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const SLUG = 'soft-skills';
const track = getBcepTrack(SLUG);

export const metadata: Metadata = pageMetadata({
  title: 'Soft Skills & Personality — BCEP',
  description:
    track?.description ||
    'Soft skills development — time management, resilience, business communication, decision making, and confidence building.',
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
