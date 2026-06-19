import { createServer } from 'node:http'
import { mkdir, readFile, appendFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PORT = Number(process.env.OCC_BACKEND_PORT ?? process.env.PORT ?? 8787)
const HOST = process.env.OCC_BACKEND_HOST ?? '127.0.0.1'
const MAX_BODY_BYTES = 1024 * 1024

const serverDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(serverDir, 'data')
const sessionFile = path.join(dataDir, 'session.json')
const reportsFile = path.join(dataDir, 'reports.ndjson')
const DEFAULT_SESSION_CODE = 'OCC-TRAINING-001'
const MONITOR_LAUNCH_ORIGIN = '/screen/line-map'
const MONITOR_LAUNCH_TARGETS = new Set(['/screen/alarms', '/screen/timetable'])
const MAX_TRANSPORT_EVENTS = 80
const LINE_MAP_LAYOUT_VERSION = 10
// The core assessed workflow validates one operator path end to end.
const REQUIRED_TASKS = ['selectTrain', 'ackAlarm', 'setRoute', 'dispatchTrain', 'completeScenario']
const TASK_STEPS = {
  ackAlarm: 2,
  completeScenario: 5,
  dispatchTrain: 4,
  selectTrain: 1,
  setRoute: 3,
}
const TASK_LABELS = {
  ackAlarm: 'Alarm acknowledged',
  completeScenario: 'Scenario reviewed',
  dispatchTrain: 'Train dispatched',
  selectTrain: 'Train selected',
  setRoute: 'Route command applied',
}
const TASK_THRESHOLDS = {
  ackAlarm: 45,
  completeScenario: 150,
  dispatchTrain: 105,
  selectTrain: 20,
  setRoute: 75,
}
// Each task is worth roughly one fifth of the final score; wrong actions apply
// penalties in calculateAssessmentScore().
const TASK_WEIGHT = Math.round(100 / REQUIRED_TASKS.length)
const TRAIN_ROUTE_SEGMENT_IDS = {
  '021': 'hbf-turnback',
  '047': 'wlh-turnback',
  '049': 'wlh-turnback',
  '053': 'frp-turnback',
  '065': 'wlh-turnback',
  '077': 'frp-turnback',
  '089': 'frp-turnback',
  '093': 'wlh-turnback',
  '095': 'hbf-turnback',
  '097': 'frp-turnback',
  '301': 'bgk-rt3',
  '309': 'pgc-depot',
  '312': 'pgc-depot',
  '314': 'pgc-depot',
  '317': 'bgk-rt2',
  '320': 'bgk-rt3',
  '917': 'bgk-rt1',
}

let currentSession = null
const sseClients = new Set()
const transportEvents = []

function getIsoNow() {
  return new Date().toISOString()
}

function recordTransportEvent(type, event = {}) {
  transportEvents.unshift({
    ...event,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: getIsoNow(),
    type,
  })

  if (transportEvents.length > MAX_TRANSPORT_EVENTS) {
    transportEvents.length = MAX_TRANSPORT_EVENTS
  }
}

function createSessionMeta(lifecycle = 'CREATED') {
  const createdAt = getIsoNow()

  return {
    code: DEFAULT_SESSION_CODE,
    createdAt,
    lifecycle,
    screens: {},
    trainer: 'MNADZRULS [TSR1] @ OCC',
  }
}

function normalizeSessionCode(code) {
  if (typeof code !== 'string' || !code.trim()) {
    return DEFAULT_SESSION_CODE
  }

  if (code.startsWith('OCC-') && !code.startsWith('OCC-TRAINING-')) {
    return DEFAULT_SESSION_CODE
  }

  return code
}

function normalizeSessionMeta(session, lifecycle) {
  const existingMeta = session?.sessionMeta ?? {}
  const fallbackLifecycle = lifecycle ?? existingMeta.lifecycle ?? 'CREATED'

  return {
    ...createSessionMeta(fallbackLifecycle),
    ...existingMeta,
    code: normalizeSessionCode(existingMeta.code),
    lifecycle: fallbackLifecycle,
    screens: existingMeta.screens ?? {},
  }
}

function mergeSessionMeta(existingMeta, incomingMeta) {
  const baseMeta = createSessionMeta(incomingMeta?.lifecycle ?? existingMeta?.lifecycle ?? 'CREATED')

  return {
    ...baseMeta,
    ...existingMeta,
    ...incomingMeta,
    code: normalizeSessionCode(incomingMeta?.code ?? existingMeta?.code),
    screens: {
      ...(existingMeta?.screens ?? {}),
      ...(incomingMeta?.screens ?? {}),
    },
  }
}

// Assessment state is stored beside the session so reports can be generated
// from backend-owned evidence, not from browser-only UI calculations.
function createAssessmentMetrics() {
  const tasks = Object.fromEntries(REQUIRED_TASKS.map((taskId) => [
    taskId,
    {
      label: TASK_LABELS[taskId],
      score: 0,
      status: 'PENDING',
      taskId,
      thresholdSeconds: TASK_THRESHOLDS[taskId],
    },
  ]))

  return {
    lateTasks: 0,
    onTimeTasks: 0,
    rejectedActions: 0,
    result: 'INCOMPLETE',
    score: 0,
    tasks,
  }
}

function calculateAssessmentScore(tasks, rejectedActions) {
  const taskScore = REQUIRED_TASKS.reduce((totalScore, taskId) => (
    totalScore + (tasks[taskId]?.score ?? 0)
  ), 0)
  const penalty = Math.min(25, rejectedActions * 5)

  return Math.max(0, Math.min(100, Math.round(taskScore - penalty)))
}

// PASS is intentionally strict: complete scenario, good score, and no rejected
// actions. NEEDS_REVIEW lets the trainer discuss near-misses with evidence.
function getAssessmentResult(score, sessionTasks, rejectedActions) {
  if (sessionTasks?.completeScenario && rejectedActions === 0 && score >= 80) {
    return 'PASS'
  }

  if (score >= 70 || REQUIRED_TASKS.filter((taskId) => sessionTasks?.[taskId]).length >= 4) {
    return 'NEEDS_REVIEW'
  }

  return 'INCOMPLETE'
}

// Accepts older sessions gracefully by filling missing metrics after the data
// model evolves.
function normalizeAssessmentMetrics(session, metrics = session?.assessmentMetrics) {
  const fallback = createAssessmentMetrics()
  const tasks = Object.fromEntries(REQUIRED_TASKS.map((taskId) => [
    taskId,
    {
      ...fallback.tasks[taskId],
      ...(metrics?.tasks?.[taskId] ?? {}),
    },
  ]))
  const rejectedActions = metrics?.rejectedActions ?? (session?.eventRows ?? []).filter((row) =>
    String(row.message ?? '').toLowerCase().includes('rejected'),
  ).length
  const score = metrics?.score ?? calculateAssessmentScore(tasks, rejectedActions)

  return {
    ...fallback,
    ...(metrics ?? {}),
    lateTasks: Object.values(tasks).filter((task) => task.status === 'LATE').length,
    onTimeTasks: Object.values(tasks).filter((task) => task.status === 'ON_TIME').length,
    rejectedActions,
    result: metrics?.result ?? getAssessmentResult(score, session?.scenarioTasks, rejectedActions),
    score,
    tasks,
  }
}

function finalizeAssessmentMetrics(session, metrics) {
  const rejectedActions = metrics.rejectedActions ?? 0
  const score = calculateAssessmentScore(metrics.tasks, rejectedActions)

  return {
    ...metrics,
    completedAt: session.scenarioTasks?.completeScenario ? metrics.completedAt ?? getIsoNow() : metrics.completedAt,
    lateTasks: Object.values(metrics.tasks).filter((task) => task.status === 'LATE').length,
    onTimeTasks: Object.values(metrics.tasks).filter((task) => task.status === 'ON_TIME').length,
    rejectedActions,
    result: getAssessmentResult(score, session.scenarioTasks, rejectedActions),
    score,
  }
}

function normalizeLineMapRuntimeState(lineMap) {
  return {
    layoutVersion: LINE_MAP_LAYOUT_VERSION,
    routeSegments: lineMap?.routeSegments ?? {},
  }
}

function hasActiveTrain317DoorFaultSimulation(session) {
  return session?.scenarioMode === 'RUNNING'
    && Number(session?.scenarioStep ?? 0) >= 2
    && String(session?.activeScenario?.incident ?? '').trim().toLowerCase() === 'door fault'
}

function getTrain317DoorFailureStateFromRows(session) {
  const rows = [
    ...(Array.isArray(session?.eventRows) ? session.eventRows : []),
    ...(Array.isArray(session?.alarmSummaryRows) ? session.alarmSummaryRows.map((row) => ({
      message: row.description,
      value: row.value,
    })) : []),
  ]

  for (const row of rows) {
    const message = String(row?.message ?? '').toLowerCase()
    const value = String(row?.value ?? '').toUpperCase()

    if (!message.includes('train 317')) {
      continue
    }

    switch (value) {
      case 'CYCLE DOOR REQUESTED':
        return 'CYCLE_DOOR_REQUESTED'
      case 'CLOSED/LOCKED':
        return 'CLOSED_LOCKED_CONFIRMED'
      case 'DOOR ISOLATED':
        return 'DOOR_ISOLATED'
      case 'AUTHORISED TO MOVE':
        return 'AUTHORIZED_TO_MOVE'
      case 'WITHDRAW FROM SERVICE':
        return 'WITHDRAW_FROM_SERVICE'
      default:
        break
    }
  }

  return null
}

function normalizeTrainDoorFailureStates(session) {
  const trains = Array.isArray(session?.trains) ? session.trains : []

  if (!hasActiveTrain317DoorFaultSimulation(session)) {
    return trains
  }

  const derivedDoorFailureState = getTrain317DoorFailureStateFromRows(session)

  return trains.map((train) => {
    if (train?.id !== '317') {
      return train
    }

    if (derivedDoorFailureState) {
      return {
        ...train,
        doorFailureState: derivedDoorFailureState,
      }
    }

    if (train.doorFailureState && train.doorFailureState !== 'NORMAL') {
      return train
    }

    return {
      ...train,
      doorFailureState: 'FAULT_ALARM',
    }
  })
}

function updateLineMapRouteState(lineMap, trainId, status) {
  const current = normalizeLineMapRuntimeState(lineMap)
  const segmentId = TRAIN_ROUTE_SEGMENT_IDS[String(trainId)] ?? ''

  if (!segmentId) {
    return current
  }

  return {
    ...current,
    routeSegments: {
      ...current.routeSegments,
      [segmentId]: {
        segmentId,
        status,
        trainId,
        updatedAt: Date.now(),
      },
    },
  }
}
// The backend keeps browser-published state, but preserves backend-owned
// metadata and metrics such as screen joins, lifecycle, and scoring.
function normalizeSession(session, existingSession = null) {
  const incomingLifecycle =
    session?.scenarioMode === 'COMPLETE'
      ? 'COMPLETE'
      : session?.scenarioMode === 'RUNNING'
        ? 'RUNNING'
        : session?.sessionMeta?.lifecycle

  return {
    ...session,
    lineMap: normalizeLineMapRuntimeState(session?.lineMap),
    trains: normalizeTrainDoorFailureStates(session),
    assessmentMetrics: normalizeAssessmentMetrics(session, {
      ...(existingSession?.assessmentMetrics ?? {}),
      ...(session?.assessmentMetrics ?? {}),
      tasks: {
        ...(existingSession?.assessmentMetrics?.tasks ?? {}),
        ...(session?.assessmentMetrics?.tasks ?? {}),
      },
    }),
    sessionMeta: mergeSessionMeta(
      existingSession?.sessionMeta,
      normalizeSessionMeta(session, incomingLifecycle),
    ),
  }
}

function createMonitorEvent(trainId, message, value, tone = 'yellow') {
  return {
    asset: `EMU/${trainId}/TRN/OCC`,
    level: 'S',
    message,
    time: new Date().toLocaleString('en-SG', {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
    }).replace(',', ''),
    tone,
    value,
  }
}

// Alarm summary rows mimic the monitor table; event rows mimic the live feed.
function createSummaryEvent(event, tone = 'yellow') {
  return {
    ack: 'Y',
    asset: event.asset,
    avl: '',
    description: event.message,
    mms: 'S',
    timestamp: event.time,
    tone,
    value: event.value,
  }
}

function createScenarioEvidence(source, action, result, detail) {
  return {
    action,
    detail,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    result,
    source,
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}

function appendScenarioEvidence(current, evidence) {
  return [evidence, ...(current ?? [])].slice(0, 24)
}

function createEmptyScenarioTasks() {
  return {
    ackAlarm: false,
    completeScenario: false,
    dispatchTrain: false,
    selectTrain: false,
    setRoute: false,
  }
}

function updateScenarioTask(tasks, taskId, complete = true) {
  return {
    ...createEmptyScenarioTasks(),
    ...(tasks ?? {}),
    [taskId]: complete,
  }
}

function getScenarioTaskBlocker(tasks, taskId) {
  const currentTasks = {
    ...createEmptyScenarioTasks(),
    ...(tasks ?? {}),
  }

  if (taskId === 'ackAlarm' && !currentTasks.selectTrain) {
    // The first required trainee action is selecting the train under assessment.
    return 'Select Train 317 before acknowledging the injected alarm.'
  }

  if (taskId === 'setRoute') {
    if (!currentTasks.selectTrain) {
      return 'Select Train 317 before applying route.'
    }

    if (!currentTasks.ackAlarm) {
      return 'Acknowledge the door fault before applying route.'
    }
  }

  if (taskId === 'dispatchTrain') {
    if (!currentTasks.ackAlarm) {
      return 'Acknowledge the door fault before dispatch.'
    }

    if (!currentTasks.setRoute) {
      // Dispatch before route is the main wrong-sequence behavior to prevent.
      return 'Apply route command before dispatch.'
    }
  }

  if (taskId === 'completeScenario' && !currentTasks.dispatchTrain) {
    return 'Dispatch Train 317 before completing the scenario.'
  }

  return ''
}

function updateSessionLifecycle(sessionMeta, lifecycle) {
  const currentMeta = sessionMeta ?? createSessionMeta(lifecycle)
  const now = getIsoNow()

  return {
    ...currentMeta,
    completedAt: lifecycle === 'COMPLETE' ? currentMeta.completedAt ?? now : currentMeta.completedAt,
    lifecycle,
    startedAt: lifecycle === 'RUNNING' || lifecycle === 'COMPLETE'
      ? currentMeta.startedAt ?? now
      : currentMeta.startedAt,
  }
}

function getResponseSeconds(startedAt, completedAt) {
  if (!startedAt) {
    return 0
  }

  const elapsed = Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000)

  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0
}

// Records timing and threshold status for one accepted golden-path task.
function recordAcceptedAssessmentTask(session, taskId, source, completedAt) {
  const currentMetrics = normalizeAssessmentMetrics(session)
  const currentTask = currentMetrics.tasks[taskId]

  if (currentTask?.completedAt) {
    return finalizeAssessmentMetrics(session, currentMetrics)
  }

  const startedAt = currentMetrics.startedAt ?? session.sessionMeta?.startedAt ?? session.sessionMeta?.createdAt ?? completedAt
  const responseSeconds = getResponseSeconds(startedAt, completedAt)
  const thresholdSeconds = currentTask?.thresholdSeconds ?? TASK_THRESHOLDS[taskId]
  const status = responseSeconds <= thresholdSeconds ? 'ON_TIME' : 'LATE'
  const taskScore = status === 'ON_TIME' ? TASK_WEIGHT : Math.round(TASK_WEIGHT / 2)
  const nextMetrics = {
    ...currentMetrics,
    startedAt,
    tasks: {
      ...currentMetrics.tasks,
      [taskId]: {
        ...currentTask,
        completedAt,
        responseSeconds,
        score: taskScore,
        source,
        status,
      },
    },
  }

  return finalizeAssessmentMetrics(session, nextMetrics)
}

// Rejected actions count as backend assessment penalties while the UI remains
// available for recovery.
function recordRejectedAssessmentAction(session) {
  const currentMetrics = normalizeAssessmentMetrics(session)
  const startedAt = currentMetrics.startedAt ?? session.sessionMeta?.startedAt ?? getIsoNow()
  const nextMetrics = {
    ...currentMetrics,
    rejectedActions: (currentMetrics.rejectedActions ?? 0) + 1,
    startedAt,
  }

  return finalizeAssessmentMetrics(session, nextMetrics)
}

// A rejected operator action mutates the shared session, adds evidence, and
// becomes visible on every connected monitor through SSE.
function rejectScenarioAction(session, text, trainId, source) {
  const event = createMonitorEvent(trainId, `Command rejected: ${text}`, 'REJECTED', 'red')

  return {
    ...session,
    assessmentMetrics: recordRejectedAssessmentAction(session),
    evidenceLog: appendScenarioEvidence(
      session.evidenceLog,
      createScenarioEvidence(source, 'Action rejected', 'rejected', text),
    ),
    eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
    scenarioNotice: { text, tone: 'warning' },
  }
}

// Accepted actions advance the checklist and update assessment timing in one
// place so IOS, alarms, line map, timetable, and report stay consistent.
function applyAcceptedTask(session, taskId, source, successText) {
  const nextSessionMeta = updateSessionLifecycle(
    session.sessionMeta,
    taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING',
  )
  const completedAt = getIsoNow()
  const nextScenarioTasks = updateScenarioTask(session.scenarioTasks, taskId)
  const nextSessionForMetrics = {
    ...session,
    scenarioTasks: nextScenarioTasks,
    sessionMeta: nextSessionMeta,
  }

  return {
    ...session,
    assessmentMetrics: recordAcceptedAssessmentTask(nextSessionForMetrics, taskId, source, completedAt),
    evidenceLog: appendScenarioEvidence(
      session.evidenceLog,
      createScenarioEvidence(source, TASK_LABELS[taskId], 'accepted', successText),
    ),
    scenarioMode: taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING',
    scenarioNotice: {
      text: successText,
      tone: taskId === 'completeScenario' ? 'success' : 'info',
    },
    scenarioStep: Math.max(session.scenarioStep ?? 0, TASK_STEPS[taskId] ?? 0),
    scenarioTasks: nextScenarioTasks,
    sessionMeta: nextSessionMeta,
  }
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'content-type')
  response.setHeader('Access-Control-Max-Age', '86400')
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response)
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function sendNotFound(response) {
  sendJson(response, 404, {
    error: 'not_found',
    message: 'Unknown OCC backend route.',
  })
}

