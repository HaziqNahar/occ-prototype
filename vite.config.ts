import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Each production build gets an id, in the app (__APP_BUILD__) and in
// dist/build.json. Open pages compare the two and offer a reload when the
// host has been rebuilt (src/components/UpdateBanner.tsx).
const buildId = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'timetable-data',
              priority: 2,
              test: /src[\\/]data[\\/]nelOtesWeekday03/,
            },
            {
              name: 'react-vendor',
              priority: 1,
              test: /node_modules[\\/](react|react-dom)[\\/]/,
            },
          ],
        },
      },
    },
  },
  define: {
    __APP_BUILD__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    {
      apply: 'build',
      name: 'occ-build-id',
      generateBundle() {
        this.emitFile({ fileName: 'build.json', source: JSON.stringify({ build: buildId }), type: 'asset' })
      },
    },
  ],
  server: {
    proxy: {
      '/api': {
        changeOrigin: true,
        target: process.env.VITE_OCC_PROXY_TARGET ?? 'http://127.0.0.1:8787',
      },
    },
  },
})
