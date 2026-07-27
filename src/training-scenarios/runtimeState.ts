import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import { enforceLineMapRailStateOwnership } from '../screens/line-map/lineMapRailStateAuthority'
import { normalizeLineMapRuntimeState } from '../screens/line-map/lineMapRuntimeState'
import { getDefinedSignalRouteByLabel } from '../screens/line-map/routeDefinitions'
import {
  createSignalRouteSetPatch,
  createTrainMovementRouteSegmentStates,
} from '../screens/line-map/scadaRouteState'
import { RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS } from '../screens/line-map/trainMovementRoutes'
import type { TrainRouteAnimationStep } from '../screens/line-map/trainMovementRoutes'
import type {
  LineMapRouteSegmentState,
  LineMapRuntimeState,
  OccSessionState,
  TrainDirection,
  TrainState,
} from '../types'

export function applyScenarioSignalRouteSet(
  lineMap: LineMapRuntimeState,
  routeLabel: string,
  trainId: string,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeDefinition = getDefinedSignalRouteByLabel(routeLabel)

  if (!routeDefinition) {
    return current
  }

  const routePatch = createSignalRouteSetPatch(routeDefinition, { id: trainId }, 'SET')
  const routeSegments = {
    ...current.routeSegments,
    ...routePatch.routeSegments,
  }

  enforceLineMapRailStateOwnership(routeSegments, {
    prioritySegmentIds: routePatch.prioritySegmentIds,
  })

  return {
    ...current,
    routeSegments,
  }
}

export function applyScenarioTrainRouteStep(
  lineMap: LineMapRuntimeState,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
  currentStepIndex: number,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeSegments = createTrainMovementRouteSegmentStates(
    current.routeSegments,
    trainId,
    routeSteps,
    currentStepIndex,
    {
      shouldPreserveSegmentState: (_segmentId, state) => isActiveRouteStateOwnedByAnotherTrain(state, trainId),
    },
  )

  enforceLineMapRailStateOwnership(routeSegments, {
    completedTrainId: trainId,
    prioritySegmentIds: routeSteps.map((step) => step.segmentId),
  })

  return {
    ...current,
    routeSegments,
  }
}

export function upsertScenarioWorkflowTrain(
  trains: readonly TrainState[],
  trainId: string,
  step: TrainRouteAnimationStep,
  updates: {
    direction: TrainDirection
    isMoving: boolean
    service: string
    status: TrainState['status']
  },
) {
  const existingTrain = trains.find((train) => train.id === trainId)
  const nextTrain: TrainState = {
    ...(existingTrain ?? {
      id: trainId,
      direction: updates.direction,
      service: updates.service,
      status: updates.status,
      x: step.point.x,
      y: step.point.y,
    }),
    direction: updates.direction,
    isMoving: updates.isMoving,
    lineMapVisible: true,
    occupancySegmentId: step.segmentId,
    readinessMode: 'MAINLINE_SERVICE',
    service: updates.service,
    status: updates.status,
    timetablePlayback: existingTrain?.timetablePlayback ?? false,
    trainNumber: existingTrain?.trainNumber ?? trainId,
    x: step.point.x,
    y: step.point.y,
  }

  if (!existingTrain) {
    return [...trains, nextTrain]
  }

  return trains.map((train) => (train.id === trainId ? nextTrain : train))
}

export function upsertScenarioDoorFaultTrain(
  trains: readonly TrainState[],
  trainId: string,
  updates: Pick<TrainState, 'doorFailureState' | 'isMoving' | 'status'>,
) {
  return trains.map((train) => (
    train.id === trainId
      ? {
          ...train,
          doorFailureState: updates.doorFailureState,
          isMoving: updates.isMoving,
          lineMapVisible: true,
          readinessMode: 'MAINLINE_SERVICE' as const,
          status: updates.status,
        }
      : train
  ))
}

export function revealTrainingScenarioTargetTrain(
  trains: readonly TrainState[],
  trainId: string | undefined,
): TrainState[] {
  if (!trainId) {
    return [...trains]
  }

  return trains.map((train) => (
    train.id === trainId
      ? {
          ...train,
          lineMapVisible: true,
          timetablePlayback: false,
        }
      : train
  ))
}

export function stageTrainLaunchScenarioAtSignal(current: OccSessionState, trainId: string) {
  const signalStep = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[1]

  return {
    ...current,
    lineMap: applyScenarioSignalRouteSet(current.lineMap, 'Route R655_617', trainId),
    selectedTrainId: trainId,
    trains: upsertScenarioWorkflowTrain(
      current.trains,
      trainId,
      signalStep,
      {
        direction: 'right',
        isMoving: false,
        service: 'NB',
        status: 'WAIT',
      },
    ),
  }
}

export function appendTrainingScenarioEvidence(
  current: OccSessionState,
  source: string,
  action: string,
  detail: string,
) {
  const alreadyLogged = current.evidenceLog.some((evidence) => (
    evidence.source === source
    && evidence.action === action
    && evidence.detail === detail
  ))

  if (alreadyLogged) {
    return current
  }

  return {
    ...current,
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(source, action, 'accepted', detail),
    ),
  }
}

function isActiveRouteStateOwnedByAnotherTrain(
  state: LineMapRouteSegmentState | undefined,
  trainId: string,
) {
  return Boolean(
    state?.trainId
    && state.trainId !== trainId
    && (state.status === 'DISPATCHED' || state.status === 'HELD'),
  )
}
