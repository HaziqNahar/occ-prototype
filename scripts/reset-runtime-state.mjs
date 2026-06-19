import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeFiles = [
  path.join(rootDir, 'server', 'data', 'session.json'),
  path.join(rootDir, 'server', 'data', 'reports.ndjson'),
]

for (const filePath of runtimeFiles) {
  await rm(filePath, { force: true })
}

console.log('OCC runtime session and report snapshots cleared.')
