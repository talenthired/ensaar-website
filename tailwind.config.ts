import type { Config } from 'tailwindcss';

const withVar = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;
const withVarRaw = (name: string) => `rgb(var(--color-${name}))`;

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: withVar('bg-primary'),
          secondary: withVar('bg-secondary'),
          tertiary: withVar('bg-tertiary'),
          glass: withVarRaw('bg-glass'),
          'glass-strong': withVarRaw('bg-glass-strong'),
        },
        accent: {
          primary: withVar('accent-primary'),
          secondary: withVar('accent-secondary'),
          glow: withVar('accent-glow'),
          cyan: withVar('accent-cyan'),
          'cyan-soft': withVar('accent-cyan-soft'),
          warm: withVar('accent-warm'),
        },
        ink: {
          primary: withVar('ink-primary'),
          secondary: withVar('ink-secondary'),
          muted: withVar('ink-muted'),
        },
        line: {
          subtle: withVarRaw('line-subtle'),
          glow: withVarRaw('line-glow'),
        },
      },
      fontFamily: {
        display: ['var(--font-inter)', 'Inter', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #008ecf 0%, #13a694 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, rgba(0,142,207,0.13) 0%, rgba(19,166,148,0.11) 100%)',
        'gradient-mesh':
          'radial-gradient(at 20% 10%, rgba(99,102,241,0.10) 0%, transparent 50%), radial-gradient(at 80% 80%, rgba(6,182,212,0.08) 0%, transparent 50%)',
      },
      boxShadow: {
        glow: '0 8px 30px rgba(99,102,241,0.18)',
        'glow-strong': '0 12px 50px rgba(99,102,241,0.3)',
        card: '0 4px 24px rgba(15,23,42,0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 10s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
