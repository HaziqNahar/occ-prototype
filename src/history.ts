import { getCommsMessage } from './comms/commsCatalog'
import type { SessionCommandType } from './session-commands/types'
import { trainingAidLabels } from './trainingAids'
import type { TrainingAid } from './trainingAids'

// Past runs and trainee progress, built from the archived reports (scored by the
// server) and the action log. Shared by the server (server/history.ts) and pages.

export type RunTrainee = { id: string; name: string }

export type RunSummary = {
  // Show me / Locate uses in a Practice run; missing on older reports.
  aidsUsed?: { locate: number; showMe: number }
  // The run reached Complete (otherwise the trainer saved notes mid-run).
  completed: boolean
  completedAt?: string
  durationLabel?: string
  exercise?: number
  id: string
  mode?: string
  notes: string
  rejectedActions: number
  result: string
  scenarioTitle: string
  score: number
  sessionCode?: string
  sessionId?: string
  startedAt?: string
  trainees: RunTrainee[]
}

export type RunTaskResult = {
  complete: boolean
  critical?: boolean
  label: string
  monitor?: string
}

// One command from the action log, during the run.
export type RunActionEntry = {
  accepted: boolean | null
  actionType: string | null
  actor: string | null
  actorRole: string | null
  at: string
  detail: string | null
  // What it was about: the train, the call, the state.
  subject?: string
}

export type RunDetail = RunSummary & {
  actions: RunActionEntry[]
  averageResponseSeconds?: number
  tasks: RunTaskResult[]
}

export type ScenarioProgress = {
  averageScore: number
  bestScore: number
  lastResult: string
  lastRunAt?: string
  passes: number
  runs: number
  scenarioTitle: string
}

export type TraineeProgress = {
  byScenario: ScenarioProgress[]
  // Newest first.
  runs: RunSummary[]
  totals: {
    averageScore: number
    completed: number
    passed: number
    runs: number
  }
  trainee: RunTrainee
}

const asString = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

// When a run happened, for ordering; reports from before phase 6 may lack times.
export function getRunTime(run: Pick<RunSummary, 'completedAt' | 'startedAt'>) {
  return run.startedAt ?? run.completedAt ?? ''
}

// Reads an archived report. Older reports (before phase 2) have fewer fields.
export function toRunSummary(report: { id: string; notes: unknown; summary: Record<string, unknown> }): RunSummary {
  const summary = report.summary
  const trainees = Array.isArray(summary.trainees)
    ? (summary.trainees as Array<Partial<RunTrainee>>).filter((trainee): trainee is RunTrainee => (
        typeof trainee?.id === 'string' && typeof trainee.name === 'string'
      ))
    : []

  const aidsUsed = summary.aidsUsed && typeof summary.aidsUsed === 'object'
    ? summary.aidsUsed as Record<string, unknown>
    : undefined

  return {
    aidsUsed: aidsUsed ? { locate: asNumber(aidsUsed.locate), showMe: asNumber(aidsUsed.showMe) } : undefined,
    completed: summary.lifecycle === 'COMPLETE',
    completedAt: asString(summary.completedAt),
    durationLabel: asString(summary.durationLabel),
    exercise: typeof summary.exercise === 'number' ? summary.exercise : undefined,
    id: report.id,
    mode: asString(summary.mode),
    notes: typeof report.notes === 'string' ? report.notes : '',
    rejectedActions: asNumber(summary.rejectedActions),
    result: asString(summary.result) ?? 'UNKNOWN',
    scenarioTitle: asString(summary.scenarioTitle) ?? 'Unknown scenario',
    score: asNumber(summary.score),
    sessionCode: asString(summary.sessionCode),
    sessionId: asString(summary.sessionId),
    startedAt: asString(summary.startedAt),
    trainees,
  }
}

export function toRunTasks(summary: Record<string, unknown>): RunTaskResult[] {
  return Array.isArray(summary.taskMetrics)
    ? (summary.taskMetrics as Array<Record<string, unknown>>).map((task) => ({
        complete: task.complete === true,
        critical: task.critical === true,
        label: asString(task.label) ?? 'Task',
        monitor: asString(task.monitor),
      }))
    : []
}

const average = (values: number[]) => (values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0)

