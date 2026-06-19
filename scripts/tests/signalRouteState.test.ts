import assert from 'node:assert/strict'
import type { LineMapRouteSegmentStatus, LineMapRuntimeState } from '../../src/types'
import {
  getSignalRouteCommandLabels,
  getSignalRouteCommandStateSegmentIds,
  getSignalRouteLampTone,
  getSignalRouteLabels,
  getSignalRouteSetLabels,
  isSignalRouteCommandState,
} from '../../src/screens/line-map/signalRouteState'

function lineMap(routeSegments: LineMapRuntimeState['routeSegments'] = {}): LineMapRuntimeState {
  return {
    layoutVersion: 10,
    routeSegments,
  }
}

function routeState(
  segmentId: string,
  status: LineMapRouteSegmentStatus,
  updatedAt = 1,
) {
  return {
    segmentId,
    status,
    trainId: '',
    updatedAt,
  }
}

assert.deepEqual(getSignalRouteLabels('S700'), ['Route R709_705'])
assert.deepEqual(getSignalRouteLabels('S704'), ['Route R704_700'])
assert.deepEqual(getSignalRouteLabels('S709'), [])
assert.deepEqual(getSignalRouteLabels('S608'), ['Route R608_600', 'Route R608_602', 'Route R608_803'])
assert.deepEqual(getSignalRouteCommandLabels('S608'), ['Route R608_803'])
assert.deepEqual(getSignalRouteCommandLabels('S709'), [])

assert.deepEqual(
  getSignalRouteCommandStateSegmentIds('S700', 'Route R709_705'),
  ['route-r709-705-command'],
)
assert.deepEqual(
  getSignalRouteCommandStateSegmentIds('S704', 'Route R704_700'),
  ['route-r704-700-command'],
)
assert.deepEqual(
  getSignalRouteCommandStateSegmentIds('S608', 'Route R608_803'),
  ['route-r608-803-command'],
)

assert.equal(isSignalRouteCommandState(routeState('route-r709-705-command', 'SET')), true)
assert.equal(isSignalRouteCommandState(routeState('route-r709-705-command', 'UNSET')), false)
assert.equal(isSignalRouteCommandState(routeState('route-r709-705-command', 'SET', 0)), false)

{
  const map = lineMap({
    'route-r704-700-command': routeState('route-r704-700-command', 'SET'),
  })

  assert.deepEqual(getSignalRouteSetLabels('S700', map), [])
  assert.deepEqual(getSignalRouteSetLabels('S704', map), ['Route R704_700'])
  assert.equal(getSignalRouteLampTone({ label: 'S700', x: 0 }, map), 'red')
  assert.equal(getSignalRouteLampTone({ label: 'S704', x: 0 }, map), 'white')
}

{
  const map = lineMap({
    'route-r709-705-command': routeState('route-r709-705-command', 'SET'),
  })

  assert.deepEqual(getSignalRouteSetLabels('S700', map), ['Route R709_705'])
  assert.deepEqual(getSignalRouteSetLabels('S709', map), [])
  assert.equal(getSignalRouteLampTone({ label: 'S700', x: 0 }, map), 'white')
  assert.equal(getSignalRouteLampTone({ label: 'S709', x: 0 }, map), 'red')
}
