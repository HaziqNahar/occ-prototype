import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_NEL_TIMETABLE_NAME,
  createNelTimetableRows,
  createNelTrainRosterItems,
  normalizeNelTimetableName,
} from './data/nelTimetable'
import type { NelTimetableName, NelTrainRosterItem } from './data/nelTimetable'
import { createLineMapRuntimeState, LINE_MAP_LAYOUT_VERSION, clearStartupSignalRouteState, normalizeLineMapRuntimeState, resetLineMapRouteSegmentState } from './screens/line-map/lineMapRuntimeState'
import { clearTimetableGuideRouteState } from './screens/line-map/timetableRouteStateCleanup'
import { getTimetablePlaybackTrainIds } from './screens/line-map/timetablePlayback'
import { clearLineMapPlatformDoorStatesForTrain } from './screens/line-map/platformDoorState'
import { MONITOR_WIDTH, initialTrains } from './screens/line-map/model'
import { RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS } from './screens/line-map/trainMovementRoutes'
import { createOccSessionTransport, OCC_SESSION_KEY } from './sessionTransport'
import {
  DEFAULT_TIMETABLE_VIEW_STATE,
  normalizeTimetableViewState,
} from './timetableViewState'
import {
  DEFAULT_TIMETABLE_CLOCK_STATE,
  normalizeTimetableClockState,
} from './timetableClockState'
import type { MonitorLaunchRequest, ScreenRegistration } from './sessionTransport'
import { createScenarioEvidence, scenarioTaskList } from './scenario'
import type {
  AlarmSummaryRow,
  AssessmentTaskMetric,
  LineMapRuntimeState,
  MonitorAlarmRow,
  OccAssessmentMetrics,
  OccSessionMeta,
  OccSessionState,
  ScenarioNotice,
  ScenarioTaskId,
  ScenarioTaskState,
  SessionLifecycle,
  TraineeParticipant,
  TimetableRow,
  TrainingMode,
  TrainDoorFailureState,
  TrainState,
} from './types'

const STALE_LINE_MAP_TRAIN_DELTAS = new Set([MONITOR_WIDTH - 1064, MONITOR_WIDTH * 2 - 2084, MONITOR_WIDTH * 3 - 3066, -164, -16, -2, 2, 3, 10])
const LEGACY_OCC_SESSION_KEYS = [
  'sbs-occ-training-session-v1',
  'sbs-occ-training-session-v2',
  'sbs-occ-training-session-v3',
  'sbs-occ-training-session-v4',
] as const

export const alarmRows: MonitorAlarmRow[] = [
  {
    level: 'S',
    time: '05/11 11:00:06',
    asset: 'SIG/SKG/RT1/SIGN0655',
    message: 'Signal S655: Signal Lamp Filament Status',
    value: 'BURNT',
    tone: 'orange',
  },
  {
    level: 'S',
    time: '05/11 11:02:17',
    asset: 'EMU/032/TRN/XXXXXXX',
    message: 'Train 032: Action Needed (from operator for recovery)',
    value: 'YES',
    tone: 'red',
  },
  {
    level: 'S',
    time: '05/11 11:02:17',
    asset: 'EMU/032/TRN/XXXXXXX',
    message: 'Train 032: Train ITAMA Status',
    value: 'NOT GRANTED',
    tone: 'yellow',
  },
  {
    level: 'S',
    time: '05/11 11:02:21',
    asset: 'EMU/049/TRN/XXXXXXX',
    message: 'Train 049: Train Hold',
    value: 'APPLIED',
    tone: 'yellow',
  },
]

export const trainingModeDetails: Record<TrainingMode, { label: string; title: string; cue: string; report: string }> = {
  PRACTICE: {
    label: 'Practice',
    title: 'Guided practice mode',
    cue: 'Hints and trainer step controls are visible.',
    report: 'Guided learning with trainer support.',
  },
  ASSESSMENT: {
    label: 'Assessment',
    title: 'Assessment mode',
    cue: 'Hints hidden. Operator actions and rejected commands are scored.',
    report: 'Timed competency check with reduced guidance.',
  },
  PLAYER: {
    label: 'Player',
    title: 'Player replay mode',
    cue: 'Auto-run playback walks through the scenario.',
    report: 'Playback for review and assessment preparation.',
  },
}

