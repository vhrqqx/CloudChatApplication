import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendTarget = process.env.CLOUDCHAT_API_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@phosphor-icons')) return 'icons';
          if (id.includes('react') || id.includes('zustand')) return 'react-vendor';
          return 'network-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,

    proxy: {
      "/api": { target: backendTarget, changeOrigin: true },
      "/ws": { target: backendTarget, ws: true, changeOrigin: true },
    },
  },
});