function writeSse(response, payload) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true })
}

async function loadStoredSession() {
  try {
    const rawSession = await readFile(sessionFile, 'utf8')
    currentSession = normalizeSession(JSON.parse(rawSession))
  } catch {
    currentSession = null
  }
}

async function persistSession(session) {
  await ensureDataDir()
  await writeFile(sessionFile, `${JSON.stringify(session, null, 2)}\n`, 'utf8')
}

async function clearPersistedSession() {
  try {
    await unlink(sessionFile)
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
  }
}

async function appendReport(report) {
  await ensureDataDir()
  await appendFile(reportsFile, `${JSON.stringify(report)}\n`, 'utf8')
}

async function readJsonBody(request) {
  const chunks = []
  let totalBytes = 0

  for await (const chunk of request) {
    totalBytes += chunk.length

    if (totalBytes > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.')
      error.statusCode = 413
      throw error
    }

    chunks.push(chunk)
  }

  const body = Buffer.concat(chunks).toString('utf8').trim()
  return body ? JSON.parse(body) : {}
}

function createRequestError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeMonitorLaunchRequest(body) {
  const originRoute = body.originRoute ?? MONITOR_LAUNCH_ORIGIN

  if (originRoute !== MONITOR_LAUNCH_ORIGIN) {
    throw createRequestError('Monitor launch requests must originate from the Line Map screen.')
  }

  if (!Array.isArray(body.targets)) {
    throw createRequestError('Expected monitor launch targets.')
  }

  const targets = [...new Set(body.targets.filter((target) => MONITOR_LAUNCH_TARGETS.has(target)))]

  if (!targets.length) {
    throw createRequestError('Expected at least one supported monitor launch target.')
  }

  const requestedAt = Number(body.requestedAt)

  return {
    launchId: typeof body.launchId === 'string' && body.launchId.trim()
      ? body.launchId
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    originRoute,
    requestedAt: Number.isFinite(requestedAt) ? requestedAt : Date.now(),
    sourceId: typeof body.sourceId === 'string' && body.sourceId.trim() ? body.sourceId : 'backend',
    targets,
  }
}