const scenarioTaskThresholds: Record<ScenarioTaskId, number> = {
  ackAlarm: 45,
  completeScenario: 150,
  dispatchTrain: 105,
  selectTrain: 20,
  setRoute: 75,
}

export const initialScenarioTasks: ScenarioTaskState = {
  ackAlarm: false,
  completeScenario: false,
  dispatchTrain: false,
  selectTrain: false,
  setRoute: false,
}

const defaultSessionCode = 'OCC-TRAINING-001'

export const initialScenarioNotice: ScenarioNotice = {
  text: 'Ready for IOS training scenario selection.',
  tone: 'info',
}

export const initialActiveScenario = {
  duration: '00:00',
  id: 'idle',
  incident: 'None',
  target: 'No active scenario',
  title: 'Idle',
}

export const initialTrainees: TraineeParticipant[] = [
  {
    email: 'traffic.controller@sbs.local',
    joinedAt: '11:00',
    monitor: 'Monitor 02 - Line Map',
    name: 'Traffic Controller',
    role: 'Traffic Controller',
    status: 'Joined',
  },
]

export const alarmSummaryRows: AlarmSummaryRow[] = [
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '21/06/26 06:55:01',
    asset: 'SIG/VKN/B2/DMS0501',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '21/06/26 06:55:01',
    asset: 'SIG/SKG/B2/DMS1401',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '21/06/26 06:55:01',
    asset: 'SIG/HGN/B2/DMS0401',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '21/06/26 06:55:01',
    asset: 'SIG/PGC/B2/DMS1700',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '21/06/26 06:55:01',
    asset: 'SIG/SER/B2/DMS0601',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
]

// The reference OCC display reports the full alarm archive count while only
// the current rows are rendered in the viewport. Keep that baseline visible
// as new scenario rows are added to the local session.
export const ALARM_SUMMARY_TOTAL = 63

export function getAlarmSummaryCounts(rows: readonly AlarmSummaryRow[]) {
  return {
    notAcknowledged: rows.filter((row) => row.ack === 'N').length,
    total: Math.max(ALARM_SUMMARY_TOTAL, rows.length),
  }
}

const timetableRowsByName = new Map<NelTimetableName, TimetableRow[]>()
const trainRosterItemsByName = new Map<NelTimetableName, NelTrainRosterItem[]>()

export function getTimetableRows(timetableName: NelTimetableName = DEFAULT_NEL_TIMETABLE_NAME): TimetableRow[] {
  let rows = timetableRowsByName.get(timetableName)

  if (!rows) {
    rows = createNelTimetableRows({ timetable: timetableName })
    timetableRowsByName.set(timetableName, rows)
  }

  return rows
}

function getTrainRosterItems(timetableName: NelTimetableName): NelTrainRosterItem[] {
  let items = trainRosterItemsByName.get(timetableName)

  if (!items) {
    items = createNelTrainRosterItems({ timetable: timetableName })
    trainRosterItemsByName.set(timetableName, items)
  }

  return items
}

const lineMapTrainPlacementById = new Map(initialTrains.map((train) => [train.id, train]))

function getTimetableRowKey(row: TimetableRow) {
  return [
    row.run,
    row.sched,
    row.train,
    row.originPoint,
    row.originTime,
    row.stationPoint,
    row.stationTime,
    row.destinationPoint,
    row.destinationTime,
  ].join('|')
}

function normalizeTimetableRows(
  rows: TimetableRow[] | undefined,
  timetableName: NelTimetableName = DEFAULT_NEL_TIMETABLE_NAME,
): TimetableRow[] {
  const timetableRows = getTimetableRows(timetableName)

  if (!rows?.length) {
    return timetableRows
  }

  const normalizedRows = rows.filter((row) => !(row.originPoint === 'HBFS' && row.stationPoint === 'SKGN' && row.sched !== ''))
  const hasTimetableRows = normalizedRows.some((row) => row.run === 'NB' || row.run === 'SB')

  if (!hasTimetableRows) {
    return timetableRows
  }

  const storedRowsByKey = new Map(normalizedRows.map((row) => [getTimetableRowKey(row), row]))
  const activeRowsAreStored = timetableRows.every((row) => storedRowsByKey.has(getTimetableRowKey(row)))

  if (activeRowsAreStored && normalizedRows.length === timetableRows.length) {
    return normalizedRows
  }

  return timetableRows.map((row) => {
    const storedRow = storedRowsByKey.get(getTimetableRowKey(row))

    return storedRow
      ? {
          ...row,
          state: storedRow.state,
        }
      : row
  })
}

