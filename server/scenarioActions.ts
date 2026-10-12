import { appendScenarioEvidence, createScenarioEvidence } from '../src/scenario'
import {
  createMonitorEvent,
  createSummaryEvent,
  getScenarioTaskBlocker,
  updateScenarioTask,
} from '../src/scenarioWorkflow'
import { updateSessionLifecycle } from '../src/sessionState'
import {
  recordAcceptedAssessmentTask,
  recordRejectedAssessmentAction,
  TASK_LABELS,
  TASK_STEPS,
} from './legacyAssessment'
import { getIsoNow } from './http'
import { normalizeLineMap } from './sessionNormalize'
import type {
  LineMapRouteSegmentStatus,
  LineMapRuntimeState,
  OccSessionAction,
  OccSessionState,
  ScenarioTaskId,
  TrainStatus,
} from '../src/types'

// Validates and applies the five scored actions sent by the monitors.
// Phase 2 widens this to every trainee and trainer action.

export type ScenarioActionResult = {
  accepted: boolean
  reason?: string
  session: OccSessionState
}

const RT1_LAUNCH_STAGING_STEP = { occupancySegmentId: 'rail-653', x: 3281, y: 274 }

const TRAIN_ROUTE_SEGMENT_IDS: Record<string, string> = {
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

function updateLineMapRouteState(lineMap: LineMapRuntimeState, trainId: string, status: LineMapRouteSegmentStatus): LineMapRuntimeState {
  const current = normalizeLineMap(lineMap)
  const segmentId = TRAIN_ROUTE_SEGMENT_IDS[trainId]

  if (!segmentId) {
    return current
  }

  return {
    ...current,
    routeSegments: {
      ...current.routeSegments,
      [segmentId]: { segmentId, status, trainId, updatedAt: Date.now() },
    },
  }
}

function getTargetTrainId(session: OccSessionState, activeScenarioId: string) {
  if (activeScenarioId === 'train-withdrawal' || activeScenarioId === 'train-launch') {
    return session.activeScenario?.targetTrainId ?? ''
  }

  // Fault scenarios arm a randomly chosen train; older sessions default to 317.
  return session.activeScenario?.targetTrainId ?? '317'
}

// A rejected action adds evidence and a red event, and counts as a penalty.
export function rejectScenarioAction(session: OccSessionState, text: string, trainId: string, source: string): OccSessionState {
  const event = createMonitorEvent(trainId, `Command rejected: ${text}`, 'REJECTED', 'red')

  return {
    ...session,
    assessmentMetrics: recordRejectedAssessmentAction(session),
    evidenceLog: appendScenarioEvidence(session.evidenceLog, createScenarioEvidence(source, 'Action rejected', 'rejected', text)),
    eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
    scenarioNotice: { text, tone: 'warning' },
  }
}

// An accepted action advances the checklist and assessment timing in one place.
function applyAcceptedTask(session: OccSessionState, taskId: ScenarioTaskId, source: string, successText: string): OccSessionState {
  const sessionMeta = updateSessionLifecycle(session.sessionMeta, taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING')
  const scenarioTasks = updateScenarioTask(session.scenarioTasks, taskId)

  return {
    ...session,
    assessmentMetrics: recordAcceptedAssessmentTask({ ...session, scenarioTasks, sessionMeta }, taskId, source, getIsoNow()),
    evidenceLog: appendScenarioEvidence(session.evidenceLog, createScenarioEvidence(source, TASK_LABELS[taskId], 'accepted', successText)),
    scenarioMode: taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING',
    scenarioNotice: { text: successText, tone: taskId === 'completeScenario' ? 'success' : 'info' },
    scenarioStep: Math.max(session.scenarioStep ?? 0, TASK_STEPS[taskId] ?? 0),
    scenarioTasks,
    sessionMeta,
  }
}

function getTrainSelectionDetail(activeScenarioId: string, trainId: string) {
  if (activeScenarioId === 'train-withdrawal') {
    return `Train ${trainId} selected for withdrawal.`
  }

  if (activeScenarioId === 'train-launch') {
    return `Train ${trainId} selected for launch.`
  }

  return `Train ${trainId} selected. Acknowledge alarm before route.`
}

function applyTrainSelection(session: OccSessionState, action: OccSessionAction, activeScenarioId: string, source: string, trainId: string): ScenarioActionResult {
  const updated = applyAcceptedTask(session, 'selectTrain', source, action.detail ?? getTrainSelectionDetail(activeScenarioId, trainId))
  const bindsTarget = (activeScenarioId === 'train-withdrawal' || activeScenarioId === 'train-launch')
    && !session.activeScenario?.targetTrainId

  return {
    accepted: true,
    session: {
      ...updated,
      ...(bindsTarget
        ? {
            activeScenario: { ...session.activeScenario, targetTrainId: trainId },
            trains: (session.trains ?? []).map((train) => (
              train.id === trainId
                ? {
                    ...train,
                    lineMapVisible: true,
                    timetablePlayback: false,
                    ...(activeScenarioId === 'train-launch'
                      ? { ...RT1_LAUNCH_STAGING_STEP, direction: 'right' as const, isMoving: false, service: 'NB', status: 'WAIT' as const }
                      : {}),
                  }
                : train
            )),
          }
        : {}),
      selectedTrainId: trainId,
    },
  }
}

export function applyScenarioAction(session: OccSessionState, action: OccSessionAction): ScenarioActionResult {
  const source = action.source ?? 'Backend Scenario Engine'
  const trainId = action.trainId ?? session.selectedTrainId ?? '317'
  const activeScenarioId = session.activeScenario?.id ?? ''
  const targetTrainId = getTargetTrainId(session, activeScenarioId)
  const reject = (reason: string): ScenarioActionResult => ({
    accepted: false,
    reason,
    session: rejectScenarioAction(session, reason, trainId, source),
  })

  if (targetTrainId !== '') {
    if (trainId !== targetTrainId) {
      return reject(`Scenario target is Train ${targetTrainId}. Select Train ${targetTrainId} for this assessment action.`)
    }
  } else if (action.type !== 'SELECT_TRAIN') {
    return reject('Select a train first for this assessment action.')
  }

  if (action.type === 'SELECT_TRAIN') {
    return applyTrainSelection(session, action, activeScenarioId, source, trainId)
  }

  if (action.type === 'ACK_ALARM') {
    const blocker = getScenarioTaskBlocker(session.scenarioTasks, 'ackAlarm', activeScenarioId, targetTrainId)

    // The monitor marks which alarm rows were acknowledged; the engine only scores it.
    return blocker
      ? reject(blocker)
      : { accepted: true, session: applyAcceptedTask(session, 'ackAlarm', source, action.detail ?? 'Alarm acknowledgement accepted.') }
  }

  if (action.type === 'SET_ROUTE' || action.type === 'DISPATCH_TRAIN') {
    const isDispatch = action.type === 'DISPATCH_TRAIN'
    const taskId: ScenarioTaskId = isDispatch ? 'dispatchTrain' : 'setRoute'
    const nextStatus: TrainStatus = isDispatch ? 'RUN' : 'WAIT'
    const message = isDispatch ? `Train ${trainId}: Dispatch command executed` : `Train ${trainId}: Route command selected`
    const blocker = getScenarioTaskBlocker(session.scenarioTasks, taskId, activeScenarioId, targetTrainId)

    if (blocker) {
      return reject(blocker)
    }

    const event = createMonitorEvent(trainId, message, nextStatus, 'yellow')
    const accepted = applyAcceptedTask(session, taskId, source, action.detail ?? `${message} accepted.`)

    return {
      accepted: true,
      session: {
        ...accepted,
        alarmSummaryRows: [createSummaryEvent(event), ...(session.alarmSummaryRows ?? [])].slice(0, 12),
        eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
        lineMap: updateLineMapRouteState(session.lineMap, trainId, isDispatch ? 'DISPATCHED' : 'SET'),
        selectedTrainId: trainId,
        timetableRows: (session.timetableRows ?? []).map((row) => (
          row.train === trainId ? { ...row, state: isDispatch ? '>' : 'R' } : row
        )),
        trains: (session.trains ?? []).map((train) => (train.id === trainId ? { ...train, status: nextStatus } : train)),
      },
    }
  }

  if (action.type === 'COMPLETE_SCENARIO') {
    const blocker = getScenarioTaskBlocker(session.scenarioTasks, 'completeScenario', activeScenarioId, targetTrainId)

    if (blocker) {
      return reject(blocker)
    }

    const event = createMonitorEvent(trainId, `Scenario complete: Trainer reviewed Train ${trainId} response`, 'COMPLETE', 'yellow')
    const accepted = applyAcceptedTask(session, 'completeScenario', source, action.detail ?? 'Scenario review complete. Report is ready.')

    return {
      accepted: true,
      session: {
        ...accepted,
        alarmSummaryRows: [createSummaryEvent(event), ...(session.alarmSummaryRows ?? [])].slice(0, 12),
        eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
      },
    }
  }

  return { accepted: false, reason: `Unsupported backend action: ${String((action as { type?: string }).type ?? 'UNKNOWN')}`, session }
}