function applyMonitorLaunchToSession(session, launchRequest) {
  if (!session) {
    return null
  }

  const normalizedSession = normalizeSession(session)

  return {
    ...normalizedSession,
    sessionMeta: {
      ...normalizedSession.sessionMeta,
      lastMonitorLaunch: launchRequest,
    },
    updatedAt: Date.now(),
  }
}

// The backend stores a UI-shaped session, but still checks for the minimum
// fields needed to score and broadcast it safely.
function isSessionCandidate(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value.updatedAt === 'number' &&
      value.activeScenario &&
      value.scenarioTasks &&
      Array.isArray(value.trains) &&
      Array.isArray(value.timetableRows),
  )
}

function buildReport(session) {
  if (!session) {
    return null
  }

  const taskValues = Object.values(session.scenarioTasks ?? {})
  const completedTasks = taskValues.filter(Boolean).length
  const totalTasks = taskValues.length
  const rejectedActions = (session.eventRows ?? []).filter((row) =>
    String(row.message ?? '').toLowerCase().includes('rejected'),
  )
  const sessionMeta = normalizeSessionMeta(session)
  const assessmentMetrics = normalizeAssessmentMetrics(session)
  const joinedScreens = Object.values(sessionMeta.screens ?? {})
  const taskMetrics = REQUIRED_TASKS.map((taskId) => assessmentMetrics.tasks[taskId])
  const completedTaskMetrics = taskMetrics.filter((task) => task.completedAt)
  const averageResponseSeconds = completedTaskMetrics.length
    ? Math.round(completedTaskMetrics.reduce((total, task) => total + (task.responseSeconds ?? 0), 0) / completedTaskMetrics.length)
    : 0

  return {
    averageResponseSeconds,
    completedTasks,
    generatedAt: new Date().toISOString(),
    evidenceCount: session.evidenceLog?.length ?? 0,
    joinedScreens: joinedScreens.length,
    lateTasks: assessmentMetrics.lateTasks,
    lifecycle: sessionMeta.lifecycle,
    mode: session.trainingMode,
    onTimeTasks: assessmentMetrics.onTimeTasks,
    rejectedActions: Math.max(assessmentMetrics.rejectedActions, rejectedActions.length),
    result: assessmentMetrics.result,
    scenarioId: session.activeScenario?.id,
    scenarioTitle: session.activeScenario?.title,
    score: assessmentMetrics.score,
    sessionCode: sessionMeta.code,
    sessionUpdatedAt: session.updatedAt,
    taskMetrics,
    totalTasks,
  }
}

