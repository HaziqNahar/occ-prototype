import type { IncomingMessage, ServerResponse } from 'node:http'
import { AuthService } from './auth'
import { createBackup, listBackups } from './backup'
import type { OccDatabase } from './database'
import { getRunDetail, getTraineeProgress, listRuns } from './history'
import { createId, readJsonBody, RequestError, sendJson, setCorsHeaders } from './http'
import { getTransportEvents, recordTransportEvent } from './realtime'
import { SessionStore } from './sessionStore'
import type { ManagedSession } from './sessionStore'
import { serveStatic } from './static'
import type { PublicUser } from '../src/accounts'
import type { SessionActor, SessionCommand } from '../src/session-commands/types'
import type {
  MonitorLaunchRoute,
  SessionMonitorLaunch,
  SessionScreenJoin,
  SessionScreenRole,
  SessionTransportSnapshot,
} from '../src/types'

const MONITOR_LAUNCH_ORIGIN = '/screen/line-map'
const MONITOR_LAUNCH_TARGETS = new Set<string>(['/screen/alarms', '/screen/timetable'])
const SCREEN_ROLES = new Set<string>(['ALARM', 'LINE_MAP', 'TIMETABLE', 'IOS', 'TRAINEE', 'LOBBY', 'REPORT'])

const optionalString = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined)

function requireUser(user: PublicUser | null) {
  if (!user) {
    throw new RequestError('Sign in first.', 401)
  }

  return user
}

function requireTrainer(user: PublicUser | null) {
  if (requireUser(user).role !== 'trainer') {
    throw new RequestError('Only trainers can do that.', 403)
  }

  return user!
}

function requireAdmin(user: PublicUser | null) {
  if (!requireTrainer(user).admin) {
    throw new RequestError('Only an admin trainer can manage people.', 403)
  }

  return user!
}

// Commands act as the signed-in account; whatever a page claims is ignored.
function toActor(user: PublicUser): SessionActor {
  return { id: user.id, name: user.name, role: user.role }
}

// The sign-in token: an Authorization header, or ?token= for the event stream
// (EventSource cannot send headers).
function readToken(request: IncomingMessage, url: URL) {
  const header = request.headers.authorization

  return header?.startsWith('Bearer ') ? header.slice(7).trim() : url.searchParams.get('token')
}

