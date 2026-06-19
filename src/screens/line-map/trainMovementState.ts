import type { TrainTimeSelection } from '../../components/train-control/trainTimeOptions'
import type { LineMapRuntimeState, TrainState } from '../../types'
import {
  S608_R608_803_REAL_ROUTE_SEGMENT_IDS,
  S610_REAL_ROUTE_SEGMENT_IDS,
} from './routeDefinitions'
import type { TimetablePlaybackPlan } from './timetablePlayback'
import { upsertTimetablePlaybackTrain } from './timetablePlayback'
import {
  getClosestTrainRoutePointIndex,
  getVisibleTrainRoutePointIndex,
  resolveTrainMovementAuthority,
} from './trainMovementAuthority'
import type {
  TrainRouteAnimationPoint,
  TrainRouteAnimationStep,
} from './trainMovementRoutes'
import {
  completeTrainRoutePlaybackState,
  getTrainRouteStepIndexFromLineMap,
  updateTrainRouteStepState,
} from './trainRoutePlaybackState'
import {
  withLineMapRailStateOwnership,
} from './lineMapRailStateAuthority'
import {
  clearLineMapRouteSegmentState,
} from './lineMapRouteSegmentState'

export type AllowedTrainMovementAuthority = Extract<ReturnType<typeof resolveTrainMovementAuthority>, { allowed: true }>

export type ManualTrainRoutePlan = {
  allowed: true
  authority: AllowedTrainMovementAuthority
  currentPoint: TrainRouteAnimationPoint
  currentStepIndex: number
  lastStepIndex: number
  train: TrainState | undefined
} | {
  allowed: false
  reason: string
}

type TrainMovementSessionState = {
  lineMap: LineMapRuntimeState
  selectedTrainId: string
  trains: readonly TrainState[]
}

export function createManualTrainRoutePlan({
  arrivalDestinations,
  fallbackStepIndex,
  lineMap,
  trainId,
  trains,
}: {
  arrivalDestinations: Record<string, TrainTimeSelection>
  fallbackStepIndex?: number | null
  lineMap: LineMapRuntimeState
  trainId: string
  trains: readonly TrainState[]
}): ManualTrainRoutePlan {
  const arrivalDestination = arrivalDestinations[trainId]
  const currentTrain = trains.find((train) => train.id === trainId)
  const authority = resolveTrainMovementAuthority(currentTrain, arrivalDestination)

  if (!authority.allowed) {
    return authority
  }

  const routePoints = authority.movementRouteSteps.map((step) => step.point)
  const currentStepIndex = getManualTrainRouteCurrentStepIndex({
    authority,
    fallbackStepIndex,
    lineMap,
    routePoints,
    train: currentTrain,
    trainId,
  })

  return {
    allowed: true,
    authority,
    currentPoint: authority.movementRouteSteps[currentStepIndex].point,
    currentStepIndex,
    lastStepIndex: authority.movementRouteSteps.length - 1,
    train: currentTrain,
  }
}

export function clearManualTrainRouteSegmentOverrides(
  currentRouteSegments: LineMapRuntimeState['routeSegments'],
  authority: AllowedTrainMovementAuthority,
) {
  const next = { ...currentRouteSegments }

  authority.movementRouteSteps.forEach((step) => {
    clearLineMapRouteSegmentState(next, step.segmentId)
  })

  getManualTrainRouteOverrideSegmentIds(authority).forEach((segmentId) => {
    clearLineMapRouteSegmentState(next, segmentId)
  })

  return withLineMapRailStateOwnership(next)
}

export function applyManualTrainRouteStepState<T extends TrainMovementSessionState>(
  current: T,
  trainId: string,
  authority: AllowedTrainMovementAuthority,
  stepIndex: number,
): T {
  const lastStepIndex = authority.movementRouteSteps.length - 1
  const boundedStepIndex = Math.min(Math.max(0, stepIndex), lastStepIndex)
  const currentStep = authority.movementRouteSteps[boundedStepIndex]

  return {
    ...current,
    lineMap: updateTrainRouteStepState(
      current.lineMap,
      trainId,
      authority.stateRouteSteps,
      authority.getStateRouteStepIndex(boundedStepIndex),
    ),
    selectedTrainId: trainId,
    trains: current.trains.map((train) => (
      train.id === trainId
        ? {
            ...train,
            direction: 'left',
            isMoving: boundedStepIndex < lastStepIndex,
            lineMapVisible: true,
            occupancySegmentId: currentStep.segmentId,
            service: 'SB',
            status: 'RUN',
            timetablePlayback: false,
            x: currentStep.point.x,
            y: currentStep.point.y,
          }
        : train
    )),
  }
}

export function applyTimetablePlaybackStepState<T extends TrainMovementSessionState>(
  current: T,
  plan: TimetablePlaybackPlan,
  step: TrainRouteAnimationStep,
  stepIndex: number,
  lastStepIndex: number,
): T {
  const routePlaybackComplete = Boolean(plan.routeSteps && stepIndex >= lastStepIndex)

  return {
    ...current,
    lineMap: plan.routeSteps
      ? routePlaybackComplete
        ? completeTrainRoutePlaybackState(current.lineMap, plan.trainId, plan.routeSteps)
        : updateTrainRouteStepState(current.lineMap, plan.trainId, plan.routeSteps, stepIndex)
      : current.lineMap,
    selectedTrainId: plan.routeSteps && !routePlaybackComplete ? plan.trainId : current.selectedTrainId,
    trains: upsertTimetablePlaybackTrain(current.trains, plan, step, stepIndex, lastStepIndex),
  }
}

function getManualTrainRouteCurrentStepIndex({
  authority,
  fallbackStepIndex,
  lineMap,
  routePoints,
  train,
  trainId,
}: {
  authority: AllowedTrainMovementAuthority
  fallbackStepIndex?: number | null
  lineMap: LineMapRuntimeState
  routePoints: readonly TrainRouteAnimationPoint[]
  train: TrainState | undefined
  trainId: string
}) {
  return getVisibleTrainRoutePointIndex(train, routePoints)
    ?? getTrainRouteStepIndexFromLineMap(lineMap, trainId, authority.movementRouteSteps)
    ?? fallbackStepIndex
    ?? getClosestTrainRoutePointIndex(train, routePoints)
}

function getManualTrainRouteOverrideSegmentIds(authority: AllowedTrainMovementAuthority) {
  if (authority.routeLabel === 'Route R608_803') {
    return S608_R608_803_REAL_ROUTE_SEGMENT_IDS
  }

  if (authority.routeLabel === 'Route R610_652') {
    return S610_REAL_ROUTE_SEGMENT_IDS
  }

  return []
}
