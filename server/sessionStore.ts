import type { OccDatabase, StoredReport } from './database'
import { getIsoNow } from './http'
import { RealtimeHub, recordTransportEvent } from './realtime'
import type { SessionSnapshotMessage, SessionUpdateMessage } from '../src/session-commands/protocol'
import { buildScenarioReport } from '../src/scenarioReport'
import { applySessionCommand } from '../src/session-commands/applySessionCommand'
import { createSessionDelta } from '../src/session-commands/sessionDelta'
import type { SessionActor, SessionCommand, SessionCommandResult } from '../src/session-commands/types'
import { getSessionId } from '../src/sessionCode'
import { createInitialSession, restoreSession } from '../src/sessionState'
import type { OccSessionState, SessionScreenJoin, SessionScreenRole, SessionTransportSnapshot } from '../src/types'

// The server's sessions, keyed by session id. Only this module changes a session:
// every change is versioned, saved and sent to that session's screens as a delta.
// Phase 2 runs one session; phase 5 runs one per trainee.

export type ManagedSession = {
  id: string
  session: OccSessionState
  version: number
}

export type CommandOutcome = {
  managed: ManagedSession
  result: SessionCommandResult
  update: SessionUpdateMessage | null
}

export type ScreenRegistration = {
  label: string
  role: SessionScreenRole
  route: SessionScreenJoin['route']
  sourceId?: string
  transport?: SessionTransportSnapshot
}

// Train movement and presence change often; they are saved at most once a second.
const SAVE_DELAY_MS = 1000

export class SessionStore {
  readonly realtime: RealtimeHub
  private readonly db: OccDatabase
  private readonly sessions = new Map<string, ManagedSession>()
  private readonly saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private currentId: string

  constructor(db: OccDatabase) {
    this.db = db

    const stored = db.loadCurrentSession()
    const managed = this.add(stored ? restoreSession(stored) : createInitialSession())

    this.currentId = managed.id
    this.realtime = new RealtimeHub(() => this.currentId)
    db.setCurrentSession(managed.session)

    if (!stored) {
      db.logAction({ detail: managed.session.sessionMeta.code, kind: 'session.created', sessionId: managed.id })
    }
  }

  current() {
    return this.sessions.get(this.currentId) as ManagedSession
  }

  // By session id, or by the code trainees type.
  find(reference: string | null | undefined) {
    if (!reference) {
      return undefined
    }

    return this.sessions.get(reference)
      ?? [...this.sessions.values()].find((managed) => managed.session.sessionMeta.code === reference.toUpperCase())
  }

  snapshot(managed: ManagedSession): SessionSnapshotMessage {
    return { session: managed.session, sessionId: managed.id, type: 'session:snapshot', version: managed.version }
  }

  applyCommand(
    managed: ManagedSession,
    command: SessionCommand,
    actor: SessionActor,
    meta: { commandId?: string; sourceId?: string } = {},
  ): CommandOutcome {
    const before = managed.session
    const result = applySessionCommand(before, command, { actor })
    let target = managed
    let update: SessionUpdateMessage | null = null

    if (result.session !== before) {
      if (getSessionId(result.session) !== managed.id) {
        target = this.replace(managed, result.session)
      } else {
        update = this.commit(managed, result.session, meta, command.type === 'SIM_UPDATE' ? 'later' : 'now')
      }
    }

    // Train movement is simulation output, not an operator action.
    if (command.type !== 'SIM_UPDATE') {
      this.db.logAction({
        accepted: result.accepted,
        actionType: command.type,
        actor,
        detail: result.reason,
        kind: 'command',
        payload: command,
        sessionId: managed.id,
      })
      recordTransportEvent(result.accepted ? 'scenario_action_accepted' : 'scenario_action_rejected', {
        detail: result.reason ?? `${command.type} applied by the server.`,
        sourceId: meta.sourceId,
        transport: 'backend',
      })
    }

    // Every completed run is archived, scored by the server.
    if (before.scenarioMode !== 'COMPLETE' && target.session.scenarioMode === 'COMPLETE') {
      this.archiveReport(target)
    }

    return { managed: target, result, update }
  }

  // Screens heartbeat every 15 s; only a first join goes into the action log.
  registerScreen(managed: ManagedSession, screen: ScreenRegistration) {
    const now = getIsoNow()
    const session = managed.session
    const existing = session.sessionMeta.screens[screen.role]
    const isNewJoin = !existing || existing.sourceId !== screen.sourceId
    const next: OccSessionState = {
      ...session,
      sessionMeta: {
        ...session.sessionMeta,
        screens: {
          ...session.sessionMeta.screens,
          [screen.role]: {
            joinedAt: isNewJoin ? now : existing.joinedAt,
            label: screen.label,
            lastSeenAt: now,
            role: screen.role,
            route: screen.route,
            sourceId: screen.sourceId,
            status: 'ONLINE',
            transport: screen.transport,
          },
        },
      },
    }

    this.commit(managed, next, { sourceId: screen.sourceId }, 'later')

    if (isNewJoin) {
      recordTransportEvent('screen_joined', {
        detail: `${screen.label} registered ${screen.transport?.backendSse ?? 'UNKNOWN'} SSE.`,
        role: screen.role,
        route: screen.route,
        sourceId: screen.sourceId,
        transport: 'backend',
      })
      this.db.logAction({
        actor: screen.sourceId,
        detail: screen.label,
        kind: 'screen.joined',
        payload: { role: screen.role, route: screen.route },
        sessionId: managed.id,
      })
    }

    return next.sessionMeta.screens[screen.role]
  }

