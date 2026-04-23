import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          secondary: '#12121a',
          tertiary: '#1a1a26',
          glass: 'rgba(18,18,26,0.6)',
          'glass-strong': 'rgba(18,18,26,0.85)',
        },
        accent: {
          primary: '#6366f1',
          secondary: '#818cf8',
          glow: '#4f46e5',
          cyan: '#06b6d4',
          'cyan-soft': '#22d3ee',
        },
        ink: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        line: {
          subtle: 'rgba(99,102,241,0.15)',
          glow: 'rgba(99,102,241,0.35)',
        },
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'Inter', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.15) 100%)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(99,102,241,0.25)',
        'glow-strong': '0 0 60px rgba(99,102,241,0.4)',
        card: '0 10px 40px rgba(0,0,0,0.4)',
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
