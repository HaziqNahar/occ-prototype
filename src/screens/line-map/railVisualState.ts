import type { LineMapRuntimeState } from '../../types'
import { getLineMapBaseRailVisualState } from './lineMapBaseRailVisualState'
import { EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS, routeSegmentData } from './model'
import { getRouteSegmentRailId } from './railIds'

const BLOCKED_STRAIGHT_RAIL_COLOR = '#63869a'
const BLOCKED_STRAIGHT_RAIL_OPACITY = 0.28

export const DEFAULT_RAIL_VISUAL_PAINT = { color: '#63869a', opacity: 0.28 } as const

const STRAIGHT_RAIL_BLOCKING_SLANTED_SEGMENT_IDS = EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.reduce<Record<string, string[]>>((mapping, group) => {
  const slantedSegmentIds = group.sides[0].filter((segmentId) => /^rail-P/i.test(segmentId))

  group.sides.slice(1).flat().forEach((segmentId) => {
    if (!/^rail-(?!P)/i.test(segmentId)) {
      return
    }

    mapping[segmentId] = [
      ...(mapping[segmentId] ?? []),
      ...slantedSegmentIds,
    ]
  })

  return mapping
}, {})

const ROUTE_SEGMENTS_BY_RAIL_ID = new Map(routeSegmentData.map((segment) => [
  getRouteSegmentRailId(segment),
  segment,
]))

const STATELESS_VISUAL_RAIL_IDS = new Set([
  'rail-1107-to-1115-background',
  'rail-1115',
  'rail-1115-to-1104-background',
])

export type RailRuntimeState = LineMapRuntimeState['routeSegments'][string]

export type RailVisualPaint = {
  color?: string
  opacity?: number
}

const RAIL_DISPLAY_STATE_PRIORITY: Record<LineMapRuntimeState['routeSegments'][string]['status'], number> = {
  DISPATCHED: 4,
  UNSET: 3,
  HELD: 2,
  SET: 1,
}

export function isStatelessVisualRail(railId: string) {
  return STATELESS_VISUAL_RAIL_IDS.has(railId) || railId.endsWith('-background')
}

export function isRouteRailDisplaySuppressed(lineMap: LineMapRuntimeState, railId: string) {
  return isStatelessVisualRail(railId) || isStraightRailBlockedBySlantedRoute(lineMap, railId)
}

function isStraightRailBlockedBySlantedRoute(lineMap: LineMapRuntimeState, railId: string) {
  const blockingSlantedSegmentIds = STRAIGHT_RAIL_BLOCKING_SLANTED_SEGMENT_IDS[railId]

  return Boolean(blockingSlantedSegmentIds?.some((segmentId) => (
    isRouteStateBlockingStraightRail(lineMap.routeSegments[segmentId])
    || isIdleRouteSegmentBlockingStraightRail(segmentId)
  )))
}

function isRouteStateBlockingStraightRail(state?: RailRuntimeState) {
  return Boolean(state && ['DISPATCHED', 'HELD', 'SET', 'UNSET'].includes(state.status))
}

function isIdleRouteSegmentBlockingStraightRail(segmentId: string) {
  const segment = ROUTE_SEGMENTS_BY_RAIL_ID.get(segmentId)

  return Boolean(
    segment
    && 'idleColor' in segment
    && segment.idleColor === '#eedc7f'
    && (!('idleOpacity' in segment) || segment.idleOpacity === undefined || segment.idleOpacity >= 1),
  )
}

function getRouteRailRouteState(
  lineMap: LineMapRuntimeState,
  railId: string,
  segmentRailId: string,
  fallbackRouteState: RailRuntimeState | undefined,
) {
  const safeFallbackRouteState = isRouteRailDisplaySuppressed(lineMap, segmentRailId) ? undefined : fallbackRouteState

  return railId === segmentRailId
    ? safeFallbackRouteState
    : selectRailVisualDisplayState(lineMap.routeSegments[railId], safeFallbackRouteState)
}

export function selectRailVisualDisplayState(...states: (RailRuntimeState | undefined)[]) {
  return states.reduce<RailRuntimeState | undefined>((selectedState, candidateState) => {
    if (!candidateState) {
      return selectedState
    }

    if (!selectedState) {
      return candidateState
    }

    return RAIL_DISPLAY_STATE_PRIORITY[candidateState.status] > RAIL_DISPLAY_STATE_PRIORITY[selectedState.status]
      ? candidateState
      : selectedState
  }, undefined)
}

export function resolveRailVisualPaint({
  lineMap,
  railId,
  modelPaint = DEFAULT_RAIL_VISUAL_PAINT,
  baseState,
  occupancyState,
  routeState,
  suppressedPaint,
}: {
  lineMap: LineMapRuntimeState
  railId: string
  modelPaint?: RailVisualPaint
  baseState?: RailRuntimeState
  occupancyState?: RailRuntimeState
  routeState?: RailRuntimeState
  suppressedPaint?: RailVisualPaint
}) {
  const suppressed = isRouteRailDisplaySuppressed(lineMap, railId)
  const displayState = suppressed ? undefined : selectRailVisualDisplayState(occupancyState, routeState)
  const basePaint = baseState ? getRouteSegmentPaint(baseState) : undefined

  if (displayState) {
    return {
      ...getRouteSegmentPaint(displayState),
      displayState,
      suppressed,
    }
  }

  return {
    ...(suppressed ? suppressedPaint ?? modelPaint : basePaint ?? modelPaint),
    displayState,
    suppressed,
  }
}

export function resolveRouteRailVisualPaint({
  fallbackRouteState,
  lineMap,
  modelPaint,
  railId,
  segmentRailId,
  trainOccupancyRouteSegments,
}: {
  fallbackRouteState?: RailRuntimeState
  lineMap: LineMapRuntimeState
  modelPaint: RailVisualPaint
  railId: string
  segmentRailId: string
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
}) {
  return resolveRailVisualPaint({
    lineMap,
    railId,
    modelPaint,
    baseState: selectRailVisualDisplayState(
      getLineMapBaseRailVisualState(railId),
      getLineMapBaseRailVisualState(segmentRailId),
    ),
    occupancyState: trainOccupancyRouteSegments[railId] ?? trainOccupancyRouteSegments[segmentRailId],
    routeState: getRouteRailRouteState(lineMap, railId, segmentRailId, fallbackRouteState),
  })
}

export function getBlockedStraightRailPaint(piece: object) {
  return {
    color: 'color' in piece && typeof piece.color === 'string' ? piece.color : BLOCKED_STRAIGHT_RAIL_COLOR,
    opacity: 'opacity' in piece && typeof piece.opacity === 'number' ? piece.opacity : BLOCKED_STRAIGHT_RAIL_OPACITY,
  }
}

export function getRouteSegmentPaint(state?: RailRuntimeState) {
  if (state?.status === 'DISPATCHED') {
    return { color: '#ff0000', opacity: 1 }
  }

  if (state?.status === 'UNSET') {
    return { color: '#eedc7f', opacity: 1 }
  }

  if (state) {
    return { color: '#ffffff', opacity: 1 }
  }

  return DEFAULT_RAIL_VISUAL_PAINT
}
