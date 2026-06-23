import assert from 'node:assert/strict'
import { createInitialSession } from '../../src/sessionState'
import {
  createAllowedTimetablePlaybackPlans,
  createTimetableMovementAuthorities,
} from '../../src/screens/line-map/timetableMovementAuthority'
import type { OccSessionState, TimetableRow } from '../../src/types'

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

function sessionWithRows(rows: TimetableRow[]): OccSessionState {
  return {
    ...createInitialSession(),
    timetableRows: rows,
  }
}

{
  const session = sessionWithRows([timetableRow()])
  const [authority] = createTimetableMovementAuthorities(session, {}, new Date(2026, 0, 1, 10, 6, 0))

  assert.ok(authority)
  assert.equal(authority.allowed, true)
  assert.equal(authority.blockedReason, undefined)
  assert.equal(authority.trainId, '312')
  assert.equal(authority.scheduleNumber, '001')
  assert.equal(authority.stationRouteId, 'timetable-pgc-skg-to-rt2-depot')
  assert.equal(authority.routeMode, 'OCCA')
  assert.equal(authority.panelCode, 'SKG')
  assert.equal(authority.from, 'PGC')
  assert.equal(authority.to, 'RT2_DEPOT')
  assert.deepEqual(authority.via, ['SKG'])
  assert.equal(authority.firstRail, 'rail-1109')
  assert.equal(authority.lastRail, 'rail-652')
  assert.equal(authority.currentRail, authority.plan.steps[authority.currentStepIndex].segmentId)
  assert.equal(authority.nextRail, authority.plan.steps[authority.nextStepIndex ?? authority.currentStepIndex].segmentId)
  assert.deepEqual(createAllowedTimetablePlaybackPlans(session, {}, new Date(2026, 0, 1, 10, 6, 0)), [authority.plan])
}

{
  const session = sessionWithRows([timetableRow()])
  const [authority] = createTimetableMovementAuthorities(session, { SKG: 'OCCM' }, new Date(2026, 0, 1, 10, 6, 0))

  assert.ok(authority)
  assert.equal(authority.allowed, false)
  assert.equal(authority.routeMode, 'OCCM')
  assert.equal(authority.blockedReason, 'SKG route mode is OCCM/manual')
  assert.deepEqual(createAllowedTimetablePlaybackPlans(session, { SKG: 'OCCM' }, new Date(2026, 0, 1, 10, 6, 0)), [])
}
