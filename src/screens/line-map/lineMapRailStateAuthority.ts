import type { LineMapRuntimeState } from '../../types'
import type { SignalRouteDefinition } from './routeDefinitions'
import { EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS } from './model'
import { SIGNAL_ROUTE_DEFINITIONS } from './routeDefinitions'
import {
  getSignalRouteCommandMarkerSegmentIds,
  shouldClearCompletedRouteCommandState,
} from './scadaRouteState'
import {
  clearLineMapRouteSegmentState,
} from './lineMapRouteSegmentState'
import {
  isLineMapRouteSegmentActive,
  isSignalRouteCommandState,
} from './signalRouteState'

export type LineMapRailStateOwnershipOptions = {
  completedTrainId?: string
  prioritySegmentIds?: readonly string[]
}

export function enforceLineMapRailStateOwnership(
  routeSegments: LineMapRuntimeState['routeSegments'],
  options: LineMapRailStateOwnershipOptions = {},
) {
  enforceExclusiveRailGroupOwnership(routeSegments, options.prioritySegmentIds)

  if (options.completedTrainId) {
    clearCompletedSignalRouteCommandStates(routeSegments, options.completedTrainId)
  }
}

export function withLineMapRailStateOwnership(
  routeSegments: LineMapRuntimeState['routeSegments'],
  options: LineMapRailStateOwnershipOptions = {},
) {
  const next = { ...routeSegments }

  enforceLineMapRailStateOwnership(next, options)

  return next
}

export function getExclusiveLineMapRailSegmentIds(segmentIds: readonly string[]) {
  const segmentIdSet = new Set(segmentIds.filter(Boolean))
  const exclusiveSegmentIds = new Set<string>()

  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
    const hasRequestedSegment = group.sides.some((side) => (
      side.some((segmentId) => segmentIdSet.has(segmentId))
    ))

    if (!hasRequestedSegment) {
      return
    }

    group.sides.flat().forEach((segmentId) => {
      exclusiveSegmentIds.add(segmentId)
    })
  })

  segmentIdSet.forEach((segmentId) => {
    exclusiveSegmentIds.add(segmentId)
  })

  return [...exclusiveSegmentIds]
}

function enforceExclusiveRailGroupOwnership(
  routeSegments: LineMapRuntimeState['routeSegments'],
  prioritySegmentIds: readonly string[] = [],
) {
  const prioritySegmentIdSet = new Set(prioritySegmentIds)

  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
    const prioritySideIndex = group.sides.findIndex((side) => side.some((segmentId) => prioritySegmentIdSet.has(segmentId)))
    const keepSideIndex = prioritySideIndex >= 0
      ? prioritySideIndex
      : getExclusiveRailGroupSideToKeep(routeSegments, group.sides, group.preferredSide)

    if (keepSideIndex === undefined) {
      return
    }

    group.sides.forEach((side, sideIndex) => {
      if (sideIndex === keepSideIndex) {
        return
      }

      side.forEach((segmentId) => {
        clearLineMapRouteSegmentState(routeSegments, segmentId)
      })
    })
  })
}

function clearCompletedRouteCommandState(
  routeSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
  commandSegmentId: string,
  routeSegmentIds: readonly string[],
) {
  if (
    shouldClearCompletedRouteCommandState(
      routeSegments,
      trainId,
      commandSegmentId,
      routeSegmentIds,
      isSignalRouteCommandState,
    )
  ) {
    clearLineMapRouteSegmentState(routeSegments, commandSegmentId)
  }
}

function clearCompletedSignalRouteCommandStates(
  routeSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
) {
  const activeRouteDefinitions = SIGNAL_ROUTE_DEFINITIONS.filter((routeDefinition) => (
    getSignalRouteCommandMarkerSegmentIds(routeDefinition).some((commandSegmentId) => (
      isSignalRouteCommandState(routeSegments[commandSegmentId])
    ))
  ))

  SIGNAL_ROUTE_DEFINITIONS.forEach((routeDefinition) => {
    getSignalRouteCommandMarkerSegmentIds(routeDefinition).forEach((commandSegmentId) => {
      clearCompletedRouteCommandState(
        routeSegments,
        trainId,
        commandSegmentId,
        getRouteSegmentIdsForCommandClear(routeDefinition, activeRouteDefinitions),
      )
    })
  })
}

function getRouteSegmentIdsForCommandClear(
  routeDefinition: SignalRouteDefinition,
  activeRouteDefinitions: readonly SignalRouteDefinition[],
) {
  const activeSharedSegmentIds = new Set(
    activeRouteDefinitions
      .filter((activeRouteDefinition) => activeRouteDefinition !== routeDefinition)
      .flatMap((activeRouteDefinition) => activeRouteDefinition.realSegmentIds),
  )

  return routeDefinition.realSegmentIds.filter((segmentId) => (
    !activeSharedSegmentIds.has(segmentId)
  ))
}

function getExclusiveRailGroupSideToKeep(
  routeSegments: LineMapRuntimeState['routeSegments'],
  sides: readonly (readonly string[])[],
  preferredSide: number,
) {
  const sideScores = sides.map((side) => Math.max(...side.map((segmentId) => getRailGroupOwnershipScore(routeSegments[segmentId]))))
  const presentSides = sideScores.filter((score) => score > 0).length

  if (presentSides <= 1) {
    return undefined
  }

  const highestScore = Math.max(...sideScores)
  const highestScoreSideIndexes = sideScores
    .map((score, sideIndex) => ({ score, sideIndex }))
    .filter(({ score }) => score === highestScore)
    .map(({ sideIndex }) => sideIndex)

  return highestScoreSideIndexes.includes(preferredSide) ? preferredSide : highestScoreSideIndexes[0]
}

function getRailGroupOwnershipScore(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  if (!state) {
    return 0
  }

  if (isSeededLineMapRouteSegmentState(state)) {
    return 1
  }

  if (isLineMapRouteSegmentActive(state)) {
    return 3
  }

  return state.updatedAt > 0 ? 2 : 1
}

export function isSeededLineMapRouteSegmentState(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  return Boolean(state && state.updatedAt === 0 && state.trainId === '')
}
