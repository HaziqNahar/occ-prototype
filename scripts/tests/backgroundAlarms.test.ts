import assert from 'node:assert/strict'
import { ALARM_SUMMARY_ROW_LIMIT, isScenarioAlarmPending } from '../../src/alarmAcknowledgement'
import { addBackgroundAlarm, BACKGROUND_ALARM_INTERVAL_MS, getNextBackgroundAlarmDelayMs } from '../../src/backgroundAlarms'
import { createInitialSession, getAlarmSummaryCounts } from '../../src/sessionState'
import { getActiveTrainingScenarioTargetTrainId } from '../../src/training-scenarios/targetSelection'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'

const armed = createTrainingScenarioStartSession(createInitialSession(), 'PSD_FAULT', 'Single PSD failed to close')
const targetTrainId = getActiveTrainingScenarioTargetTrainId(armed)
const before = getAlarmSummaryCounts(armed.alarmSummaryRows)

// Each background alarm arrives unacknowledged and grey, and is not the incident.
{
  const next = addBackgroundAlarm(armed, () => 0.5)
  const [row] = next.alarmSummaryRows

  assert.equal(row.ack, 'N')
  assert.equal(row.tone, 'grey')
  assert.equal(row.scenarioAlarm, undefined)
  assert.deepEqual(getAlarmSummaryCounts(next.alarmSummaryRows), {
    notAcknowledged: before.notAcknowledged + 1,
    total: before.total + 1,
  })
}

// Every kind of alarm can come up, and none names the scenario's train.
{
  const descriptions = new Set<string>()

  for (let index = 0; index < 50; index += 1) {
    const value = index / 50
    const row = addBackgroundAlarm(armed, () => value).alarmSummaryRows[0]

    descriptions.add(row.description.replace(/^Train \d+: /, ''))
    assert.ok(!targetTrainId || !row.asset.startsWith(`EMU/${targetTrainId}/`))
  }

  assert.ok(descriptions.has('DMS:HMI Status'))
  assert.ok([...descriptions].some((description) => description.startsWith('Route abandoned: R')))
}

// A long run fills the list, but the incident alarm waiting for acknowledgement stays.
{
  let session = armed

  for (let index = 0; index < 30; index += 1) {
    session = addBackgroundAlarm(session)
  }

  assert.equal(session.alarmSummaryRows.length, ALARM_SUMMARY_ROW_LIMIT)
  assert.equal(isScenarioAlarmPending(session.alarmSummaryRows), true)
}

// Alarms come every 1.5 to 3 minutes.
assert.equal(getNextBackgroundAlarmDelayMs(() => 0), BACKGROUND_ALARM_INTERVAL_MS.min)
assert.equal(getNextBackgroundAlarmDelayMs(() => 1), BACKGROUND_ALARM_INTERVAL_MS.max)
