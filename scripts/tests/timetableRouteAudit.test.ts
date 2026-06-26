import assert from 'node:assert/strict'
import { createTimetableRouteAudit, createTimetableRouteAuditReport } from '../audit-timetable-routes.ts'

const audit = createTimetableRouteAudit()
const coverageCountsByRouteId = new Map(audit.coverages.map((coverage) => [
  coverage.path.id,
  coverage.rowCount,
]))

const report = createTimetableRouteAuditReport()

assert.equal(audit.rows.length, 759)
assert.equal(audit.resolvedRows.length, 759)
assert.equal(audit.unresolvedRows.length, 0)
assert.equal(coverageCountsByRouteId.get('timetable-skg-to-pgc-upper-mainline'), 50)
assert.equal(coverageCountsByRouteId.get('timetable-skg-through-to-pgc-upper-mainline'), 327)
assert.equal(coverageCountsByRouteId.get('timetable-skg-through-to-pgl-upper-mainline'), 2)
assert.equal(coverageCountsByRouteId.get('timetable-pgc-to-skg-lower-mainline'), 380)
assert.deepEqual(audit.unusedRoutePaths.map((routePath) => routePath.id), [
  'timetable-pgc-skg-to-rt2-depot',
  'timetable-skg-to-pgl-upper-mainline',
  'timetable-pgl-to-skg-lower-mainline',
])
assert.equal(report.includes('Rows without station route: 0'), true)
assert.equal(report.includes('SKG -> PGC'), true)
assert.equal(report.includes('SKG -> PGL'), true)
assert.equal(report.includes('PGC -> SKG'), true)
assert.equal(report.includes('Unused station route definitions: 3'), true)
assert.equal(report.includes('PGC via SKG -> RT2_DEPOT'), true)
assert.equal(report.includes('timetable-pgc-to-selected-skg-lower-mainline'), false)
