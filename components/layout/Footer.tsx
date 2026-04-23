import Link from 'next/link';
import { LogoMark } from '@/components/icons/LogoMark';
import { siteConfig } from '@/lib/utils';

export function Footer() {
  return (
    <footer className="relative border-t border-line-subtle bg-gradient-to-b from-transparent to-accent-primary/[0.03] pt-16 pb-8">
      <div className="container-page">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr_1fr] mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <LogoMark animated={false} />
              <span className="font-display text-lg tracking-[0.15em] gradient-text">ENSAAR</span>
            </Link>
            <p className="text-ink-secondary text-[0.9375rem] max-w-[320px]">
              {siteConfig.tagline} — now powered by AI. Engineering design and technology services since {siteConfig.foundedYear}.
            </p>
          </div>

          <FooterCol
            heading="Services"
            links={[
              { label: 'AI Solutions', href: '/services/ai-solutions' },
              { label: 'Engineering', href: '/services/engineering' },
              { label: 'Technology', href: '/services/technology' },
              { label: 'BCEP', href: '/bcep' },
            ]}
          />

          <FooterCol
            heading="Explore"
            links={[
              { label: 'About', href: '/about' },
              { label: 'Our Work', href: '/work' },
              { label: 'AI Capabilities', href: '/ai' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Contact', href: '/contact' },
            ]}
          />

          <div>
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-accent-secondary mb-5">
              Contact
            </h4>
            <ul className="flex flex-col gap-2.5 text-[0.9375rem] text-ink-secondary">
              <li>
                <a href={`mailto:${siteConfig.email}`} className="hover:text-ink-primary transition-colors">
                  {siteConfig.email}
                </a>
                <span className="block text-xs text-ink-muted font-mono mt-0.5">general</span>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.trainingEmail}`}
                  className="hover:text-ink-primary transition-colors"
                >
                  {siteConfig.trainingEmail}
                </a>
                <span className="block text-xs text-ink-muted font-mono mt-0.5">training / BCEP</span>
              </li>
              <li className="mt-2">{siteConfig.locality}, {siteConfig.region}</li>
              <li>{siteConfig.state}, {siteConfig.country}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-8 border-t border-line-subtle text-xs text-ink-muted">
          <p>© {siteConfig.foundedYear} — {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.</p>
          <p className="font-mono tracking-[0.1em]">Crafted with AI.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-accent-secondary mb-5">{heading}</h4>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[0.9375rem] text-ink-secondary hover:text-ink-primary transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
