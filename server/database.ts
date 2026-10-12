import { mkdirSync, readFileSync, renameSync, existsSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import { DATABASE_FILE, DATA_DIR, LEGACY_REPORTS_FILE, LEGACY_SESSION_FILE } from './config'
import { getIsoNow } from './http'
import { getSessionId } from '../src/sessionCode'
import type { SessionActor } from '../src/session-commands/types'
import type { OccSessionState } from '../src/types'

// One SQLite file holds the sessions, the action log and archived reports.
// node:sqlite ships with Node 24, so the LAN host needs nothing else installed.

export type ActionLogKind =
  | 'command'
  | 'report.archived'
  | 'report.notes'
  | 'screen.joined'
  | 'session.cleared'
  | 'session.created'
  | 'simulation.owner'
  | 'simulation.released'
  // Kinds written before phase 2; kept so older logs still read back.
  | 'scenario.action'
  | 'session.published'
  | 'session.reset'

export type ActionLogEntry = {
  accepted?: boolean
  actionType?: string
  actor?: SessionActor | string
  detail?: string
  kind: ActionLogKind
  payload?: unknown
  sessionId?: string
}

export type ActionLogRow = {
  accepted: number | null
  action_type: string | null
  actor: string | null
  actor_id: string | null
  actor_role: string | null
  at: string
  detail: string | null
  id: number
  kind: ActionLogKind
  payload: string | null
  session_id: string
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

// Columns added after the database was first released.
const ADDED_COLUMNS: Array<{ column: string; definition: string; table: string }> = [
  { column: 'actor_role', definition: 'text', table: 'action_log' },
  { column: 'actor_id', definition: 'text', table: 'action_log' },
  { column: 'updated_at', definition: 'text', table: 'reports' },
]

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
    this.addMissingColumns()
  }

  loadCurrentSession(): OccSessionState | null {
    const id = this.getSetting('current_session_id')
    const row = id
      ? this.db.prepare('select snapshot from sessions where id = ?').get(id) as { snapshot: string } | undefined
      : undefined

    return row ? JSON.parse(row.snapshot) as OccSessionState : null
  }

  saveSession(session: OccSessionState) {
    this.db.prepare(`
      insert into sessions (id, code, created_at, updated_at, snapshot) values (?, ?, ?, ?, ?)
      on conflict (id) do update set updated_at = excluded.updated_at, snapshot = excluded.snapshot
    `).run(getSessionId(session), session.sessionMeta.code, session.sessionMeta.createdAt, session.updatedAt, JSON.stringify(session))
  }

  // The session new screens open on (phase 5 runs two at once).
  setCurrentSession(session: OccSessionState) {
    this.saveSession(session)
    this.setSetting('current_session_id', getSessionId(session))
  }

  clearCurrentSession() {
    this.db.prepare('delete from settings where key = ?').run('current_session_id')
  }

  logAction(entry: ActionLogEntry) {
    const actor: Partial<SessionActor> | undefined = typeof entry.actor === 'string' ? { name: entry.actor } : entry.actor

    this.db.prepare(`
      insert into action_log (session_id, at, kind, actor, actor_role, actor_id, action_type, accepted, detail, payload)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.sessionId ?? null,
      getIsoNow(),
      entry.kind,
      actor?.name ?? null,
      actor?.role ?? null,
      actor?.id ?? null,
      entry.actionType ?? null,
      entry.accepted === undefined ? null : Number(entry.accepted),
      entry.detail ?? null,
      entry.payload === undefined ? null : JSON.stringify(entry.payload),
    )
  }

  listActions(sessionId: string) {
    return this.db.prepare('select * from action_log where session_id = ? order by id').all(sessionId) as ActionLogRow[]
  }

  // Browsers never send a summary: the server computes it from its own session.
  // Notes are kept when the summary is refreshed.
  saveReport(report: { id: string; notes?: string; summary: Record<string, unknown> }, sessionId: string) {
    const existing = this.getReport(report.id)
    const stored: StoredReport = {
      id: report.id,
      notes: report.notes ?? existing?.notes ?? '',
      summary: report.summary,
    }
    const now = getIsoNow()

    this.db.prepare(`
      insert into reports (id, session_id, created_at, updated_at, report) values (?, ?, ?, ?, ?)
      on conflict (id) do update set updated_at = excluded.updated_at, report = excluded.report
    `).run(report.id, sessionId, now, now, JSON.stringify(stored))

    return stored
  }

  getReport(id: string) {
    const row = this.db.prepare('select report from reports where id = ?').get(id) as { report: string } | undefined

    return row ? JSON.parse(row.report) as StoredReport : null
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
          this.setCurrentSession(session)
        }
      } catch {
        // An unreadable legacy session is skipped; the server starts a fresh one.
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

  private addMissingColumns() {
    ADDED_COLUMNS.forEach(({ column, definition, table }) => {
      const columns = this.db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>

      if (!columns.some((item) => item.name === column)) {
        this.db.exec(`alter table ${table} add column ${column} ${definition}`)
      }
    })
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
