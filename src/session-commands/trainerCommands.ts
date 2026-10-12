import { normalizeNelTimetableName } from '../data/nelTimetable'
import type { NelTimetableName } from '../data/nelTimetable'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import { createSummaryEvent, formatScenarioTime } from '../scenarioWorkflow'
import { createResetSessionState, updateSessionLifecycle } from '../sessionState'
import {
  applyTrainingScenarioRuntimeEvent,
  applyTrainingScenarioTrainSelection,
  completeTrainingScenarioDefinitionTask,
  createTrainingScenarioStartSession,
  findTrainingScenarioDefinition,
  getActiveTrainingScenarioTargetTrainId,
  getTrainingScenarioCompletionBlockers,
  getTrainingScenarioDefinition,
  pickRandomFaultLocation,
  resetTrainingScenarioRuntime,
} from '../trainingScenarios'
import type { FaultLocation } from '../training-scenarios/faultLocation'
import type { TrainingScenarioKind } from '../training-scenarios/types'
import type { MonitorAlarmRow, OccSessionState, TrainingMode } from '../types'
import type { SessionCommandResult } from './types'

// Trainer console commands: load, pause/resume/complete, confirm tasks, reset.

const CONSOLE = 'IOS Scenario Runtime'

const accepted = (session: OccSessionState): SessionCommandResult => ({ accepted: true, session })
const refused = (session: OccSessionState): SessionCommandResult => ({
  accepted: false,
  reason: session.scenarioNotice.text,
  session,
})

export const TRAINING_MODES: readonly TrainingMode[] = ['PRACTICE', 'ASSESSMENT', 'PLAYER']
const SCENARIO_KINDS: readonly TrainingScenarioKind[] = ['TRAIN_LAUNCH', 'TRAIN_WITHDRAWAL', 'DOOR_FAULT', 'PSD_FAULT']

export function isTrainingMode(value: unknown): value is TrainingMode {
  return TRAINING_MODES.includes(value as TrainingMode)
}

export function isTrainingScenarioKind(value: unknown): value is TrainingScenarioKind {
  return SCENARIO_KINDS.includes(value as TrainingScenarioKind)
}

// Run time target, mm:ss.
export function isScenarioDuration(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:[0-5]\d$/.test(value) && value !== '00:00'
}

function createConsoleEvent(message: string, value: string, tone: MonitorAlarmRow['tone'], trainId?: string): MonitorAlarmRow {
  return {
    asset: trainId ? `EMU/${trainId}/TRN/OCC` : 'IOS/TRAINER/OCC',
    level: 'S',
    message,
    time: formatScenarioTime(),
    tone,
    value,
  }
}

function prependConsoleEvent(session: OccSessionState, event: MonitorAlarmRow): OccSessionState {
  return {
    ...session,
    alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...session.alarmSummaryRows].slice(0, 12),
    eventRows: [event, ...session.eventRows].slice(0, 4),
  }
}

// Switching timetable rebuilds the trains, but the class is the same session:
// keep the joined trainees, the code they joined with and the screens.
function keepSessionPeople(reset: OccSessionState, loaded: OccSessionState): OccSessionState {
  return {
    ...reset,
    sessionMeta: {
      ...reset.sessionMeta,
      code: loaded.sessionMeta.code,
      createdAt: loaded.sessionMeta.createdAt,
      screens: loaded.sessionMeta.screens,
    },
    trainees: loaded.trainees,
  }
}

export function loadScenario(
  loaded: OccSessionState,
  options: {
    duration: string
    faultLocation?: FaultLocation
    incident: string
    kind: TrainingScenarioKind
    timetableName: NelTimetableName
    trainingMode: TrainingMode
  },
): SessionCommandResult {
  const timetableName = normalizeNelTimetableName(options.timetableName)
  const definition = findTrainingScenarioDefinition(options.kind, options.incident)
  // A different timetable changes the train roster, so start from a clean session.
  const base = loaded.timetableName === timetableName
    ? loaded
    : keepSessionPeople(
        createResetSessionState(options.trainingMode, Date.now(), (loaded.scenarioRevision ?? 0) + 1, timetableName),
        loaded,
      )
  // Each run puts the fault on a different train, station and bound.
  const armed = createTrainingScenarioStartSession(
    { ...base, trainingMode: options.trainingMode },
    definition.kind,
    definition.incident,
    { faultLocation: options.faultLocation ?? pickRandomFaultLocation(base) },
  )

  return accepted({ ...armed, activeScenario: { ...armed.activeScenario, duration: options.duration } })
}

export function assignLaunchTrain(current: OccSessionState, trainId: string): SessionCommandResult {
  const result = applyTrainingScenarioTrainSelection(current, CONSOLE, trainId)

  return result.allowed ? accepted(result.next) : refused(result.next)
}

export function setScenarioState(current: OccSessionState, action: 'PAUSE' | 'RESUME' | 'COMPLETE'): SessionCommandResult {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)

  if (definition.id === 'idle') {
    return { accepted: false, reason: 'No scenario is loaded.', session: current }
  }

  const nextMode = action === 'PAUSE' ? 'PAUSED' as const : action === 'RESUME' ? 'RUNNING' as const : 'COMPLETE' as const
  const event = createConsoleEvent(
    `IOS scenario ${action.toLowerCase()}: ${definition.title}`,
    nextMode,
    action === 'PAUSE' ? 'orange' : 'yellow',
    getActiveTrainingScenarioTargetTrainId(current),
  )

  if (action === 'COMPLETE') {
    const openRequiredTasks = getTrainingScenarioCompletionBlockers(current)

    if (openRequiredTasks.length > 0) {
      return refused({
        ...current,
        scenarioNotice: {
          text: `Cannot complete yet. Open: ${openRequiredTasks.map((task) => task.label).join(', ')}.`,
          tone: 'warning',
        },
      })
    }

    const guard = applyTrainingScenarioRuntimeEvent(current, { source: CONSOLE, type: 'SCENARIO_REVIEWED' })

    return guard.allowed ? accepted(prependConsoleEvent(guard.next, event)) : refused(guard.next)
  }

  const noticeText = `${definition.title} ${action === 'PAUSE' ? 'paused' : 'resumed'} by the trainer.`

  return accepted(prependConsoleEvent({
    ...current,
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(CONSOLE, `Scenario ${action.toLowerCase()}`, 'info', noticeText),
    ),
    scenarioMode: nextMode,
    scenarioNotice: { text: noticeText, tone: 'info' },
    sessionMeta: updateSessionLifecycle(current.sessionMeta, nextMode),
  }, event))
}

// The trainer confirms a step they observed (a call, a radio message).
export function confirmTask(current: OccSessionState, taskId: string, label: string): SessionCommandResult {
  const guard = completeTrainingScenarioDefinitionTask(current, taskId, CONSOLE)

  if (!guard.allowed) {
    return refused(guard.next)
  }

  const event = createConsoleEvent(`IOS scenario task confirmed: ${label}`, 'DONE', 'yellow', getActiveTrainingScenarioTargetTrainId(current))

  return accepted(prependConsoleEvent(guard.next, event))
}

export function resetScenario(current: OccSessionState): SessionCommandResult {
  return accepted(resetTrainingScenarioRuntime(current))
}

// A whole new session: new code, nobody joined, trains at baseline.
export function resetSession(current: OccSessionState, trainingMode: TrainingMode, timetableName: NelTimetableName): SessionCommandResult {
  return accepted(createResetSessionState(
    trainingMode,
    Date.now(),
    (current.scenarioRevision ?? 0) + 1,
    normalizeNelTimetableName(timetableName),
  ))
}
