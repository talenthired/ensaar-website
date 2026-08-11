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
import { headers } from 'next/headers';
import './globals.css';

// Inline script to apply theme before paint.
const themeBootstrap = `
(function(){try{var t=localStorage.getItem('ensaar-theme');if(t!=='light'&&t!=='dark')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;

/**
 * Strip attributes injected by browser extensions before React hydrates.
 *
 * Form-autofill extensions stamp `fdprocessedid` onto every button and input
 * between the HTML arriving and React hydrating, which React then reports as a
 * hydration mismatch on each one. It is harmless, but it buries real errors in
 * the console. `suppressHydrationWarning` does not help: it only applies one
 * level deep, so the <html>/<body> flags never reach a nested button.
 *
 * The observer disconnects a few seconds after load, by which point hydration
 * is long finished and the attributes no longer matter.
 *
 * This mirrors the same script in DailyByte's layout; keep the two in step.
 */
const extensionAttributeCleanup = `
(function(){
  var attrs=['fdprocessedid','cz-shortcut-listen','data-berrycast-extension'];
  function clean(root){
    if(!root||root.nodeType!==1)return;
    for(var i=0;i<attrs.length;i++)root.removeAttribute(attrs[i]);
    if(root.querySelectorAll){
      for(var j=0;j<attrs.length;j++){
        var nodes=root.querySelectorAll('['+attrs[j]+']');
        for(var k=0;k<nodes.length;k++)nodes[k].removeAttribute(attrs[j]);
      }
    }
  }
  clean(document.documentElement);
  var observer=new MutationObserver(function(records){
    for(var i=0;i<records.length;i++){
      clean(records[i].target);
      for(var j=0;j<records[i].addedNodes.length;j++)clean(records[i].addedNodes[j]);
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:attrs});
  window.addEventListener('load',function(){setTimeout(function(){clean(document.documentElement);observer.disconnect();},4000);});
})();
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
    'DailyByte AI Jobs',
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
    types: {
      'application/rss+xml': `${siteConfig.url}/insights/feed.xml`,
    },
  },
  manifest: '/manifest.webmanifest',
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang="en-IN"
      data-theme="light"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script
          suppressHydrationWarning
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
        <script
          suppressHydrationWarning
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: extensionAttributeCleanup }}
        />
        <JsonLd nonce={nonce} data={[organizationSchema(), websiteSchema()]} />
        <ThemeProvider>
          <Analytics nonce={nonce} />
          <AttributionCapture />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <OpportunityAdvisor liveSupportEnabled={Boolean(process.env.SUPPORT_BRIDGE_SECRET?.trim())} />
        </ThemeProvider>
      </body>
    </html>
  );
}
