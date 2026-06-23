import assert from 'node:assert/strict'
import { createTimetableRouteAuditReport } from '../audit-timetable-routes.ts'

const report = createTimetableRouteAuditReport()

assert.equal(report.includes('Rows without station route: 0'), true)
assert.equal(report.includes('SKG -> PGC'), true)
assert.equal(report.includes('PGC -> SKG'), true)
assert.equal(report.includes('Unused station route definitions: 1'), true)
assert.equal(report.includes('PGC via SKG -> RT2_DEPOT'), true)
assert.equal(report.includes('timetable-pgc-to-selected-skg-lower-mainline'), false)
