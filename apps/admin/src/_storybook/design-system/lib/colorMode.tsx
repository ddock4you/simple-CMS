'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type ColorMode = 'light' | 'dark';

const ColorModeContext = createContext<ColorMode>('light');

export function useColorMode(): ColorMode {
  return useContext(ColorModeContext);
}

interface DarkModeContainerProps {
  children: ReactNode;
  defaultMode?: ColorMode;
}

export function DarkModeContainer({ children, defaultMode = 'light' }: DarkModeContainerProps) {
  const [mode, setMode] = useState<ColorMode>(defaultMode);

  return (
    <ColorModeContext.Provider value={mode}>
      <div className={mode === 'dark' ? 'dark' : ''}>
        <div className="bg-background text-foreground rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {mode === 'light' ? 'Light mode' : 'Dark mode'} · `.dark` ancestor 토글
            </span>
            <button
              type="button"
              onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}
              className="rounded-md border bg-secondary text-secondary-foreground px-3 py-1 text-xs font-medium hover:opacity-90"
            >
              {mode === 'light' ? '🌙 Dark' : '☀ Light'}
            </button>
          </div>
          {children}
        </div>
      </div>
    </ColorModeContext.Provider>
  );
}