function buildTransportStatus() {
  const sessionMeta = currentSession ? normalizeSessionMeta(currentSession) : null
  const screens = Object.values(sessionMeta?.screens ?? {})
  const transportSnapshots = screens
    .map((screen) => screen.transport)
    .filter(Boolean)
  const connectedSseScreens = transportSnapshots.filter((transport) => transport.backendSse === 'CONNECTED').length
  const connectedWorkerScreens = transportSnapshots.filter((transport) => transport.sharedWorker === 'CONNECTED').length
  const connectedChannelScreens = transportSnapshots.filter((transport) => transport.broadcastChannel === 'CONNECTED').length

  return {
    clients: sseClients.size,
    connectedChannelScreens,
    connectedSseScreens,
    connectedWorkerScreens,
    events: transportEvents,
    lastMonitorLaunch: sessionMeta?.lastMonitorLaunch ?? null,
    screens,
    sessionCode: sessionMeta?.code ?? null,
    updatedAt: currentSession?.updatedAt ?? null,
  }
}

// Server-sent events are the backend realtime path. SharedWorker and
// BroadcastChannel remain browser-local fallbacks when the backend is offline.
function broadcastSession(type, sourceId) {
  const payload = {
    session: currentSession,
    sourceId: sourceId ?? 'backend',
    type,
    updatedAt: currentSession?.updatedAt ?? null,
  }

  for (const client of sseClients) {
    writeSse(client, payload)
  }
}

