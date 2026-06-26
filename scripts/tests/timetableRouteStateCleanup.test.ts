import assert from 'node:assert/strict'
import type { LineMapRouteSegmentStatus, LineMapRuntimeState } from '../../src/types'
import {
  clearTimetableGuideRouteState,
  isTimetableIneligibleGuideRailId,
} from '../../src/screens/line-map/timetableRouteStateCleanup'

function lineMap(routeSegments: LineMapRuntimeState['routeSegments'] = {}): LineMapRuntimeState {
  return {
    layoutVersion: 10,
    routeSegments,
  }
}

function routeState(
  segmentId: string,
  status: LineMapRouteSegmentStatus,
  trainId: string,
) {
  return {
    segmentId,
    status,
    trainId,
    updatedAt: 1,
  }
}

assert.equal(isTimetableIneligibleGuideRailId('rail-P615'), true)
assert.equal(isTimetableIneligibleGuideRailId('rail-P609'), false)
assert.equal(isTimetableIneligibleGuideRailId('rail-P611'), false)
assert.equal(isTimetableIneligibleGuideRailId('rail-1115'), true)
assert.equal(isTimetableIneligibleGuideRailId('rail-1107-to-1115-background'), true)
assert.equal(isTimetableIneligibleGuideRailId('rail-617'), false)

{
  const map = lineMap({
    'rail-P615': routeState('rail-P615', 'SET', '314'),
    'rail-P611': routeState('rail-P611', 'DISPATCHED', '314'),
    'rail-P609': routeState('rail-P609', 'UNSET', '314'),
    'rail-1115': routeState('rail-1115', 'SET', '314'),
    'rail-617': routeState('rail-617', 'DISPATCHED', '314'),
    'rail-P610': routeState('rail-P610', 'SET', '312'),
  })
  const cleaned = clearTimetableGuideRouteState(map, new Set(['314']))

  assert.equal(cleaned.routeSegments['rail-P615'], undefined)
  assert.equal(cleaned.routeSegments['rail-1115'], undefined)
  assert.deepEqual(cleaned.routeSegments['rail-P611'], map.routeSegments['rail-P611'])
  assert.deepEqual(cleaned.routeSegments['rail-P609'], map.routeSegments['rail-P609'])
  assert.deepEqual(cleaned.routeSegments['rail-617'], map.routeSegments['rail-617'])
  assert.deepEqual(cleaned.routeSegments['rail-P610'], map.routeSegments['rail-P610'])
}

{
  const map = lineMap({
    'rail-P615': routeState('rail-P615', 'SET', '314'),
  })
  const cleaned = clearTimetableGuideRouteState(map, new Set(['312']))

  assert.strictEqual(cleaned, map)
  assert.deepEqual(cleaned.routeSegments['rail-P615'], map.routeSegments['rail-P615'])
}
