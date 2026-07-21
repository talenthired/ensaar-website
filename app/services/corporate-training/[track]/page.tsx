import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BcepTrackPage } from '@/components/sections/BcepTrackPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { BCEP_TRACKS, getBcepTrack } from '@/lib/content/bcep';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

type Params = { track: string };

export function generateStaticParams(): Params[] {
  return BCEP_TRACKS.map((track) => ({ track: track.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track: slug } = await params;
  const track = getBcepTrack(slug);
  if (!track) return pageMetadata({ title: 'Training track not found', description: 'Not found', path: `/services/corporate-training/${slug}` });
  return pageMetadata({ title: `${track.name} BCEP AI Readiness Certification`, description: track.description, path: `/services/corporate-training/${track.slug}` });
}

export default async function CorporateTrainingTrackPage({ params }: { params: Promise<Params> }) {
  const { track: slug } = await params;
  const track = getBcepTrack(slug);
  if (!track) notFound();
  const url = `${siteConfig.url}/services/corporate-training/${track.slug}`;
  return <><JsonLd data={[
    webPageSchema({ name: track.name, description: track.description, url }),
    serviceSchema({ name: track.credential, description: track.description, serviceType: 'Professional Certification', url }),
    breadcrumbSchema([
      { name: 'Home', url: siteConfig.url },
      { name: 'Services', url: `${siteConfig.url}/services` },
      { name: 'Corporate Training', url: `${siteConfig.url}/services/corporate-training` },
      { name: track.name, url },
    ]),
  ]} /><BcepTrackPage track={track} /></>;
}
