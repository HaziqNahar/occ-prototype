import assert from 'node:assert/strict'
import type { LineMapRouteSegmentStatus, LineMapRuntimeState } from '../../src/types'
import {
  DEFAULT_RAIL_VISUAL_PAINT,
  getRouteSegmentPaint,
  isRouteRailDisplaySuppressed,
  isStatelessVisualRail,
  resolveRailVisualPaint,
  resolveRouteRailVisualPaint,
  selectRailVisualDisplayState,
} from '../../src/screens/line-map/railVisualState'
import { getLineMapBaseRailVisualState } from '../../src/screens/line-map/lineMapBaseRailVisualState'

function lineMap(routeSegments: LineMapRuntimeState['routeSegments'] = {}): LineMapRuntimeState {
  return {
    layoutVersion: 10,
    routeSegments,
  }
}

function routeState(segmentId: string, status: LineMapRouteSegmentStatus) {
  return {
    segmentId,
    status,
    trainId: '',
    updatedAt: 1,
  }
}

assert.equal(isStatelessVisualRail('rail-1115'), true)
assert.equal(isStatelessVisualRail('rail-1107-to-1115-background'), true)
assert.equal(isStatelessVisualRail('rail-1115-to-1104-background'), true)

{
  const state = routeState('rail-1115', 'UNSET')
  const paint = resolveRailVisualPaint({
    lineMap: lineMap({ 'rail-1115': state }),
    railId: 'rail-1115',
    routeState: state,
  })

  assert.equal(paint.suppressed, true)
  assert.equal(paint.displayState, undefined)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, DEFAULT_RAIL_VISUAL_PAINT)
}

assert.deepEqual(getRouteSegmentPaint(routeState('rail-1', 'DISPATCHED')), { color: '#ff0000', opacity: 1 })
assert.deepEqual(getRouteSegmentPaint(routeState('rail-1', 'UNSET')), { color: '#eedc7f', opacity: 1 })
assert.deepEqual(getRouteSegmentPaint(routeState('rail-1', 'SET')), { color: '#ffffff', opacity: 1 })
assert.deepEqual(getRouteSegmentPaint(undefined), DEFAULT_RAIL_VISUAL_PAINT)

{
  const setState = routeState('rail-1', 'SET')
  const unsetState = routeState('rail-1', 'UNSET')
  const dispatchedState = routeState('rail-1', 'DISPATCHED')

  assert.equal(selectRailVisualDisplayState(setState, unsetState), unsetState)
  assert.equal(selectRailVisualDisplayState(unsetState, dispatchedState), dispatchedState)
  assert.equal(selectRailVisualDisplayState(undefined, setState), setState)
}

{
  const route = routeState('rail-619', 'UNSET')
  const occupancy = routeState('rail-619', 'DISPATCHED')
  const paint = resolveRailVisualPaint({
    lineMap: lineMap({ 'rail-619': route }),
    railId: 'rail-619',
    occupancyState: occupancy,
    routeState: route,
  })

  assert.equal(paint.displayState, occupancy)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, { color: '#ff0000', opacity: 1 })
}

{
  const baseState = getLineMapBaseRailVisualState('rail-314')
  const paint = resolveRailVisualPaint({
    lineMap: lineMap(),
    railId: 'rail-314',
    baseState,
  })

  assert.equal(baseState?.status, 'UNSET')
  assert.equal(paint.displayState, undefined)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, { color: '#eedc7f', opacity: 1 })
}

{
  const baseState = getLineMapBaseRailVisualState('rail-651')
  const paint = resolveRailVisualPaint({
    lineMap: lineMap(),
    railId: 'rail-651',
    baseState,
  })

  assert.equal(baseState, undefined)
  assert.equal(paint.displayState, undefined)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, { color: '#63869a', opacity: 0.28 })
}

{
  const route = routeState('rail-314', 'SET')
  const paint = resolveRailVisualPaint({
    lineMap: lineMap({ 'rail-314': route }),
    railId: 'rail-314',
    baseState: getLineMapBaseRailVisualState('rail-314'),
    routeState: route,
  })

  assert.equal(paint.displayState, route)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, { color: '#ffffff', opacity: 1 })
}

