import type { LineMapRouteSegmentStatus, LineMapRuntimeState, TrainState } from '../../types'
import type { SignalRouteDefinition } from './routeDefinitions'
import type { TrainRouteAnimationStep } from './trainMovementRoutes'
import {
  createLineMapRouteSegmentStates,
  setLineMapRouteSegmentState,
} from './lineMapRouteSegmentState'

export function createRouteCommandSegmentStates(
  segmentIds: readonly string[],
  train: Pick<TrainState, 'id'>,
  status: LineMapRouteSegmentStatus,
): LineMapRuntimeState['routeSegments'] {
  return createLineMapRouteSegmentStates(segmentIds, status, { trainId: train.id })
}

export function createUnsetRouteSegmentStates(
  routeSegmentIds: readonly string[],
): LineMapRuntimeState['routeSegments'] {
  return createLineMapRouteSegmentStates(routeSegmentIds, 'UNSET')
}

export function createSignalRouteSetPatch(
  routeDefinition: SignalRouteDefinition,
  train: Pick<TrainState, 'id'>,
  status: LineMapRouteSegmentStatus,
) {
  return {
    prioritySegmentIds: routeDefinition.realSegmentIds,
    routeSegments: createRouteCommandSegmentStates(routeDefinition.commandSegmentIds, train, status),
  }
}

export function createSignalRouteUnsetPatch(routeDefinition: SignalRouteDefinition) {
  if (routeDefinition.keepRealSegmentsUnsetOnUnset) {
    return {
      prioritySegmentIds: routeDefinition.realSegmentIds,
      removeSegmentIds: routeDefinition.commandStateSegmentIds,
      resetSegmentIds: [] as string[],
      routeSegments: createUnsetRouteSegmentStates(routeDefinition.realSegmentIds),
    }
  }

  return {
    prioritySegmentIds: [] as string[],
    removeSegmentIds: [] as string[],
    resetSegmentIds: routeDefinition.commandSegmentIds,
    routeSegments: {},
  }
}

export function getSignalRouteCommandMarkerSegmentIds(routeDefinition: SignalRouteDefinition) {
  const realSegmentIdSet = new Set(routeDefinition.realSegmentIds)

  return routeDefinition.commandStateSegmentIds.filter((segmentId) => !realSegmentIdSet.has(segmentId))
}

export function shouldClearCompletedRouteCommandState(
  routeSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
  commandSegmentId: string,
  routeSegmentIds: readonly string[],
  isCommandState: (state: LineMapRuntimeState['routeSegments'][string] | undefined) => boolean,
) {
  if (!isCommandState(routeSegments[commandSegmentId])) {
    return false
  }

  return routeSegmentIds.every((segmentId) => {
    const state = routeSegments[segmentId]

    return state?.status === 'UNSET' && state.trainId === trainId
  })
}

export function createTrainMovementRouteSegmentStates(
  currentRouteSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
  currentStepIndex: number,
) {
  const routeSegments = { ...currentRouteSegments }
  const updatedAt = Date.now()

  routeSteps.forEach((step, stepIndex) => {
    setLineMapRouteSegmentState(
      routeSegments,
      step.segmentId,
      getTrainMovementStepStatus(stepIndex, currentStepIndex),
      { trainId, updatedAt },
    )
  })

  return routeSegments
}

export function getTrainMovementStepStatus(
  stepIndex: number,
  currentStepIndex: number,
): LineMapRouteSegmentStatus {
  if (stepIndex < currentStepIndex) {
    return 'UNSET'
  }

  if (stepIndex === currentStepIndex || stepIndex === currentStepIndex + 1) {
    return 'DISPATCHED'
  }

  return 'SET'
}

export function getTrainRouteStepIndexFromRouteSegments(
  routeSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  const dispatchedStepIndex = routeSteps.findIndex((step) => {
    const state = routeSegments[step.segmentId]

    return state?.status === 'DISPATCHED' && state.trainId === trainId
  })

  return dispatchedStepIndex >= 0 ? dispatchedStepIndex : undefined
}

export function getTrainRouteStepFromRouteSegments(
  routeSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  return routeSteps.find((step) => {
    const state = routeSegments[step.segmentId]

    return state?.status === 'DISPATCHED' && state.trainId === trainId
  })
}
