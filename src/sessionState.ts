import { useCallback, useEffect, useRef, useState } from 'react'
import { createNelTimetableRows, createNelTrainRosterItems } from './data/nelTimetable'
import { scenarioTemplates } from './scenarioLibrary'
import { createLineMapRuntimeState, LINE_MAP_LAYOUT_VERSION, clearStartupSignalRouteState, normalizeLineMapRuntimeState, resetLineMapRouteSegmentState } from './screens/line-map/lineMapRuntimeState'
import { clearTimetableGuideRouteState } from './screens/line-map/timetableRouteStateCleanup'
import { getTimetablePlaybackTrainIds } from './screens/line-map/timetablePlayback'
import { MONITOR_WIDTH, initialTrains } from './screens/line-map/model'
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
  text: 'Ready for Train 317 launch / withdrawal drill.',
  tone: 'info',
}

const defaultScenarioTemplate = scenarioTemplates[0]

export const initialActiveScenario = {
  duration: defaultScenarioTemplate.duration,
  id: defaultScenarioTemplate.id,
  incident: defaultScenarioTemplate.incidents[0],
  target: defaultScenarioTemplate.target,
  title: defaultScenarioTemplate.title,
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
  {
    email: 'station.manager@sbs.local',
    joinedAt: '--',
    monitor: 'Monitor 01 - Alarms',
    name: 'Station Manager',
    role: 'Station Manager',
    status: 'Waiting',
  },
]

export const alarmSummaryRows: AlarmSummaryRow[] = [
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/BNK/B2/DMS0901',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/HGN/B2/DMS0401',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/OTP/B4/DMS1501',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:55:50',
    asset: 'EMU/042/TRN/XXXXXXX',
    description: 'Train 042: Action Needed (from operator for recovery)',
    value: 'YES',
    tone: 'red',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:55:52',
    asset: 'EMU/037/TRN/XXXXXXX',
    description: 'Train 037: Status of Train Hold Request',
    value: 'AUTOMATIC HOLD',
    tone: 'yellow',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:56:50',
    asset: 'SIG/NED/1133/DMS0003',
    description: 'DMS:HMI Status',
    value: 'OK',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:57:09',
    asset: 'EMU/017/TRN/XXXXXXX',
    description: 'Train 017: Train Hold',
    value: 'NOT APPLIED',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: '',
    timestamp: '05/11/25 10:57:48',
    asset: 'EMU/032/TRN/XXXXXXX',
    description: 'Train 032: Train Skip Stop Demand',
    value: 'FAILED: RET. COND',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: '',
    timestamp: '05/11/25 10:58:31',
    asset: 'SKG_ROUT_S003',
    description: 'Route abandoned: R613_617/Management of Route Control',
    value: '',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:58:33',
    asset: 'EMU/048/TRN/XXXXXXX',
    description: 'Train 048: Emergency Brake',
    value: 'NOT APPLIED',
    tone: 'grey',
  },
]

export const timetableRows: TimetableRow[] = createNelTimetableRows()
const trainRosterItems = createNelTrainRosterItems()
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

function normalizeTimetableRows(rows: TimetableRow[] | undefined): TimetableRow[] {
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
  const inactiveTrainIds = current.trains
    .filter((train) => (
      (train.timetablePlayback || timetablePlaybackTrainIds.has(train.id))
      && !activeTrainIds.has(train.id)
    ))
    .map((train) => train.id)

  if (inactiveTrainIds.length === 0) {
    return current
  }

  const inactiveTrainIdSet = new Set(inactiveTrainIds)

  return {
    ...current,
    lineMap: clearTrainOwnedRouteState(current.lineMap, inactiveTrainIdSet),
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
    completedAt: lifecycle === 'COMPLETE' ? currentMeta.completedAt ?? now : currentMeta.completedAt,
    lifecycle,
    startedAt: lifecycle === 'RUNNING' || lifecycle === 'COMPLETE'
      ? currentMeta.startedAt ?? now
      : currentMeta.startedAt,
  }
}

function createInitialTrainStates(): TrainState[] {
  return trainRosterItems.map((item) => {
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
      isMoving: false,
      lineMapVisible: false,
      readinessMode: placement?.readinessMode,
      scheduleNumber: item.firstScheduleNumber,
      service: placement?.service ?? item.service,
      trainNumber: item.trainNumber,
    }
  })
}

