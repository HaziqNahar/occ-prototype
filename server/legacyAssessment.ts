import { getIsoNow } from './http'
import type {
  AssessmentResult,
  AssessmentTaskMetric,
  OccAssessmentMetrics,
  OccSessionState,
  ScenarioTaskId,
} from '../src/types'

// Legacy 5-step assessment ("golden path"): timing and score per scored action.
// Phase 2 of docs/production-plan.md replaces this with the definition-based
// scoring in src/training-scenarios/assessment.ts, run on the server.

export const REQUIRED_TASKS: readonly ScenarioTaskId[] = ['selectTrain', 'ackAlarm', 'setRoute', 'dispatchTrain', 'completeScenario']

export const TASK_STEPS: Record<ScenarioTaskId, number> = {
  ackAlarm: 2,
  completeScenario: 5,
  dispatchTrain: 4,
  selectTrain: 1,
  setRoute: 3,
}

export const TASK_LABELS: Record<ScenarioTaskId, string> = {
  ackAlarm: 'Alarm acknowledged',
  completeScenario: 'Scenario reviewed',
  dispatchTrain: 'Train dispatched',
  selectTrain: 'Train selected',
  setRoute: 'Route command applied',
}

const TASK_THRESHOLDS: Record<ScenarioTaskId, number> = {
  ackAlarm: 45,
  completeScenario: 150,
  dispatchTrain: 105,
  selectTrain: 20,
  setRoute: 75,
}

// Each task is worth roughly one fifth of the final score; wrong actions apply penalties.
const TASK_WEIGHT = Math.round(100 / REQUIRED_TASKS.length)

type SessionForMetrics = Pick<OccSessionState, 'eventRows' | 'scenarioTasks' | 'sessionMeta'> & {
  assessmentMetrics?: Partial<OccAssessmentMetrics>
}

export function createAssessmentMetrics(): OccAssessmentMetrics {
  const tasks = Object.fromEntries(REQUIRED_TASKS.map((taskId) => [
    taskId,
    {
      label: TASK_LABELS[taskId],
      score: 0,
      status: 'PENDING',
      taskId,
      thresholdSeconds: TASK_THRESHOLDS[taskId],
    } satisfies AssessmentTaskMetric,
  ])) as Record<ScenarioTaskId, AssessmentTaskMetric>

  return {
    lateTasks: 0,
    onTimeTasks: 0,
    rejectedActions: 0,
    result: 'INCOMPLETE',
    score: 0,
    tasks,
  }
}

function calculateAssessmentScore(tasks: Record<ScenarioTaskId, AssessmentTaskMetric>, rejectedActions: number) {
  const taskScore = REQUIRED_TASKS.reduce((totalScore, taskId) => totalScore + (tasks[taskId]?.score ?? 0), 0)
  const penalty = Math.min(25, rejectedActions * 5)

  return Math.max(0, Math.min(100, Math.round(taskScore - penalty)))
}

// PASS is strict: complete scenario, good score and no rejected actions.
function getAssessmentResult(
  score: number,
  sessionTasks: OccSessionState['scenarioTasks'] | undefined,
  rejectedActions: number,
): AssessmentResult {
  if (sessionTasks?.completeScenario && rejectedActions === 0 && score >= 80) {
    return 'PASS'
  }

  if (score >= 70 || REQUIRED_TASKS.filter((taskId) => sessionTasks?.[taskId]).length >= 4) {
    return 'NEEDS_REVIEW'
  }

  return 'INCOMPLETE'
}

// Fills metrics missing from older sessions.
export function normalizeAssessmentMetrics(
  session: SessionForMetrics,
  metrics: Partial<OccAssessmentMetrics> | undefined = session.assessmentMetrics,
): OccAssessmentMetrics {
  const fallback = createAssessmentMetrics()
  const tasks = Object.fromEntries(REQUIRED_TASKS.map((taskId) => [
    taskId,
    { ...fallback.tasks[taskId], ...(metrics?.tasks?.[taskId] ?? {}) },
  ])) as Record<ScenarioTaskId, AssessmentTaskMetric>
  const rejectedActions = metrics?.rejectedActions ?? (session.eventRows ?? []).filter((row) => (
    String(row.message ?? '').toLowerCase().includes('rejected')
  )).length
  const score = metrics?.score ?? calculateAssessmentScore(tasks, rejectedActions)

  return {
    ...fallback,
    ...(metrics ?? {}),
    lateTasks: Object.values(tasks).filter((task) => task.status === 'LATE').length,
    onTimeTasks: Object.values(tasks).filter((task) => task.status === 'ON_TIME').length,
    rejectedActions,
    result: metrics?.result ?? getAssessmentResult(score, session.scenarioTasks, rejectedActions),
    score,
    tasks,
  }
}

function finalizeAssessmentMetrics(session: SessionForMetrics, metrics: OccAssessmentMetrics): OccAssessmentMetrics {
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

function getResponseSeconds(startedAt: string | undefined, completedAt: string) {
  if (!startedAt) {
    return 0
  }

  const elapsed = Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000)

  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0
}

// Records timing and threshold status for one accepted task.
export function recordAcceptedAssessmentTask(
  session: SessionForMetrics,
  taskId: ScenarioTaskId,
  source: string,
  completedAt: string,
): OccAssessmentMetrics {
  const currentMetrics = normalizeAssessmentMetrics(session)
  const currentTask = currentMetrics.tasks[taskId]

  if (currentTask?.completedAt) {
    return finalizeAssessmentMetrics(session, currentMetrics)
  }

  const startedAt = currentMetrics.startedAt ?? session.sessionMeta?.startedAt ?? session.sessionMeta?.createdAt ?? completedAt
  const responseSeconds = getResponseSeconds(startedAt, completedAt)
  const thresholdSeconds = currentTask?.thresholdSeconds ?? TASK_THRESHOLDS[taskId]
  const status = responseSeconds <= thresholdSeconds ? 'ON_TIME' : 'LATE'

  return finalizeAssessmentMetrics(session, {
    ...currentMetrics,
    startedAt,
    tasks: {
      ...currentMetrics.tasks,
      [taskId]: {
        ...currentTask,
        completedAt,
        responseSeconds,
        score: status === 'ON_TIME' ? TASK_WEIGHT : Math.round(TASK_WEIGHT / 2),
        source,
        status,
      },
    },
  })
}

// Rejected actions count as penalties while the trainee can still recover.
export function recordRejectedAssessmentAction(session: SessionForMetrics): OccAssessmentMetrics {
  const currentMetrics = normalizeAssessmentMetrics(session)

  return finalizeAssessmentMetrics(session, {
    ...currentMetrics,
    rejectedActions: (currentMetrics.rejectedActions ?? 0) + 1,
    startedAt: currentMetrics.startedAt ?? session.sessionMeta?.startedAt ?? getIsoNow(),
  })
}
