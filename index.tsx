import React, { useState, createContext, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ThemeContextType {
  
  
}

export const ThemeContext = createContext<ThemeContextType>({});

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  
  

  
  
  

  return (
    
    
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