function broadcastMonitorLaunch(launchRequest) {
  const payload = {
    ...launchRequest,
    transport: 'backend',
    type: 'monitor-launch:request',
  }

  for (const client of sseClients) {
    writeSse(client, payload)
  }
}

async function handleRuntimeSessionClear(request, response) {
  const body = request.method === 'POST' ? await readJsonBody(request) : {}

  currentSession = null
  await clearPersistedSession()
  recordTransportEvent('session_runtime_cleared', {
    detail: 'Runtime session snapshot cleared. The next browser seed will create a fresh training session.',
    sourceId: body.sourceId ?? 'backend',
    transport: 'backend',
  })
  broadcastSession('session:reset', body.sourceId ?? 'backend')

  sendJson(response, 200, {
    ok: true,
    session: null,
    updatedAt: null,
  })
}

// The frontend may publish a complete session snapshot; this method normalizes
// it so backend-owned metadata and metrics survive browser refreshes.
async function acceptSessionUpdate(request, response, force = false) {
  const body = await readJsonBody(request)
  const incomingSession = body.session ?? body

  if (!isSessionCandidate(incomingSession)) {
    sendJson(response, 400, {
      error: 'invalid_session',
      message: 'Expected a serialized OCC session state.',
    })
    return
  }

  if (!force && currentSession && incomingSession.updatedAt < currentSession.updatedAt) {
    sendJson(response, 409, {
      error: 'stale_session',
      message: 'Backend already has a newer OCC session state.',
      session: currentSession,
    })
    return
  }

  currentSession = normalizeSession(incomingSession, force ? null : currentSession)
  await persistSession(currentSession)
  recordTransportEvent(force ? 'session_reset' : 'session_updated', {
    detail: force ? 'Session reset from browser snapshot.' : 'Session snapshot accepted from browser.',
    sourceId: body.sourceId,
    transport: 'backend',
  })
  broadcastSession(force ? 'session:reset' : 'session:update', body.sourceId)

  sendJson(response, 200, {
    ok: true,
    session: currentSession,
    updatedAt: currentSession.updatedAt,
  })
}

