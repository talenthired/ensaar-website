import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BcepTrackPage } from '@/components/sections/BcepTrackPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { getBcepTrack } from '@/lib/content/bcep';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const SLUG = 'train-the-trainer';
const track = getBcepTrack(SLUG);

export const metadata: Metadata = pageMetadata({
  title: 'Train-the-Trainer — BCEP',
  description:
    track?.description ||
    'Build internal training capability — workshop design, training needs assessment, and scalable program delivery.',
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
