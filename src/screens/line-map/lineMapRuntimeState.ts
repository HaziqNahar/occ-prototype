import type { LineMapRuntimeState } from '../../types'
import {
  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS,
} from './model'
import {
  LINE_SUFFIX_ROUTE_SEGMENT_MIGRATIONS,
  REMOVED_ROUTE_SEGMENT_IDS,
  S610_REAL_ROUTE_SEGMENT_IDS,
  S610_RETIRED_ROUTE_SEGMENT_IDS,
  S610_SIGNAL_TRACK_SEGMENT_IDS,
  STARTUP_SIGNAL_ROUTE_SEGMENT_IDS,
} from './routeDefinitions'
import {
  isLineMapRouteSegmentActive,
  isSignalRouteCommandState,
} from './signalRouteState'
import {
  enforceLineMapRailStateOwnership,
  isSeededLineMapRouteSegmentState,
} from './lineMapRailStateAuthority'
import {
  getLineMapBaseRailVisualState,
  isLineMapBaseRailVisualState,
} from './lineMapBaseRailVisualState'
import {
  clearLineMapRouteSegmentState,
  clearLineMapRouteSegmentStates,
  setLineMapRouteSegmentState,
} from './lineMapRouteSegmentState'

export const LINE_MAP_LAYOUT_VERSION = 10

const DEFAULT_P_ROUTE_SEGMENT_IDS: ReadonlySet<string> = new Set(
  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.flatMap((group) => group.sides[0]),
)

export function createLineMapRuntimeState(): LineMapRuntimeState {
  return {
    layoutVersion: LINE_MAP_LAYOUT_VERSION,
    routeSegments: {},
  }
}

export function clearStartupSignalRouteState(lineMap: LineMapRuntimeState): LineMapRuntimeState {
  const routeSegments = { ...lineMap.routeSegments }

  STARTUP_SIGNAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    resetLineMapRouteSegmentState(routeSegments, segmentId)
  })

  return {
    ...lineMap,
    routeSegments,
  }
}

export function normalizeLineMapRuntimeState(lineMap: Partial<LineMapRuntimeState> | undefined): LineMapRuntimeState {
  if (lineMap?.layoutVersion !== LINE_MAP_LAYOUT_VERSION) {
    return createLineMapRuntimeState()
  }

  return {
    layoutVersion: LINE_MAP_LAYOUT_VERSION,
    routeSegments: migrateLineMapRouteSegments(lineMap?.routeSegments),
  }
}

export function migrateLineMapRouteSegments(routeSegments: LineMapRuntimeState['routeSegments'] | undefined) {
  const next = { ...(routeSegments ?? {}) }

  removeLineMapBaseRailVisualStates(next)

  if (routeSegments) {
    EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
      const preferredSideStates = group.sides[0]
        .map((segmentId) => next[segmentId])
        .filter((state): state is NonNullable<typeof state> => Boolean(state))
      const straightSideStates = group.sides[1]
        .map((segmentId) => next[segmentId])
        .filter((state): state is NonNullable<typeof state> => Boolean(state))
      const hasLegacyPreferredSeed = preferredSideStates.length > 0 && preferredSideStates.every(isSeededLineMapRouteSegmentState)
      const hasMeaningfulPreferredState = preferredSideStates.some((state) => !isSeededLineMapRouteSegmentState(state))
      const hasMeaningfulStraightState = straightSideStates.some((state) => !isSeededLineMapRouteSegmentState(state))
      const hasMeaningfulState = hasMeaningfulPreferredState || hasMeaningfulStraightState

      if (!hasLegacyPreferredSeed || hasMeaningfulState) {
        return
      }

      group.sides[0].forEach((segmentId) => {
        clearLineMapRouteSegmentState(next, segmentId)
      })

      group.sides[1].forEach((segmentId) => {
        setLineMapRouteSegmentState(next, segmentId, 'SET', { updatedAt: 0 })
      })
    })
  }

  Array.from(DEFAULT_P_ROUTE_SEGMENT_IDS).forEach((segmentId) => {
    const state = next[segmentId]

    if (state && state.updatedAt === 0 && state.trainId === '') {
      clearLineMapRouteSegmentState(next, segmentId)
    }
  })

  LINE_SUFFIX_ROUTE_SEGMENT_MIGRATIONS.forEach(([legacySegmentId, migratedSegmentId]) => {
    if (next[legacySegmentId] && !next[migratedSegmentId]) {
      const legacyState = next[legacySegmentId]

      setLineMapRouteSegmentState(next, migratedSegmentId, legacyState.status, {
        trainId: legacyState.trainId,
        updatedAt: legacyState.updatedAt,
      })
    }

    clearLineMapRouteSegmentState(next, legacySegmentId)
  })

  clearLineMapRouteSegmentStates(next, REMOVED_ROUTE_SEGMENT_IDS)

  removeLineMapBaseRailVisualStates(next)

  S610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    if (!isSignalRouteCommandState(next[segmentId])) {
      clearLineMapRouteSegmentState(next, segmentId)
    }
  })

  const activeS610SignalSegment = S610_SIGNAL_TRACK_SEGMENT_IDS
    .map((segmentId) => next[segmentId])
    .find(isLineMapRouteSegmentActive)
  const activeS610RetiredSegment = S610_RETIRED_ROUTE_SEGMENT_IDS
    .map((segmentId) => next[segmentId])
    .find(isLineMapRouteSegmentActive)
  const activeS610CurrentSegment = S610_REAL_ROUTE_SEGMENT_IDS
    .map((segmentId) => next[segmentId])
    .find(isLineMapRouteSegmentActive)
  const activeS610MigrationSegment = activeS610SignalSegment
    ?? (activeS610RetiredSegment && activeS610CurrentSegment ? activeS610RetiredSegment : undefined)

  if (activeS610MigrationSegment) {
    S610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
      setLineMapRouteSegmentState(next, segmentId, activeS610MigrationSegment.status, {
        trainId: activeS610MigrationSegment.trainId,
        updatedAt: activeS610MigrationSegment.updatedAt,
      })
    })
  }
  clearLineMapRouteSegmentStates(next, S610_RETIRED_ROUTE_SEGMENT_IDS)

  enforceLineMapRailStateOwnership(next)

  clearLineMapRouteSegmentState(next, 'rail-P609')

  return next
}

export function createDefaultLineMapRouteSegments(): LineMapRuntimeState['routeSegments'] {
  return {}
}

export function getDefaultLineMapRouteSegmentState(segmentId: string) {
  return getLineMapBaseRailVisualState(segmentId)
}

export function resetLineMapRouteSegmentState(routeSegments: LineMapRuntimeState['routeSegments'], segmentId: string) {
  clearLineMapRouteSegmentState(routeSegments, segmentId)
  enforceLineMapRailStateOwnership(routeSegments)
}

function removeLineMapBaseRailVisualStates(routeSegments: LineMapRuntimeState['routeSegments']) {
  Object.entries(routeSegments).forEach(([segmentId, state]) => {
    if (isLineMapBaseRailVisualState(state)) {
      clearLineMapRouteSegmentState(routeSegments, segmentId)
    }
  })
}
