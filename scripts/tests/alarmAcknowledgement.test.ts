import assert from 'node:assert/strict'
import {
  acknowledgeAlarmRows,
  acknowledgesScenarioAlarm,
  isScenarioAlarmPending,
} from '../../src/alarmAcknowledgement'
import { createInitialSession } from '../../src/sessionState'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'
import { createScenarioActionEngine } from '../../server/scenarioActionEngine.mjs'

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

// The backend scores ACK_ALARM but leaves the alarm rows as the monitor set them.
{
  const engine = createScenarioActionEngine({
    applyAcceptedTask: (session: typeof armed, taskId: string) => ({
      ...session,
      scenarioTasks: { ...session.scenarioTasks, [taskId]: true },
    }),
    createMonitorEvent: () => ({}),
    createSummaryEvent: () => ({}),
    getScenarioTaskBlocker: () => '',
    rejectScenarioAction: (session: typeof armed) => session,
    updateLineMapRouteState: (lineMap: unknown) => lineMap,
  })
  const result = engine(armed, { source: 'Monitor 01 Alarms', trainId: '317', type: 'ACK_ALARM' })

  assert.equal(result.accepted, true)
  assert.equal(result.session.scenarioTasks.ackAlarm, true)
  assert.deepEqual(result.session.alarmSummaryRows, rows)
}
