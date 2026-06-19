import assert from 'node:assert/strict'
import {
  clearLineMapRouteSegmentState,
  clearLineMapRouteSegmentStates,
  createLineMapRouteSegmentState,
  createLineMapRouteSegmentStates,
  setLineMapRouteSegmentState,
  setLineMapRouteSegmentStates,
} from '../../src/screens/line-map/lineMapRouteSegmentState'
import type { LineMapRuntimeState } from '../../src/types'

{
  const state = createLineMapRouteSegmentState('rail-1', 'SET', {
    trainId: '312',
    updatedAt: 42,
  })

  assert.deepEqual(state, {
    segmentId: 'rail-1',
    status: 'SET',
    trainId: '312',
    updatedAt: 42,
  })
}

{
  const routeSegments = createLineMapRouteSegmentStates(['rail-a', 'rail-b'], 'UNSET', {
    trainId: '312',
    updatedAt: 99,
  })

  assert.equal(routeSegments['rail-a'].status, 'UNSET')
  assert.equal(routeSegments['rail-a'].trainId, '312')
  assert.equal(routeSegments['rail-a'].updatedAt, 99)
  assert.equal(routeSegments['rail-b'].updatedAt, 99)
}

{
  const routeSegments: LineMapRuntimeState['routeSegments'] = {}

  setLineMapRouteSegmentState(routeSegments, 'rail-a', 'SET', { updatedAt: 1 })
  setLineMapRouteSegmentStates(routeSegments, ['rail-b', 'rail-c'], 'DISPATCHED', {
    trainId: '314',
    updatedAt: 2,
  })

  assert.equal(routeSegments['rail-a'].status, 'SET')
  assert.equal(routeSegments['rail-b'].status, 'DISPATCHED')
  assert.equal(routeSegments['rail-c'].trainId, '314')

  clearLineMapRouteSegmentState(routeSegments, 'rail-a')
  clearLineMapRouteSegmentStates(routeSegments, ['rail-b', 'rail-c'])

  assert.deepEqual(routeSegments, {})
}
