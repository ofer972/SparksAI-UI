'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'ocean' | 'forest' | 'purple' | 'sunset' | 'midnight' | 'mixed';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage or default to 'dark' for first-time users
    const savedTheme = (localStorage.getItem('sparksai-theme') as Theme | null) || 'dark';
    setThemeState(savedTheme);
    applyTheme(savedTheme);
    // Save default theme if none exists
    if (!localStorage.getItem('sparksai-theme')) {
      localStorage.setItem('sparksai-theme', savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    // Remove all theme classes
    html.classList.remove('theme-light', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-purple', 'theme-sunset', 'theme-midnight', 'theme-mixed', 'dark');
    // Add new theme class
    html.classList.add(`theme-${newTheme}`);
    // Add dark class for backwards compatibility with existing dark: classes
    if (newTheme === 'dark' || newTheme === 'midnight') {
      html.classList.add('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('sparksai-theme', newTheme);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
