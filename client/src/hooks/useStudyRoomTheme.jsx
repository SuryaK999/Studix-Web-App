import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useGlobalTheme } from './useGlobalTheme';


const StudyRoomThemeContext = createContext(undefined);

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

export function StudyRoomThemeProvider({ children, roomId }) {
  const { theme: globalTheme } = useGlobalTheme();
  
  const [roomTheme, setRoomThemeState] = useState(() => {
    if (typeof window !== 'undefined' && roomId) {
      const stored = localStorage.getItem(`studix:theme:room:${roomId}`);
      if (stored && ['light', 'dark', 'brand', 'amoled'].includes(stored)) {
         return stored;
      }
    }
    return null;
  });

  // When roomId changes, reload the persisted room theme
  useEffect(() => {
    if (!roomId) return;
    const stored = localStorage.getItem(`studix:theme:room:${roomId}`);
    if (stored && ['light', 'dark', 'brand', 'amoled'].includes(stored)) {
       setRoomThemeState(stored);
    } else {
       setRoomThemeState(null);
    }
  }, [roomId]);

  const setRoomTheme = (newTheme) => {
    setRoomThemeState(newTheme);
    if (newTheme === null) {
      localStorage.removeItem(`studix:theme:room:${roomId}`);
    } else {
      localStorage.setItem(`studix:theme:room:${roomId}`, newTheme);
    }
  };

  const activeTheme = roomTheme || globalTheme;
  const tokens = useMemo(() => THEME_TOKENS[activeTheme], [activeTheme]);

  return (
    <StudyRoomThemeContext.Provider value={{ roomTheme, setRoomTheme, tokens, activeTheme }}>
      <div className={`theme-${activeTheme} h-full w-full contain-theme`}>
         {children}
      </div>
    </StudyRoomThemeContext.Provider>
  );
}

export function useStudyRoomTheme() {
  const context = useContext(StudyRoomThemeContext);
  if (context === undefined) {
    throw new Error('useStudyRoomTheme must be used within a StudyRoomThemeProvider');
  }
  return context;
}