function clearTrainOwnedRouteState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  trainIds: ReadonlySet<string>,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeSegments = { ...current.routeSegments }

  Object.entries(routeSegments).forEach(([segmentId, state]) => {
    if (trainIds.has(state.trainId)) {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    }
  })

  return {
    ...current,
    routeSegments,
  }
}

export function clearInactiveTimetablePlaybackTrains(
  current: OccSessionState,
  activeTrainIds: ReadonlySet<string>,
): OccSessionState {
  const timetablePlaybackTrainIds = new Set(getTimetablePlaybackTrainIds(current.timetableRows))
  const scenarioTargetTrainId = current.activeScenario.targetTrainId
  // Scenario playback can briefly publish no active plans while it is being
  // rebuilt. Keep trains that are already on the map visible through that
  // hand-off instead of flashing the line map empty.
  const preserveScenarioVisibleTrains = current.scenarioMode === 'RUNNING'
  const inactiveTrainIds = current.trains
    .filter((train) => (
      (train.timetablePlayback || timetablePlaybackTrainIds.has(train.id))
      && !activeTrainIds.has(train.id)
      && train.id !== scenarioTargetTrainId
      && !(preserveScenarioVisibleTrains && train.lineMapVisible)
    ))
    .map((train) => train.id)

  if (inactiveTrainIds.length === 0) {
    return current
  }

  const inactiveTrainIdSet = new Set(inactiveTrainIds)
  const cleanedLineMap = inactiveTrainIds.reduce(
    (lineMap, trainId) => clearLineMapPlatformDoorStatesForTrain(lineMap, trainId),
    clearTrainOwnedRouteState(current.lineMap, inactiveTrainIdSet),
  )

  return {
    ...current,
    lineMap: cleanedLineMap,
    trains: current.trains.map((train) => (
      inactiveTrainIdSet.has(train.id)
        ? {
            ...train,
            isMoving: false,
            lineMapVisible: false,
            occupancySegmentId: undefined,
            timetablePlayback: false,
          }
        : train
    )),
  }
}

export function getTimetablePlaybackTrainIdSet(trains: readonly TrainState[]) {
  return new Set(trains
    .filter((train) => train.timetablePlayback)
    .map((train) => train.id))
}

function cleanSessionTimetableGuideRouteState(session: OccSessionState): OccSessionState {
  const cleanedLineMap = clearTimetableGuideRouteState(
    session.lineMap,
    getTimetablePlaybackTrainIdSet(session.trains),
  )

  return cleanedLineMap === session.lineMap
    ? session
    : {
        ...session,
        lineMap: cleanedLineMap,
      }
}

function revealActiveScenarioTargetTrain(session: OccSessionState): OccSessionState {
  const targetTrainId = session.activeScenario.targetTrainId

  if (!targetTrainId || session.scenarioMode !== 'RUNNING') {
    return session
  }

  const launchSignalStep = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[1]
  const shouldStageLaunchTargetAtSignal = (
    session.activeScenario.id === 'train-launch'
    && !session.scenarioTasks.dispatchTrain
    && Boolean(launchSignalStep)
  )
  let changed = false
  const trains = session.trains.map((train) => {
    if (train.id !== targetTrainId) {
      return train
    }

    const nextTrain = shouldStageLaunchTargetAtSignal && launchSignalStep
      ? {
          ...train,
          direction: 'right' as const,
          isMoving: false,
          lineMapVisible: true,
          occupancySegmentId: launchSignalStep.segmentId,
          service: 'NB' as const,
          status: 'WAIT' as const,
          timetablePlayback: false,
          x: launchSignalStep.point.x,
          y: launchSignalStep.point.y,
        }
      : {
          ...train,
          lineMapVisible: true,
          timetablePlayback: false,
        }

    if (
      nextTrain.direction === train.direction
      && nextTrain.isMoving === train.isMoving
      && nextTrain.lineMapVisible === train.lineMapVisible
      && nextTrain.occupancySegmentId === train.occupancySegmentId
      && nextTrain.service === train.service
      && nextTrain.status === train.status
      && nextTrain.timetablePlayback === train.timetablePlayback
      && nextTrain.x === train.x
      && nextTrain.y === train.y
    ) {
      return train
    }

    changed = true
    return nextTrain
  })

  return changed
    ? {
        ...session,
        trains,
      }
    : session
}

