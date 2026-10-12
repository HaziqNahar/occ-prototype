import type { IncomingMessage, ServerResponse } from 'node:http'
import type { OccDatabase } from './database'
import { createId, readJsonBody, RequestError, sendJson, setCorsHeaders } from './http'
import { getTransportEvents, recordTransportEvent } from './realtime'
import { SessionStore } from './sessionStore'
import type { ManagedSession } from './sessionStore'
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

// The sender of a command. Phase 4 replaces this with signed-in accounts.
function readActor(value: unknown): SessionActor {
  const actor = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>

  if (actor.role !== 'trainer' && actor.role !== 'trainee') {
    throw new RequestError('Expected an actor with role trainer or trainee.')
  }

  return {
    ...(optionalString(actor.id) ? { id: String(actor.id).slice(0, 120) } : {}),
    name: (optionalString(actor.name) ?? (actor.role === 'trainer' ? 'Trainer' : 'Trainee')).slice(0, 80),
    role: actor.role,
  }
}

// HTTP API for the OCC training sessions. Browsers send commands; the server
// applies them and streams the result. See docs/production-plan.md, phase 2.
export function createRoutes(db: OccDatabase, store: SessionStore = new SessionStore(db)) {
  // Requests name their session (id or code); without one they use the current session.
  function resolveSession(reference: string | null | undefined): ManagedSession | null {
    return reference ? store.find(reference) ?? null : store.current()
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

  async function handleCommand(request: IncomingMessage, response: ServerResponse) {
    const body = await readJsonBody(request)
    const requestedSessionId = optionalString(body.sessionId)
    const managed = resolveSession(requestedSessionId)

    // A window still showing a session that was reset gets the current one instead.
    if (!managed) {
      sendSnapshot(response, store.current(), 409, { error: 'stale_session', message: 'That session has ended. Showing the current session.' })
      return
    }

    const actor = readActor(body.actor)
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

  async function handleClearRuntime(request: IncomingMessage, response: ServerResponse) {
    const body = request.method === 'POST' ? await readJsonBody(request) : {}
    const sourceId = optionalString(body.sourceId) ?? 'backend'
    const managed = store.clearCurrent(sourceId)

    recordTransportEvent('session_runtime_cleared', { detail: 'Runtime session cleared; a fresh session started.', sourceId, transport: 'backend' })
    sendSnapshot(response, managed, 200, { ok: true })
  }

  // Trainer notes for the current run. The score comes from the server's session.
  async function handleReportArchive(request: IncomingMessage, response: ServerResponse) {
    const body = await readJsonBody(request)
    const managed = resolveSession(optionalString(body.sessionId))

    if (!managed) {
      sendJson(response, 404, { error: 'unknown_session', message: 'That session has ended.' })
      return
    }

    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 10_000) : ''
    const report = store.archiveReport(managed, notes)

    sendJson(response, 201, { ok: true, report })
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

    try {
      const managed = resolveSession(sessionParam)

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
          sendJson(response, 200, buildTransportStatus(managed ?? store.current()))
          return
        case 'GET /api/session/events': {
          const subscribed = sessionParam ? managed : null

          store.realtime.open(request, response, {
            snapshot: store.snapshot(subscribed ?? store.current()),
            sourceId: url.searchParams.get('sourceId') ?? 'browser',
            subscribedSessionId: subscribed?.id ?? null,
          })
          return
        }
        case 'GET /api/session/actions': {
          const id = managed?.id ?? sessionParam

          sendJson(response, 200, { actions: id ? db.listActions(id) : [], sessionId: id ?? null })
          return
        }
        case 'POST /api/session/commands':
          await handleCommand(request, response)
          return
        case 'POST /api/session/screens':
          await handleScreenJoin(request, response, managed ?? store.current())
          return
        case 'POST /api/session/monitor-launches':
          await handleMonitorLaunch(request, response, managed ?? store.current())
          return
        case 'POST /api/session/runtime':
        case 'DELETE /api/session/runtime':
          await handleClearRuntime(request, response)
          return
        case 'GET /api/reports/latest':
          sendJson(response, 200, { report: managed ? { id: store.reportId(managed), summary: store.buildReportSummary(managed) } : null })
          return
        case 'GET /api/reports':
          sendJson(response, 200, { reports: db.listReports() })
          return
        case 'POST /api/reports':
          await handleReportArchive(request, response)
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

      sendJson(response, statusCode, {
        error: statusCode === 500 ? 'server_error' : 'request_error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
