import assert from 'node:assert/strict'
import { createRouteAuditReport } from '../audit-routes.ts'

const report = createRouteAuditReport()

assert.equal(report.includes('Validation: OK'), true)
assert.equal(report.includes('PGC via SKG -> RT2_DEPOT'), true)
assert.equal(report.includes('SKG -> PGC'), true)
assert.equal(report.includes('S700 Route R700_610'), true)
assert.equal(report.includes('rail-P700 -> rail-P701'), true)
assert.equal(report.includes('timetable:timetable-pgc-skg-to-rt2-depot'), true)
assert.equal(report.includes('S709 Route'), false)
