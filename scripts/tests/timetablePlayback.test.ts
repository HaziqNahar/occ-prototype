import assert from 'node:assert/strict'
import type { TimetableRow } from '../../src/types'
import {
  createTimetablePlaybackPlans,
  createTimetablePlaybackStepOffsets,
  getForwardTimetableDurationSeconds,
  getTimetablePlaybackFirstStepIndex,
  getTimetablePlaybackStepDirection,
  getTimetableRowEndSeconds,
  getTimetableRowSelectedStation,
  getTimetableRowStartSeconds,
  parseTimetableSeconds,
  shouldUseTimetableStationEndTime,
  shouldUseTimetableStationStartTime,
} from '../../src/screens/line-map/timetablePlayback'
import {
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'

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
  const row = timetableRow({
    destinationPoint: 'PGCN',
    destinationTime: '6:33:06',
    originPoint: 'HBFS',
    originTime: '5:56:46',
    run: 'NB',
    stationPoint: 'SKG',
    stationTime: '6:28:01',
  })

  assert.equal(shouldUseTimetableStationStartTime(row), true)
  assert.equal(getTimetableRowStartSeconds(row), parseTimetableSeconds('6:28:01'))
  assert.equal(getTimetableRowEndSeconds(row), parseTimetableSeconds('6:33:06'))
}

{
  const row = timetableRow({
    destinationPoint: 'HBFS',
    destinationTime: '7:11:53',
    originPoint: 'PGCS',
    originTime: '6:35:11',
    run: 'SB',
    stationPoint: 'SKG',
    stationTime: '6:40:32',
  })

  assert.equal(shouldUseTimetableStationEndTime(row), true)
  assert.equal(getTimetableRowStartSeconds(row), parseTimetableSeconds('6:35:11'))
  assert.equal(getTimetableRowEndSeconds(row), parseTimetableSeconds('6:40:32'))
}

{
  const row = timetableRow({
    destinationPoint: 'RT2D',
    destinationTime: '10:20:00',
    originPoint: 'PGC',
    originTime: '10:00:00',
    run: 'SB',
    stationPoint: 'SKG',
    stationTime: '10:05:00',
  })

  assert.equal(shouldUseTimetableStationEndTime(row), false)
  assert.equal(getTimetableRowEndSeconds(row), parseTimetableSeconds('10:20:00'))
}

{
  const plan = {
    service: 'NB',
    steps: SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
  }
  const finalStepIndex = plan.steps.length - 1

  assert.equal(getTimetablePlaybackStepDirection(plan, 0), 'right')
  assert.equal(getTimetablePlaybackStepDirection(plan, Math.floor(finalStepIndex / 2)), 'right')
  assert.equal(getTimetablePlaybackStepDirection(plan, finalStepIndex), 'right')
}

{
  const plan = {
    service: 'SB',
    steps: PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  }
  const finalStepIndex = plan.steps.length - 1

  assert.equal(getTimetablePlaybackStepDirection(plan, 0), 'left')
  assert.equal(getTimetablePlaybackStepDirection(plan, Math.floor(finalStepIndex / 2)), 'left')
  assert.equal(getTimetablePlaybackStepDirection(plan, finalStepIndex), 'left')
}

{
  const row = timetableRow({
    destinationPoint: 'PGCN',
    destinationTime: '6:33:06',
    originPoint: 'HBFS',
    originTime: '5:56:46',
    run: 'NB',
    sched: '1014',
    stationPoint: 'SKG',
    stationTime: '6:28:01',
    train: '342',
  })

  assert.equal(createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 27, 59)).length, 0)
  assert.equal(createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 28, 1)).length, 1)
  assert.equal(createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 33, 7)).length, 0)
}

{
  const row = timetableRow({
    destinationPoint: 'PGL',
    destinationTime: '6:21:57',
    originPoint: 'HBFN',
    originTime: '5:47:50',
    run: 'NB',
    sched: '1010',
    stationPoint: 'SKG',
    stationTime: '6:19:01',
    train: '335',
  })
  const plan = createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 20, 0))[0]

  assert.ok(plan)
  assert.equal(plan.stationRouteId, 'timetable-skg-to-pgl-upper-mainline')
  assert.equal(plan.to, 'PGL')
  assert.equal(plan.steps.at(-1)?.segmentId, 'rail-709')
  assert.deepEqual(plan.platformStops.map((stop) => `${stop.platformCode}:${stop.stepIndex}:${stop.track}`), [
    'SKG:0:NB',
    'PGL:7:NB',
  ])
}

{
  const row = timetableRow({
    destinationPoint: 'HBFS',
    destinationTime: '7:11:53',
    originPoint: 'PGCS',
    originTime: '6:35:11',
    run: 'SB',
    sched: '2015',
    stationPoint: 'SKG',
    stationTime: '6:40:32',
    train: '342',
  })

  assert.equal(createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 35, 10)).length, 0)
  assert.equal(createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 35, 11)).length, 1)
  assert.equal(createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 40, 33)).length, 0)
}

{
  const row = timetableRow({
    destinationPoint: 'HBF',
    destinationTime: '7:11:53',
    originPoint: 'PGLS',
    originTime: '6:36:30',
    run: 'SB',
    sched: '2015',
    stationPoint: 'SKG',
    stationTime: '6:40:32',
    train: '342',
  })
  const plan = createTimetablePlaybackPlans([row], new Date(2026, 0, 1, 6, 37, 0))[0]

  assert.ok(plan)
  assert.equal(plan.stationRouteId, 'timetable-pgl-to-skg-lower-mainline')
  assert.equal(plan.from, 'PGL')
  assert.equal(plan.steps[0]?.segmentId, 'rail-710')
  assert.equal(plan.steps.at(-1)?.segmentId, 'rail-618')
  assert.deepEqual(plan.platformStops.map((stop) => `${stop.platformCode}:${stop.stepIndex}:${stop.track}`), [
    'PGL:0:SB',
    'SKG:8:SB',
  ])
}

{
  const plan = createTimetablePlaybackPlans(
    [timetableRow()],
    new Date(2026, 0, 1, 10, 6, 0),
  )[0]

  assert.ok(plan)
  assert.equal(plan.trainId, '312')
  assert.equal(plan.panelCode, 'SKG')
  assert.equal(plan.stationRouteId, 'timetable-pgc-skg-to-rt2-depot')
  assert.equal(plan.from, 'PGC')
  assert.deepEqual(plan.via, ['SKG'])
  assert.equal(plan.to, 'RT2_DEPOT')
  assert.equal(plan.steps.length > 0, true)
  assert.equal(
    plan.steps.some((step) => step.segmentId.startsWith('rail-P') || step.segmentId === 'rail-1115'),
    false,
    'timetable playback route must not include P-guide rails or rail-1115',
  )
}

{
  const plans = createTimetablePlaybackPlans(
    [timetableRow({
      destinationPoint: 'PGCN',
      originPoint: 'HBFN',
      run: 'NB',
      stationPoint: 'HBFN',
    })],
    new Date(2026, 0, 1, 10, 6, 0),
  )

  assert.equal(plans.length, 0, 'timetable rows without a station route must not use fallback playback')
}
