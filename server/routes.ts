import type { IncomingMessage, ServerResponse } from 'node:http'
import type { OccDatabase } from './database'
import { getSessionId } from './database'
import { createId, getIsoNow, readJsonBody, RequestError, sendJson, setCorsHeaders } from './http'
import { normalizeAssessmentMetrics, REQUIRED_TASKS } from './legacyAssessment'
import {
  broadcastMonitorLaunch,
  broadcastSession,
  getSseClientCount,
  getTransportEvents,
  openEventStream,
  recordTransportEvent,
} from './realtime'
import { applyScenarioAction } from './scenarioActions'
import { isSessionCandidate, normalizeSession, normalizeSessionMeta } from './sessionNormalize'
import type {
  MonitorLaunchRoute,
  OccSessionAction,
  OccSessionState,
  SessionMonitorLaunch,
  SessionScreenJoin,
  SessionScreenRole,
  SessionTransportSnapshot,
} from '../src/types'

const MONITOR_LAUNCH_ORIGIN = '/screen/line-map'
const MONITOR_LAUNCH_TARGETS = new Set<string>(['/screen/alarms', '/screen/timetable'])

// HTTP API for the shared OCC session. Holds the current session in memory and
// saves every change to the database.
export function createRoutes(db: OccDatabase) {
  let currentSession: OccSessionState | null = db.loadCurrentSession()

  if (currentSession) {
    currentSession = normalizeSession(currentSession)
  }

  const sessionId = () => (currentSession ? getSessionId(currentSession) : undefined)

  const saveAndBroadcast = (type: 'session:reset' | 'session:update', sourceId?: string) => {
    if (currentSession) {
      db.saveCurrentSession(currentSession)
    }

    broadcastSession(currentSession, type, sourceId)
  }

  const optionalString = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined)

  function buildReport(session: OccSessionState | null) {
    if (!session) {
      return null
    }

    const taskValues = Object.values(session.scenarioTasks ?? {})
    const rejectedRows = (session.eventRows ?? []).filter((row) => String(row.message ?? '').toLowerCase().includes('rejected'))
    const sessionMeta = normalizeSessionMeta(session)
    const metrics = normalizeAssessmentMetrics(session)
    const taskMetrics = REQUIRED_TASKS.map((taskId) => metrics.tasks[taskId])
    const completedTaskMetrics = taskMetrics.filter((task) => task.completedAt)

    return {
      averageResponseSeconds: completedTaskMetrics.length
        ? Math.round(completedTaskMetrics.reduce((total, task) => total + (task.responseSeconds ?? 0), 0) / completedTaskMetrics.length)
        : 0,
      completedTasks: taskValues.filter(Boolean).length,
      evidenceCount: session.evidenceLog?.length ?? 0,
      generatedAt: getIsoNow(),
      joinedScreens: Object.values(sessionMeta.screens ?? {}).length,
      lateTasks: metrics.lateTasks,
      lifecycle: sessionMeta.lifecycle,
      mode: session.trainingMode,
      onTimeTasks: metrics.onTimeTasks,
      rejectedActions: Math.max(metrics.rejectedActions, rejectedRows.length),
      result: metrics.result,
      scenarioId: session.activeScenario?.id,
      scenarioTitle: session.activeScenario?.title,
      score: metrics.score,
      sessionCode: sessionMeta.code,
      sessionUpdatedAt: session.updatedAt,
      taskMetrics,
      totalTasks: taskValues.length,
    }
  }

  function buildTransportStatus() {
    const sessionMeta = currentSession ? normalizeSessionMeta(currentSession) : null
    const screens = Object.values(sessionMeta?.screens ?? {})
    const snapshots = screens.map((screen) => screen?.transport).filter((transport): transport is SessionTransportSnapshot => Boolean(transport))

    return {
      clients: getSseClientCount(),
      connectedChannelScreens: snapshots.filter((transport) => transport.broadcastChannel === 'CONNECTED').length,
      connectedSseScreens: snapshots.filter((transport) => transport.backendSse === 'CONNECTED').length,
      connectedWorkerScreens: snapshots.filter((transport) => transport.sharedWorker === 'CONNECTED').length,
      events: getTransportEvents(),
      lastMonitorLaunch: sessionMeta?.lastMonitorLaunch ?? null,
      screens,
      sessionCode: sessionMeta?.code ?? null,
      updatedAt: currentSession?.updatedAt ?? null,
    }
  }

  // A browser publishes its whole session. Older snapshots are refused with 409 and
  // the current one, so that window catches up. A reset replaces without merging.
  async function acceptSessionUpdate(request: IncomingMessage, response: ServerResponse, force = false) {
    const body = await readJsonBody(request)
    const incoming = body.session ?? body
    const sourceId = optionalString(body.sourceId)

    if (!isSessionCandidate(incoming)) {
      sendJson(response, 400, { error: 'invalid_session', message: 'Expected a serialized OCC session state.' })
      return
    }

    const incomingRevision = Number(incoming.scenarioRevision ?? 0)
    const currentRevision = Number(currentSession?.scenarioRevision ?? 0)
    const isStale = currentSession && (
      incomingRevision < currentRevision
      || (incomingRevision === currentRevision && incoming.updatedAt < currentSession.updatedAt)
    )

    if (!force && isStale) {
      sendJson(response, 409, { error: 'stale_session', message: 'Backend already has a newer OCC session state.', session: currentSession })
      return
    }

    currentSession = normalizeSession(incoming, force ? null : currentSession)
    saveAndBroadcast(force ? 'session:reset' : 'session:update', sourceId)
    recordTransportEvent(force ? 'session_reset' : 'session_updated', {
      detail: force ? 'Session reset from browser snapshot.' : 'Session snapshot accepted from browser.',
      sourceId,
      transport: 'backend',
    })

    if (force) {
      db.logAction({ detail: currentSession.activeScenario?.title, kind: 'session.reset', sessionId: sessionId() })
    }

    sendJson(response, 200, { ok: true, session: currentSession, updatedAt: currentSession.updatedAt })
  }

  async function clearRuntimeSession(request: IncomingMessage, response: ServerResponse) {
    const body = request.method === 'POST' ? await readJsonBody(request) : {}
    const sourceId = optionalString(body.sourceId) ?? 'backend'

    db.logAction({ actor: sourceId, kind: 'session.cleared', sessionId: sessionId() })
    currentSession = null
    db.clearCurrentSession()
    recordTransportEvent('session_runtime_cleared', {
      detail: 'Runtime session cleared. The next browser seed will create a fresh training session.',
      sourceId,
      transport: 'backend',
    })
    broadcastSession(null, 'session:reset', sourceId)
    sendJson(response, 200, { ok: true, session: null, updatedAt: null })
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

  async function handleMonitorLaunch(request: IncomingMessage, response: ServerResponse) {
    const launchRequest = normalizeMonitorLaunchRequest(await readJsonBody(request))

    // Launches are one-shot events; the latest is also kept in the session metadata.
    if (currentSession) {
      const normalized = normalizeSession(currentSession)

      currentSession = { ...normalized, sessionMeta: { ...normalized.sessionMeta, lastMonitorLaunch: launchRequest }, updatedAt: Date.now() }
      saveAndBroadcast('session:update', launchRequest.sourceId)
    }

    recordTransportEvent('monitor_launch_requested', {
      detail: `Launch ${launchRequest.targets.join(', ')} from Line Map.`,
      route: launchRequest.originRoute,
      sourceId: launchRequest.sourceId,
      transport: 'backend',
    })
    broadcastMonitorLaunch(launchRequest)
    sendJson(response, 202, { ok: true, request: launchRequest, session: currentSession })
  }

  // Screen joins double as 15-second heartbeats: lastSeenAt moves, joinedAt stays.
  async function handleScreenJoin(request: IncomingMessage, response: ServerResponse) {
    const body = await readJsonBody(request)

    if (!currentSession && isSessionCandidate(body.session)) {
      currentSession = normalizeSession(body.session)
    }

    if (!currentSession) {
      sendJson(response, 409, { error: 'missing_session', message: 'Create or publish an OCC session before registering screens.' })
      return
    }

    const label = optionalString(body.label)
    const role = optionalString(body.role) as SessionScreenRole | undefined
    const route = optionalString(body.route) as SessionScreenJoin['route'] | undefined
    const sourceId = optionalString(body.sourceId)

    if (!label || !role || !route) {
      sendJson(response, 400, { error: 'invalid_screen_registration', message: 'Expected role, label, and route for screen registration.' })
      return
    }

    const now = getIsoNow()
    const normalized = normalizeSession(currentSession)
    const existingScreen = normalized.sessionMeta.screens[role]
    const isNewJoin = !existingScreen || existingScreen.sourceId !== sourceId

    currentSession = {
      ...normalized,
      sessionMeta: {
        ...normalized.sessionMeta,
        lifecycle: normalized.scenarioMode === 'COMPLETE' ? 'COMPLETE' : normalized.sessionMeta.lifecycle,
        screens: {
          ...normalized.sessionMeta.screens,
          [role]: {
            joinedAt: existingScreen?.joinedAt ?? now,
            label,
            lastSeenAt: now,
            role,
            route,
            sourceId,
            status: 'ONLINE',
            transport: body.transport as SessionTransportSnapshot | undefined,
          },
        },
      },
      updatedAt: Date.now(),
    }
    saveAndBroadcast('session:update', sourceId)

    if (isNewJoin) {
      const transport = body.transport as Partial<SessionTransportSnapshot> | undefined

      recordTransportEvent('screen_joined', {
        detail: `${label} registered ${transport?.backendSse ?? 'UNKNOWN'} SSE, ${transport?.sharedWorker ?? 'UNKNOWN'} worker, ${transport?.broadcastChannel ?? 'UNKNOWN'} channel.`,
        role,
        route,
        sourceId,
        transport: 'backend',
      })
      db.logAction({ actor: sourceId, detail: label, kind: 'screen.joined', payload: { role, route }, sessionId: sessionId() })
    }

    sendJson(response, 200, { ok: true, screen: currentSession.sessionMeta.screens[role], session: currentSession, sourceId: 'backend' })
  }

  // Scored actions: validated against the snapshot the operator acted on, then logged.
  async function handleScenarioAction(request: IncomingMessage, response: ServerResponse) {
    const body = await readJsonBody(request)
    const incomingSession = isSessionCandidate(body.session) ? normalizeSession(body.session, currentSession) : null

    if (!currentSession && incomingSession) {
      currentSession = incomingSession
    }

    if (!currentSession) {
      sendJson(response, 409, { error: 'missing_session', message: 'Create or publish an OCC session before submitting actions.' })
      return
    }

    const action = (body.action ?? body) as OccSessionAction
    const actionSession = normalizeSession(incomingSession ?? currentSession, currentSession)
    const result = applyScenarioAction(actionSession, action)

    currentSession = { ...normalizeSession(result.session, currentSession), updatedAt: Date.now() }
    saveAndBroadcast('session:update', optionalString(body.sourceId))
    db.logAction({
      accepted: result.accepted,
      actionType: action.type,
      actor: action.source,
      detail: result.reason ?? action.detail,
      kind: 'scenario.action',
      payload: { trainId: action.trainId },
      sessionId: sessionId(),
    })
    recordTransportEvent(result.accepted ? 'scenario_action_accepted' : 'scenario_action_rejected', {
      detail: result.reason ?? `${action.type} processed by backend validator.`,
      sourceId: optionalString(body.sourceId) ?? action.source,
      transport: 'backend',
    })
    sendJson(response, 200, { accepted: result.accepted, action: action.type, ok: true, reason: result.reason ?? null, session: currentSession })
  }

  async function handleReportArchive(request: IncomingMessage, response: ServerResponse) {
    const body = await readJsonBody(request)
    const session = body.session ?? currentSession

    if (!isSessionCandidate(session)) {
      sendJson(response, 400, { error: 'invalid_session', message: 'No valid OCC session is available to archive.' })
      return
    }

    const summaryOverride = body.summary && typeof body.summary === 'object' && !Array.isArray(body.summary)
      ? body.summary as Record<string, unknown>
      : {}
    const report = { id: createId(), notes: body.notes ?? '', summary: { ...buildReport(session), ...summaryOverride } }

    db.saveReport(report, getSessionId(normalizeSession(session)))
    db.logAction({ detail: report.id, kind: 'report.archived', sessionId: getSessionId(normalizeSession(session)) })
    sendJson(response, 201, { ok: true, report })
  }

  return async function routeRequest(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const method = request.method ?? 'GET'

    if (method === 'OPTIONS') {
      setCorsHeaders(response)
      response.writeHead(204)
      response.end()
      return
    }

    try {
      switch (`${method} ${url.pathname}`) {
        case 'GET /api/health': {
          const sessionMeta = currentSession ? normalizeSessionMeta(currentSession) : null

          sendJson(response, 200, {
            clients: getSseClientCount(),
            hasSession: Boolean(currentSession),
            joinedScreens: sessionMeta ? Object.keys(sessionMeta.screens ?? {}).length : 0,
            sessionCode: sessionMeta?.code ?? null,
            service: 'sbs-occ-session-backend',
            status: 'ok',
            updatedAt: currentSession?.updatedAt ?? null,
          })
          return
        }
        case 'GET /api/session':
          sendJson(response, 200, { session: currentSession, updatedAt: currentSession?.updatedAt ?? null })
          return
        case 'GET /api/session/status':
          sendJson(response, 200, {
            clients: getSseClientCount(),
            sessionMeta: currentSession ? normalizeSessionMeta(currentSession) : null,
            updatedAt: currentSession?.updatedAt ?? null,
          })
          return
        case 'GET /api/session/transport-status':
          sendJson(response, 200, buildTransportStatus())
          return
        case 'GET /api/session/events':
          openEventStream(request, response, url.searchParams.get('sourceId') ?? 'browser', currentSession)
          return
        case 'GET /api/session/actions': {
          const id = url.searchParams.get('sessionId') ?? sessionId()

          sendJson(response, 200, { actions: id ? db.listActions(id) : [], sessionId: id ?? null })
          return
        }
        case 'PUT /api/session':
          await acceptSessionUpdate(request, response)
          return
        case 'POST /api/session/reset':
          await acceptSessionUpdate(request, response, true)
          return
        case 'POST /api/session/runtime':
        case 'DELETE /api/session/runtime':
          await clearRuntimeSession(request, response)
          return
        case 'POST /api/session/screens':
          await handleScreenJoin(request, response)
          return
        case 'POST /api/session/monitor-launches':
          await handleMonitorLaunch(request, response)
          return
        case 'POST /api/session/actions':
          await handleScenarioAction(request, response)
          return
        case 'GET /api/reports/latest':
          sendJson(response, 200, { report: buildReport(currentSession) })
          return
        case 'POST /api/reports':
          await handleReportArchive(request, response)
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