  // Keeps the latest monitor launch with the session for the console's diagnostics.
  recordMonitorLaunch(managed: ManagedSession, launch: OccSessionState['sessionMeta']['lastMonitorLaunch']) {
    this.commit(managed, {
      ...managed.session,
      sessionMeta: { ...managed.session.sessionMeta, lastMonitorLaunch: launch },
    }, { sourceId: launch?.sourceId }, 'later')
  }

  // Starts a fresh session in place of the current one.
  clearCurrent(sourceId: string) {
    const previous = this.current()

    this.db.logAction({ actor: sourceId, kind: 'session.cleared', sessionId: previous.id })

    return this.replace(previous, createInitialSession())
  }

  reportId(managed: ManagedSession) {
    return `${managed.id}#${managed.session.sessionMeta.startedAt ?? 'not-started'}`
  }

  buildReportSummary(managed: ManagedSession): Record<string, unknown> {
    const session = managed.session

    return {
      ...buildScenarioReport(session).archiveSummary,
      generatedAt: getIsoNow(),
      lifecycle: session.sessionMeta.lifecycle,
      mode: session.trainingMode,
      sessionCode: session.sessionMeta.code,
      sessionId: managed.id,
      startedAt: session.sessionMeta.startedAt,
      trainees: session.trainees.map((trainee) => ({ id: trainee.email, name: trainee.name })),
    }
  }

  // The summary always comes from the server's own session; a browser can only add notes.
  archiveReport(managed: ManagedSession, notes?: string): StoredReport {
    const report = this.db.saveReport({ id: this.reportId(managed), notes, summary: this.buildReportSummary(managed) }, managed.id)

    this.db.logAction({ detail: report.id, kind: notes === undefined ? 'report.archived' : 'report.notes', sessionId: managed.id })

    return report
  }

  flush() {
    this.saveTimers.forEach((timer, id) => {
      clearTimeout(timer)

      const managed = this.sessions.get(id)

      if (managed) {
        this.db.saveSession(managed.session)
      }
    })
    this.saveTimers.clear()
  }

  // Versions start from the clock, so they keep rising across a server restart
  // and screens that stayed open accept the restarted server's session.
  private add(session: OccSessionState): ManagedSession {
    const managed: ManagedSession = { id: getSessionId(session), session, version: Date.now() }

    this.sessions.set(managed.id, managed)

    return managed
  }

  private replace(previous: ManagedSession, session: OccSessionState): ManagedSession {
    this.saveNow(previous)
    this.sessions.delete(previous.id)

    const managed = this.add(session)

    // Before the current session changes, so screens following it are found.
    this.realtime.moveClients(previous.id, this.snapshot(managed))

    if (this.currentId === previous.id) {
      this.currentId = managed.id
      this.db.setCurrentSession(session)
    } else {
      this.db.saveSession(session)
    }

    this.db.logAction({ detail: session.sessionMeta.code, kind: 'session.created', sessionId: managed.id })
    recordTransportEvent('session_reset', { detail: `New session ${session.sessionMeta.code}.`, transport: 'backend' })

    return managed
  }

  private commit(
    managed: ManagedSession,
    next: OccSessionState,
    meta: { commandId?: string; sourceId?: string },
    persist: 'later' | 'now',
  ): SessionUpdateMessage | null {
    const delta = createSessionDelta(managed.session, next)

    managed.session = next

    if (!delta) {
      return null
    }

    const message: SessionUpdateMessage = {
      baseVersion: managed.version,
      ...(meta.commandId ? { commandId: meta.commandId } : {}),
      delta,
      sessionId: managed.id,
      ...(meta.sourceId ? { sourceId: meta.sourceId } : {}),
      type: 'session:update',
      version: managed.version + 1,
    }

    managed.version = message.version
    this.realtime.send(managed.id, message)

    if (persist === 'now') {
      this.saveNow(managed)
    } else if (!this.saveTimers.has(managed.id)) {
      this.saveTimers.set(managed.id, setTimeout(() => this.saveNow(managed), SAVE_DELAY_MS))
    }

    return message
  }

  private saveNow(managed: ManagedSession) {
    const timer = this.saveTimers.get(managed.id)

    if (timer) {
      clearTimeout(timer)
      this.saveTimers.delete(managed.id)
    }

    this.db.saveSession(managed.session)
  }
}
