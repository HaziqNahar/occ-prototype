import { defineConfig } from 'vite'

// Bundles the TypeScript backend (server/main.ts) into dist-server/ for the LAN host.
// Run with `npm run build:server`, then `npm run start:server`.
export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: 'dist-server',
    ssr: 'server/main.ts',
    target: 'node24',
  },
  publicDir: false,
})
