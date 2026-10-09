import { hasCommsEvidence } from '../comms/commsCatalog'
import { getTrainingScenarioDefinition } from './definitions'
import type {
  TrainingScenarioScore,
  TrainingScenarioTaskDefinition,
} from './types'
import type { OccSessionState, ScenarioEvidence } from '../types'

export function scoreTrainingScenario(session: OccSessionState): TrainingScenarioScore {
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)
  const rejectedActions = getRejectedActionCount(session.evidenceLog)
  const taskResults = definition.tasks.map((task) => ({
    ...task,
    complete: isTrainingScenarioTaskComplete(session, task),
  }))
  const totalWeight = definition.tasks.reduce((total, task) => total + task.weight, 0)
  const earnedWeight = taskResults.reduce((total, task) => total + (task.complete ? task.weight : 0), 0)
  const penalty = rejectedActions * 5
  const score = totalWeight === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100) - penalty))
  const criticalTasks = taskResults.filter((task) => task.critical).length
  const completedCriticalTasks = taskResults.filter((task) => task.critical && task.complete).length
  const result = session.scenarioMode !== 'COMPLETE'
    ? 'IN PROGRESS'
    : completedCriticalTasks === criticalTasks && taskResults.every((task) => task.complete) && score >= 80
      ? 'PASS'
      : 'NEEDS REVIEW'

  return {
    completedCriticalTasks,
    completedTasks: taskResults.filter((task) => task.complete).length,
    criticalTasks,
    rejectedActions,
    result,
    score,
    taskResults,
    totalTasks: taskResults.length,
  }
}

export function getTrainingScenarioCompletionBlockers(session: OccSessionState) {
  return scoreTrainingScenario(session).taskResults.filter((task) => (
    !task.complete
    && task.mappedTaskId !== 'completeScenario'
  ))
}

export function isTrainingScenarioTaskComplete(
  session: OccSessionState,
  task: TrainingScenarioTaskDefinition,
) {
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)

  if (task.commsMessageIds?.length) {
    return task.commsMessageIds.every((messageId) => hasCommsEvidence(session.evidenceLog, messageId))
  }

  if (definition.kind === 'TRAIN_LAUNCH') {
    return Boolean(task.mappedTaskId && session.scenarioTasks[task.mappedTaskId])
  }

  if (task.mappedTaskId && session.scenarioTasks[task.mappedTaskId]) {
    return true
  }

  if (task.runtimeOnly) {
    return hasScenarioEvidenceAction(task.label, session.evidenceLog)
  }

  return (task.evidenceKeywords ?? []).some((keyword) => hasScenarioEvidenceKeyword(
    keyword,
    session.evidenceLog,
  ))
}

export function hasTrainingScenarioDefinitionTaskEvidence(
  session: OccSessionState,
  taskId: string,
) {
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)
  const task = definition.tasks.find((item) => item.id === taskId)

  return Boolean(task && isTrainingScenarioTaskComplete(session, task))
}

function hasScenarioEvidenceKeyword(
  keyword: string,
  evidenceLog: readonly ScenarioEvidence[],
) {
  const normalizedKeyword = keyword.toLowerCase()
  const haystack = evidenceLog
    .filter((row) => row.result === 'accepted')
    .map((row) => `${row.action} ${row.detail}`)
    .join('\n')
    .toLowerCase()

  return haystack.includes(normalizedKeyword)
}

function hasScenarioEvidenceAction(
  action: string,
  evidenceLog: readonly ScenarioEvidence[],
) {
  return evidenceLog.some((row) => row.result === 'accepted' && row.action === action)
}

function getRejectedActionCount(evidenceLog: readonly ScenarioEvidence[]) {
  return evidenceLog.filter((event) => event.result === 'rejected').length
}
