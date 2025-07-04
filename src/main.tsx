import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";

// Function to apply font class from localStorage
const applyFontClass = () => {
  const savedFont = localStorage.getItem('app-font') || 'font-inter'; // Default to Inter
  document.documentElement.className = savedFont;
};

// Apply font class on initial load
applyFontClass();

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      disableTransitionOnChange={false}
      storageKey="notica-theme"
    >
      <App />
    </ThemeProvider>
  </StrictMode>
);