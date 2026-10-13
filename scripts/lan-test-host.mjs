// Runs the bundled training server (dist-server/main.js, serving dist/) on a
// fresh data folder for the LAN rehearsal test (playwright.lan.config.ts).
// Build first: npm run host:build.
import { rm } from 'node:fs/promises'
import path from 'node:path'

const dataDir = path.resolve('.playwright-lan-data')

await rm(dataDir, { force: true, recursive: true })

process.env.OCC_BACKEND_DATA_DIR = dataDir
process.env.OCC_BACKEND_HOST = '127.0.0.1'
process.env.OCC_BACKEND_PORT = process.env.OCC_LAN_TEST_PORT ?? '8799'

await import('../dist-server/main.js')
