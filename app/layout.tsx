import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AttributionCapture } from '@/components/marketing/AttributionCapture';
import { Analytics } from '@/components/marketing/Analytics';
import { OpportunityAdvisor } from '@/components/marketing/OpportunityAdvisor';
import { organizationSchema, websiteSchema } from '@/components/seo/schemas';
import { siteConfig, ogImage } from '@/lib/utils';
import './globals.css';

// Inline script to apply theme before paint.
const themeBootstrap = `
(function(){try{var t=localStorage.getItem('ensaar-theme');if(t!=='light'&&t!=='dark')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'enterprise AI enablement',
    'enterprise AI adoption',
    'AI engineering support',
    'multi-model AI strategy',
    'Amazon Bedrock consulting',
    'AWS GPU AI deployment',
    'IDE AI enablement',
    'AI observability and governance',
    'AI software development',
    'custom software development company',
    'application development services',
    'enterprise software development',
    'AI application engineering',
    'AI automation services',
    'Claude integration services',
    'RAG development company',
    'AI augmented staffing',
    'AI support automation',
    'AI research services',
    'AI product development',
    'AI workforce enablement',
    'AI work simulation',
    'AI skills assessment',
    'role based AI training',
    'AI capability pilot',
    'DailyByte AI Learn',
    'DailyByte AI Target',
    'DailyByte Daily Code',
    'job specific AI learning',
    'BCEP certification',
    'BCEP AI readiness',
    'AI readiness certification',
    'emotional intelligence training',
    'business communication certification',
    'Hyderabad',
    'Noida',
    'Ensaar Global',
  ],
  authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [{ url: ogImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [ogImage],
  },
  alternates: {
    canonical: siteConfig.url,
    languages: {
      'en-IN': siteConfig.url,
      'x-default': siteConfig.url,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'technology',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      data-theme="light"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <ThemeProvider>
          <Analytics />
          <AttributionCapture />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <OpportunityAdvisor />
        </ThemeProvider>
      </body>
    </html>
  );
}
