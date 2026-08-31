import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';

/**
 * Next's sitemap serializer writes image URLs into <image:loc> without
 * XML-escaping them. An Unsplash URL with "&q=85&auto=format" therefore made
 * https://ensaar.com/sitemap.xml invalid XML, and Search Console rejected the
 * whole file. Every URL that reaches the serializer must carry no character
 * that XML requires escaped.
 */
describe('sitemap', () => {
  const entries = sitemap();

  it('contains no character the serializer would need to escape', () => {
    for (const entry of entries) {
      expect(entry.url).not.toMatch(/[&<>'"]/);
      for (const image of entry.images ?? []) {
        expect(String(image)).not.toMatch(/[&<>'"]/);
      }
    }
  });

  it('still carries one absolute hero image per insight entry', () => {
    const withImages = entries.filter((entry) => (entry.images?.length ?? 0) > 0);
    expect(withImages.length).toBeGreaterThanOrEqual(6);
    for (const entry of withImages) {
      expect(String(entry.images![0])).toMatch(/^https:\/\//);
    }
  });
});
