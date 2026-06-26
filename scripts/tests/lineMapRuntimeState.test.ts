import assert from 'node:assert/strict'
import type { LineMapRouteSegmentStatus, LineMapRuntimeState } from '../../src/types'
import {
  LINE_MAP_LAYOUT_VERSION,
  clearStartupSignalRouteState,
  createLineMapRuntimeState,
  getDefaultLineMapRouteSegmentState,
  normalizeLineMapRuntimeState,
  resetLineMapRouteSegmentState,
} from '../../src/screens/line-map/lineMapRuntimeState'
import {
  createLineMapBaseRailVisualStates,
  getLineMapBaseRailVisualState,
} from '../../src/screens/line-map/lineMapBaseRailVisualState'
import {
  getExclusiveLineMapRailSegmentIds,
} from '../../src/screens/line-map/lineMapRailStateAuthority'

function routeState(
  segmentId: string,
  status: LineMapRouteSegmentStatus,
  trainId = '312',
  updatedAt = 1,
) {
  return {
    segmentId,
    status,
    trainId,
    updatedAt,
  }
}

function lineMap(routeSegments: LineMapRuntimeState['routeSegments']): LineMapRuntimeState {
  return {
    layoutVersion: LINE_MAP_LAYOUT_VERSION,
    platformDoorStates: {},
    routeSegments,
  }
}

{
  const fresh = createLineMapRuntimeState()

  assert.equal(fresh.layoutVersion, LINE_MAP_LAYOUT_VERSION)
  assert.deepEqual(fresh.platformDoorStates, {})
  assert.deepEqual(fresh.routeSegments, {})
  assert.equal(fresh.routeSegments['rail-P609'], undefined)
  assert.equal(getLineMapBaseRailVisualState('rail-651'), undefined)
  assert.equal(getLineMapBaseRailVisualState('bgk-651'), undefined)
  assert.equal(getLineMapBaseRailVisualState('rail-661')?.status, 'UNSET')
}

{
  const defaultState = getDefaultLineMapRouteSegmentState('rail-314')

  assert.equal(defaultState?.status, 'UNSET')
  assert.equal(getDefaultLineMapRouteSegmentState('rail-not-real'), undefined)
}

{
  assert.deepEqual(getExclusiveLineMapRailSegmentIds(['rail-705']).sort(), ['rail-705', 'rail-P701'].sort())
  assert.deepEqual(getExclusiveLineMapRailSegmentIds(['rail-P608']).sort(), ['rail-614', 'rail-P608'].sort())
  assert.deepEqual(getExclusiveLineMapRailSegmentIds(['rail-P611']).sort(), ['rail-611', 'rail-P611'].sort())
  assert.deepEqual(getExclusiveLineMapRailSegmentIds(['rail-1106']).sort(), ['rail-1106', 'rail-P1102'].sort())
}

{
  const normalized = normalizeLineMapRuntimeState({
    layoutVersion: LINE_MAP_LAYOUT_VERSION - 1,
    routeSegments: {
      'rail-705': routeState('rail-705', 'SET'),
    },
  })

  assert.deepEqual(normalized.routeSegments, {})
  assert.equal(getLineMapBaseRailVisualState('rail-705')?.status, 'SET')
  assert.equal(getLineMapBaseRailVisualState('rail-651'), undefined)
}

{
  const normalized = normalizeLineMapRuntimeState(lineMap(createLineMapBaseRailVisualStates()))

  assert.deepEqual(normalized.routeSegments, {})
}

{
  const normalized = normalizeLineMapRuntimeState(lineMap({
    'rail-716-section04': routeState('rail-716-section04', 'SET'),
    'route-r610-652-upper-705': routeState('route-r610-652-upper-705', 'SET'),
  }))

  assert.equal(normalized.routeSegments['rail-716'].status, 'SET')
  assert.equal(normalized.routeSegments['rail-716'].segmentId, 'rail-716')
  assert.equal(normalized.routeSegments['rail-716-section04'], undefined)
  assert.equal(normalized.routeSegments['route-r610-652-upper-705'], undefined)
}

{
  const cleared = clearStartupSignalRouteState(lineMap({
    'route-r704-700-command': routeState('route-r704-700-command', 'SET'),
    'rail-712': routeState('rail-712', 'SET'),
    'rail-710': routeState('rail-710', 'SET'),
  }))

  assert.equal(cleared.routeSegments['route-r704-700-command'], undefined)
  assert.equal(cleared.routeSegments['rail-712'], undefined)
  assert.equal(cleared.routeSegments['rail-710'], undefined)
  assert.equal(getLineMapBaseRailVisualState('rail-712')?.status, 'SET')
  assert.equal(getLineMapBaseRailVisualState('rail-710')?.status, 'SET')
}

{
  const routeSegments = {
    'rail-314': routeState('rail-314', 'SET'),
    'rail-P1103': routeState('rail-P1103', 'SET'),
  }

  resetLineMapRouteSegmentState(routeSegments, 'rail-314')
  resetLineMapRouteSegmentState(routeSegments, 'rail-P1103')

  assert.equal(routeSegments['rail-314'], undefined)
  assert.equal(getDefaultLineMapRouteSegmentState('rail-314')?.status, 'UNSET')
  assert.equal(routeSegments['rail-P1103'], undefined)
}
