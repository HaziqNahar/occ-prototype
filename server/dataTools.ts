import { copyFileSync, existsSync, openSync, readSync, closeSync, rmSync } from 'node:fs'
import path from 'node:path'
import { createBackup, listBackups } from './backup'
import { BACKUP_DIR, DATABASE_FILE, PORT } from './config'
import { OccDatabase } from './database'
import { resetPassword } from './resetPassword'

// Host PC data tools (scripts/data-tool.mjs):
//   npm.cmd run backup                     copy the database into the backups folder
//   npm.cmd run restore -- <backup file>   put a backup back (server stopped)
//   npm.cmd run reset:password -- <user> <password>

function backupNow() {
  const db = new OccDatabase()

  try {
    const backup = createBackup(db)

    return `Backup written: ${path.join(BACKUP_DIR, backup.name)} (${Math.round(backup.bytes / 1024)} KB)`
  } finally {
    db.close()
  }
}

async function isServerRunning() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(1500) })

    return response.ok
  } catch {
    return false
  }
}

function isSqliteFile(file: string) {
  const header = Buffer.alloc(16)
  const handle = openSync(file, 'r')

  try {
    readSync(handle, header, 0, 16, 0)
  } finally {
    closeSync(handle)
  }

  return header.toString('latin1') === 'SQLite format 3\u0000'
}

async function restore(args: readonly string[]) {
  const [given] = args

  if (!given) {
    const names = listBackups().map((backup) => `  ${backup.name}`).join('\n')

    throw new Error(`Usage: npm.cmd run restore -- <backup file>\nBackups in ${BACKUP_DIR}:\n${names || '  (none yet)'}`)
  }

  const file = existsSync(given) ? path.resolve(given) : path.join(BACKUP_DIR, given)

  if (!existsSync(file) || !isSqliteFile(file)) {
    throw new Error(`${given} is not a backup of the training database.`)
  }

  if (await isServerRunning()) {
    throw new Error('Stop the training server first (close its window), then run the restore again.')
  }

  // Keep the data being replaced, including changes still in the write-ahead log.
  const keep = DATABASE_FILE.replace(/\.sqlite$/, `.before-restore-${Date.now()}.sqlite`)

  if (existsSync(DATABASE_FILE)) {
    const current = new OccDatabase()

    try {
      current.backupTo(keep)
    } finally {
      current.close()
    }
  }

  ;['', '-wal', '-shm'].forEach((suffix) => rmSync(`${DATABASE_FILE}${suffix}`, { force: true }))
  copyFileSync(file, DATABASE_FILE)

  return [
    `Restored ${path.basename(file)}.`,
    existsSync(keep) ? `The data it replaced is kept in ${keep}.` : '',
    'Start the training server again.',
  ].filter(Boolean).join('\n')
}

export async function runDataTool(args: readonly string[]) {
  const [tool, ...rest] = args

  switch (tool) {
    case 'backup':
      return backupNow()
    case 'restore':
      return restore(rest)
    case 'reset-password':
      return resetPassword(rest)
    default:
      throw new Error('Usage: data-tool.mjs backup | restore <file> | reset-password <user> <password>')
  }
}