// One trainee's record: completed runs count towards pass rate and averages.
export function summarizeProgress(trainee: RunTrainee, allRuns: readonly RunSummary[]): TraineeProgress {
  const runs = allRuns
    .filter((run) => run.trainees.some((item) => item.id === trainee.id))
    .sort((left, right) => getRunTime(right).localeCompare(getRunTime(left)))
  const completed = runs.filter((run) => run.completed)
  const byTitle = new Map<string, RunSummary[]>()

  completed.forEach((run) => byTitle.set(run.scenarioTitle, [...(byTitle.get(run.scenarioTitle) ?? []), run]))

  return {
    byScenario: [...byTitle.entries()]
      .map(([scenarioTitle, scenarioRuns]) => ({
        averageScore: average(scenarioRuns.map((run) => run.score)),
        bestScore: Math.max(...scenarioRuns.map((run) => run.score)),
        lastResult: scenarioRuns[0].result,
        lastRunAt: getRunTime(scenarioRuns[0]) || undefined,
        passes: scenarioRuns.filter((run) => run.result === 'PASS').length,
        runs: scenarioRuns.length,
        scenarioTitle,
      }))
      .sort((left, right) => left.scenarioTitle.localeCompare(right.scenarioTitle)),
    runs,
    totals: {
      averageScore: average(completed.map((run) => run.score)),
      completed: completed.length,
      passed: completed.filter((run) => run.result === 'PASS').length,
      runs: runs.length,
    },
    trainee,
  }
}

// Plain names for the commands in a run's action log.
const ACTION_LABELS: Partial<Record<SessionCommandType, string>> = {
  ACK_ALARMS: 'Acknowledged alarms',
  ARRIVAL_DESTINATION: 'Set arrival destination',
  ASSIGN_LAUNCH_TRAIN: 'Assigned the launch train',
  ASSIGN_TRAINEE: 'Assigned a trainee',
  CONFIRM_TASK: 'Confirmed a checklist step',
  ITAMA_ACK: 'Acknowledged ITAMA status',
  ITAMA_CONFIRM: 'Confirmed ITAMA',
  LOAD_SCENARIO: 'Loaded the scenario',
  LOG_CALL: 'Made a call',
  MANUAL_ROUTE_COMPLETED: 'Train reached the end of its route',
  OPEN_TRAIN_VIEW: 'Opened a train view',
  RESET_SCENARIO: 'Stopped the scenario',
  RESET_SESSION: 'Reset the session',
  SCADA_TRAIN_COMMAND: 'SCADA train command',
  SELECT_TRAIN: 'Selected a train',
  SET_SCENARIO_STATE: 'Changed scenario state',
  SET_TIMETABLE_VIEW: 'Changed the timetable view',
  SIGNAL_ROUTE: 'Set or unset a signal route',
  TIMETABLE_TRIP_ACTION: 'Timetable trip action',
  TRAIN_DEPARTURE: 'Confirmed a departure',
  TRAIN_DOOR_COMMAND: 'Door command',
  TRAIN_HOLD: 'Held a train',
  TRAIN_READINESS: 'Train readiness command',
  TRAINEE_JOIN: 'Joined the exercise',
  TRAINEE_LEAVE: 'Left the exercise',
  USE_TRAINING_AID: 'Used a training aid',
}

export function describeAction(type: string | null) {
  return (type && ACTION_LABELS[type as SessionCommandType]) ?? type ?? 'Action'
}

// The detail worth showing from a logged command: which train, call or state.
export function describeActionSubject(payload: unknown) {
  const command = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
  const request = command.request && typeof command.request === 'object' ? command.request as Record<string, unknown> : undefined
  const call = text(request?.messageId)
  const parts = [
    call ? getCommsMessage(call)?.label ?? call : undefined,
    text(command.trainId) ? `Train ${String(command.trainId)}` : undefined,
    text(command.incident),
    text(command.command),
    text(command.step),
    text(command.state)?.toLowerCase(),
    text(command.routeLabel),
    text(command.view) && command.type === 'OPEN_TRAIN_VIEW' ? text(command.view) : undefined,
    text(command.action),
    text(command.aid) ? trainingAidLabels[command.aid as TrainingAid] ?? text(command.aid) : undefined,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : undefined
}