{
  const route = routeState('rail-651', 'UNSET')
  const paint = resolveRailVisualPaint({
    lineMap: lineMap({ 'rail-651': route }),
    railId: 'rail-651',
    baseState: getLineMapBaseRailVisualState('rail-651'),
    routeState: route,
  })

  assert.equal(paint.displayState, route)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, { color: '#eedc7f', opacity: 1 })
}

{
  const broadRouteState = routeState('rail-parent', 'UNSET')
  const stalePartState = routeState('rail-parent-1', 'SET')
  const paint = resolveRouteRailVisualPaint({
    fallbackRouteState: broadRouteState,
    lineMap: lineMap({ 'rail-parent-1': stalePartState }),
    modelPaint: DEFAULT_RAIL_VISUAL_PAINT,
    railId: 'rail-parent-1',
    segmentRailId: 'rail-parent',
    trainOccupancyRouteSegments: {},
  })

  assert.equal(paint.displayState, broadRouteState)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, { color: '#eedc7f', opacity: 1 })
}

{
  const map = lineMap({
    'rail-661': routeState('rail-661', 'UNSET'),
  })
  const paint = resolveRailVisualPaint({
    lineMap: map,
    railId: 'rail-661',
    routeState: map.routeSegments['rail-661'],
    suppressedPaint: DEFAULT_RAIL_VISUAL_PAINT,
  })

  assert.equal(isRouteRailDisplaySuppressed(map, 'rail-661'), true)
  assert.equal(paint.displayState, undefined)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, DEFAULT_RAIL_VISUAL_PAINT)
}

{
  const map = lineMap({
    'rail-P1103': routeState('rail-P1103', 'SET'),
    'rail-1107': routeState('rail-1107', 'UNSET'),
  })
  const paint = resolveRailVisualPaint({
    lineMap: map,
    railId: 'rail-1107',
    routeState: map.routeSegments['rail-1107'],
  })

  assert.equal(isRouteRailDisplaySuppressed(map, 'rail-1107'), true)
  assert.equal(paint.displayState, undefined)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, DEFAULT_RAIL_VISUAL_PAINT)
}

{
  const map = lineMap({
    'rail-P611': routeState('rail-P611', 'SET'),
    'rail-611': routeState('rail-611', 'SET'),
  })
  const paint = resolveRailVisualPaint({
    lineMap: map,
    railId: 'rail-611',
    routeState: map.routeSegments['rail-611'],
    suppressedPaint: DEFAULT_RAIL_VISUAL_PAINT,
  })

  assert.equal(isRouteRailDisplaySuppressed(map, 'rail-611'), true)
  assert.equal(paint.displayState, undefined)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, DEFAULT_RAIL_VISUAL_PAINT)
}

{
  const map = lineMap({
    'rail-P1100': routeState('rail-P1100', 'SET'),
    'rail-1104': routeState('rail-1104', 'UNSET'),
  })
  const paint = resolveRailVisualPaint({
    lineMap: map,
    railId: 'rail-1104',
    routeState: map.routeSegments['rail-1104'],
  })

  assert.equal(isRouteRailDisplaySuppressed(map, 'rail-1104'), true)
  assert.equal(paint.displayState, undefined)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, DEFAULT_RAIL_VISUAL_PAINT)
}

{
  const route = routeState('rail-619', 'SET')
  const occupancy = routeState('rail-619', 'DISPATCHED')
  const paint = resolveRouteRailVisualPaint({
    fallbackRouteState: route,
    lineMap: lineMap({ 'rail-619': route }),
    modelPaint: DEFAULT_RAIL_VISUAL_PAINT,
    railId: 'rail-619',
    segmentRailId: 'rail-619',
    trainOccupancyRouteSegments: {
      'rail-619': occupancy,
    },
  })

  assert.equal(paint.displayState, occupancy)
  assert.deepEqual({ color: paint.color, opacity: paint.opacity }, { color: '#ff0000', opacity: 1 })
}
