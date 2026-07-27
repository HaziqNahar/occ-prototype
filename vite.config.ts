import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        changeOrigin: true,
        target: process.env.VITE_OCC_PROXY_TARGET ?? 'http://127.0.0.1:8787',
      },
    },
  },
})
