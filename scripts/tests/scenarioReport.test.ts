import assert from 'node:assert/strict'
import { buildScenarioReport } from '../../src/scenarioReport'
import { createInitialSession } from '../../src/sessionState'
import {
  completeTrainingScenarioTask,
  createTrainingScenarioStartSession,
} from '../../src/trainingScenarios'

{
  const session = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const report = buildScenarioReport(session)

  assert.equal(report.scenarioKind, 'TRAIN_LAUNCH')
  assert.equal(report.completedTasks.length, 0)
  assert.equal(report.missedTasks.length, 6)
  assert.equal(report.archiveSummary.totalTasks, 6)
  assert.equal(report.archiveSummary.taskMetrics.length, 6)
  assert.equal(report.archiveSummary.taskMetrics.some((task) => task.owner === 'Engineer'), false)
  assert.equal(report.archiveSummary.taskMetrics.filter((task) => task.completionSource === 'Live monitor').length, 5)
  assert.equal(report.archiveSummary.taskMetrics.filter((task) => task.completionSource === 'Instructor review').length, 1)
}

{
  const started = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const completed = completeTrainingScenarioTask(started, 'selectTrain', 'Launch train selected', 'Line Map')
  assert.equal(completed.allowed, true)
  const session = completed.next
  const report = buildScenarioReport(session)

  assert.equal(report.completedTasks.length, 1)
  assert.equal(report.missedTasks.length, 5)
  assert.equal(report.archiveSummary.completedTasks, 1)
  assert.equal(report.archiveSummary.missedTasks, 5)
  assert.equal(report.archiveSummary.taskMetrics.find((task) => task.id === 'select-launch-train')?.complete, true)
}
