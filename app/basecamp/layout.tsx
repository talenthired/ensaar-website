import type { Metadata } from 'next';

// Basecamp is private. Nothing under it should ever be indexed; robots.ts disallows the
// path as well, but the header covers a URL that leaks through a link or a referrer.
export const metadata: Metadata = {
  title: 'Basecamp',
  robots: { index: false, follow: false, nocache: true },
};

export default function BasecampLayout({ children }: { children: React.ReactNode }) {
  return children;
}
