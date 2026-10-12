import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Deletes all backend data: the SQLite database (session, action log, reports)
// and any files left by the old JavaScript backend. Stop the backend first.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = process.env.OCC_BACKEND_DATA_DIR
  ? path.resolve(process.env.OCC_BACKEND_DATA_DIR)
  : path.join(rootDir, 'server', 'data')
const runtimeFiles = [
  'occ-training.sqlite',
  'occ-training.sqlite-shm',
  'occ-training.sqlite-wal',
  'session.json',
  'session.json.migrated',
  'reports.ndjson',
  'reports.ndjson.migrated',
].map((file) => path.join(dataDir, file))

for (const filePath of runtimeFiles) {
  await rm(filePath, { force: true })
}

console.log(`OCC backend data cleared in ${dataDir}.`)
