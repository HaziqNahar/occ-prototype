import { mkdirSync, readFileSync, renameSync, existsSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import { DATABASE_FILE, DATA_DIR, LEGACY_REPORTS_FILE, LEGACY_SESSION_FILE } from './config'
import { getIsoNow } from './http'
import type { OccSessionState } from '../src/types'

// One SQLite file holds the session, the action log and archived reports.
// node:sqlite ships with Node 24, so the LAN host needs nothing else installed.

export type ActionLogKind =
  | 'report.archived'
  | 'scenario.action'
  | 'screen.joined'
  | 'session.cleared'
  | 'session.published'
  | 'session.reset'

export type ActionLogEntry = {
  accepted?: boolean
  actionType?: string
  actor?: string
  detail?: string
  kind: ActionLogKind
  payload?: unknown
  sessionId?: string
}

export type StoredReport = {
  id: string
  notes: unknown
  summary: Record<string, unknown>
}

const SCHEMA = `
  create table if not exists sessions (
    id text primary key,
    code text not null,
    created_at text not null,
    updated_at integer not null,
    snapshot text not null
  );
  create table if not exists action_log (
    id integer primary key autoincrement,
    session_id text,
    at text not null,
    kind text not null,
    actor text,
    action_type text,
    accepted integer,
    detail text,
    payload text
  );
  create index if not exists action_log_session on action_log (session_id, id);
  create table if not exists reports (
    id text primary key,
    session_id text,
    created_at text not null,
    report text not null
  );
  create table if not exists settings (
    key text primary key,
    value text not null
  );
`

// Loading node:sqlite prints an "experimental" warning; silence only that one.
function loadSqlite() {
  const originalEmitWarning = process.emitWarning

  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    if (String(warning).includes('SQLite')) {
      return
    }

    return (originalEmitWarning as (...args: unknown[]) => void).call(process, warning, ...rest)
  }) as typeof process.emitWarning

  try {
    return process.getBuiltinModule('node:sqlite')
  } finally {
    process.emitWarning = originalEmitWarning
  }
}

// A session's id is stable for its lifetime: a reset creates a new session.
export function getSessionId(session: Pick<OccSessionState, 'sessionMeta'>) {
  return `${session.sessionMeta.code}-${session.sessionMeta.createdAt}`
}

export class OccDatabase {
  private readonly db: DatabaseSync

  constructor(file: string = DATABASE_FILE) {
    const { DatabaseSync: Database } = loadSqlite()

    if (file !== ':memory:') {
      mkdirSync(DATA_DIR, { recursive: true })
    }

    this.db = new Database(file)
    this.db.exec('pragma journal_mode = wal; pragma synchronous = normal;')
    this.db.exec(SCHEMA)
  }

  loadCurrentSession(): OccSessionState | null {
    const id = this.getSetting('current_session_id')
    const row = id
      ? this.db.prepare('select snapshot from sessions where id = ?').get(id) as { snapshot: string } | undefined
      : undefined

    return row ? JSON.parse(row.snapshot) as OccSessionState : null
  }

  saveCurrentSession(session: OccSessionState) {
    const id = getSessionId(session)

    this.db.prepare(`
      insert into sessions (id, code, created_at, updated_at, snapshot) values (?, ?, ?, ?, ?)
      on conflict (id) do update set updated_at = excluded.updated_at, snapshot = excluded.snapshot
    `).run(id, session.sessionMeta.code, session.sessionMeta.createdAt, session.updatedAt, JSON.stringify(session))
    this.setSetting('current_session_id', id)
  }

  clearCurrentSession() {
    this.db.prepare('delete from settings where key = ?').run('current_session_id')
  }

  logAction(entry: ActionLogEntry) {
    this.db.prepare(`
      insert into action_log (session_id, at, kind, actor, action_type, accepted, detail, payload)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.sessionId ?? null,
      getIsoNow(),
      entry.kind,
      entry.actor ?? null,
      entry.actionType ?? null,
      entry.accepted === undefined ? null : Number(entry.accepted),
      entry.detail ?? null,
      entry.payload === undefined ? null : JSON.stringify(entry.payload),
    )
  }

  listActions(sessionId: string) {
    return this.db.prepare('select * from action_log where session_id = ? order by id').all(sessionId) as Array<{
      accepted: number | null
      action_type: string | null
      actor: string | null
      at: string
      detail: string | null
      id: number
      kind: ActionLogKind
      payload: string | null
      session_id: string
    }>
  }

  saveReport(report: StoredReport, sessionId?: string) {
    this.db.prepare('insert into reports (id, session_id, created_at, report) values (?, ?, ?, ?)')
      .run(report.id, sessionId ?? null, getIsoNow(), JSON.stringify(report))
  }

  listReports() {
    return (this.db.prepare('select report from reports order by created_at').all() as Array<{ report: string }>)
      .map((row) => JSON.parse(row.report) as StoredReport)
  }

  // Imports session.json and reports.ndjson written by the old JavaScript backend,
  // then renames them so they are not imported twice.
  migrateLegacyFiles() {
    if (existsSync(LEGACY_SESSION_FILE)) {
      try {
        const session = JSON.parse(readFileSync(LEGACY_SESSION_FILE, 'utf8')) as OccSessionState

        if (!this.loadCurrentSession() && session?.sessionMeta?.code && session.sessionMeta.createdAt) {
          this.saveCurrentSession(session)
        }
      } catch {
        // An unreadable legacy session is skipped; the next browser seeds a fresh one.
      }

      renameSync(LEGACY_SESSION_FILE, `${LEGACY_SESSION_FILE}.migrated`)
    }

    if (existsSync(LEGACY_REPORTS_FILE)) {
      readFileSync(LEGACY_REPORTS_FILE, 'utf8').split('\n').filter(Boolean).forEach((line) => {
        try {
          const report = JSON.parse(line) as StoredReport

          this.db.prepare('insert or ignore into reports (id, session_id, created_at, report) values (?, ?, ?, ?)')
            .run(report.id, null, getIsoNow(), line)
        } catch {
          // Skip a damaged line rather than losing the rest of the archive.
        }
      })
      renameSync(LEGACY_REPORTS_FILE, `${LEGACY_REPORTS_FILE}.migrated`)
    }
  }

  close() {
    this.db.close()
  }

  private getSetting(key: string) {
    const row = this.db.prepare('select value from settings where key = ?').get(key) as { value: string } | undefined

    return row?.value
  }

  private setSetting(key: string, value: string) {
    this.db.prepare('insert into settings (key, value) values (?, ?) on conflict (key) do update set value = excluded.value')
      .run(key, value)
  }
}
