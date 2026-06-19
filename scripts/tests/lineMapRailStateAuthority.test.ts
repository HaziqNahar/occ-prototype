import assert from 'node:assert/strict'
import type { LineMapRouteSegmentStatus, LineMapRuntimeState } from '../../src/types'
import {
  S700_REAL_ROUTE_SEGMENT_IDS,
  S700_ROUTE_STATE_SEGMENT_ID,
  S704_REAL_ROUTE_SEGMENT_IDS,
  S704_ROUTE_STATE_SEGMENT_ID,
} from '../../src/screens/line-map/routeDefinitions'
import {
  enforceLineMapRailStateOwnership,
  withLineMapRailStateOwnership,
} from '../../src/screens/line-map/lineMapRailStateAuthority'

function routeState(
  segmentId: string,
  status: LineMapRouteSegmentStatus = 'SET',
  trainId = '312',
): LineMapRuntimeState['routeSegments'][string] {
  return {
    segmentId,
    status,
    trainId,
    updatedAt: 1,
  }
}

{
  const owned = withLineMapRailStateOwnership({
    'rail-P1103': routeState('rail-P1103', 'DISPATCHED'),
    'rail-1107': routeState('rail-1107', 'SET'),
  }, { prioritySegmentIds: ['rail-P1103'] })

  assert.equal(owned['rail-P1103']?.status, 'DISPATCHED')
  assert.equal(owned['rail-1107'], undefined)
}

{
  const owned = withLineMapRailStateOwnership({
    'rail-P606': routeState('rail-P606', 'DISPATCHED'),
    'rail-612': routeState('rail-612', 'SET'),
  }, { prioritySegmentIds: ['rail-P606'] })

  assert.equal(owned['rail-P606']?.status, 'DISPATCHED')
  assert.equal(owned['rail-612'], undefined)
}

{
  const routeSegments: LineMapRuntimeState['routeSegments'] = {
    [S700_ROUTE_STATE_SEGMENT_ID]: routeState(S700_ROUTE_STATE_SEGMENT_ID, 'SET'),
    ...Object.fromEntries(S700_REAL_ROUTE_SEGMENT_IDS.map((segmentId) => [
      segmentId,
      routeState(segmentId, 'UNSET'),
    ])),
    [S704_ROUTE_STATE_SEGMENT_ID]: routeState(S704_ROUTE_STATE_SEGMENT_ID, 'SET'),
    ...Object.fromEntries(S704_REAL_ROUTE_SEGMENT_IDS.map((segmentId) => [
      segmentId,
      routeState(segmentId, 'SET'),
    ])),
  }

  enforceLineMapRailStateOwnership(routeSegments, { completedTrainId: '312' })

  assert.equal(routeSegments[S700_ROUTE_STATE_SEGMENT_ID], undefined)
  assert.equal(routeSegments[S704_ROUTE_STATE_SEGMENT_ID]?.status, 'SET')
  S704_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(routeSegments[segmentId]?.status, 'SET')
  })
}