export function createSessionMeta(lifecycle: SessionLifecycle = 'CREATED'): OccSessionMeta {
  const createdAt = new Date().toISOString()

  return {
    code: defaultSessionCode,
    createdAt,
    lifecycle,
    screens: {},
    trainer: 'MNADZRULS [TSR1] @ OCC',
  }
}

export function createAssessmentMetrics(): OccAssessmentMetrics {
  const tasks = scenarioTaskList.reduce((currentTasks, task) => ({
    ...currentTasks,
    [task.id]: {
      label: task.label,
      score: 0,
      status: 'PENDING',
      taskId: task.id,
      thresholdSeconds: scenarioTaskThresholds[task.id],
    } satisfies AssessmentTaskMetric,
  }), {} as OccAssessmentMetrics['tasks'])

  return {
    lateTasks: 0,
    onTimeTasks: 0,
    rejectedActions: 0,
    result: 'INCOMPLETE',
    score: 0,
    tasks,
  }
}

function normalizeAssessmentMetrics(metrics: Partial<OccAssessmentMetrics> | undefined): OccAssessmentMetrics {
  const fallback = createAssessmentMetrics()
  const tasks = scenarioTaskList.reduce((currentTasks, task) => ({
    ...currentTasks,
    [task.id]: {
      ...fallback.tasks[task.id],
      ...metrics?.tasks?.[task.id],
    },
  }), {} as OccAssessmentMetrics['tasks'])

  return {
    ...fallback,
    ...metrics,
    tasks,
  }
}

export function updateSessionLifecycle(sessionMeta: OccSessionMeta | undefined, lifecycle: SessionLifecycle): OccSessionMeta {
  const currentMeta = sessionMeta ?? createSessionMeta(lifecycle)
  const now = new Date().toISOString()

  return {
    ...currentMeta,
    completedAt: lifecycle === 'CREATED'
      ? undefined
      : lifecycle === 'COMPLETE' ? currentMeta.completedAt ?? now : currentMeta.completedAt,
    lifecycle,
    startedAt: lifecycle === 'CREATED'
      ? undefined
      : lifecycle === 'RUNNING' || lifecycle === 'COMPLETE'
        ? currentMeta.startedAt ?? now
        : currentMeta.startedAt,
  }
}

function createInitialTrainStates(timetableName: NelTimetableName = DEFAULT_NEL_TIMETABLE_NAME): TrainState[] {
  return getTrainRosterItems(timetableName).map((item) => {
    const placement = lineMapTrainPlacementById.get(item.trainNumber)

    return {
      ...(placement ?? {
        direction: item.service === 'SB' ? 'left' as const : 'right' as const,
        id: item.trainNumber,
        service: item.service,
        status: 'WAIT' as const,
        x: 0,
        y: 0,
      }),
      doorFailureState: undefined,
      itamaAuthorisedPreparationConfirmed: false,
      itamaGranted: true,
      itamaNotAuthorisedPreparationConfirmed: false,
      itamaStatus: 'GRANTED',
      isMoving: false,
      lineMapVisible: false,
      readinessMode: placement?.readinessMode ?? 'MAINLINE_SERVICE',
      scheduleNumber: item.firstScheduleNumber,
      service: placement?.service ?? item.service,
      trainNumber: item.trainNumber,
    }
  })
}

