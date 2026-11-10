import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the app from /AJAIA_Ravi/; the Pages workflow sets VITE_BASE.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  build: {
    rollupOptions: {
      output: {
        // Split big, rarely-changing libraries into their own cacheable chunks.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/](@tiptap|prosemirror-[^\\/]+)[\\/]/.test(id)) return "editor";
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react";
        },
      },
    },
  },
});