// HTTP API for the OCC training sessions. Browsers send commands; the server
// applies them and streams the result. Everything but health and sign-in needs
// a signed-in account. See docs/production-plan.md, phases 2 and 4.
export function createRoutes(
  db: OccDatabase,
  store: SessionStore = new SessionStore(db),
  auth: AuthService = new AuthService(db),
) {
  // The exercise a screen shows when it names none: a trainee's own, otherwise Exercise 1.
  function followed(user: PublicUser | null) {
    return store.find(store.followedSessionId(user?.id ?? null)) ?? store.current()
  }

  // Requests name their exercise (session id or code), or get the followed one.
  // Trainees cannot reach the other trainee's exercise.
  function resolveSession(reference: string | null | undefined, user: PublicUser | null): ManagedSession | null {
    const managed = reference ? store.find(reference) ?? null : followed(user)

    if (managed && user?.role === 'trainee' && !store.isTraineeAllowed(managed, user.id)) {
      throw new RequestError('That is another trainee\'s exercise.', 403)
    }

    return managed
  }

  function buildTransportStatus(managed: ManagedSession) {
    const screens = Object.values(managed.session.sessionMeta.screens ?? {})
    const snapshots = screens.map((screen) => screen?.transport).filter((transport): transport is SessionTransportSnapshot => Boolean(transport))

    return {
      clients: store.realtime.clientCount,
      connectedChannelScreens: snapshots.filter((transport) => transport.broadcastChannel === 'CONNECTED').length,
      connectedSseScreens: snapshots.filter((transport) => transport.backendSse === 'CONNECTED').length,
      connectedWorkerScreens: snapshots.filter((transport) => transport.sharedWorker === 'CONNECTED').length,
      events: getTransportEvents(),
      lastMonitorLaunch: managed.session.sessionMeta.lastMonitorLaunch ?? null,
      screens,
      sessionCode: managed.session.sessionMeta.code,
      updatedAt: managed.session.updatedAt,
    }
  }

  function sendSnapshot(response: ServerResponse, managed: ManagedSession, statusCode = 200, extra: Record<string, unknown> = {}) {
    sendJson(response, statusCode, { ...extra, ...store.snapshot(managed), updatedAt: managed.session.updatedAt })
  }

  async function handleCommand(request: IncomingMessage, response: ServerResponse, user: PublicUser) {
    const body = await readJsonBody(request)
    const requestedSessionId = optionalString(body.sessionId)
    const managed = resolveSession(requestedSessionId, user)

    // A window still showing a session that was reset gets its current one instead.
    if (!managed) {
      sendSnapshot(response, followed(user), 409, { error: 'stale_session', message: 'That session has ended. Showing the current session.' })
      return
    }

    const actor = toActor(user)
    const command = body.command as SessionCommand
    const outcome = store.applyCommand(managed, command, actor, {
      commandId: optionalString(body.commandId),
      sourceId: optionalString(body.sourceId),
    })

    sendJson(response, 200, {
      accepted: outcome.result.accepted,
      ok: true,
      reason: outcome.result.reason ?? null,
      sessionId: outcome.managed.id,
      update: outcome.update,
      version: outcome.managed.version,
    })
  }

  async function handleScreenJoin(request: IncomingMessage, response: ServerResponse, managed: ManagedSession) {
    const body = await readJsonBody(request)
    const label = optionalString(body.label)
    const role = optionalString(body.role)
    const route = optionalString(body.route) as SessionScreenJoin['route'] | undefined

    if (!label || !role || !SCREEN_ROLES.has(role) || !route) {
      sendJson(response, 400, { error: 'invalid_screen_registration', message: 'Expected role, label, and route for screen registration.' })
      return
    }

    const screen = store.registerScreen(managed, {
      label,
      role: role as SessionScreenRole,
      route,
      sourceId: optionalString(body.sourceId),
      transport: body.transport as SessionTransportSnapshot | undefined,
      wantsSimulation: body.wantsSimulation === true,
    })

    sendJson(response, 200, { ok: true, screen, sessionId: managed.id, version: managed.version })
  }

  function normalizeMonitorLaunchRequest(body: Record<string, unknown>): SessionMonitorLaunch {
    const originRoute = body.originRoute ?? MONITOR_LAUNCH_ORIGIN

    if (originRoute !== MONITOR_LAUNCH_ORIGIN) {
      throw new RequestError('Monitor launch requests must originate from the Line Map screen.')
    }

    if (!Array.isArray(body.targets)) {
      throw new RequestError('Expected monitor launch targets.')
    }

    const targets = [...new Set(body.targets.filter((target): target is MonitorLaunchRoute => (
      typeof target === 'string' && MONITOR_LAUNCH_TARGETS.has(target)
    )))]

    if (!targets.length) {
      throw new RequestError('Expected at least one supported monitor launch target.')
    }

    const requestedAt = Number(body.requestedAt)

    return {
      launchId: optionalString(body.launchId) ?? createId(),
      originRoute: MONITOR_LAUNCH_ORIGIN,
      requestedAt: Number.isFinite(requestedAt) ? requestedAt : Date.now(),
      sourceId: optionalString(body.sourceId) ?? 'backend',
      targets,
    }
  }

  async function handleMonitorLaunch(request: IncomingMessage, response: ServerResponse, managed: ManagedSession) {
    const launchRequest = normalizeMonitorLaunchRequest(await readJsonBody(request))

    store.recordMonitorLaunch(managed, launchRequest)
    recordTransportEvent('monitor_launch_requested', {
      detail: `Launch ${launchRequest.targets.join(', ')} from Line Map.`,
      route: launchRequest.originRoute,
      sourceId: launchRequest.sourceId,
      transport: 'backend',
    })
    store.realtime.broadcastMonitorLaunch(launchRequest)
    sendJson(response, 202, { ok: true, request: launchRequest })
  }

  // A Line Map window asks for the session's train simulation; takeover forces it.
  async function handleSimulationClaim(request: IncomingMessage, response: ServerResponse, managed: ManagedSession) {
    const body = await readJsonBody(request)
    const owner = store.claimSimulation(managed, optionalString(body.sourceId), {
      label: optionalString(body.label) ?? 'Line Map',
      takeover: body.takeover === true,
    })

    sendJson(response, 200, { ok: true, owner, simulationOwner: managed.session.sessionMeta.simulationOwner ?? null })
  }

  async function handleClearRuntime(request: IncomingMessage, response: ServerResponse) {
    const body = request.method === 'POST' ? await readJsonBody(request) : {}
    const sourceId = optionalString(body.sourceId) ?? 'backend'
    const managed = store.clearCurrent(sourceId)

    recordTransportEvent('session_runtime_cleared', { detail: 'Runtime session cleared; a fresh session started.', sourceId, transport: 'backend' })
    sendSnapshot(response, managed, 200, { ok: true })
  }

  // Trainer notes for the current run. The score comes from the server's session.
  async function handleReportArchive(request: IncomingMessage, response: ServerResponse, user: PublicUser) {
    const body = await readJsonBody(request)
    const managed = resolveSession(optionalString(body.sessionId), user)

    if (!managed) {
      sendJson(response, 404, { error: 'unknown_session', message: 'That session has ended.' })
      return
    }

    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 10_000) : ''
    const report = store.archiveReport(managed, notes)

    sendJson(response, 201, { ok: true, report })
  }

  async function handleAccountRoute(request: IncomingMessage, response: ServerResponse, method: string, pathname: string, user: PublicUser | null) {
    switch (`${method} ${pathname}`) {
      case 'GET /api/auth/status':
        sendJson(response, 200, { needsSetup: auth.needsSetup() })
        return true
      case 'POST /api/auth/setup': {
        const body = await readJsonBody(request)
        const result = await auth.setup({ id: String(body.username ?? ''), name: String(body.name ?? ''), password: String(body.password ?? '') })

        db.logAction({ actor: toActor(result.user), detail: 'First trainer (admin) set up', kind: 'account.created' })
        sendJson(response, 201, result)
        return true
      }
      case 'POST /api/auth/login': {
        const body = await readJsonBody(request)

        sendJson(response, 200, await auth.signIn(String(body.username ?? ''), String(body.password ?? '')))
        return true
      }
      case 'POST /api/auth/logout': {
        const token = readToken(request, new URL(request.url ?? '/', 'http://localhost'))

        if (token) {
          auth.signOut(token)
        }

        sendJson(response, 200, { ok: true })
        return true
      }
      case 'GET /api/auth/me':
        sendJson(response, 200, { user: requireUser(user) })
        return true
      case 'GET /api/users':
        requireAdmin(user)
        sendJson(response, 200, { users: auth.listUsers() })
        return true
      case 'POST /api/users': {
        const admin = requireAdmin(user)
        const body = await readJsonBody(request)
        const created = await auth.createAccount({
          admin: body.admin === true,
          id: String(body.username ?? ''),
          name: String(body.name ?? ''),
          password: String(body.password ?? ''),
          role: body.role as PublicUser['role'],
        })

        db.logAction({ actor: toActor(admin), detail: `${created.role} ${created.id}`, kind: 'account.created' })
        sendJson(response, 201, { user: created })
        return true
      }
    }

    if (method === 'PATCH' && pathname.startsWith('/api/users/')) {
      const admin = requireAdmin(user)
      const body = await readJsonBody(request)
      const id = decodeURIComponent(pathname.slice('/api/users/'.length))
      const updated = await auth.updateAccount(admin, id, {
        admin: typeof body.admin === 'boolean' ? body.admin : undefined,
        disabled: typeof body.disabled === 'boolean' ? body.disabled : undefined,
        name: typeof body.name === 'string' ? body.name : undefined,
        password: typeof body.password === 'string' ? body.password : undefined,
      })
      const changed = Object.keys(body).filter((key) => key !== 'password').concat(body.password === undefined ? [] : ['password reset'])

      db.logAction({ actor: toActor(admin), detail: `${updated.id}: ${changed.join(', ')}`, kind: 'account.updated' })
      sendJson(response, 200, { user: updated })
      return true
    }

    return false
  }

  // Exercises: the trainer opens a second one and assigns trainees; trainees join by code.
  async function handleExerciseRoute(request: IncomingMessage, response: ServerResponse, method: string, pathname: string, user: PublicUser | null) {
    switch (`${method} ${pathname}`) {
      case 'GET /api/sessions':
        requireTrainer(user)
        sendJson(response, 200, { sessions: store.summaries() })
        return true
      // Trainee accounts a trainer can assign to an exercise.
      case 'GET /api/trainees':
        requireTrainer(user)
        sendJson(response, 200, {
          trainees: auth.listUsers()
            .filter((account) => account.role === 'trainee' && !account.disabled)
            .map((account) => ({ id: account.id, name: account.name })),
        })
        return true
      case 'POST /api/sessions': {
        const added = store.addExercise(toActor(requireTrainer(user)))

        if (!added) {
          throw new RequestError('Two exercises are already open.', 409)
        }

        sendJson(response, 201, { session: store.summaries().find((summary) => summary.id === added.id) })
        return true
      }
      case 'POST /api/class/join': {
        const signedIn = requireUser(user)
        const body = await readJsonBody(request)
        const outcome = store.joinByCode(String(body.code ?? ''), toActor(signedIn))

        if (!outcome) {
          throw new RequestError('That code does not match. Check the code on your trainer\'s screen.', 404)
        }

        sendJson(response, 200, { accepted: outcome.result.accepted, reason: outcome.result.reason ?? null, sessionId: outcome.managed.id })
        return true
      }
      case 'POST /api/class/assign': {
        const trainer = requireTrainer(user)
        const body = await readJsonBody(request)
        const managed = store.find(optionalString(body.sessionId))
        const trainee = auth.listUsers().find((account) => account.id === body.traineeId && account.role === 'trainee' && !account.disabled)

        if (!managed || !trainee) {
          throw new RequestError('Unknown exercise or trainee.', 404)
        }

        const outcome = store.assignTrainee(managed, { id: trainee.id, name: trainee.name }, toActor(trainer))

        sendJson(response, 200, { accepted: outcome.result.accepted, reason: outcome.result.reason ?? null, sessions: store.summaries() })
        return true
      }
    }

    if (method === 'DELETE' && pathname.startsWith('/api/sessions/')) {
      const trainer = requireTrainer(user)
      const managed = store.find(decodeURIComponent(pathname.slice('/api/sessions/'.length)))

      if (!managed) {
        throw new RequestError('No such exercise.', 404)
      }

      const problem = store.removeExercise(managed, toActor(trainer))

      if (problem) {
        throw new RequestError(problem, 409)
      }

      sendJson(response, 200, { sessions: store.summaries() })
      return true
    }

    return false
  }

  // Past runs and progress. Trainers see everyone; a trainee sees only their own.
  function handleHistoryRoute(response: ServerResponse, method: string, url: URL, user: PublicUser) {
    const isTrainer = user.role === 'trainer'
    const traineeId = isTrainer ? url.searchParams.get('trainee') : user.id

    if (method !== 'GET') {
      return false
    }

    if (url.pathname === '/api/history') {
      const runs = listRuns(db).filter((run) => !traineeId || run.trainees.some((trainee) => trainee.id === traineeId))

      sendJson(response, 200, { runs })
      return true
    }

    if (url.pathname.startsWith('/api/history/')) {
      const run = getRunDetail(db, decodeURIComponent(url.pathname.slice('/api/history/'.length)))

      if (!run || (!isTrainer && !run.trainees.some((trainee) => trainee.id === user.id))) {
        throw new RequestError('No such run.', 404)
      }

      sendJson(response, 200, { run })
      return true
    }

    if (url.pathname === '/api/progress') {
      if (!traineeId) {
        throw new RequestError('Choose a trainee.')
      }

      const account = auth.listUsers().find((item) => item.id === traineeId)
      const name = account?.name ?? listRuns(db).flatMap((run) => run.trainees).find((trainee) => trainee.id === traineeId)?.name

      if (!name) {
        throw new RequestError('No such trainee.', 404)
      }

      sendJson(response, 200, { progress: getTraineeProgress(db, { id: traineeId, name }) })
      return true
    }

    return false
  }

  return async function routeRequest(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const method = request.method ?? 'GET'
    const sessionParam = url.searchParams.get('session') ?? url.searchParams.get('sessionId')

    if (method === 'OPTIONS') {
      setCorsHeaders(response)
      response.writeHead(204)
      response.end()
      return
    }

    // Everything outside /api is the app itself.
    if (!url.pathname.startsWith('/api/')) {
      if (!serveStatic(request, response, url.pathname)) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        response.end('Not found')
      }

      return
    }

    try {
      const user = auth.authenticate(readToken(request, url))

      if (await handleAccountRoute(request, response, method, url.pathname, user)) {
        return
      }

      // Everything below needs a signed-in account, except the health check.
      if (url.pathname !== '/api/health') {
        requireUser(user)
      }

      if (await handleExerciseRoute(request, response, method, url.pathname, user)) {
        return
      }

      if (user && handleHistoryRoute(response, method, url, user)) {
        return
      }

      // Database backups, for an admin trainer (the server also makes one daily).
      if (url.pathname === '/api/admin/backups') {
        requireAdmin(user)

        if (method === 'POST') {
          const backup = createBackup(db)

          db.logAction({ actor: toActor(user!), detail: backup.name, kind: 'backup.created' })
          sendJson(response, 201, { backup, backups: listBackups() })
        } else {
          sendJson(response, 200, { backups: listBackups() })
        }

        return
      }

      const managed = url.pathname === '/api/health' ? store.current() : resolveSession(sessionParam, user)

      switch (`${method} ${url.pathname}`) {
        case 'GET /api/health': {
          const current = store.current()

          sendJson(response, 200, {
            clients: store.realtime.clientCount,
            hasSession: true,
            joinedScreens: Object.keys(current.session.sessionMeta.screens ?? {}).length,
            service: 'sbs-occ-session-backend',
            sessionCode: current.session.sessionMeta.code,
            sessionId: current.id,
            status: 'ok',
            updatedAt: current.session.updatedAt,
          })
          return
        }
        case 'GET /api/session':
          if (!managed) {
            sendJson(response, 404, { error: 'unknown_session', message: 'No session with that id or code.' })
            return
          }

          sendSnapshot(response, managed)
          return
        case 'GET /api/session/status':
          sendJson(response, 200, {
            clients: store.realtime.clientCount,
            sessionId: managed?.id ?? null,
            sessionMeta: managed?.session.sessionMeta ?? null,
            updatedAt: managed?.session.updatedAt ?? null,
            version: managed?.version ?? null,
          })
          return
        case 'GET /api/session/transport-status':
          sendJson(response, 200, buildTransportStatus(managed ?? followed(user)))
          return
        case 'GET /api/session/events': {
          const subscribed = sessionParam ? managed : null
          const sourceId = url.searchParams.get('sourceId')

          store.realtime.open(request, response, {
            onClose: sourceId ? () => store.releaseSimulation(sourceId) : undefined,
            sourceId: sourceId ?? 'browser',
            subscribedSessionId: subscribed?.id ?? null,
            userId: user?.id ?? null,
          })
          return
        }
        case 'GET /api/session/actions': {
          requireTrainer(user)

          const id = managed?.id ?? sessionParam

          sendJson(response, 200, { actions: id ? db.listActions(id) : [], sessionId: id ?? null })
          return
        }
        case 'POST /api/session/commands':
          await handleCommand(request, response, user!)
          return
        case 'POST /api/session/screens':
          await handleScreenJoin(request, response, managed ?? followed(user))
          return
        case 'POST /api/session/simulation':
          await handleSimulationClaim(request, response, managed ?? followed(user))
          return
        case 'POST /api/session/monitor-launches':
          await handleMonitorLaunch(request, response, managed ?? followed(user))
          return
        case 'POST /api/session/runtime':
        case 'DELETE /api/session/runtime':
          requireTrainer(user)
          await handleClearRuntime(request, response)
          return
        case 'GET /api/reports/latest':
          requireTrainer(user)
          sendJson(response, 200, { report: managed ? { id: store.reportId(managed), summary: store.buildReportSummary(managed) } : null })
          return
        case 'GET /api/reports':
          requireTrainer(user)
          sendJson(response, 200, { reports: db.listReports() })
          return
        case 'POST /api/reports':
          requireTrainer(user)
          await handleReportArchive(request, response, user!)
          return
        // Phase 1 accepted whole sessions from browsers; the server is now the only writer.
        case 'PUT /api/session':
        case 'POST /api/session/reset':
        case 'POST /api/session/actions':
          sendJson(response, 410, { error: 'gone', message: 'Send a command to POST /api/session/commands instead.' })
          return
        default:
          sendJson(response, 404, { error: 'not_found', message: 'Unknown OCC backend route.' })
      }
    } catch (error) {
      const statusCode = error instanceof RequestError ? error.statusCode : 500

      if (statusCode === 500) {
        console.error(`${new Date().toISOString()} ${method} ${url.pathname} failed:`, error)
      }

      sendJson(response, statusCode, {
        error: statusCode === 500 ? 'server_error' : statusCode === 401 ? 'signed_out' : 'request_error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