export function createInitialSession(
  trainingMode: TrainingMode = 'PRACTICE',
  timetableName: NelTimetableName = DEFAULT_NEL_TIMETABLE_NAME,
): OccSessionState {
  return {
    activeScenario: initialActiveScenario,
    alarmSummaryRows,
    assessmentMetrics: createAssessmentMetrics(),
    cycleMode: 'NONE',
    evidenceLog: [
      createScenarioEvidence(
        'IOS',
        'Session initialized',
        'info',
        `${trainingModeDetails[trainingMode].label} session ready for IOS training scenario selection.`,
      ),
    ],
    eventRows: alarmRows,
    lineMap: createLineMapRuntimeState(),
    scenarioMode: 'IDLE',
    sessionMeta: createSessionMeta(),
    scenarioNotice: initialScenarioNotice,
    scenarioRevision: 0,
    scenarioStep: 0,
    scenarioTasks: initialScenarioTasks,
    selectedTrainId: '317',
    timetableClock: DEFAULT_TIMETABLE_CLOCK_STATE,
    timetableName,
    timetableRows: getTimetableRows(timetableName),
    timetableView: DEFAULT_TIMETABLE_VIEW_STATE,
    trainingMode,
    trainees: initialTrainees,
    trains: createInitialTrainStates(timetableName),
    updatedAt: Date.now(),
  }
}

export function createResetSessionState(
  trainingMode: TrainingMode = 'PRACTICE',
  updatedAt = Date.now(),
  scenarioRevision = 0,
  timetableName: NelTimetableName = DEFAULT_NEL_TIMETABLE_NAME,
): OccSessionState {
  const baseSession = createInitialSession(trainingMode, timetableName)
  const baselineReady = isTrainBaselineSession(baseSession)

  return cleanSessionTimetableGuideRouteState({
    ...baseSession,
    scenarioNotice: {
      text: baselineReady
        ? 'Train reset complete. Trains, routes and movement state returned to baseline.'
        : 'Train reset requested. Review train baseline state.',
      tone: baselineReady ? 'success' : 'warning',
    },
    scenarioRevision,
    updatedAt,
  })
}

function isTrainBaselineSession(session: OccSessionState) {
  const baselineTrains = createInitialTrainStates(session.timetableName)

  return baselineTrains.every((baselineTrain) => {
    const train = session.trains.find((item) => item.id === baselineTrain.id)

    return Boolean(train)
      && train?.x === baselineTrain.x
      && train?.y === baselineTrain.y
      && train?.direction === baselineTrain.direction
      && train?.status === baselineTrain.status
      && train?.isMoving !== true
      && !train?.doorFailureState
  })
}

function mergeStoredTrains(
  storedTrains: TrainState[] | undefined,
  preserveGeometry = true,
  timetableName: NelTimetableName = DEFAULT_NEL_TIMETABLE_NAME,
): TrainState[] {
  if (!storedTrains) {
    return createInitialTrainStates(timetableName)
  }

  const storedById = new Map(storedTrains.map((train) => [train.id, train]))

  return createInitialTrainStates(timetableName).map((train) => {
    const stored = storedById.get(train.id)

    if (!stored) {
      return train
    }

    if (train.id === '314') {
      return {
        ...train,
        ...stored,
        itamaGranted: stored.itamaGranted ?? train.itamaGranted,
        readinessMode: stored.readinessMode ?? train.readinessMode,
      }
    }

    const hasStaleGeometry = STALE_LINE_MAP_TRAIN_DELTAS.has(Math.round(train.x - stored.x))

    if (preserveGeometry && !hasStaleGeometry) {
      return {
        ...train,
        ...stored,
        direction: getMergedStoredTrainDirection(train, stored),
        itamaGranted: stored.itamaGranted ?? train.itamaGranted,
        readinessMode: stored.readinessMode ?? train.readinessMode,
        y: stored.y ?? train.y,
      }
    }

    return {
      ...train,
      direction: getMergedStoredTrainDirection(train, stored),
      status: stored.status ?? train.status,
    }
  })
}

function getMergedStoredTrainDirection(train: TrainState, stored: TrainState): TrainState['direction'] {
  return stored.direction ?? train.direction
}

function hasTrain317DoorFaultIncident(session: Partial<OccSessionState>) {
  return session.scenarioMode === 'RUNNING'
    && Number(session.scenarioStep ?? 0) >= 2
    && String(session.activeScenario?.incident ?? '').trim().toLowerCase() === 'door fault'
}

