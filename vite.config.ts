import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    include: ["lucide-svelte"],
  },
   ssr: {
    noExternal: ['lucide-svelte']
  },
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
  }
})
