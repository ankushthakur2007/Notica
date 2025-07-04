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

// Service Worker registration removed as offline capabilities are being removed.

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