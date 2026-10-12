import path from 'node:path'

// Backend settings, read once at start-up from environment variables.
export const PORT = Number(process.env.OCC_BACKEND_PORT ?? process.env.PORT ?? 8787)
export const HOST = process.env.OCC_BACKEND_HOST ?? '127.0.0.1'
export const MAX_BODY_BYTES = 1024 * 1024

// Runtime data (database, migrated legacy files) defaults to server/data next to
// the source tree; the bundled LAN build is started from the project folder too.
export const DATA_DIR = process.env.OCC_BACKEND_DATA_DIR
  ? path.resolve(process.env.OCC_BACKEND_DATA_DIR)
  : path.resolve(process.cwd(), 'server', 'data')

export const DATABASE_FILE = path.join(DATA_DIR, 'occ-training.sqlite')
export const LEGACY_SESSION_FILE = path.join(DATA_DIR, 'session.json')
export const LEGACY_REPORTS_FILE = path.join(DATA_DIR, 'reports.ndjson')

export const MAX_TRANSPORT_EVENTS = 80
export const SSE_HEARTBEAT_MS = 25_000
