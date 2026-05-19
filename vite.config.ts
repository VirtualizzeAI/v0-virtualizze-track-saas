import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "header.png"],
      manifest: {
        name: "Virtualizze Track",
        short_name: "VTrack",
        description: "Sistema de gestão de projetos e tarefas",
        theme_color: "#22c55e",
        background_color: "#09090b",
        display: "standalone",
        start_url: "/",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "svelte-vendor": ["svelte"],
        },
      },
    },
  },
  server: {
    fs: {
      strict: false,
    },
  },
})
