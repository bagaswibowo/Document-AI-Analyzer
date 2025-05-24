import React, { useState, createContext, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ThemeContextType {
  // themeMode and toggleTheme are removed as dark mode is being eliminated.
  // This context can be used for other theme-related props in the future if needed.
}

export const ThemeContext = createContext<ThemeContextType>({});

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Dark mode logic is removed. Light mode is the default and only mode.
  // The initial setup in index.html and body classes will handle light mode.

  // No themeMode state or toggleTheme function needed anymore.
  // No useEffect needed to sync with localStorage or <html> class for dark mode.

  return (
    // Provider still exists, can be used for other theme aspects if added later.
    // Value is now an empty object as no theme-switching props are passed.
    <ThemeContext.Provider value={{}}>
      {children}
    </ThemeContext.Provider>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeWrapper>
      <App />
    </ThemeWrapper>
  </React.StrictMode>
);