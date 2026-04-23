import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AICapabilitiesSection } from '@/components/sections/AICapabilitiesSection';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'AI Capabilities — Claude, LLMs, Agentic Workflows',
  description:
    'Ensaar Global builds AI solutions with Claude, LLMs, agentic workflows, prompt engineering, RAG systems, MCP servers, and Claude Code skills and plugins.',
  path: '/ai',
});

export default function AiPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'AI Capabilities',
          description: 'Our AI capabilities: Claude integration, LLM workflows, RAG, MCP servers, Claude Code plugins and skills.',
          url: `${siteConfig.url}/ai`,
        })}
      />
      <div className="pt-32 pb-8">
        <Container>
          <Breadcrumbs items={[{ name: 'AI', href: '/ai' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-5">AI Capabilities</span>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-6 text-balance">
              We don't just talk about AI — <span className="gradient-text">we build with it.</span>
            </h1>
            <p className="text-xl text-ink-secondary">
              Every AI engagement at Ensaar is delivered by people who use AI tooling daily — including Claude Code, its plugins, and skills. This page is a living snapshot of the capabilities we bring to client work.
            </p>
            <div className="mt-8">
              <Button href="/contact" size="lg" withArrow>
                Discuss an AI project
              </Button>
            </div>
          </div>
        </Container>
      </div>
      <AICapabilitiesSection />
    </>
  );
}
