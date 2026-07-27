import type { TrainTimeSelection } from '../../components/train-control/trainTimeOptions'
import {
  hasTrainMovementDestination,
  isRt2DepotArrivalDestination,
  isSkgArrivalDestination,
} from '../../components/train-control/trainTimeOptions'
import type { LineMapRuntimeState, TrainDirection, TrainState } from '../../types'
import {
  getTrainReadinessMode,
  isTrainItamaGranted,
} from './model'
import {
  TRAIN_ROUTE_STEP_POSITION_TOLERANCE,
} from './trainMovementRoutes'
import type { TrainRouteAnimationPoint, TrainRouteAnimationStep } from './trainMovementRoutes'
import {
  getManualLineMapRoutePathCandidates,
  getManualLineMapRoutePathLatestSetRouteUpdatedAt,
  getManualLineMapRoutePathSetRouteCount,
  getManualLineMapRoutePathStateStepIndex,
} from './lineMapRoutePaths'
import type { ManualLineMapRoutePathDefinition, ManualRouteDestinationKind } from './lineMapRoutePaths'

export type TrainMovementAuthorityDecision = {
  allowed: true
  direction: TrainDirection
  movementRouteSteps: readonly TrainRouteAnimationStep[]
  routeLabel: string
  routeLabels: readonly string[]
  service: 'NB' | 'SB'
  stateRouteSteps: readonly TrainRouteAnimationStep[]
  getStateRouteStepIndex: (movementStepIndex: number) => number
} | {
  allowed: false
  reason: string
}

export function resolveTrainMovementAuthority(
  train: TrainState | undefined,
  arrivalDestination: TrainTimeSelection | undefined,
  lineMap?: LineMapRuntimeState,
): TrainMovementAuthorityDecision {
  const trainId = train?.id ?? ''

  if (train && !isManualMovementReadinessAllowed(getTrainReadinessMode(train))) {
    return {
      allowed: false,
      reason: `Train ${trainId} departure rejected. Train must be Mainline Service or Mainline Off Service before manual movement.`,
    }
  }

  if (train && !isTrainItamaGranted(train)) {
    return {
      allowed: false,
      reason: `Train ${trainId} departure rejected. Train ITAMA status must be Granted before movement.`,
    }
  }

  if (!hasTrainMovementDestination(arrivalDestination)) {
    return {
      allowed: false,
      reason: `Train ${trainId} departure rejected. Set Arrival Time Station and Platform / Siding first.`,
    }
  }

  const destinationKind = getManualRouteDestinationKind(arrivalDestination)

  if (!destinationKind) {
    return {
      allowed: false,
      reason: `Train ${trainId} departure rejected. No movement authority is defined for ${arrivalDestination?.station ?? ''} / ${arrivalDestination?.platformSiding ?? ''} yet.`,
    }
  }

  const routePath = getSetManualLineMapRoutePath(train, trainId, destinationKind, lineMap)
    ?? getClosestManualLineMapRoutePath(train, trainId, destinationKind)

  if (!routePath) {
    return {
      allowed: false,
      reason: `Train ${trainId} departure rejected. No ${destinationKind} movement authority is defined for this train yet.`,
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
    direction: routePath.direction ?? 'left',
    getStateRouteStepIndex: (movementStepIndex) => getManualLineMapRoutePathStateStepIndex(routePath, movementStepIndex),
    movementRouteSteps: routePath.movementRouteSteps,
    routeLabel: routePath.routeLabel,
    routeLabels: routePath.routeLabels,
    service: routePath.service ?? 'SB',
    stateRouteSteps: routePath.stateRouteSteps,
  }
}

function getManualRouteDestinationKind(
  arrivalDestination: TrainTimeSelection | undefined,
): ManualRouteDestinationKind | undefined {
  if (isRt2DepotArrivalDestination(arrivalDestination)) {
    return 'RT2_DEPOT'
  }

  if (isSkgArrivalDestination(arrivalDestination)) {
    if (arrivalDestination && arrivalDestination.platformSiding.trim().toUpperCase() === 'SKGN') {
      return 'SKG_NB_LAUNCH'
    }

    return 'SKG'
  }

  return undefined
}

function isManualMovementReadinessAllowed(readinessMode: ReturnType<typeof getTrainReadinessMode>) {
  return readinessMode === 'MAINLINE_SERVICE' || readinessMode === 'MAINLINE_OFF_SERVICE'
}

function getClosestManualLineMapRoutePath(
  train: TrainState | undefined,
  trainId: string,
  destinationKind: ManualRouteDestinationKind,
): ManualLineMapRoutePathDefinition | undefined {
  const routePaths = getManualLineMapRoutePathCandidates(trainId, destinationKind)

  if (routePaths.length <= 1) {
    return routePaths[0]
  }

  return routePaths.reduce((closestRoutePath, routePath) => {
    return getManualRoutePathDistance(train, routePath) < getManualRoutePathDistance(train, closestRoutePath)
      ? routePath
      : closestRoutePath
  }, routePaths[0])
}

function getSetManualLineMapRoutePath(
  train: TrainState | undefined,
  trainId: string,
  destinationKind: ManualRouteDestinationKind,
  lineMap: LineMapRuntimeState | undefined,
): ManualLineMapRoutePathDefinition | undefined {
  if (!lineMap) {
    return undefined
  }

  const routePaths = getManualLineMapRoutePathCandidates(trainId, destinationKind)
  const setRoutePaths = routePaths
    .map((routePath) => ({
      latestSetRouteUpdatedAt: getManualLineMapRoutePathLatestSetRouteUpdatedAt(routePath, lineMap.routeSegments),
      routePath,
      setCount: getManualLineMapRoutePathSetRouteCount(routePath, lineMap.routeSegments),
    }))
    .filter((entry) => entry.setCount > 0)

  if (setRoutePaths.length === 0) {
    return undefined
  }

  return setRoutePaths.reduce((best, entry) => {
    if (entry.latestSetRouteUpdatedAt > best.latestSetRouteUpdatedAt) {
      return entry
    }

    if (entry.latestSetRouteUpdatedAt < best.latestSetRouteUpdatedAt) {
      return best
    }

    const entryDistance = getManualRoutePathDistance(train, entry.routePath)
    const bestDistance = getManualRoutePathDistance(train, best.routePath)

    if (entryDistance < bestDistance) {
      return entry
    }

    if (entryDistance === bestDistance && entry.setCount > best.setCount) {
      return entry
    }

    return best
  }).routePath
}

function getManualRoutePathDistance(
  train: TrainState | undefined,
  routePath: ManualLineMapRoutePathDefinition,
) {
  const routePoints = routePath.movementRouteSteps.map((step) => step.point)
  const closestPoint = routePoints[getClosestTrainRoutePointIndex(train, routePoints)]

  if (!train || !closestPoint) {
    return 0
  }

  return Math.hypot(train.x - closestPoint.x, train.y - closestPoint.y)
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
