import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { BACKUP_DIR, BACKUP_INTERVAL_MS, BACKUP_KEEP } from './config'
import type { OccDatabase } from './database'

// Copies of the database: one a day while the server runs, plus on request.
// Each is a complete SQLite file; restore one with npm run restore.

const BACKUP_PATTERN = /^occ-training-\d{8}-\d{6}\.sqlite$/

export type BackupFile = {
  bytes: number
  createdAt: string
  name: string
}

function timestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export function listBackups(directory = BACKUP_DIR): BackupFile[] {
  try {
    return readdirSync(directory)
      .filter((name) => BACKUP_PATTERN.test(name))
      .map((name) => {
        const stats = statSync(path.join(directory, name))

        return { bytes: stats.size, createdAt: stats.mtime.toISOString(), name }
      })
      .sort((left, right) => right.name.localeCompare(left.name))
  } catch {
    return []
  }
}

// Writes a backup now and removes the oldest beyond the ones to keep.
export function createBackup(db: OccDatabase, directory = BACKUP_DIR, keep = BACKUP_KEEP): BackupFile {
  mkdirSync(directory, { recursive: true })

  let name = `occ-training-${timestamp()}.sqlite`

  // Two backups in the same second: wait for the next name rather than overwrite.
  for (let attempt = 1; listBackups(directory).some((backup) => backup.name === name); attempt += 1) {
    name = `occ-training-${timestamp(new Date(Date.now() + attempt * 1000))}.sqlite`
  }

  db.backupTo(path.join(directory, name))
  listBackups(directory).slice(keep).forEach((old) => rmSync(path.join(directory, old.name), { force: true }))

  return listBackups(directory).find((backup) => backup.name === name)!
}

// A backup at start-up if the newest is a day old, then every day.
export function scheduleDailyBackups(db: OccDatabase, onError: (error: unknown) => void) {
  const runIfDue = () => {
    const newest = listBackups()[0]

    if (!newest || Date.now() - Date.parse(newest.createdAt) >= BACKUP_INTERVAL_MS - 60_000) {
      try {
        createBackup(db)
      } catch (error) {
        onError(error)
      }
    }
  }

  runIfDue()

  const timer = setInterval(runIfDue, 60 * 60 * 1000)

  timer.unref()

  return () => clearInterval(timer)
}
