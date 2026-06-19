import { submitOccSessionAction } from './backendClient'
import type { OccSessionAction } from './backendClient'
import { appendScenarioEvidence, createScenarioEvidence } from './scenario'
import {
  initialScenarioNotice,
  initialScenarioTasks,
  normalizeClientSession,
  updateSessionLifecycle,
} from './sessionState'
import { createLineMapRuntimeState } from './screens/line-map/lineMapRuntimeState'
import type {
  AlarmSummaryRow,
  CycleMode,
  LineMapRouteSegmentStatus,
  LineMapRuntimeState,
  MonitorAlarmRow,
  OccSessionState,
  ScenarioNoticeTone,
  ScenarioTaskId,
  ScenarioTaskState,
  TimetableRow,
  TrainDoorFailureState,
  TrainState,
  TrainStatus,
} from './types'

export const scenarioSteps = [
  {
    label: 'T+00',
    title: 'Ready',
    text: 'Session reset and monitors synchronized',
  },
  {
    label: 'T+30',
    title: 'Hold train',
    text: 'Train 317 is held for launch / withdrawal handling',
  },
  {
    label: 'T+60',
    title: 'Inject alarm',
    text: 'Door fault alarm appears on Alarm Summary monitor',
  },
  {
    label: 'T+90',
    title: 'Route command',
    text: 'Route command selected and train waits for dispatch',
  },
  {
    label: 'T+120',
    title: 'Dispatch',
    text: 'Train dispatches and cycle mode starts movement',
  },
  {
    label: 'T+150',
    title: 'Complete',
    text: 'Scenario complete and operator response recorded',
  },
]

export const scenarioCues = [
  {
    primary: 'Confirm three monitor windows are online.',
    secondary: 'Start at IOS, then point to Monitor 02.',
  },
  {
    primary: 'Monitor 02: Train 317 changes to HOLD.',
    secondary: 'Explain launch / withdrawal control.',
  },
  {
    primary: 'Monitor 01: red alarm needs acknowledgement.',
    secondary: 'Show sync with IOS event feed.',
  },
  {
    primary: 'Monitor 03: timetable state changes.',
    secondary: 'Explain route and timetable linkage.',
  },
  {
    primary: 'Monitor 02: dispatch starts AUTO cycle.',
    secondary: 'Watch train state update across screens.',
  },
  {
    primary: 'Wrap up: acknowledge, replay, or reset.',
    secondary: 'Close the loop without stale state.',
  },
]

const scenarioTaskStep: Record<ScenarioTaskId, number> = {
  ackAlarm: 2,
  completeScenario: 5,
  dispatchTrain: 4,
  selectTrain: 1,
  setRoute: 3,
}

const scenarioTaskEvidenceLabels: Record<ScenarioTaskId, string> = {
  ackAlarm: 'Alarm acknowledged',
  completeScenario: 'Scenario reviewed',
  dispatchTrain: 'Train dispatched',
  selectTrain: 'Train selected',
  setRoute: 'Route command applied',
}

type ApplyScenarioStepOptions = {
  updateLineMapRouteState: (
    lineMap: Partial<LineMapRuntimeState> | undefined,
    train: Pick<TrainState, 'id'>,
    status: LineMapRouteSegmentStatus,
  ) => LineMapRuntimeState
}

function createLiveTimetableRow(trainId: string, state: string): TimetableRow {
  return {
    state,
    train: trainId,
    sched: '',
    originPoint: '',
    originTime: '',
    selectedStation: '',
    stationPoint: '',
    stationTime: '',
    dwell: '',
    run: '',
    destinationPoint: '',
    destinationTime: '',
    revision: '',
    speed: '',
  }
}

export function upsertTimetableRow(rows: TimetableRow[], trainId: string, state: string): TimetableRow[] {
  const match = rows.findIndex((row) => row.train === trainId)

  if (match === -1) {
    return [...rows, createLiveTimetableRow(trainId, state)]
  }

  return rows.map((row, index) => (
    index === match ? { ...row, state } : row
  ))
}

