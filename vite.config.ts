import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync } from 'fs'; // Import fs module
import { resolve } from 'path'; // Import resolve from path

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(), 
    react(),
    { // Custom plugin to copy service worker
      name: 'copy-service-worker',
      writeBundle() {
        const src = resolve(__dirname, 'public/service-worker.js');
        const dest = resolve(__dirname, 'dist/service-worker.js');
        try {
          copyFileSync(src, dest);
          console.log('Copied service-worker.js to dist/');
        } catch (error) {
          console.error('Failed to copy service-worker.js:', error);
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));