export function createInitialSession(trainingMode: TrainingMode = 'PRACTICE'): OccSessionState {
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
        `${trainingModeDetails[trainingMode].label} session ready for Train 317 drill.`,
      ),
    ],
    eventRows: alarmRows,
    lineMap: createLineMapRuntimeState(),
    scenarioMode: 'IDLE',
    sessionMeta: createSessionMeta(),
    scenarioNotice: initialScenarioNotice,
    scenarioStep: 0,
    scenarioTasks: initialScenarioTasks,
    selectedTrainId: '317',
    timetableClock: DEFAULT_TIMETABLE_CLOCK_STATE,
    timetableRows,
    timetableView: DEFAULT_TIMETABLE_VIEW_STATE,
    trainingMode,
    trainees: initialTrainees,
    trains: createInitialTrainStates(),
    updatedAt: Date.now(),
  }
}

function isTrainBaselineSession(session: OccSessionState) {
  const baselineTrains = createInitialTrainStates()

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

function mergeStoredTrains(storedTrains: TrainState[] | undefined, preserveGeometry = true): TrainState[] {
  if (!storedTrains) {
    return createInitialTrainStates()
  }

  const storedById = new Map(storedTrains.map((train) => [train.id, train]))

  return createInitialTrainStates().map((train) => {
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
        direction: train.id === '312' ? 'left' : stored.direction ?? train.direction,
        itamaGranted: stored.itamaGranted ?? train.itamaGranted,
        readinessMode: stored.readinessMode ?? train.readinessMode,
        y: stored.y ?? train.y,
      }
    }

    return {
      ...train,
      direction: train.id === '312' ? 'left' : stored.direction ?? train.direction,
      status: stored.status ?? train.status,
    }
  })
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
  const trains = mergeStoredTrains(session.trains, session.lineMap?.layoutVersion === LINE_MAP_LAYOUT_VERSION)

  return cleanSessionTimetableGuideRouteState({
    ...session,
    lineMap,
    timetableClock: normalizeTimetableClockState(session.timetableClock),
    timetableRows: normalizeTimetableRows(session.timetableRows),
    timetableView: normalizeTimetableViewState(session.timetableView),
    trains: inferTrain317DoorFailureState(session, trains),
  })
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

    const storedTrains = mergeStoredTrains(parsed.trains, parsed.lineMap?.layoutVersion === LINE_MAP_LAYOUT_VERSION)
    const lineMap = clearTimetableGuideRouteState(
      clearStartupSignalRouteState(normalizeLineMapRuntimeState(parsed.lineMap)),
      getTimetablePlaybackTrainIdSet(storedTrains),
    )

    const nextSession: OccSessionState = {
      ...createInitialSession(),
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
      scenarioStep: parsed.scenarioStep ?? 0,
      scenarioTasks: { ...initialScenarioTasks, ...parsed.scenarioTasks },
      lineMap,
      timetableClock: normalizeTimetableClockState(parsed.timetableClock),
      timetableRows: normalizeTimetableRows(parsed.timetableRows),
      timetableView: normalizeTimetableViewState(parsed.timetableView),
      trainingMode: parsed.trainingMode ?? 'PRACTICE',
      trainees: parsed.trainees ?? initialTrainees,
      trains: storedTrains,
      updatedAt: Date.now(),
    }

    return {
      ...nextSession,
      trains: inferTrain317DoorFailureState(nextSession, nextSession.trains),
    }
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
      const normalizedRows = normalizeTimetableRows(current.timetableRows)

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

          if (normalizedSession.updatedAt <= currentSession.updatedAt) {
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
      const next = cleanSessionTimetableGuideRouteState({
        ...updater(current),
        updatedAt: Date.now(),
      })

      transportRef.current?.publish(next)

      return next
    })
  }, [])

  const resetSession = useCallback((trainingMode: TrainingMode = 'PRACTICE') => {
    clearStoredOccSessions(true)
    const baseSession = createInitialSession(trainingMode)
    const baselineReady = isTrainBaselineSession(baseSession)
    const next = {
      ...baseSession,
      scenarioNotice: {
        text: baselineReady
          ? 'Train reset complete. Trains, routes and movement state returned to baseline.'
          : 'Train reset requested. Review train baseline state.',
        tone: baselineReady ? 'success' : 'warning',
      } satisfies ScenarioNotice,
      updatedAt: Date.now(),
    }
    sessionRef.current = next
    transportRef.current?.publish(next)
    setSession(next)
  }, [])

  return { registerScreen, requestMonitorPeerLaunch, resetSession, session, subscribeMonitorLaunch, updateSession }
}
