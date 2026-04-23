import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/components/seo/schemas';
import { siteConfig } from '@/lib/utils';

type Crumb = { name: string; href: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const allItems = [{ name: 'Home', href: '/' }, ...items];
  return (
    <>
      <JsonLd
        data={breadcrumbSchema(
          allItems.map((i) => ({ name: i.name, url: `${siteConfig.url}${i.href}` })),
        )}
      />
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-ink-secondary font-mono">
          {allItems.map((item, i) => {
            const last = i === allItems.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-2">
                {last ? (
                  <span className="text-ink-primary">{item.name}</span>
                ) : (
                  <Link href={item.href} className="hover:text-accent-secondary transition-colors">
                    {item.name}
                  </Link>
                )}
                {!last && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
