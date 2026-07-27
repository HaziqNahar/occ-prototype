import { getScenarioTaskOwner, type ScenarioTaskOwner } from './iosScenarioRoles'
import {
  getScenarioTaskStageLabel,
  withScenarioTaskStages,
  type ScenarioTaskStage,
} from './iosScenarioTaskStages'
import { scoreTrainingScenario, type TrainingScenarioTaskDefinition } from './trainingScenarios'
import type { OccSessionState, ScenarioEvidence } from './types'

export type ScenarioTaskCompletionSource = 'Live monitor' | 'Instructor review'
export type ScenarioTaskValidationMode = 'automatic' | 'instructor-review'

export type ScenarioAssessmentRow = TrainingScenarioTaskDefinition & {
  complete: boolean
  completionRule: string
  completionSource: ScenarioTaskCompletionSource
  evidenceCount: number
  latestEvidence?: ScenarioEvidence
  owner: ScenarioTaskOwner
  scoreContribution: number
  stage: ScenarioTaskStage
  stageLabel: string
  statusLabel: 'Open' | 'Verified' | 'Scored'
  validationMode: ScenarioTaskValidationMode
}

function evidenceMatchesTask(task: TrainingScenarioTaskDefinition, evidence: ScenarioEvidence) {
  if (evidence.result !== 'accepted') {
    return false
  }
  const haystack = `${evidence.source} ${evidence.action} ${evidence.detail}`.toLowerCase()
  const taskWords = task.label.toLowerCase().split(/\s+/).filter((word) => word.length > 3)

  return haystack.includes(task.monitor.toLowerCase())
    || taskWords.some((word) => haystack.includes(word))
}

function getScenarioTaskCompletionSource(task: TrainingScenarioTaskDefinition): ScenarioTaskCompletionSource {
  return task.mappedTaskId === 'completeScenario' ? 'Instructor review' : 'Live monitor'
}

function getScenarioTaskValidationMode(task: TrainingScenarioTaskDefinition): ScenarioTaskValidationMode {
  return getScenarioTaskCompletionSource(task) === 'Instructor review' ? 'instructor-review' : 'automatic'
}

function getScenarioTaskCompletionRule(task: TrainingScenarioTaskDefinition) {
  if (task.mappedTaskId === 'completeScenario') {
    return 'Trainer confirms final scenario review.'
  }

  if (task.runtimeOnly) {
    return 'Accepted live OCC event must match this scenario task.'
  }

  if (task.mappedTaskId) {
    return `Automatic scenario task flag: ${task.mappedTaskId}.`
  }

  if (task.evidenceKeywords?.length) {
    return `Accepted evidence must include: ${task.evidenceKeywords.join(', ')}.`
  }

  return 'Accepted live OCC evidence completes this task.'
}

export function getScenarioAssessmentRows(session: OccSessionState): ScenarioAssessmentRow[] {
  const scenarioScore = scoreTrainingScenario(session)
  const stagedTasks = withScenarioTaskStages(scenarioScore.taskResults, session.scenarioMode)

  return stagedTasks.map((task) => {
    const matchingEvidence = session.evidenceLog.filter((evidence) => evidenceMatchesTask(task, evidence))
    const owner = getScenarioTaskOwner(task.monitor)
    const statusLabel = task.complete
      ? session.scenarioMode === 'COMPLETE' ? 'Scored' : 'Verified'
      : 'Open'

    return {
      ...task,
      completionRule: getScenarioTaskCompletionRule(task),
      completionSource: getScenarioTaskCompletionSource(task),
      evidenceCount: matchingEvidence.length,
      latestEvidence: matchingEvidence[0],
      owner,
      scoreContribution: task.complete ? task.weight : 0,
      stageLabel: getScenarioTaskStageLabel(task.stage),
      statusLabel,
      validationMode: getScenarioTaskValidationMode(task),
    }
  })
}

export function getScenarioAssessmentSummary(session: OccSessionState) {
  const rows = getScenarioAssessmentRows(session)
  const criticalRows = rows.filter((row) => row.critical)
  const liveMonitorRows = rows.filter((row) => row.completionSource === 'Live monitor')
  const instructorRows = rows.filter((row) => row.completionSource === 'Instructor review')

  return {
    criticalComplete: criticalRows.filter((row) => row.complete).length,
    criticalTotal: criticalRows.length,
    instructorReviewComplete: instructorRows.filter((row) => row.complete).length,
    instructorReviewTotal: instructorRows.length,
    liveMonitorComplete: liveMonitorRows.filter((row) => row.complete).length,
    liveMonitorTotal: liveMonitorRows.length,
    rows,
  }
}