function getTrain317DoorFailureStateFromRows(session: Partial<OccSessionState>): TrainDoorFailureState | null {
  const rows = [
    ...(session.eventRows ?? []).map((row) => ({
      message: row.message,
      value: row.value,
    })),
    ...(session.alarmSummaryRows ?? []).map((row) => ({
      message: row.description,
      value: row.value,
    })),
  ]

  for (const row of rows) {
    const message = String(row.message ?? '').toLowerCase()
    const value = String(row.value ?? '').toUpperCase()

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
      case 'AUTHORIZED TO MOVE':
        return 'AUTHORIZED_TO_MOVE'
      case 'WITHDRAW FROM SERVICE':
        return 'WITHDRAW_FROM_SERVICE'
      default:
        break
    }
  }

  return null
}

function inferTrain317DoorFailureState(session: Partial<OccSessionState>, trains: TrainState[]) {
  if (!hasTrain317DoorFaultIncident(session)) {
    return trains
  }

  const derivedDoorFailureState = getTrain317DoorFailureStateFromRows(session)

  return trains.map((train) => {
    if (train.id !== '317') {
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
      doorFailureState: 'FAULT_ALARM' as const,
    }
  })
}

export function normalizeClientSession(session: OccSessionState): OccSessionState {
  const lineMap = normalizeLineMapRuntimeState(session.lineMap)
  const timetableName = normalizeNelTimetableName(session.timetableName)
  const trains = mergeStoredTrains(session.trains, session.lineMap?.layoutVersion === LINE_MAP_LAYOUT_VERSION, timetableName)

  return revealActiveScenarioTargetTrain(cleanSessionTimetableGuideRouteState({
    ...session,
    lineMap,
    timetableClock: normalizeTimetableClockState(session.timetableClock),
    timetableName,
    timetableRows: normalizeTimetableRows(session.timetableRows, timetableName),
    timetableView: normalizeTimetableViewState(session.timetableView),
    trains: inferTrain317DoorFailureState(session, trains),
  }))
}

export function clearStoredOccSessions(includeCurrent = false) {
  try {
    const keys = includeCurrent
      ? [...LEGACY_OCC_SESSION_KEYS, OCC_SESSION_KEY]
      : [...LEGACY_OCC_SESSION_KEYS]

    keys.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Storage is a fallback transport; reset still works through in-memory state.
  }
}

function readStoredSession(): OccSessionState {
  try {
    clearStoredOccSessions()

    const stored = window.localStorage.getItem(OCC_SESSION_KEY)

    if (!stored) {
      return createInitialSession()
    }

    const parsed = JSON.parse(stored) as Partial<OccSessionState>

    const timetableName = normalizeNelTimetableName(parsed.timetableName)
    const storedTrains = mergeStoredTrains(parsed.trains, parsed.lineMap?.layoutVersion === LINE_MAP_LAYOUT_VERSION, timetableName)
    const lineMap = clearTimetableGuideRouteState(
      clearStartupSignalRouteState(normalizeLineMapRuntimeState(parsed.lineMap)),
      getTimetablePlaybackTrainIdSet(storedTrains),
    )

    const nextSession: OccSessionState = {
      ...createInitialSession('PRACTICE', timetableName),
      ...parsed,
      activeScenario: parsed.activeScenario ?? initialActiveScenario,
      alarmSummaryRows: parsed.alarmSummaryRows ?? alarmSummaryRows,
      assessmentMetrics: normalizeAssessmentMetrics(parsed.assessmentMetrics),
      evidenceLog: parsed.evidenceLog ?? [],
      eventRows: parsed.eventRows ?? alarmRows,
      scenarioMode: parsed.scenarioMode ?? 'IDLE',
      sessionMeta: {
        ...createSessionMeta(parsed.scenarioMode === 'COMPLETE' ? 'COMPLETE' : 'CREATED'),
        ...parsed.sessionMeta,
        screens: parsed.sessionMeta?.screens ?? {},
      },
      scenarioNotice: parsed.scenarioNotice ?? initialScenarioNotice,
      scenarioRevision: parsed.scenarioRevision ?? 0,
      scenarioStep: parsed.scenarioStep ?? 0,
      scenarioTasks: { ...initialScenarioTasks, ...parsed.scenarioTasks },
      lineMap,
      timetableClock: normalizeTimetableClockState(parsed.timetableClock),
      timetableName,
      timetableRows: normalizeTimetableRows(parsed.timetableRows, timetableName),
      timetableView: normalizeTimetableViewState(parsed.timetableView),
      trainingMode: parsed.trainingMode ?? 'PRACTICE',
      trainees: parsed.trainees ?? initialTrainees,
      trains: storedTrains,
      updatedAt: Date.now(),
    }

    return revealActiveScenarioTargetTrain({
      ...nextSession,
      trains: inferTrain317DoorFailureState(nextSession, nextSession.trains),
    })
  } catch {
    return createInitialSession()
  }
}

