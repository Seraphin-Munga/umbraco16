import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    },
  },
})
