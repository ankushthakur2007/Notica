import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import React from "react"; // Import React for useEffect

// Function to apply font class from localStorage
const applyFontClass = () => {
  const savedFont = localStorage.getItem('app-font') || 'font-inter'; // Default to Inter
  document.documentElement.className = savedFont;
};

// Apply font class on initial load
applyFontClass();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);