import { acknowledgeAlarmRows, acknowledgesScenarioAlarm } from '../alarmAcknowledgement'
import { applyCommsRequest } from '../comms/commsCatalog'
import type { CommsRequest } from '../comms/commsCatalog'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import { completeScenarioTask, createMonitorEvent, createSummaryEvent } from '../scenarioWorkflow'
import { getLineMapRouteStatus, updateLineMapRouteState } from '../screens/line-map/lineMapRouteState'
import { sessionCodesMatch } from '../sessionCode'
import { applyTrainingScenarioRuntimeEvent, getActiveTrainingScenarioTargetTrainId } from '../trainingScenarios'
import type {
  MonitorAlarmRow,
  OccSessionState,
  ScenarioTaskId,
  TimetableViewDirection,
  TraineeParticipant,
  TrainStatus,
} from '../types'
import { getAlarmRowKey } from './types'
import type { SessionCommandResult, TimetableTripAction } from './types'

// Monitor 01 (alarms), Monitor 03 (timetable), the Calls panel and the trainee page.

const accepted = (session: OccSessionState): SessionCommandResult => ({ accepted: true, session })

// Only acknowledging the scenario's incident alarm is scored; any other row is
// simply acknowledged on the GWS.
export function acknowledgeAlarms(
  current: OccSessionState,
  rowKeys: readonly string[],
  keepRedTone = false,
): SessionCommandResult {
  const keys = new Set(rowKeys)
  const indexes = new Set(current.alarmSummaryRows.flatMap((row, index) => (keys.has(getAlarmRowKey(row)) ? [index] : [])))

  if (indexes.size === 0) {
    return { accepted: false, reason: 'Those alarm rows are no longer in the alarm summary.', session: current }
  }

  const options = { keepRedTone }

  if (!acknowledgesScenarioAlarm(current.alarmSummaryRows, indexes)) {
    return accepted({ ...current, alarmSummaryRows: acknowledgeAlarmRows(current.alarmSummaryRows, indexes, options) })
  }

  const guard = applyTrainingScenarioRuntimeEvent(current, {
    source: 'Monitor 01 Alarms',
    trainId: getActiveTrainingScenarioTargetTrainId(current) || '317',
    type: 'ALARM_ACKNOWLEDGED',
  })

  if (!guard.allowed) {
    return { accepted: false, reason: guard.next.scenarioNotice.text, session: guard.next }
  }

  return accepted({ ...guard.next, alarmSummaryRows: acknowledgeAlarmRows(current.alarmSummaryRows, indexes, options) })
}

const TRIP_ACTIONS: Record<TimetableTripAction, { state: string; status: TrainStatus; tone: MonitorAlarmRow['tone']; value: string }> = {
  'Creation of additional trips': { state: 'A>', status: 'WAIT', tone: 'yellow', value: 'ADDED' },
  'Service cancellation': { state: 'C>', status: 'HOLD', tone: 'red', value: 'CANCELLED' },
  'Service restoration': { state: '>', status: 'RUN', tone: 'yellow', value: 'RESTORED' },
  'Shift trips': { state: 'S>', status: 'WAIT', tone: 'yellow', value: 'SHIFTED' },
  'Trip interruption': { state: 'H>', status: 'HOLD', tone: 'orange', value: 'INTERRUPT' },
  'Trip modification': { state: 'M>', status: 'WAIT', tone: 'yellow', value: 'MODIFIED' },
}

export function isTimetableTripAction(value: unknown): value is TimetableTripAction {
  return typeof value === 'string' && value in TRIP_ACTIONS
}

// Trip regulation from the timetable's trip buttons.
export function applyTimetableTripAction(
  current: OccSessionState,
  trainId: string,
  sched: string,
  action: TimetableTripAction,
): SessionCommandResult {
  const meta = TRIP_ACTIONS[action]
  const taskId: ScenarioTaskId = action === 'Service restoration' ? 'dispatchTrain' : 'setRoute'
  const detail = `${action} accepted for Train ${trainId}.`
  const guard = completeScenarioTask(current, taskId, detail, 'Monitor 03 Timetable')

  if (!guard.allowed) {
    return { accepted: false, reason: guard.next.scenarioNotice.text, session: guard.next }
  }

  const event = createMonitorEvent(trainId, `Timetable ${action.toLowerCase()}: Train ${trainId}`, meta.value, meta.tone)

  return accepted({
    ...guard.next,
    alarmSummaryRows: [createSummaryEvent(event, meta.tone === 'red' ? 'red' : 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
    eventRows: [event, ...current.eventRows].slice(0, 4),
    lineMap: updateLineMapRouteState(current.lineMap, { id: trainId }, getLineMapRouteStatus(meta.status)),
    selectedTrainId: trainId,
    timetableRows: current.timetableRows.map((row) => (
      row.train === trainId && row.sched === sched ? { ...row, state: meta.state } : row
    )),
    trains: current.trains.map((train) => (train.id === trainId ? { ...train, status: meta.status } : train)),
  })
}

export function setTimetableView(
  current: OccSessionState,
  view: { direction?: TimetableViewDirection; station?: string },
): SessionCommandResult {
  return accepted({
    ...current,
    timetableView: {
      ...current.timetableView,
      ...(view.direction ? { direction: view.direction } : {}),
      ...(view.station ? { station: view.station } : {}),
    },
  })
}

// A call made from the Calls panel. Scenario tasks that need calls are scored from these.
export function logCall(current: OccSessionState, request: CommsRequest): SessionCommandResult {
  const next = applyCommsRequest(current, request)

  return next === current
    ? { accepted: false, reason: 'Unknown call message.', session: current }
    : accepted(next)
}

export function showNotice(current: OccSessionState, notice: OccSessionState['scenarioNotice']): SessionCommandResult {
  return accepted({ ...current, scenarioNotice: notice })
}

// Trainee ids are derived from the name until sign-in (phase 4) gives real accounts.
export function toTraineeId(name: string) {
  return `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'trainee'}@trainee.local`
}

export function joinTrainee(current: OccSessionState, code: string, name: string): SessionCommandResult {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { accepted: false, reason: 'Enter your name.', session: current }
  }

  if (!sessionCodesMatch(code, current.sessionMeta.code)) {
    return { accepted: false, reason: 'That code does not match. Check the code on your trainer’s screen.', session: current }
  }

  const participant: TraineeParticipant = {
    email: toTraineeId(trimmedName),
    joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    monitor: 'Monitor 02 - Line Map',
    name: trimmedName,
    role: 'Traffic Controller',
    status: 'Joined',
  }

  return accepted({
    ...current,
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence('Trainee', 'Trainee joined', 'info', `${participant.name} joined as Traffic Controller.`),
    ),
    trainees: [participant, ...current.trainees.filter((trainee) => trainee.email !== participant.email)].slice(0, 8),
  })
}

export function leaveTrainee(current: OccSessionState, traineeId: string): SessionCommandResult {
  return accepted({ ...current, trainees: current.trainees.filter((trainee) => trainee.email !== traineeId) })
}
