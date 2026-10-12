// Development launcher: runs the TypeScript backend (server/main.ts) through
// Vite's module loader, so it shares src/ modules without a build step.
// For the LAN host, build once with `npm run build:server` and run
// `npm run start:server` instead.
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  root: fileURLToPath(new URL('..', import.meta.url)),
  // No live-reload socket or file watching: several backends may run side by side in tests.
  server: { hmr: false, middlewareMode: true, watch: null, ws: false },
})

await vite.ssrLoadModule('/server/main.ts')
