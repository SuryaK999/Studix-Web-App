import { createContext, useContext, useEffect, useState, useMemo } from 'react';

const GlobalThemeContext = createContext(undefined);

const THEME_TOKENS = {
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f3f4f6',
    textPrimary: '#000000',
    textSecondary: '#4b5563',
    borderSubtle: '#e5e7eb',
    accent: '#7148EB',
  },
  dark: {
    bgPrimary: '#0f1015',
    bgSecondary: '#12131b',
    textPrimary: '#ffffff',
    textSecondary: '#8e9297',
    borderSubtle: '#2a2b36',
    accent: '#7148EB',
  },
  brand: {
    bgPrimary: '#070514',
    bgSecondary: '#0a071c',
    textPrimary: '#ffffff',
    textSecondary: '#a5b4fc',
    borderSubtle: '#3730a3',
    accent: '#A855F7',
  },
  amoled: {
    bgPrimary: '#000000',
    bgSecondary: '#0a0a0a',
    textPrimary: '#ffffff',
    textSecondary: '#666666',
    borderSubtle: '#1a1a1a',
    accent: '#7148EB',
  }
};

export function GlobalThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('studix:theme:global');
      if (stored && ['light', 'dark', 'brand', 'amoled'].includes(stored)) return stored;
      
      // Fallback to legacy key to prevent breaking user preferences
      const legacyStored = localStorage.getItem('studix-theme');
      if (legacyStored && ['light', 'dark', 'brand', 'amoled'].includes(legacyStored)) return legacyStored;
      
      // Fallback to old preferences format
      const prefs = localStorage.getItem('studix_prefs');
      if (prefs) {
        try {
          const parsed = JSON.parse(prefs);
          if (parsed.theme && ['light', 'dark', 'brand', 'amoled'].includes(parsed.theme)) {
             return parsed.theme;
          }
        } catch {}
      }

      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default SSR theme
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('studix:theme:global', newTheme);
    // Write back to legacy for backwards compatibility if needed elsewhere
    localStorage.setItem('studix-theme', newTheme);
    
    // Dispatch event for any legacy listeners
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'brand', 'amoled');
    
    if (theme === 'amoled') {
      root.classList.add('dark', 'amoled');
    } else if (theme !== 'light') {
      root.classList.add(theme);
    }
    
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }, [theme]);

  // Listen for external legacy changes
  useEffect(() => {
    const handleLegacyThemeChange = (e) => {
      const customEvent = e;
      if (customEvent.detail && ['light', 'dark', 'brand', 'amoled'].includes(customEvent.detail)) {
        setThemeState(customEvent.detail);
        localStorage.setItem('studix:theme:global', customEvent.detail);
      }
    };
    
    window.addEventListener('themeChanged', handleLegacyThemeChange);
    return () => window.removeEventListener('themeChanged', handleLegacyThemeChange);
  }, []);

  const tokens = useMemo(() => THEME_TOKENS[theme], [theme]);

  return (
    <GlobalThemeContext.Provider value={{ theme, setTheme, tokens }}>
      {children}
    </GlobalThemeContext.Provider>
  );
}

export function useGlobalTheme() {
  const context = useContext(GlobalThemeContext);
  if (context === undefined) {
    throw new Error('useGlobalTheme must be used within a GlobalThemeProvider');
  }
  return context;
}
