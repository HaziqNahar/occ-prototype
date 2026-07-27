import {
  getScenarioAssessmentRows,
  getScenarioAssessmentSummary,
  type ScenarioAssessmentRow,
} from './iosScenarioAssessment'
import {
  categoriseScenarioEvidence,
  groupScenarioEvidenceByCategory,
  type CategorisedScenarioEvidence,
} from './iosEvidenceTrail'
import {
  getActiveTrainingScenarioTargetTrainId,
  getTrainingScenarioDefinition,
  scoreTrainingScenario,
} from './trainingScenarios'
import type { OccSessionState } from './types'

type ScenarioReportTimelineEntry = {
  categoryLabel: string
  detail: string
  id: string
  result: CategorisedScenarioEvidence['result']
  source: string
  time: string
  title: string
}

function parseTime(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const time = Date.parse(value)
  return Number.isFinite(time) ? time : undefined
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  if (minutes <= 0) {
    return `${remainingSeconds}s`
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
}

function getScenarioDurationSeconds(session: OccSessionState) {
  const startedAt = parseTime(session.assessmentMetrics.startedAt)
    ?? parseTime(session.sessionMeta.startedAt)
    ?? parseTime(session.sessionMeta.createdAt)
  const completedAt = parseTime(session.assessmentMetrics.completedAt)
    ?? parseTime(session.sessionMeta.completedAt)
  const fallbackEnd = Number.isFinite(session.updatedAt) ? session.updatedAt : Date.now()
  const endedAt = completedAt ?? fallbackEnd

  if (!startedAt || endedAt < startedAt) {
    return 0
  }

  return Math.round((endedAt - startedAt) / 1000)
}

function buildEvidenceTimeline(evidenceLog: OccSessionState['evidenceLog']): ScenarioReportTimelineEntry[] {
  return categoriseScenarioEvidence(evidenceLog)
    .slice()
    .reverse()
    .map((evidence) => ({
      categoryLabel: evidence.categoryLabel,
      detail: evidence.detail,
      id: evidence.id,
      result: evidence.result,
      source: evidence.source,
      time: evidence.time,
      title: evidence.action,
    }))
}

function buildTaskMetric(task: ScenarioAssessmentRow) {
  return {
    complete: task.complete,
    completionRule: task.completionRule,
    completionSource: task.completionSource,
    critical: task.critical,
    evidenceCount: task.evidenceCount,
    id: task.id,
    label: task.label,
    monitor: task.monitor,
    owner: task.owner,
    scoreContribution: task.scoreContribution,
    stage: task.stageLabel,
    status: task.statusLabel,
    validationMode: task.validationMode,
    weight: task.weight,
  }
}

export function buildScenarioReport(session: OccSessionState) {
  const scenarioScore = scoreTrainingScenario(session)
  const assessmentRows = getScenarioAssessmentRows(session)
  const assessmentSummary = getScenarioAssessmentSummary(session)
  const categorisedEvidenceLog = categoriseScenarioEvidence(session.evidenceLog)
  const evidenceGroups = groupScenarioEvidenceByCategory(session.evidenceLog)
  const targetTrainId = getActiveTrainingScenarioTargetTrainId(session)
  const selectedTrain = session.trains.find((train) => train.id === session.selectedTrainId) ?? session.trains[0]
  const targetTrain = session.trains.find((train) => train.id === targetTrainId) ?? selectedTrain
  const targetTimetable = session.timetableRows.find((row) => row.train === targetTrainId)
  const completedTaskMetrics = Object.values(session.assessmentMetrics.tasks ?? {}).filter((task) => task.completedAt)
  const averageResponseSeconds = completedTaskMetrics.length
    ? Math.round(completedTaskMetrics.reduce((total, task) => total + (task.responseSeconds ?? 0), 0) / completedTaskMetrics.length)
    : 0
  const durationSeconds = getScenarioDurationSeconds(session)
  const completedTasks = assessmentRows.filter((task) => task.complete)
  const missedTasks = assessmentRows.filter((task) => !task.complete)
  const rejectedEvidenceCount = session.evidenceLog.filter((evidence) => evidence.result === 'rejected').length
  const timeline = buildEvidenceTimeline(session.evidenceLog)
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)

  return {
    archiveSummary: {
      averageResponseSeconds,
      completedTasks: scenarioScore.completedTasks,
      durationLabel: formatDuration(durationSeconds),
      durationSeconds,
      evidenceCount: session.evidenceLog.length,
      lateTasks: session.assessmentMetrics.lateTasks,
      missedTasks: missedTasks.length,
      onTimeTasks: session.assessmentMetrics.onTimeTasks,
      rejectedActions: scenarioScore.rejectedActions,
      rejectedEvidenceCount,
      result: scenarioScore.result,
      scenarioId: session.activeScenario.id,
      scenarioKind: definition.kind,
      scenarioTitle: session.activeScenario.title,
      score: scenarioScore.score,
      selectedTrainId: selectedTrain?.id,
      targetTrainId: targetTrain?.id,
      taskMetrics: assessmentRows.map(buildTaskMetric),
      timeline: timeline.slice(-50),
      totalTasks: scenarioScore.totalTasks,
      traineeEvidenceCount: evidenceGroups.trainee.length,
    },
    assessmentRows,
    assessmentSummary,
    averageResponseSeconds,
    completedTasks,
    durationLabel: formatDuration(durationSeconds),
    durationSeconds,
    categorisedEvidenceLog,
    evidenceGroups,
    missedTasks,
    rejectedActionCount: scenarioScore.rejectedActions,
    resultLabel: scenarioScore.result,
    scenarioKind: definition.kind,
    scenarioScore,
    selectedTrain,
    targetTimetable,
    targetTrain,
    timeline,
  }
}
