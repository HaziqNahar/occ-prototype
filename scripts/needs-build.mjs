import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Used by start-occ-host.cmd: exits 0 when the built app (dist/) and server
// (dist-server/) are newer than the source, 1 when they are missing or out of date.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const builtFiles = ['dist/index.html', 'dist-server/main.js']
const sources = ['src', 'server', 'public', 'index.html', 'package.json', 'vite.config.ts', 'vite.server.config.ts']

function newestModified(target) {
  let stats

  try {
    stats = statSync(target)
  } catch {
    return 0
  }

  if (!stats.isDirectory()) {
    return stats.mtimeMs
  }

  return readdirSync(target).reduce((newest, entry) => (
    entry === 'data' || entry === 'node_modules'
      ? newest
      : Math.max(newest, newestModified(path.join(target, entry)))
  ), stats.mtimeMs)
}

let oldestBuild = Infinity

for (const file of builtFiles) {
  try {
    oldestBuild = Math.min(oldestBuild, statSync(path.join(rootDir, file)).mtimeMs)
  } catch {
    console.log(`Not built yet: ${file}`)
    process.exit(1)
  }
}

const newestSource = Math.max(...sources.map((source) => newestModified(path.join(rootDir, source))))

if (newestSource > oldestBuild) {
  console.log('The simulator files are newer than the last build.')
  process.exit(1)
}
