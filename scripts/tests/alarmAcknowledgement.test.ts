import assert from 'node:assert/strict'
import {
  acknowledgeAlarmRows,
  acknowledgesScenarioAlarm,
  isScenarioAlarmPending,
} from '../../src/alarmAcknowledgement'
import { createInitialSession } from '../../src/sessionState'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'
import { applySessionCommand } from '../../src/session-commands/applySessionCommand'
import { getAlarmRowKey } from '../../src/session-commands/types'

const armed = createTrainingScenarioStartSession(createInitialSession(), 'PSD_FAULT', 'Single PSD failed to close')
const rows = armed.alarmSummaryRows
const faultIndex = rows.findIndex((row) => row.scenarioAlarm)
const armedNoticeIndex = rows.findIndex((row) => row.description.startsWith('IOS scenario armed'))

// Arming tags exactly one row: the incident alarm.
assert.equal(rows.filter((row) => row.scenarioAlarm).length, 1)
assert.equal(rows[faultIndex].description, 'PSD: BGK NB Door 04 Failed to Close')
assert.equal(isScenarioAlarmPending(rows), true)

// Acknowledging a different row earns no credit; the incident alarm does.
assert.equal(acknowledgesScenarioAlarm(rows, new Set([armedNoticeIndex])), false)
assert.equal(acknowledgesScenarioAlarm(rows, new Set([faultIndex])), true)
assert.equal(acknowledgesScenarioAlarm(rows, new Set(rows.map((_, index) => index))), true)

{
  const otherAcknowledged = acknowledgeAlarmRows(rows, new Set([armedNoticeIndex]))

  assert.equal(otherAcknowledged[armedNoticeIndex].acknowledgedAt !== undefined, true)
  assert.equal(otherAcknowledged[armedNoticeIndex].tone, 'grey')
  assert.equal(otherAcknowledged[faultIndex].acknowledgedAt, undefined, 'only the chosen row is acknowledged')
  assert.equal(isScenarioAlarmPending(otherAcknowledged), true)
}

{
  const acknowledged = acknowledgeAlarmRows(rows, new Set([faultIndex]), { keepRedTone: true })

  assert.equal(isScenarioAlarmPending(acknowledged), false)
  assert.equal(acknowledged[faultIndex].tone, 'red')
  // A second acknowledgement of the same alarm is not scored again.
  assert.equal(acknowledgesScenarioAlarm(acknowledged, new Set([faultIndex])), false)
}

// Sessions from before tagging keep the old rule: any acknowledgement counts.
assert.equal(acknowledgesScenarioAlarm(createInitialSession().alarmSummaryRows, new Set([0])), true)

// The server acknowledges the rows the monitor names and scores only the incident alarm.
{
  const actor = { name: 'Alex Tan', role: 'trainee' as const }
  const other = applySessionCommand(armed, { rowKeys: [getAlarmRowKey(rows[armedNoticeIndex])], type: 'ACK_ALARMS' }, { actor })

  assert.equal(other.accepted, true)
  assert.equal(other.session.scenarioTasks.ackAlarm, false)
  assert.ok(other.session.alarmSummaryRows[armedNoticeIndex].acknowledgedAt)

  const incident = applySessionCommand(armed, { rowKeys: [getAlarmRowKey(rows[faultIndex])], type: 'ACK_ALARMS' }, { actor })

  assert.equal(incident.accepted, true)
  assert.equal(incident.session.scenarioTasks.ackAlarm, true)
  assert.equal(isScenarioAlarmPending(incident.session.alarmSummaryRows), false)
}
