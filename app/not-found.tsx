import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-400px)] flex items-center justify-center pt-32 pb-20">
      <Container>
        <div className="text-center max-w-xl mx-auto">
          <h1 className="font-display text-[clamp(3rem,10vw,6rem)] gradient-text mb-4">404</h1>
          <h2 className="text-2xl mb-4">This page drifted out of orbit.</h2>
          <p className="text-ink-secondary mb-8">
            The URL doesn't match any page on Ensaar Global. Let's get you back to familiar ground.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button href="/" withArrow>
              Back to home
            </Button>
            <Link
              href="/contact"
              className="inline-flex items-center text-accent-secondary hover:text-accent-cyan-soft px-6 py-3"
            >
              Or contact us
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
