import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Forwards Header's Content Delivery API calls (see src/api/contentApi.ts)
      // to the running Umbraco backend, so the browser only ever talks to
      // this dev server's own origin - no CORS setup needed on the Umbraco
      // side, and no need for the browser to trust its local dev HTTPS cert.
      '/umbraco': {
        target: 'https://localhost:44315',
        changeOrigin: true,
        secure: false,
      },
      // contentApi.ts's mapMediaUrl resolves the Delivery API's relative
      // media urls ("/media/...") against this same origin - proxied the
      // same way as /umbraco above so an <img> tag actually loads instead
      // of 404ing against this dev server's own origin.
      '/media': {
        target: 'https://localhost:44315',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
