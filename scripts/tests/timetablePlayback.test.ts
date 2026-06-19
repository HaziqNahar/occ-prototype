import assert from 'node:assert/strict'
import type { TimetableRow } from '../../src/types'
import {
  createTimetablePlaybackPlans,
  createTimetablePlaybackStepOffsets,
  getForwardTimetableDurationSeconds,
  getTimetablePlaybackFirstStepIndex,
  getTimetableRowSelectedStation,
  parseTimetableSeconds,
} from '../../src/screens/line-map/timetablePlayback'

function timetableRow(overrides: Partial<TimetableRow> = {}): TimetableRow {
  return {
    state: 'RUN',
    train: '312',
    sched: '001',
    originPoint: 'PGC',
    originTime: '10:00:00',
    selectedStation: '',
    stationPoint: 'SKG',
    stationTime: '10:05:00',
    dwell: '',
    run: 'SB',
    destinationPoint: 'RT2D',
    destinationTime: '10:20:00',
    revision: '',
    speed: '',
    ...overrides,
  }
}

assert.equal(parseTimetableSeconds('01:02:03'), 3723)
assert.equal(parseTimetableSeconds('bad'), undefined)
assert.equal(getForwardTimetableDurationSeconds((23 * 3600) + (50 * 60), 10 * 60), 20 * 60)

assert.equal(
  getTimetablePlaybackFirstStepIndex(100, 200, 150, 5),
  2,
)
assert.deepEqual(
  createTimetablePlaybackStepOffsets(100, 200, 100, 3),
  [0, 50000, 100000],
)

assert.equal(getTimetableRowSelectedStation(timetableRow({ selectedStation: 'BNK' })), 'BNK')
assert.equal(getTimetableRowSelectedStation(timetableRow({ stationPoint: 'SKGS' })), 'SKG')
assert.equal(getTimetableRowSelectedStation(timetableRow({ stationPoint: '', originPoint: '' })), 'SKG')

{
  const plan = createTimetablePlaybackPlans(
    [timetableRow()],
    new Date(2026, 0, 1, 10, 6, 0),
  )[0]

  assert.ok(plan)
  assert.equal(plan.trainId, '312')
  assert.equal(plan.panelCode, 'SKG')
  assert.equal(plan.steps.length > 0, true)
  assert.equal(
    plan.steps.some((step) => step.segmentId.startsWith('rail-P') || step.segmentId === 'rail-1115'),
    false,
    'timetable playback route must not include P-guide rails or rail-1115',
  )
}
