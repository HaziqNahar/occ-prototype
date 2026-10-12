import { createAssessmentMetrics } from '../sessionState'
import { scoreTrainingScenario } from '../training-scenarios/assessment'
import type { AssessmentResult, OccAssessmentMetrics, OccSessionState, ScenarioTaskId } from '../types'

// The session's assessment record, kept by the server after every command:
// score and result from the scenario definition (training-scenarios/assessment),
// plus how long each checklist step took against its time threshold.

const RESULTS: Record<ReturnType<typeof scoreTrainingScenario>['result'], AssessmentResult> = {
  'IN PROGRESS': 'INCOMPLETE',
  'NEEDS REVIEW': 'NEEDS_REVIEW',
  PASS: 'PASS',
}

function getResponseSeconds(startedAt: string | undefined, completedAt: string) {
  const elapsed = startedAt ? Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000) : 0

  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0
}

function getLatestAcceptedSource(session: OccSessionState) {
  return session.evidenceLog.find((evidence) => evidence.result === 'accepted')?.source
}

function isNewRun(before: OccSessionState, after: OccSessionState) {
  return before.activeScenario.id !== after.activeScenario.id
    || before.scenarioRevision !== after.scenarioRevision
    || before.sessionMeta.startedAt !== after.sessionMeta.startedAt
}

export function updateAssessmentMetrics(
  before: OccSessionState,
  after: OccSessionState,
  now = new Date().toISOString(),
): OccAssessmentMetrics {
  const base = isNewRun(before, after) ? createAssessmentMetrics() : after.assessmentMetrics
  const startedAt = after.sessionMeta.startedAt ?? base.startedAt
  const tasks = { ...base.tasks }

  ;(Object.keys(after.scenarioTasks) as ScenarioTaskId[]).forEach((taskId) => {
    const task = tasks[taskId]

    if (!task || !after.scenarioTasks[taskId] || task.completedAt) {
      return
    }

    const responseSeconds = getResponseSeconds(startedAt, now)
    const status = responseSeconds <= task.thresholdSeconds ? 'ON_TIME' : 'LATE'

    tasks[taskId] = {
      ...task,
      completedAt: now,
      responseSeconds,
      source: getLatestAcceptedSource(after),
      status,
    }
  })

  const score = scoreTrainingScenario(after)
  const taskList = Object.values(tasks)

  return {
    ...base,
    completedAt: after.scenarioMode === 'COMPLETE' ? base.completedAt ?? now : undefined,
    lateTasks: taskList.filter((task) => task.status === 'LATE').length,
    onTimeTasks: taskList.filter((task) => task.status === 'ON_TIME').length,
    rejectedActions: score.rejectedActions,
    result: RESULTS[score.result],
    score: score.score,
    startedAt,
    tasks,
  }
}
