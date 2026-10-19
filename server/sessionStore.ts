import type { OccDatabase, StoredReport } from './database'
import { getIsoNow } from './http'
import { RealtimeHub, recordTransportEvent } from './realtime'
import { addBackgroundAlarm, getNextBackgroundAlarmDelayMs } from '../src/backgroundAlarms'
import type { SessionSnapshotMessage, SessionUpdateMessage } from '../src/session-commands/protocol'
import { buildScenarioReport } from '../src/scenarioReport'
import { applySessionCommand } from '../src/session-commands/applySessionCommand'
import { checkRunGuard, endsRunUnfinished, isRunActive } from '../src/session-commands/runGuards'
import { createSessionDelta } from '../src/session-commands/sessionDelta'
import type { SessionActor, SessionCommand, SessionCommandResult } from '../src/session-commands/types'
import { createSessionCode, getSessionId } from '../src/sessionCode'
import { createInitialSession, restoreSession } from '../src/sessionState'
import type { OccSessionState, SessionScreenJoin, SessionScreenRole, SessionTransportSnapshot } from '../src/types'

// The server's sessions, keyed by session id. Only this module changes a session:
// every change is versioned, saved and sent to that session's screens as a delta.
// The trainer runs up to two at once, Exercise 1 and Exercise 2, one per trainee.

export const MAX_EXERCISES = 2

export type ManagedSession = {
  // 1 or 2; also kept in sessionMeta.exercise for the screens.
  exercise: number
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
  // A Line Map window offering to run the train simulation.
  wantsSimulation?: boolean
}

// Train movement and presence change often; they are saved at most once a second.
const SAVE_DELAY_MS = 1000
// Screens heartbeat every 15 s, so three missed beats free the simulation clock.
const SIMULATION_OWNER_STALE_MS = 45_000

export const SIMULATION_REFUSED = 'Another Line Map window runs the train simulation for this session.'

function withoutSimulationOwner(session: OccSessionState): OccSessionState {
  if (!session.sessionMeta.simulationOwner) {
    return session
  }

  const sessionMeta = { ...session.sessionMeta }

  delete sessionMeta.simulationOwner

  return { ...session, sessionMeta }
}

export class SessionStore {
  readonly realtime: RealtimeHub
  private readonly db: OccDatabase
  private readonly sessions = new Map<string, ManagedSession>()
  private readonly saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly nextBackgroundAlarmAt = new Map<string, number>()
  // Exercise 1; null until the trainer creates the first session.
  private currentId: string | null = null

  constructor(db: OccDatabase) {
    this.db = db

    // The saved session comes back after a restart. With none saved, there is
    // no session until a trainer creates one on the Trainer Console.
    const stored = db.loadCurrentSession()
    const managed = stored ? this.add(withoutSimulationOwner(restoreSession(stored)), 1) : null
    const second = managed ? db.loadSession(db.getSecondSessionId()) : null

    this.currentId = managed?.id ?? null
    this.realtime = new RealtimeHub(
      (userId) => this.followedSessionId(userId),
      (sessionId) => {
        const found = this.sessions.get(sessionId)

        return found ? this.snapshot(found) : null
      },
    )
    if (managed) {
      db.setCurrentSession(managed.session)
    }

    if (second) {
      db.setSecondSession(this.add(withoutSimulationOwner(restoreSession(second)), 2).session)
    }
  }

  hasSession() {
    return this.currentId !== null
  }

  // Routine alarms arrive during a running exercise (src/backgroundAlarms.ts);
  // the first comes a while after the run starts.
  addBackgroundAlarms(now = Date.now()) {
    this.exercises().forEach((managed) => {
      const due = this.nextBackgroundAlarmAt.get(managed.id)

      if (managed.session.scenarioMode !== 'RUNNING') {
        this.nextBackgroundAlarmAt.delete(managed.id)
      } else if (due === undefined) {
        this.nextBackgroundAlarmAt.set(managed.id, now + getNextBackgroundAlarmDelayMs())
      } else if (now >= due) {
        this.commit(managed, addBackgroundAlarm(managed.session), {}, 'later')
        this.nextBackgroundAlarmAt.set(managed.id, now + getNextBackgroundAlarmDelayMs())
      }
    })
  }

  // The trainer's exercises in order.
  exercises() {
    return [...this.sessions.values()].sort((left, right) => left.exercise - right.exercise)
  }

  // The exercise a trainee is in, if any.
  sessionForTrainee(userId: string | null | undefined) {
    return userId ? this.exercises().find((managed) => managed.session.trainees.some((trainee) => trainee.email === userId)) : undefined
  }

  // What a screen shows when it does not name an exercise: a trainee's own,
  // otherwise Exercise 1 (null before the first session is created).
  followedSessionId(userId: string | null): string | null {
    return this.sessionForTrainee(userId)?.id ?? this.currentId
  }

  // Trainees work only in their own exercise (or Exercise 1 before they join one).
  isTraineeAllowed(managed: ManagedSession, userId: string) {
    const own = this.sessionForTrainee(userId)

    return own ? own.id === managed.id : managed.id === this.currentId
  }

