'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'ensaar-theme';
const DEFAULT_THEME: Theme = 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let initial: Theme = DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark') initial = stored;
    } catch {
      // localStorage unavailable; fall back to default
    }
    apply(initial);
    setThemeState(initial);
    setMounted(true);
  }, []);

  function apply(next: Theme) {
    document.documentElement.setAttribute('data-theme', next);
  }

  function setTheme(next: Theme) {
    apply(next);
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  function toggle() {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      <span suppressHydrationWarning data-theme-mounted={mounted ? 'true' : 'false'} hidden />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: DEFAULT_THEME, toggle: () => {}, setTheme: () => {} };
  }
  return ctx;
}
