import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "BabyMon",
        short_name: "BabyMon",
        description: "Shared baby tracker for caregivers",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        // App-shell + static assets are precached; API/data calls are handled
        // by the app's own offline write-queue (frontend/src/data), not the SW cache.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"]
      }
    })
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/sync": { target: "ws://localhost:3000", ws: true }
    }
  }
});
