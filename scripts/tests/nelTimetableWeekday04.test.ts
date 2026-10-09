import assert from 'node:assert/strict'
import {
  createNelTimetableRows,
  createNelTrainRosterItems,
  normalizeNelTimetableName,
} from '../../src/data/nelTimetable'
import { resolveTimetableRailPath } from '../../src/screens/line-map/timetablePathResolver'
import {
  createInitialSession,
  createResetSessionState,
  normalizeClientSession,
} from '../../src/sessionState'
import { getEligibleLaunchScenarioTargetOptions } from '../../src/training-scenarios/targetSelection'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'

const weekday04Rows = createNelTimetableRows({ timetable: 'NEL_OTES_Weekday_04' })

// 334 NB + 327 SB scheduled trips, 1 OTPN-PGC trip, 51 insertions, 60 withdrawals.
assert.equal(weekday04Rows.length, 773)
assert.equal(createNelTrainRosterItems({ timetable: 'NEL_OTES_Weekday_04' }).length, 62)
assert.deepEqual(
  createNelTimetableRows({ focus: 'first-service-pair', timetable: 'NEL_OTES_Weekday_04' })
    .filter((row) => row.run === 'NB')
    .map((row) => row.train),
  ['303', '311', '314', '316', '321', '324', '327', '329', '332', '335', '338', '340', '343', '344'],
)
assert.deepEqual(
  weekday04Rows.find((row) => row.sched === '1000'),
  {
    destinationPoint: 'PGCN',
    destinationTime: '5:38:13',
    dwell: '0:35',
    originPoint: 'SKG',
    originTime: '5:32:45',
    revision: '',
    run: 'NB',
    sched: '1000',
    selectedStation: 'SKG',
    speed: '',
    state: 'I>',
    stationPoint: 'SKG',
    stationTime: '5:33:20',
    train: '303',
  },
)
assert.equal(weekday04Rows.filter((row) => !resolveTimetableRailPath(row)).length, 0)

// Weekday_03 remains the default for existing sessions.
assert.equal(createNelTimetableRows().length, 759)
assert.equal(normalizeNelTimetableName(undefined), 'NEL_OTES_Weekday_03')
assert.equal(normalizeNelTimetableName('NEL_OTES_Weekday_99'), 'NEL_OTES_Weekday_03')

{
  const session = createInitialSession('PRACTICE', 'NEL_OTES_Weekday_04')

  assert.equal(session.timetableName, 'NEL_OTES_Weekday_04')
  assert.equal(session.timetableRows.length, 773)
  assert.equal(session.trains.length, 62)
  assert.equal(getEligibleLaunchScenarioTargetOptions(session).length > 0, true)

  const doorFault = createTrainingScenarioStartSession(session, 'DOOR_FAULT')

  assert.equal(doorFault.timetableName, 'NEL_OTES_Weekday_04')
  assert.equal(doorFault.trains.some((train) => train.id === doorFault.activeScenario.targetTrainId), true)
}

{
  const reset = createResetSessionState('ASSESSMENT', 1, 2, 'NEL_OTES_Weekday_04')

  assert.equal(reset.timetableName, 'NEL_OTES_Weekday_04')
  assert.equal(reset.timetableRows.length, 773)
  assert.equal(reset.scenarioNotice.tone, 'success')
}

{
  const weekday04 = createInitialSession('PRACTICE', 'NEL_OTES_Weekday_04')
  const normalized = normalizeClientSession(weekday04)

  assert.equal(normalized.timetableName, 'NEL_OTES_Weekday_04')
  assert.equal(normalized.timetableRows.length, 773)

  // Sessions stored before timetable selection existed fall back to Weekday_03.
  const legacy: Partial<typeof weekday04> = { ...createInitialSession() }
  delete legacy.timetableName
  const legacyNormalized = normalizeClientSession(legacy as typeof weekday04)

  assert.equal(legacyNormalized.timetableName, 'NEL_OTES_Weekday_03')
  assert.equal(legacyNormalized.timetableRows.length, 759)
}
