import assert from 'node:assert/strict'
import { getScenarioAssessmentRows, getScenarioAssessmentSummary } from '../../src/iosScenarioAssessment'
import { createScenarioEvidence } from '../../src/scenario'
import { createInitialSession } from '../../src/sessionState'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'

{
  const session = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const rows = getScenarioAssessmentRows(session)

  assert.ok(rows.length > 0)
  assert.equal(rows[0].owner, 'Traffic Controller')
  assert.equal(rows[0].statusLabel, 'Open')
  assert.equal(rows[0].scoreContribution, 0)
  assert.equal(rows.some((row) => row.completionSource === 'Live monitor'), true)
  assert.equal(rows.some((row) => row.owner === 'Station Manager'), false)
  assert.equal(rows.some((row) => row.owner === 'Engineer'), false)
}

{
  const session = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const rows = getScenarioAssessmentRows(session)

  assert.deepEqual(rows.map((row) => row.complete), rows.map(() => false))
  assert.equal(rows.some((row) => row.owner === 'Station Manager'), false)
  assert.equal(rows.some((row) => row.owner === 'Engineer'), false)
  assert.equal(rows.filter((row) => row.owner === 'Traffic Controller').length, 3)
  assert.equal(rows.filter((row) => row.owner === 'Instructor').length, 1)
  assert.equal(rows.filter((row) => row.completionSource === 'Live monitor').length, 3)
  assert.equal(rows.filter((row) => row.completionSource === 'Instructor review').length, 1)
  assert.equal(rows.find((row) => row.id === 'review-launch-outcome')?.validationMode, 'instructor-review')
  assert.match(rows.find((row) => row.id === 'set-launch-route')?.completionRule ?? '', /setRoute/)
}

{
  const started = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const session = {
    ...started,
    evidenceLog: [
      createScenarioEvidence('Line Map Train Control', 'Set arrival time', 'accepted', 'Declare NED / RT2D depot destination in Arrival Time'),
    ],
  }
  const rows = getScenarioAssessmentRows(session)
  const destinationRow = rows.find((row) => row.id === 'declare-depot-destination')

  assert.equal(destinationRow?.evidenceCount, 1)
  assert.equal(destinationRow?.latestEvidence?.action, 'Set arrival time')
}

{
  const session = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const summary = getScenarioAssessmentSummary(session)

  assert.equal(summary.rows.length > 0, true)
  assert.equal(summary.criticalTotal > 0, true)
  assert.equal(summary.liveMonitorTotal > 0, true)
  assert.equal(summary.instructorReviewTotal > 0, true)
}
