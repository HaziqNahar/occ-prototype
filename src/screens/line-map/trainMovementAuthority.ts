import type { TrainTimeSelection } from '../../components/train-control/trainTimeOptions'
import { hasTrainMovementDestination, isRt2DepotArrivalDestination } from '../../components/train-control/trainTimeOptions'
import type { TrainState } from '../../types'
import {
  TRAIN_ROUTE_STEP_POSITION_TOLERANCE,
} from './trainMovementRoutes'
import type { TrainRouteAnimationPoint, TrainRouteAnimationStep } from './trainMovementRoutes'
import {
  getManualLineMapRoutePath,
  getManualLineMapRoutePathStateStepIndex,
} from './lineMapRoutePaths'

export type TrainMovementAuthorityDecision = {
  allowed: true
  movementRouteSteps: readonly TrainRouteAnimationStep[]
  routeLabel: string
  routeLabels: readonly string[]
  stateRouteSteps: readonly TrainRouteAnimationStep[]
  getStateRouteStepIndex: (movementStepIndex: number) => number
} | {
  allowed: false
  reason: string
}

export function resolveTrainMovementAuthority(
  train: TrainState | undefined,
  arrivalDestination: TrainTimeSelection | undefined,
): TrainMovementAuthorityDecision {
  const trainId = train?.id ?? ''

  if (!hasTrainMovementDestination(arrivalDestination)) {
    return {
      allowed: false,
      reason: `Train ${trainId} departure rejected. Set Arrival Time Station and Platform / Siding first.`,
    }
  }

  const isRt2DepotMove = isRt2DepotArrivalDestination(arrivalDestination)
  const routePath = getManualLineMapRoutePath(trainId, isRt2DepotMove ? 'RT2_DEPOT' : 'ANY')

  if (!routePath) {
    return {
      allowed: false,
      reason: `Train ${trainId} departure rejected. No movement authority is defined for this train yet.`,
    }
  }

  if (routePath.requiresStartAtFirstStep && getVisibleTrainRouteStepIndex(train, routePath.movementRouteSteps) !== 0) {
    return {
      allowed: false,
      reason: `Train ${trainId} must be waiting at S608 before it can move to NED / RT2D.`,
    }
  }

  return {
    allowed: true,
    getStateRouteStepIndex: (movementStepIndex) => getManualLineMapRoutePathStateStepIndex(routePath, movementStepIndex),
    movementRouteSteps: routePath.movementRouteSteps,
    routeLabel: routePath.routeLabel,
    routeLabels: routePath.routeLabels,
    stateRouteSteps: routePath.stateRouteSteps,
  }
}

export function getClosestTrainRoutePointIndex(
  train: TrainState | undefined,
  routePoints: readonly TrainRouteAnimationPoint[],
) {
  if (!train) {
    return 0
  }

  return routePoints.reduce((closestIndex, point, pointIndex) => {
    const closestPoint = routePoints[closestIndex]
    const pointDistance = Math.hypot(train.x - point.x, train.y - point.y)
    const closestDistance = Math.hypot(train.x - closestPoint.x, train.y - closestPoint.y)

    return pointDistance < closestDistance ? pointIndex : closestIndex
  }, 0)
}

export function getVisibleTrainRoutePointIndex(
  train: TrainState | undefined,
  routePoints: readonly TrainRouteAnimationPoint[],
) {
  if (!train) {
    return undefined
  }

  const closestIndex = getClosestTrainRoutePointIndex(train, routePoints)
  const closestPoint = routePoints[closestIndex]
  const distance = Math.hypot(train.x - closestPoint.x, train.y - closestPoint.y)

  return distance <= TRAIN_ROUTE_STEP_POSITION_TOLERANCE ? closestIndex : undefined
}

export function getVisibleTrainRouteStepIndex(
  train: TrainState | undefined,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  return getVisibleTrainRoutePointIndex(train, routeSteps.map((step) => step.point))
}
