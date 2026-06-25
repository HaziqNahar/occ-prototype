import assert from 'node:assert/strict'
import type { TimetableRow } from '../../src/types'
import {
  createTimetableRouteDiagnostics,
  createTimetableRouteDiagnosticsReport,
  createTimetableRouteDiagnosticsSummary,
} from '../../src/screens/line-map/timetableDiagnostics'

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

{
  const diagnostics = createTimetableRouteDiagnostics({
    now: new Date(2026, 0, 1, 10, 6, 0),
    routeControlModes: {},
    rows: [timetableRow()],
  })

  assert.equal(diagnostics.length, 1)
  assert.equal(diagnostics[0].trainId, '312')
  assert.equal(diagnostics[0].routeId, 'timetable-pgc-skg-to-rt2-depot')
  assert.equal(diagnostics[0].routePath, 'PGC via SKG -> RT2_DEPOT')
  assert.equal(diagnostics[0].routeMode, 'OCCA')
  assert.equal(diagnostics[0].status, 'scheduled')
  assert.equal(diagnostics[0].firstRail, 'rail-1109')
  assert.equal(diagnostics[0].lastRail, 'rail-652')
}

{
  const diagnostics = createTimetableRouteDiagnostics({
    now: new Date(2026, 0, 1, 10, 6, 0),
    routeControlModes: { SKG: 'OCCM' },
    rows: [timetableRow()],
  })
  const summary = createTimetableRouteDiagnosticsSummary(diagnostics)

  assert.equal(diagnostics[0].routeMode, 'OCCM')
  assert.equal(diagnostics[0].status, 'blocked-manual')
  assert.deepEqual(summary, {
    active: 1,
    blockedConflict: 0,
    blockedManual: 1,
    scheduled: 0,
    text: 'ROUTES 0/1 AUTO / 1 MANUAL BLOCKED',
  })
}

{
  const diagnostics = createTimetableRouteDiagnostics({
    now: new Date(2026, 0, 1, 10, 6, 0),
    routeControlModes: {},
    rows: [timetableRow()],
  })
  const report = createTimetableRouteDiagnosticsReport(diagnostics)

  assert.match(report, /Train 312/)
  assert.match(report, /timetable-pgc-skg-to-rt2-depot/)
  assert.match(report, /PGC via SKG -> RT2_DEPOT/)
}