  // The trainer creates the session (Exercise 1), then optionally Exercise 2.
  addExercise(actor: SessionActor) {
    if (this.sessions.size >= MAX_EXERCISES) {
      return null
    }

    if (this.currentId === null) {
      return this.createFirst(actor)
    }

    const managed = this.add(createInitialSession(), 2)

    this.db.setSecondSession(managed.session)
    this.db.logAction({ actor, detail: `Exercise 2 (${managed.session.sessionMeta.code})`, kind: 'session.created', sessionId: managed.id })

    return managed
  }

  // Exercise 2 can be closed once nobody is in it; it stays in the database.
  removeExercise(managed: ManagedSession, actor: SessionActor) {
    if (managed.exercise === 1) {
      return 'Exercise 1 cannot be removed.'
    }

    if (managed.session.trainees.length > 0) {
      return `Move ${managed.session.trainees.map((trainee) => trainee.name).join(', ')} to Exercise 1 first.`
    }

    this.saveNow(managed)
    this.sessions.delete(managed.id)
    this.db.setSecondSession(null)
    this.db.logAction({ actor, detail: 'Exercise 2 closed', kind: 'session.cleared', sessionId: managed.id })
    this.realtime.moveClients(managed.id, this.currentId!)

    return null
  }

  // A trainee joins the exercise whose code they typed.
  joinByCode(code: string, actor: SessionActor) {
    const managed = this.find(code.replace(/\s+/g, ''))

    return managed ? this.applyCommand(managed, { code, type: 'TRAINEE_JOIN' }, actor) : null
  }

  // The trainer puts a trainee into an exercise (and so out of the other).
  assignTrainee(managed: ManagedSession, trainee: { id: string; name: string }, actor: SessionActor) {
    return this.applyCommand(managed, { name: trainee.name, traineeId: trainee.id, type: 'ASSIGN_TRAINEE' }, actor)
  }

  summaries() {
    return this.exercises().map((managed) => ({
      code: managed.session.sessionMeta.code,
      exercise: managed.exercise,
      id: managed.id,
      scenarioMode: managed.session.scenarioMode,
      title: managed.session.activeScenario.title,
      trainees: managed.session.trainees.map((trainee) => ({ id: trainee.email, name: trainee.name })),
    }))
  }

  // Exercise 1, or undefined before the trainer has created a session.
  current(): ManagedSession | undefined {
    return this.currentId === null ? undefined : this.sessions.get(this.currentId)
  }

  // The first session: Exercise 1, which screens follow from now on.
  private createFirst(actor: SessionActor | string) {
    const managed = this.add(createInitialSession(), 1)

    this.currentId = managed.id
    this.db.setCurrentSession(managed.session)
    this.db.logAction({ actor, detail: managed.session.sessionMeta.code, kind: 'session.created', sessionId: managed.id })
    this.realtime.sync()

    return managed
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
    // Only the session's clock owner moves trains; a window may take a free clock by moving them.
    if (command.type === 'SIM_UPDATE' && !this.claimSimulation(managed, meta.sourceId, { label: 'Line Map' })) {
      return { managed, result: { accepted: false, reason: SIMULATION_REFUSED, session: managed.session }, update: null }
    }

    // The run's guardrails (runGuards.ts); a refusal is logged like any other.
    const movedTraineeId = command.type === 'ASSIGN_TRAINEE' ? command.traineeId : command.type === 'TRAINEE_JOIN' ? actor.id : undefined
    const traineeRunElsewhere = Boolean(movedTraineeId) && this.exercises().some((other) => (
      other !== managed && isRunActive(other.session) && other.session.trainees.some((trainee) => trainee.email === movedTraineeId)
    ))
    const refusal = checkRunGuard(managed.session, command, actor, traineeRunElsewhere)

    if (refusal) {
      this.db.logAction({ accepted: false, actionType: command.type, actor, detail: refusal, kind: 'command', payload: command, sessionId: managed.id })
      return { managed, result: { accepted: false, reason: refusal, session: managed.session }, update: null }
    }

    // A run ended before Complete stays in History as not completed.
    if (endsRunUnfinished(managed.session, command)) {
      this.archiveReport(managed)
    }

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

    // A trainee is in one exercise at a time.
    if (result.accepted && (command.type === 'TRAINEE_JOIN' || command.type === 'ASSIGN_TRAINEE')) {
      const traineeId = command.type === 'ASSIGN_TRAINEE' ? command.traineeId : actor.id

      this.exercises()
        .filter((other) => other !== target && other.session.trainees.some((trainee) => trainee.email === traineeId))
        .forEach((other) => this.applyCommand(other, { traineeId: traineeId!, type: 'TRAINEE_LEAVE' }, actor))
    }

    // Screens that follow a trainee move with them.
    if (before.trainees !== target.session.trainees) {
      this.realtime.sync()
    }

    return { managed: target, result, update }
  }