function handleEvents(request, response) {
  const eventUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? `${HOST}:${PORT}`}`)
  const sourceId = eventUrl.searchParams.get('sourceId') ?? 'browser'

  setCorsHeaders(response)
  response.writeHead(200, {
    connection: 'keep-alive',
    'cache-control': 'no-cache, no-transform',
    'content-type': 'text/event-stream',
    'x-accel-buffering': 'no',
  })
  response.write(': connected\n\n')

  const client = response
  sseClients.add(client)
  recordTransportEvent('sse_connected', {
    detail: 'Browser opened backend event stream.',
    sourceId,
    transport: 'backend',
  })
  writeSse(client, {
    session: currentSession,
    sourceId: 'backend',
    type: 'session:snapshot',
    updatedAt: currentSession?.updatedAt ?? null,
  })

  const heartbeat = setInterval(() => {
    response.write(': heartbeat\n\n')
  }, 25000)

  request.on('close', () => {
    clearInterval(heartbeat)
    sseClients.delete(client)
    recordTransportEvent('sse_disconnected', {
      detail: 'Browser closed backend event stream.',
      sourceId,
      transport: 'backend',
    })
  })
}

async function handleMonitorLaunch(request, response) {
  const body = await readJsonBody(request)
  const launchRequest = normalizeMonitorLaunchRequest(body)

  // Launch requests are one-shot events, but the latest request is also stored
  // in session metadata so backend status reflects the monitor orchestration.
  if (currentSession) {
    currentSession = applyMonitorLaunchToSession(currentSession, launchRequest)
    await persistSession(currentSession)
    broadcastSession('session:update', launchRequest.sourceId)
  }

  recordTransportEvent('monitor_launch_requested', {
    detail: `Launch ${launchRequest.targets.join(', ')} from Line Map.`,
    route: launchRequest.originRoute,
    sourceId: launchRequest.sourceId,
    transport: 'backend',
  })
  broadcastMonitorLaunch(launchRequest)

  sendJson(response, 202, {
    ok: true,
    request: launchRequest,
    session: currentSession,
  })
}

async function handleScreenJoin(request, response) {
  const body = await readJsonBody(request)

  if (!currentSession && isSessionCandidate(body.session)) {
    currentSession = normalizeSession(body.session)
  }

  if (!currentSession) {
    sendJson(response, 409, {
      error: 'missing_session',
      message: 'Create or publish an OCC session before registering screens.',
    })
    return
  }

  const { label, role, route, sourceId, transport } = body

  if (!label || !role || !route) {
    sendJson(response, 400, {
      error: 'invalid_screen_registration',
      message: 'Expected role, label, and route for screen registration.',
    })
    return
  }

  const now = getIsoNow()
  const normalizedSession = normalizeSession(currentSession)
  const existingScreen = normalizedSession.sessionMeta.screens[role]
  const isNewScreenJoin = !existingScreen || existingScreen.sourceId !== sourceId

  // Screen joins are idempotent heartbeats. Repeated calls update lastSeenAt
  // while preserving the original joinedAt timestamp.
  currentSession = {
    ...normalizedSession,
    sessionMeta: {
      ...normalizedSession.sessionMeta,
      lifecycle: normalizedSession.scenarioMode === 'COMPLETE'
        ? 'COMPLETE'
        : normalizedSession.sessionMeta.lifecycle,
      screens: {
        ...normalizedSession.sessionMeta.screens,
        [role]: {
          joinedAt: existingScreen?.joinedAt ?? now,
          label,
          lastSeenAt: now,
          role,
          route,
          sourceId,
          status: 'ONLINE',
          transport,
        },
      },
    },
    updatedAt: Date.now(),
  }

  await persistSession(currentSession)
  if (isNewScreenJoin) {
    recordTransportEvent('screen_joined', {
      detail: `${label} registered ${transport?.backendSse ?? 'UNKNOWN'} SSE, ${transport?.sharedWorker ?? 'UNKNOWN'} worker, ${transport?.broadcastChannel ?? 'UNKNOWN'} channel.`,
      role,
      route,
      sourceId,
      transport: 'backend',
    })
  }
  broadcastSession('session:update', sourceId)

  sendJson(response, 200, {
    ok: true,
    screen: currentSession.sessionMeta.screens[role],
    session: currentSession,
    sourceId: 'backend',
  })
}

// This is the backend-owned validator for the first-round vetting scenario.
// It intentionally covers the polished Train 317 golden path first.
function applyScenarioAction(session, action) {
  const source = action.source ?? 'Backend Scenario Engine'
  const trainId = action.trainId ?? session.selectedTrainId ?? '317'

  if (trainId !== '317') {
    return {
      accepted: false,
      reason: 'Scenario target is Train 317. Select Train 317 for this assessment action.',
      session: rejectScenarioAction(
        session,
        'Scenario target is Train 317. Select Train 317 for this assessment action.',
        trainId,
        source,
      ),
    }
  }

  if (action.type === 'SELECT_TRAIN') {
    // Selecting Train 317 starts the scored operator sequence.
    return {
      accepted: true,
      session: {
        ...applyAcceptedTask(
          session,
          'selectTrain',
          source,
          action.detail ?? 'Train 317 selected. Acknowledge alarm before route.',
        ),
        selectedTrainId: trainId,
      },
    }
  }

  if (action.type === 'ACK_ALARM') {
    // Alarm acknowledgement is only valid after the correct train is selected.
    const blocker = getScenarioTaskBlocker(session.scenarioTasks, 'ackAlarm')

    if (blocker) {
      return {
        accepted: false,
        reason: blocker,
        session: rejectScenarioAction(session, blocker, trainId, source),
      }
    }

    return {
      accepted: true,
      session: {
        ...applyAcceptedTask(
          session,
          'ackAlarm',
          source,
          action.detail ?? 'Alarm acknowledgement accepted.',
        ),
        alarmSummaryRows: (session.alarmSummaryRows ?? []).map((row) => ({
          ...row,
          ack: 'N',
          tone: row.tone === 'red' ? 'red' : 'grey',
          value: row.value === 'NO ACK' ? 'ACK' : row.value,
        })),
      },
    }
  }

  if (action.type === 'SET_ROUTE' || action.type === 'DISPATCH_TRAIN') {
    // Route and dispatch mutate both train state and timetable state so all
    // three screens visibly react to the accepted backend action.
    const taskId = action.type === 'DISPATCH_TRAIN' ? 'dispatchTrain' : 'setRoute'
    const nextStatus = action.type === 'DISPATCH_TRAIN' ? 'RUN' : 'WAIT'
    const timetableState = action.type === 'DISPATCH_TRAIN' ? '>' : 'R'
    const message = action.type === 'DISPATCH_TRAIN'
      ? `Train ${trainId}: Dispatch command executed`
      : `Train ${trainId}: Route command selected`
    const blocker = getScenarioTaskBlocker(session.scenarioTasks, taskId)

    if (blocker) {
      return {
        accepted: false,
        reason: blocker,
        session: rejectScenarioAction(session, blocker, trainId, source),
      }
    }

    const event = createMonitorEvent(trainId, message, nextStatus, 'yellow')
    const acceptedSession = applyAcceptedTask(
      session,
      taskId,
      source,
      action.detail ?? `${message} accepted.`,
    )

    return {
      accepted: true,
      session: {
        ...acceptedSession,
        alarmSummaryRows: [createSummaryEvent(event), ...(session.alarmSummaryRows ?? [])].slice(0, 12),
        eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
        selectedTrainId: trainId,
        lineMap: updateLineMapRouteState(
          session.lineMap,
          trainId,
          action.type === 'DISPATCH_TRAIN' ? 'DISPATCHED' : 'SET',
        ),
        timetableRows: (session.timetableRows ?? []).map((row) => (
          row.train === trainId ? { ...row, state: timetableState } : row
        )),
        trains: (session.trains ?? []).map((train) => (
          train.id === trainId ? { ...train, status: nextStatus } : train
        )),
      },
    }
  }

  if (action.type === 'COMPLETE_SCENARIO') {
    // Completion is trainer-controlled and locks the final assessment result.
    const blocker = getScenarioTaskBlocker(session.scenarioTasks, 'completeScenario')

    if (blocker) {
      return {
        accepted: false,
        reason: blocker,
        session: rejectScenarioAction(session, blocker, trainId, source),
      }
    }

    const event = createMonitorEvent(trainId, 'Scenario complete: Trainer reviewed Train 317 response', 'COMPLETE', 'yellow')
    const acceptedSession = applyAcceptedTask(
      session,
      'completeScenario',
      source,
      action.detail ?? 'Scenario review complete. Report is ready.',
    )

    return {
      accepted: true,
      session: {
        ...acceptedSession,
        alarmSummaryRows: [createSummaryEvent(event), ...(session.alarmSummaryRows ?? [])].slice(0, 12),
        eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
      },
    }
  }

  return {
    accepted: false,
    reason: `Unsupported backend action: ${action.type ?? 'UNKNOWN'}`,
    session,
  }
}

// Single action endpoint used by the UI. It validates sequence, updates score,
// persists state, and broadcasts the resulting session to every monitor.
async function handleScenarioAction(request, response) {
  const body = await readJsonBody(request)
  const incomingSession = isSessionCandidate(body.session)
    ? normalizeSession(body.session, currentSession)
    : null

  if (!currentSession && incomingSession) {
    currentSession = incomingSession
  }

  if (!currentSession) {
    sendJson(response, 409, {
      error: 'missing_session',
      message: 'Create or publish an OCC session before submitting actions.',
    })
    return
  }

  const action = body.action ?? body
  const normalizedSession = normalizeSession(incomingSession ?? currentSession, currentSession)
  const result = applyScenarioAction(normalizedSession, action)

  currentSession = {
    ...normalizeSession(result.session, currentSession),
    updatedAt: Date.now(),
  }

  await persistSession(currentSession)
  recordTransportEvent(result.accepted ? 'scenario_action_accepted' : 'scenario_action_rejected', {
    detail: result.reason ?? `${action.type} processed by backend validator.`,
    sourceId: body.sourceId ?? action.source,
    transport: 'backend',
  })
  broadcastSession('session:update', body.sourceId)

  sendJson(response, 200, {
    accepted: result.accepted,
    action: action.type,
    ok: true,
    reason: result.reason ?? null,
    session: currentSession,
  })
}

async function handleReportArchive(request, response) {
  const body = await readJsonBody(request)
  const session = body.session ?? currentSession

  if (!isSessionCandidate(session)) {
    sendJson(response, 400, {
      error: 'invalid_session',
      message: 'No valid OCC session is available to archive.',
    })
    return
  }

  const report = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    notes: body.notes ?? '',
    summary: buildReport(session),
  }

  await appendReport(report)

  sendJson(response, 201, {
    ok: true,
    report,
  })
}

async function routeRequest(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${HOST}:${PORT}`}`)

  if (request.method === 'OPTIONS') {
    setCorsHeaders(response)
    response.writeHead(204)
    response.end()
    return
  }

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      const sessionMeta = currentSession ? normalizeSessionMeta(currentSession) : null

      sendJson(response, 200, {
        clients: sseClients.size,
        hasSession: Boolean(currentSession),
        joinedScreens: sessionMeta ? Object.keys(sessionMeta.screens ?? {}).length : 0,
        sessionCode: sessionMeta?.code ?? null,
        service: 'sbs-occ-session-backend',
        status: 'ok',
        updatedAt: currentSession?.updatedAt ?? null,
      })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/session') {
      sendJson(response, 200, {
        session: currentSession,
        updatedAt: currentSession?.updatedAt ?? null,
      })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/session/status') {
      sendJson(response, 200, {
        clients: sseClients.size,
        sessionMeta: currentSession ? normalizeSessionMeta(currentSession) : null,
        updatedAt: currentSession?.updatedAt ?? null,
      })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/session/transport-status') {
      sendJson(response, 200, buildTransportStatus())
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/session/events') {
      handleEvents(request, response)
      return
    }

    if (request.method === 'PUT' && url.pathname === '/api/session') {
      await acceptSessionUpdate(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/session/reset') {
      await acceptSessionUpdate(request, response, true)
      return
    }

    if ((request.method === 'DELETE' || request.method === 'POST') && url.pathname === '/api/session/runtime') {
      await handleRuntimeSessionClear(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/session/screens') {
      await handleScreenJoin(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/session/monitor-launches') {
      await handleMonitorLaunch(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/session/actions') {
      await handleScenarioAction(request, response)
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/reports/latest') {
      sendJson(response, 200, {
        report: buildReport(currentSession),
      })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/reports') {
      await handleReportArchive(request, response)
      return
    }

    sendNotFound(response)
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    sendJson(response, statusCode, {
      error: statusCode === 500 ? 'server_error' : 'request_error',
      message: error.message,
    })
  }
}

await ensureDataDir()
await loadStoredSession()

const server = createServer(routeRequest)

server.listen(PORT, HOST, () => {
  console.log(`OCC session backend listening on http://${HOST}:${PORT}`)
})
