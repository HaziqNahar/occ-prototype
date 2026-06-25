import assert from 'node:assert/strict'
import type { TimetableRow } from '../../src/types'
import {
  DEFAULT_TIMETABLE_CLOCK_STATE,
  formatTimetableClockTime,
  getTimetableClockNow,
  scaleTimetablePlaybackPlansForClock,
  startTimetablePlaybackClock,
} from '../../src/timetableClockState'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'

function timetableRow(overrides: Partial<TimetableRow> = {}): TimetableRow {
  return {
    destinationPoint: 'PGCN',
    destinationTime: '05:40:00',
    dwell: '',
    originPoint: 'HBFS',
    originTime: '05:00:00',
    revision: '',
    run: 'NB',
    sched: '1000',
    selectedStation: 'SKG',
    speed: '',
    state: '',
    stationPoint: 'SKG',
    stationTime: '05:33:20',
    train: '301',
    ...overrides,
  }
}

{
  const now = new Date(2026, 0, 1, 17, 20, 0)

  assert.equal(getTimetableClockNow(DEFAULT_TIMETABLE_CLOCK_STATE, now).getTime(), now.getTime())
}

{
  const systemNow = new Date(2026, 0, 1, 17, 20, 0)
  const clock = startTimetablePlaybackClock([timetableRow()], systemNow)

  assert.equal(formatTimetableClockTime(clock, systemNow), '05:33:20')
  assert.equal(formatTimetableClockTime(clock, new Date(systemNow.getTime() + 3000)), '05:34:20')
}

{
  const systemNow = new Date(2026, 0, 1, 17, 20, 0)
  const clock = startTimetablePlaybackClock([
    timetableRow({ sched: '1001', stationTime: '05:40:00', train: '302' }),
    timetableRow({ sched: '1000', stationTime: '05:33:20', train: '301' }),
  ], systemNow)

  assert.equal(formatTimetableClockTime(clock, systemNow), '05:33:20')
}

{
  const plan: TimetablePlaybackPlan = {
    endSeconds: 200,
    firstStepIndex: 0,
    from: 'SKG',
    panelCode: 'SKG',
    platformStops: [],
    routeLabel: 'SKG to PGC',
    routeSteps: [
      { point: { x: 0, y: 0 }, segmentId: 'rail-1' },
      { point: { x: 10, y: 0 }, segmentId: 'rail-2' },
      { point: { x: 20, y: 0 }, segmentId: 'rail-3' },
    ],
    scheduleNumber: '1000',
    service: 'NB',
    signalRouteRefs: [],
    startSeconds: 100,
    stationRouteId: 'test-route',
    stepOffsetsMs: [0, 20000, 40000],
    stepSignedOffsetsMs: [-10000, 0, 20000],
    steps: [
      { point: { x: 0, y: 0 }, segmentId: 'rail-1' },
      { point: { x: 10, y: 0 }, segmentId: 'rail-2' },
      { point: { x: 20, y: 0 }, segmentId: 'rail-3' },
    ],
    to: 'PGC',
  }
  const scaled = scaleTimetablePlaybackPlansForClock([plan], {
    mode: 'PLAYBACK',
    playbackSpeed: 20,
    playbackStartEpochMs: 0,
    playbackStartSeconds: 0,
  })[0]

  assert.deepEqual(scaled.stepOffsetsMs, [0, 1000, 2000])
  assert.deepEqual(scaled.stepSignedOffsetsMs, [-500, 0, 1000])
}
