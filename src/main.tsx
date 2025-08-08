import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress React DevTools warning in development
if (import.meta.env.DEV) {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('Download the React DevTools')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
