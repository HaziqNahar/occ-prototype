import assert from 'node:assert/strict'
import { acknowledgesScenarioAlarm } from '../../src/alarmAcknowledgement'
import { loadScenario } from '../../src/session-commands/trainerCommands'
import { createInitialSession } from '../../src/sessionState'

const options = {
  duration: '06:00',
  incident: 'Door fault',
  kind: 'DOOR_FAULT',
  timetableName: 'NEL_OTES_Weekday_03',
  trainingMode: 'PRACTICE',
} as const
const initial = createInitialSession()
const first = loadScenario(initial, { ...options, faultLocation: { station: 'SKG', track: 'NB', trainId: '321' } }).session
const second = loadScenario(first, { ...options, faultLocation: { station: 'PGL', track: 'SB', trainId: '353' } }).session

// The first run's train is placed and held at SKG.
const firstTrain = first.trains.find((train) => train.id === '321')!
assert.equal(firstTrain.status, 'HOLD')
assert.equal(firstTrain.lineMapVisible, true)

// Restarting puts it back where it normally is; only the new train is placed.
assert.deepEqual(
  second.trains.find((train) => train.id === '321'),
  initial.trains.find((train) => train.id === '321'),
)
assert.equal(second.trains.find((train) => train.id === '353')?.status, 'HOLD')

// Only the new run's incident alarm is in the list, and the old one cannot earn credit.
const incidentRows = second.alarmSummaryRows.filter((row) => row.scenarioAlarm)
assert.equal(incidentRows.length, 1)
assert.match(incidentRows[0].asset, /353/)
assert.equal(second.alarmSummaryRows.some((row) => row.asset.includes('/321/')), false)
assert.equal(acknowledgesScenarioAlarm(second.alarmSummaryRows, new Set([second.alarmSummaryRows.indexOf(incidentRows[0])])), true)
