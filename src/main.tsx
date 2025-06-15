import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import React from "react"; // Import React for useEffect
import { cn } from "./lib/utils.ts"; // Import cn utility

// Function to apply font and accent color classes from localStorage
const applyThemeClasses = () => {
  const savedFont = localStorage.getItem('app-font') || 'font-inter'; // Default to Inter
  const savedAccent = localStorage.getItem('app-accent-color') || 'theme-default'; // Default to theme-default
  document.documentElement.className = cn(savedFont, savedAccent);
};

// Apply font and accent color classes on initial load
applyThemeClasses();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);