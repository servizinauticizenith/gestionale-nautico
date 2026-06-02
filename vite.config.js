import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],

workbox: {
  navigateFallback: "/index.html",
  globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,ico}"],
},

      manifest: {
        name: "Gestionale Nautico Zenith",
        short_name: "Zenith",
        description: "Gestionale officina nautica",
        theme_color: "#0b3b60",

        icons: [
          {
            src: "/favicon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
});
