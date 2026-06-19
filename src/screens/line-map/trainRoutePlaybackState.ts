import type { LineMapRuntimeState } from '../../types'
import {
  enforceLineMapRailStateOwnership,
} from './lineMapRailStateAuthority'
import {
  setLineMapRouteSegmentStates,
} from './lineMapRouteSegmentState'
import {
  createTrainMovementRouteSegmentStates,
  getTrainRouteStepFromRouteSegments,
  getTrainRouteStepIndexFromRouteSegments,
} from './scadaRouteState'
import type { TrainRouteAnimationStep } from './trainMovementRoutes'

export function completeTrainRoutePlaybackState(
  lineMap: LineMapRuntimeState,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
): LineMapRuntimeState {
  const routeSegments = { ...lineMap.routeSegments }
  const routeSegmentIds = routeSteps.map((step) => step.segmentId)

  setLineMapRouteSegmentStates(routeSegments, routeSegmentIds, 'UNSET', { trainId })

  enforceLineMapRailStateOwnership(routeSegments, {
    completedTrainId: trainId,
    prioritySegmentIds: routeSegmentIds,
  })

  return {
    ...lineMap,
    routeSegments,
  }
}

export function updateTrainRouteStepState(
  lineMap: LineMapRuntimeState,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
  currentStepIndex: number,
): LineMapRuntimeState {
  const routeSegments = createTrainMovementRouteSegmentStates(
    lineMap.routeSegments,
    trainId,
    routeSteps,
    currentStepIndex,
  )

  enforceLineMapRailStateOwnership(routeSegments, {
    completedTrainId: trainId,
    prioritySegmentIds: routeSteps.map((step) => step.segmentId),
  })

  return {
    ...lineMap,
    routeSegments,
  }
}

export function getTrainRouteStepIndexFromLineMap(
  lineMap: LineMapRuntimeState,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  return getTrainRouteStepIndexFromRouteSegments(lineMap.routeSegments, trainId, routeSteps)
}

export function getTrainRouteStepFromLineMap(
  lineMap: LineMapRuntimeState,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  return getTrainRouteStepFromRouteSegments(lineMap.routeSegments, trainId, routeSteps)
}
