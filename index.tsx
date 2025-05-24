import React, { useState, useMemo, createContext, useContext, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ThemeContextType {
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  toggleTheme: () => {},
});

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Skrip FOUC di index.html sudah mengatur kelas pada <html>
  // dan menormalkan localStorage.getItem('themeMode') menjadi 'light' atau 'dark'.
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light' // Fallback ke 'light' jika localStorage masih kosong (seharusnya tidak terjadi)
  );

  useEffect(() => {
    // Efek ini menyinkronkan kelas pada <html> jika themeMode berubah melalui React state,
    // dan juga memastikan localStorage selalu sinkron.
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
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