  // Screens heartbeat every 15 s; only a first join goes into the action log.
  registerScreen(managed: ManagedSession, screen: ScreenRegistration) {
    const now = getIsoNow()
    const session = managed.session
    const existing = session.sessionMeta.screens[screen.role]
    const isNewJoin = !existing || existing.sourceId !== screen.sourceId
    const owner = session.sessionMeta.simulationOwner
    const next: OccSessionState = {
      ...session,
      sessionMeta: {
        ...session.sessionMeta,
        // The owner's heartbeat keeps its clock.
        ...(owner && owner.sourceId === screen.sourceId ? { simulationOwner: { ...owner, lastSeenAt: now } } : {}),
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

    if (screen.wantsSimulation) {
      this.claimSimulation(managed, screen.sourceId, { label: screen.label })
    }

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

  // Gives the session's train simulation to this window when the clock is free
  // (no owner, or the owner fell silent) or on an explicit take-over. Returns
  // whether the window owns it now.
  claimSimulation(managed: ManagedSession, sourceId: string | undefined, options: { label: string; takeover?: boolean }) {
    if (!sourceId) {
      return false
    }

    const owner = managed.session.sessionMeta.simulationOwner

    if (owner?.sourceId === sourceId) {
      return true
    }

    if (owner && !options.takeover && Date.now() - Date.parse(owner.lastSeenAt) <= SIMULATION_OWNER_STALE_MS) {
      return false
    }

    const now = getIsoNow()

    this.commit(managed, {
      ...managed.session,
      sessionMeta: {
        ...managed.session.sessionMeta,
        simulationOwner: { label: options.label, lastSeenAt: now, since: now, sourceId },
      },
    }, { sourceId }, 'now')
    this.db.logAction({
      actor: sourceId,
      detail: owner ? `${options.takeover ? 'Taken over' : 'Taken'} from ${owner.sourceId}` : options.label,
      kind: 'simulation.owner',
      sessionId: managed.id,
    })

    return true
  }

  // A closed window gives up the clock at once, so another Line Map can take it.
  releaseSimulation(sourceId: string) {
    this.sessions.forEach((managed) => {
      if (managed.session.sessionMeta.simulationOwner?.sourceId === sourceId) {
        this.commit(managed, withoutSimulationOwner(managed.session), { sourceId }, 'now')
        this.db.logAction({ actor: sourceId, detail: 'Window closed', kind: 'simulation.released', sessionId: managed.id })
      }
    })
  }

  // Keeps the latest monitor launch with the session for the console's diagnostics.
  recordMonitorLaunch(managed: ManagedSession, launch: OccSessionState['sessionMeta']['lastMonitorLaunch']) {
    this.commit(managed, {
      ...managed.session,
      sessionMeta: { ...managed.session.sessionMeta, lastMonitorLaunch: launch },
    }, { sourceId: launch?.sourceId }, 'later')
  }

  // Starts a fresh session in place of the current one (or the first one).
  clearCurrent(sourceId: string) {
    const previous = this.current()

    if (!previous) {
      return this.createFirst(sourceId)
    }

    this.db.logAction({ actor: sourceId, kind: 'session.cleared', sessionId: previous.id })

    return this.replace(previous, createInitialSession(), { keepTrainees: false })
  }

  reportId(managed: ManagedSession) {
    return `${managed.id}#${managed.session.sessionMeta.startedAt ?? 'not-started'}`
  }

  buildReportSummary(managed: ManagedSession): Record<string, unknown> {
    const session = managed.session

    return {
      ...buildScenarioReport(session).archiveSummary,
      completedAt: session.sessionMeta.completedAt,
      exercise: managed.exercise,
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
  private add(session: OccSessionState, exercise: number): ManagedSession {
    const otherCodes = new Set([...this.sessions.values()].map((managed) => managed.session.sessionMeta.code))
    let code = session.sessionMeta.code

    // Each exercise needs its own code for trainees to type.
    while (otherCodes.has(code)) {
      code = createSessionCode()
    }

    const numbered: OccSessionState = { ...session, sessionMeta: { ...session.sessionMeta, code, exercise } }
    const managed: ManagedSession = { exercise, id: getSessionId(numbered), session: numbered, version: Date.now() }

    this.sessions.set(managed.id, managed)

    return managed
  }

  // A whole-session reset gives the exercise a new session and code; its trainees stay in it.
  private replace(previous: ManagedSession, session: OccSessionState, options: { keepTrainees?: boolean } = {}): ManagedSession {
    this.saveNow(previous)
    this.sessions.delete(previous.id)

    const managed = this.add(
      options.keepTrainees === false ? session : { ...session, trainees: previous.session.trainees },
      previous.exercise,
    )

    if (this.currentId === previous.id) {
      this.currentId = managed.id
      this.db.setCurrentSession(managed.session)
    } else {
      this.db.setSecondSession(managed.session)
    }

    this.realtime.moveClients(previous.id, managed.id)
    this.db.logAction({ detail: managed.session.sessionMeta.code, kind: 'session.created', sessionId: managed.id })
    recordTransportEvent('session_reset', { detail: `New session ${managed.session.sessionMeta.code}.`, transport: 'backend' })

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