export function formatScenarioTime() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${day}/${month} ${hours}:${minutes}:${seconds}`
}

export function formatAlarmSummaryTimestamp(time: string) {
  if (/^\d{2}\/\d{2}\/\d{2}\s/.test(time)) {
    return time
  }

  const year = String(new Date().getFullYear()).slice(-2)

  return time.replace(/^(\d{2}\/\d{2})\s/, `$1/${year} `)
}

export function createMonitorEvent(
  trainId: string,
  message: string,
  value: string,
  tone: MonitorAlarmRow['tone'] = 'yellow',
): MonitorAlarmRow {
  return {
    level: 'S',
    time: formatScenarioTime(),
    asset: `EMU/${trainId}/TRN/OCC`,
    message,
    value,
    tone,
  }
}

export function createSummaryEvent(event: MonitorAlarmRow, tone: AlarmSummaryRow['tone'] = 'yellow'): AlarmSummaryRow {
  return {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: formatAlarmSummaryTimestamp(event.time),
    asset: event.asset,
    description: event.message,
    value: event.value,
    tone,
  }
}

export function updateScenarioTask(
  tasks: ScenarioTaskState | undefined,
  taskId: ScenarioTaskId,
  complete = true,
): ScenarioTaskState {
  return {
    ...initialScenarioTasks,
    ...tasks,
    [taskId]: complete,
  }
}

export function getScenarioTaskBlocker(tasks: ScenarioTaskState | undefined, taskId: ScenarioTaskId) {
  const currentTasks = { ...initialScenarioTasks, ...tasks }

  if (taskId === 'ackAlarm' && !currentTasks.selectTrain) {
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
      return 'Apply route command before dispatch.'
    }
  }

  if (taskId === 'completeScenario' && !currentTasks.dispatchTrain) {
    return 'Dispatch Train 317 before completing the scenario.'
  }

  return ''
}

export function withScenarioNotice(
  current: OccSessionState,
  text: string,
  tone: ScenarioNoticeTone = 'info',
): OccSessionState {
  return {
    ...current,
    scenarioNotice: { text, tone },
  }
}

export function rejectScenarioAction(
  current: OccSessionState,
  text: string,
  trainId = '317',
  source = 'Scenario Guard',
): OccSessionState {
  const event = createMonitorEvent(trainId, `Command rejected: ${text}`, 'REJECTED', 'red')

  return {
    ...withScenarioNotice(current, text, 'warning'),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(source, 'Action rejected', 'rejected', text),
    ),
    eventRows: [event, ...current.eventRows].slice(0, 4),
  }
}

export function completeScenarioTask(
  current: OccSessionState,
  taskId: ScenarioTaskId,
  successText: string,
  source = 'OCC Workflow',
): { allowed: boolean; next: OccSessionState } {
  const blocker = getScenarioTaskBlocker(current.scenarioTasks, taskId)

  if (blocker) {
    return {
      allowed: false,
      next: rejectScenarioAction(current, blocker),
    }
  }

  return {
    allowed: true,
    next: {
      ...withScenarioNotice(current, successText, taskId === 'completeScenario' ? 'success' : 'info'),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(source, scenarioTaskEvidenceLabels[taskId], 'accepted', successText),
      ),
      scenarioMode: taskId === 'completeScenario' ? 'COMPLETE' : current.scenarioMode === 'COMPLETE' ? 'COMPLETE' : 'RUNNING',
      sessionMeta: updateSessionLifecycle(
        current.sessionMeta,
        taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING',
      ),
      scenarioStep: Math.max(current.scenarioStep, scenarioTaskStep[taskId]),
      scenarioTasks: updateScenarioTask(current.scenarioTasks, taskId),
    },
  }
}

export function getScenarioStepBlocker(current: OccSessionState, nextStep: number) {
  if (nextStep === 3) {
    return getScenarioTaskBlocker(current.scenarioTasks, 'setRoute')
  }

  if (nextStep === 4) {
    return getScenarioTaskBlocker(current.scenarioTasks, 'dispatchTrain')
  }

  if (nextStep >= 5) {
    return getScenarioTaskBlocker(current.scenarioTasks, 'completeScenario')
  }

  return ''
}

export function applyScenarioStep(
  current: OccSessionState,
  step: number,
  { updateLineMapRouteState }: ApplyScenarioStepOptions,
): OccSessionState {
  const scenarioStep = Math.min(step, scenarioSteps.length - 1)
  const trainId = '317'
  let status: TrainStatus = 'RUN'
  let cycleMode: CycleMode = 'NONE'
  let timetableState = '>'
  let event = createMonitorEvent(trainId, 'Trainer scenario ready: Train launch and withdrawal', 'READY', 'yellow')
  let summaryTone: AlarmSummaryRow['tone'] = 'yellow'
  let scenarioTasks = { ...initialScenarioTasks, ...current.scenarioTasks }
  let doorFailureState: TrainDoorFailureState | undefined

  if (scenarioStep === 1) {
    status = 'HOLD'
    timetableState = 'H>'
    event = createMonitorEvent(trainId, 'Trainer scenario started: Train 317 launch / withdrawal hold', 'HOLD', 'red')
    summaryTone = 'red'
    scenarioTasks = updateScenarioTask(scenarioTasks, 'selectTrain')
  }

  if (scenarioStep === 2) {
    status = 'HOLD'
    timetableState = 'H>'
    event = createMonitorEvent(trainId, 'Trainer injected alarm: Train 317 door fault pending', 'YES', 'red')
    summaryTone = 'red'
    doorFailureState = 'FAULT_ALARM'
  }

  if (scenarioStep === 3) {
    status = 'WAIT'
    timetableState = 'R'
    event = createMonitorEvent(trainId, 'Instructor command: Train 317 route selected', 'WAIT', 'yellow')
    scenarioTasks = updateScenarioTask(scenarioTasks, 'setRoute')
  }

  if (scenarioStep === 4) {
    status = 'RUN'
    cycleMode = 'AUTO'
    timetableState = '>'
    event = createMonitorEvent(trainId, 'Instructor command: Train 317 dispatch', 'RUN', 'yellow')
    scenarioTasks = updateScenarioTask(updateScenarioTask(scenarioTasks, 'setRoute'), 'dispatchTrain')
  }

  if (scenarioStep === 5) {
    status = 'RUN'
    cycleMode = 'AUTO'
    timetableState = '>'
    event = createMonitorEvent(trainId, 'Scenario complete: Train 317 launch / withdrawal response recorded', 'COMPLETE', 'yellow')
    scenarioTasks = {
      ...scenarioTasks,
      completeScenario: true,
      dispatchTrain: true,
      selectTrain: true,
      setRoute: true,
    }
  }

  const shouldAddEvent = scenarioStep > current.scenarioStep || current.scenarioMode === 'IDLE'

  return {
    ...current,
    alarmSummaryRows: shouldAddEvent
      ? [createSummaryEvent(event, summaryTone), ...current.alarmSummaryRows].slice(0, 12)
      : current.alarmSummaryRows,
    cycleMode,
    eventRows: shouldAddEvent ? [event, ...current.eventRows].slice(0, 4) : current.eventRows,
    lineMap: scenarioStep === 0
      ? createLineMapRuntimeState()
      : scenarioStep >= 3
        ? updateLineMapRouteState(current.lineMap, { id: trainId }, scenarioStep >= 4 ? 'DISPATCHED' : 'SET')
        : current.lineMap,
    evidenceLog: shouldAddEvent
      ? appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'IOS Scenario Control',
          scenarioSteps[scenarioStep]?.title ?? 'Scenario step',
          scenarioStep === scenarioSteps.length - 1 ? 'accepted' : 'info',
          scenarioSteps[scenarioStep]?.text ?? 'Scenario step updated.',
        ),
      )
      : current.evidenceLog,
    scenarioMode: scenarioStep === 0 ? 'IDLE' : scenarioStep === scenarioSteps.length - 1 ? 'COMPLETE' : 'RUNNING',
    sessionMeta: updateSessionLifecycle(
      current.sessionMeta,
      scenarioStep === 0 ? 'CREATED' : scenarioStep === scenarioSteps.length - 1 ? 'COMPLETE' : 'RUNNING',
    ),
    scenarioNotice: {
      text: scenarioSteps[scenarioStep]?.text ?? initialScenarioNotice.text,
      tone: scenarioStep === scenarioSteps.length - 1 ? 'success' : 'info',
    },
    scenarioStep,
    scenarioTasks,
    selectedTrainId: trainId,
    timetableRows: upsertTimetableRow(current.timetableRows, trainId, timetableState),
    trains: current.trains.map((train) => (
      train.id === trainId
        ? {
            ...train,
            status,
            ...(doorFailureState ? { doorFailureState } : {}),
          }
        : train
    )),
  }
}

// Submit golden-path actions to the backend validator. If the local backend is
// down, the fallback keeps the same UI reducer path working.
export function submitBackendScenarioAction(
  session: OccSessionState,
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void,
  action: OccSessionAction,
  fallback?: (current: OccSessionState) => OccSessionState,
  onComplete?: (accepted: boolean, reason: string | null) => void,
) {
  void submitOccSessionAction(session, action)
    .then((payload) => {
      const normalized = normalizeClientSession(payload.session)

      updateSession(() => ({
        ...normalized,
        selectedTrainId: action.trainId ?? normalized.selectedTrainId,
      }))
      onComplete?.(payload.accepted, payload.reason)
    })
    .catch(() => {
      if (fallback) {
        updateSession(fallback)
      }
      onComplete?.(false, 'Backend unavailable. Used local fallback.')
    })
}