export function useOccSession() {
  const [session, setSession] = useState<OccSessionState>(readStoredSession)
  const monitorLaunchSubscribersRef = useRef(new Set<(request: MonitorLaunchRequest) => void>())
  const sessionRef = useRef(session)
  const transportRef = useRef<ReturnType<typeof createOccSessionTransport> | null>(null)

  useEffect(() => {
    setSession((current) => {
      const normalizedRows = normalizeTimetableRows(current.timetableRows, current.timetableName)

      if (normalizedRows.length === current.timetableRows.length) {
        return current
      }

      const next = {
        ...current,
        timetableRows: normalizedRows,
        updatedAt: Date.now(),
      }

      transportRef.current?.publish(next)
      return next
    })
  }, [session.timetableRows.length])

  useEffect(() => {
    sessionRef.current = session

    try {
      window.localStorage.setItem(OCC_SESSION_KEY, JSON.stringify(session))
    } catch {
      // Storage is a fallback transport; the SharedWorker/BroadcastChannel bus can still run.
    }
  }, [session])

  useEffect(() => {
    transportRef.current = createOccSessionTransport({
      initialSession: sessionRef.current,
      onMonitorLaunchRequest: (request) => {
        monitorLaunchSubscribersRef.current.forEach((subscriber) => subscriber(request))
      },
      onSession: (nextSession) => {
        setSession((currentSession) => {
          const normalizedSession = normalizeClientSession(nextSession)

          if (!shouldAcceptRemoteSession(currentSession, normalizedSession)) {
            return currentSession
          }

          return normalizedSession
        })
      },
    })

    return () => {
      transportRef.current?.close()
      transportRef.current = null
    }
  }, [])

  const requestMonitorPeerLaunch = useCallback(() => (
    transportRef.current?.requestMonitorPeerLaunch() ?? ''
  ), [])

  const registerScreen = useCallback((screen: ScreenRegistration) => {
    transportRef.current?.registerScreen(screen, sessionRef.current)
  }, [])

  const subscribeMonitorLaunch = useCallback((subscriber: (request: MonitorLaunchRequest) => void) => {
    monitorLaunchSubscribersRef.current.add(subscriber)

    return () => {
      monitorLaunchSubscribersRef.current.delete(subscriber)
    }
  }, [])

  const updateSession = useCallback((updater: (current: OccSessionState) => OccSessionState) => {
    setSession((current) => {
      const next = applyOccSessionUpdate(current, updater)

      if (next === current) {
        return current
      }

      transportRef.current?.publish(next)

      return next
    })
  }, [])

  const resetSession = useCallback((
    trainingMode: TrainingMode = 'PRACTICE',
    timetableName: NelTimetableName = sessionRef.current.timetableName,
  ) => {
    clearStoredOccSessions(true)
    const next = createResetSessionState(
      trainingMode,
      Date.now(),
      (sessionRef.current.scenarioRevision ?? 0) + 1,
      timetableName,
    )

    sessionRef.current = next
    transportRef.current?.reset(next)
    setSession(next)
  }, [])

  return { registerScreen, requestMonitorPeerLaunch, resetSession, session, subscribeMonitorLaunch, updateSession }
}

export function applyOccSessionUpdate(
  current: OccSessionState,
  updater: (current: OccSessionState) => OccSessionState,
  updatedAt = Date.now(),
) {
  const updated = cleanSessionTimetableGuideRouteState(updater(current))

  return updated === current
    ? current
    : {
        ...updated,
        updatedAt,
      }
}

export function shouldAcceptRemoteSession(
  current: OccSessionState,
  incoming: OccSessionState,
) {
  const currentRevision = current.scenarioRevision ?? 0
  const incomingRevision = incoming.scenarioRevision ?? 0

  if (incomingRevision !== currentRevision) {
    return incomingRevision > currentRevision
  }

  return incoming.updatedAt > current.updatedAt
}
