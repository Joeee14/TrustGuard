import React, { createContext, useContext, useState } from 'react';
import { THEMES } from '../theme';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [themeName, setThemeName] = useState('light');

  const t = THEMES[themeName];

  function toggleTheme() {
    setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  return (
    <AppContext.Provider value={{ t, themeName, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
