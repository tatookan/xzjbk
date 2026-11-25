'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type LibraryThemeMode = 'light' | 'dark';

const LibraryThemeContext = createContext<{
  mode: LibraryThemeMode;
  toggle: () => void;
}>({ mode: 'dark', toggle: () => undefined });

const STORAGE_KEY = 'xinmeng:library-mode';

export function LibraryThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<LibraryThemeMode>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') setMode(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.libMode = mode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <LibraryThemeContext.Provider
      value={{ mode, toggle: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')) }}
    >
      {children}
    </LibraryThemeContext.Provider>
  );
}

export function useLibraryTheme() {
  return useContext(LibraryThemeContext);
}
