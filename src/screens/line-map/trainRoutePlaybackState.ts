import type { LineMapRouteSegmentState, LineMapRuntimeState, TrainState } from '../../types'
import {
  enforceLineMapRailStateOwnership,
} from './lineMapRailStateAuthority'
import {
  clearLineMapRouteSegmentState,
  setLineMapRouteSegmentState,
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
  const updatedAt = Date.now()

  routeSegmentIds.forEach((segmentId) => {
    if (isOwnedByAnotherTrain(routeSegments[segmentId], trainId)) {
      return
    }

    setLineMapRouteSegmentState(routeSegments, segmentId, 'UNSET', { trainId, updatedAt })
  })

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
  const cleanedLineMap = clearTrainOwnedRoutePlaybackState(lineMap, trainId)
  const routeSegments = createTrainMovementRouteSegmentStates(
    cleanedLineMap.routeSegments,
    trainId,
    routeSteps,
    currentStepIndex,
    {
      shouldPreserveSegmentState: (_segmentId, state) => (
        isActiveRoutePlaybackStateOwnedByAnotherTrain(state, trainId)
      ),
    },
  )

  enforceLineMapRailStateOwnership(routeSegments, {
    completedTrainId: trainId,
    prioritySegmentIds: routeSteps.map((step) => step.segmentId),
  })

  return {
    ...cleanedLineMap,
    routeSegments,
  }
}

export function clearTrainOwnedRoutePlaybackState(
  lineMap: LineMapRuntimeState,
  trainId: string,
): LineMapRuntimeState {
  const routeSegments = { ...lineMap.routeSegments }

  Object.entries(routeSegments).forEach(([segmentId, state]) => {
    if (state.trainId === trainId) {
      clearLineMapRouteSegmentState(routeSegments, segmentId)
    }
  })

  enforceLineMapRailStateOwnership(routeSegments)

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

export function getTrainRouteStepFromTrainOccupancyOrLineMap(
  lineMap: LineMapRuntimeState,
  train: Pick<TrainState, 'id' | 'occupancySegmentId'>,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  const occupancyStep = train.occupancySegmentId
    ? routeSteps.find((step) => step.segmentId === train.occupancySegmentId)
    : undefined

  return occupancyStep ?? getTrainRouteStepFromLineMap(lineMap, train.id, routeSteps)
}

function isOwnedByAnotherTrain(
  state: LineMapRouteSegmentState | undefined,
  trainId: string,
) {
  return Boolean(state?.trainId && state.trainId !== trainId)
}

function isActiveRoutePlaybackStateOwnedByAnotherTrain(
  state: LineMapRouteSegmentState | undefined,
  trainId: string,
) {
  return isOwnedByAnotherTrain(state, trainId)
    && (state?.status === 'DISPATCHED' || state?.status === 'HELD')
}
