import type { Metadata, Viewport } from 'next';
import { Inter, Archivo_Black, JetBrains_Mono } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { organizationSchema, websiteSchema } from '@/components/seo/schemas';
import { siteConfig, ogImage } from '@/lib/utils';
import './globals.css';

// Inline script to apply theme before paint.
const themeBootstrap = `
(function(){try{var t=localStorage.getItem('ensaar-theme');if(t!=='light'&&t!=='dark')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Managed AI Execution Pods`,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'AI execution pods',
    'AI cost reduction',
    'managed AI delivery',
    'AI automation',
    'AI staffing',
    'Claude AI integration',
    'LLM integration',
    'AI support desk',
    'AI research desk',
    'software cost reduction',
    'business excellence program',
    'BCEP',
    'corporate training',
    'Hyderabad',
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
    title: `${siteConfig.name} - Managed AI Execution Pods`,
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
      className={`${inter.variable} ${archivoBlack.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
      </head>
      <body>
        <ThemeProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
