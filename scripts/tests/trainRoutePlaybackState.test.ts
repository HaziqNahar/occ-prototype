import assert from 'node:assert/strict'
import type { LineMapRuntimeState } from '../../src/types'
import {
  S700_REAL_ROUTE_SEGMENT_IDS,
  S700_ROUTE_STATE_SEGMENT_ID,
} from '../../src/screens/line-map/routeDefinitions'
import {
  completeTrainRoutePlaybackState,
  updateTrainRouteStepState,
} from '../../src/screens/line-map/trainRoutePlaybackState'
import type { TrainRouteAnimationStep } from '../../src/screens/line-map/trainMovementRoutes'

function lineMap(routeSegments: LineMapRuntimeState['routeSegments'] = {}): LineMapRuntimeState {
  return {
    layoutVersion: 10,
    routeSegments,
  }
}

function routeState(segmentId: string, status: 'DISPATCHED' | 'SET' | 'UNSET', trainId = '312') {
  return {
    segmentId,
    status,
    trainId,
    updatedAt: 1,
  }
}

function steps(segmentIds: readonly string[]): readonly TrainRouteAnimationStep[] {
  return segmentIds.map((segmentId, index) => ({
    point: { x: index, y: 0 },
    segmentId,
  }))
}

{
  const updated = updateTrainRouteStepState(
    lineMap(),
    '312',
    steps(['rail-a', 'rail-b', 'rail-c', 'rail-d']),
    1,
  )

  assert.equal(updated.routeSegments['rail-a'].status, 'UNSET')
  assert.equal(updated.routeSegments['rail-b'].status, 'DISPATCHED')
  assert.equal(updated.routeSegments['rail-c'].status, 'DISPATCHED')
  assert.equal(updated.routeSegments['rail-d'].status, 'SET')
}

{
  const updated = updateTrainRouteStepState(
    lineMap({
      'rail-b': routeState('rail-b', 'DISPATCHED', '999'),
    }),
    '312',
    steps(['rail-a', 'rail-b', 'rail-c']),
    0,
  )

  assert.equal(updated.routeSegments['rail-a'].status, 'DISPATCHED')
  assert.equal(updated.routeSegments['rail-a'].trainId, '312')
  assert.equal(updated.routeSegments['rail-b'].status, 'DISPATCHED')
  assert.equal(updated.routeSegments['rail-b'].trainId, '999')
  assert.equal(updated.routeSegments['rail-c'].status, 'SET')
  assert.equal(updated.routeSegments['rail-c'].trainId, '312')
}

{
  const completed = completeTrainRoutePlaybackState(
    lineMap({
      [S700_ROUTE_STATE_SEGMENT_ID]: routeState(S700_ROUTE_STATE_SEGMENT_ID, 'SET'),
      ...Object.fromEntries(S700_REAL_ROUTE_SEGMENT_IDS.map((segmentId) => [
        segmentId,
        routeState(segmentId, 'SET'),
      ])),
    }),
    '312',
    steps(S700_REAL_ROUTE_SEGMENT_IDS),
  )

  assert.equal(completed.routeSegments[S700_ROUTE_STATE_SEGMENT_ID], undefined)
  S700_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(completed.routeSegments[segmentId].status, 'UNSET')
    assert.equal(completed.routeSegments[segmentId].trainId, '312')
  })
}

{
  const completed = completeTrainRoutePlaybackState(
    lineMap({
      'rail-a': routeState('rail-a', 'DISPATCHED', '312'),
      'rail-b': routeState('rail-b', 'DISPATCHED', '999'),
      'rail-c': routeState('rail-c', 'SET', '999'),
    }),
    '312',
    steps(['rail-a', 'rail-b', 'rail-c']),
  )

  assert.equal(completed.routeSegments['rail-a'].status, 'UNSET')
  assert.equal(completed.routeSegments['rail-a'].trainId, '312')
  assert.equal(completed.routeSegments['rail-b'].status, 'DISPATCHED')
  assert.equal(completed.routeSegments['rail-b'].trainId, '999')
  assert.equal(completed.routeSegments['rail-c'].status, 'SET')
  assert.equal(completed.routeSegments['rail-c'].trainId, '999')
}
