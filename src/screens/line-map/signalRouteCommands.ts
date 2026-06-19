import type { LineMapRuntimeState, OccSessionState, TrainState } from '../../types'
import {
  createMonitorEvent,
  createSummaryEvent,
  upsertTimetableRow,
} from '../../scenarioWorkflow'
import type { LineMapSignalData } from './model'
import {
  createSignalRouteSetPatch,
  createSignalRouteUnsetPatch,
} from './scadaRouteState'
import {
  getSignalRouteDefinition,
  isSignalRouteDefinitionCommandable,
} from './signalRouteState'
import {
  clearLineMapSignalTrackState,
  getSignalEquipmentLabel,
  updateLineMapSignalTrackState,
} from './lineMapRouteState'
import {
  withLineMapRailStateOwnership,
} from './lineMapRailStateAuthority'
import {
  clearLineMapRouteSegmentStates,
} from './lineMapRouteSegmentState'

export function getSignalRouteTargetTrain(trains: readonly TrainState[], selectedTrainId: string) {
  return trains.find((train) => train.id === selectedTrainId)
    ?? trains.find((train) => train.id === '314')
    ?? trains.find((train) => train.id === '317')
    ?? trains[0]
}

export function hasSignalRouteCommand(signal: Pick<LineMapSignalData, 'label'>, routeLabel: string) {
  return isSignalRouteDefinitionCommandable(getSignalRouteDefinition(signal.label, routeLabel))
}

export function shouldResetTrainRouteIndexForSignal(signal: Pick<LineMapSignalData, 'label'>) {
  return signal.label === 'S610'
}

export function createSignalRouteSetOverrideSegments(
  currentRouteSegments: LineMapRuntimeState['routeSegments'],
  signal: Pick<LineMapSignalData, 'label'>,
  routeLabel: string,
  routeOwner: Pick<TrainState, 'id'>,
) {
  const routeDefinition = getSignalRouteDefinition(signal.label, routeLabel)

  if (!isSignalRouteDefinitionCommandable(routeDefinition)) {
    return currentRouteSegments
  }

  const routePatch = createSignalRouteSetPatch(routeDefinition, routeOwner, 'SET')

  return withLineMapRailStateOwnership({
    ...currentRouteSegments,
    ...routePatch.routeSegments,
  }, { prioritySegmentIds: routePatch.prioritySegmentIds })
}

export function createSignalRouteUnsetOverrideSegments(
  currentRouteSegments: LineMapRuntimeState['routeSegments'],
  signal: Pick<LineMapSignalData, 'label'>,
  routeLabel: string,
) {
  const routeDefinition = getSignalRouteDefinition(signal.label, routeLabel)

  if (!isSignalRouteDefinitionCommandable(routeDefinition)) {
    return currentRouteSegments
  }

  const next = { ...currentRouteSegments }
  const routePatch = createSignalRouteUnsetPatch(routeDefinition)

  clearLineMapRouteSegmentStates(next, routePatch.removeSegmentIds)
  clearLineMapRouteSegmentStates(next, routePatch.resetSegmentIds)

  Object.assign(next, routePatch.routeSegments)

  return withLineMapRailStateOwnership(next, { prioritySegmentIds: routePatch.prioritySegmentIds })
}

export function applySignalRouteSetSession(
  current: OccSessionState,
  signal: LineMapSignalData,
  routeLabel: string,
): OccSessionState {
  const targetTrain = getSignalRouteTargetTrain(current.trains, current.selectedTrainId)
  const routeOwner = targetTrain ?? { id: '' }
  const event = targetTrain
    ? createMonitorEvent(
        targetTrain.id,
        `${routeLabel} set from ${signal.label}`,
        'SET',
        'yellow',
      )
    : null

  return {
    ...current,
    ...(event
      ? {
          alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
          eventRows: [event, ...current.eventRows].slice(0, 4),
        }
      : {}),
    lineMap: updateLineMapSignalTrackState(
      current.lineMap,
      signal,
      routeOwner,
      'SET',
      routeLabel,
    ),
    scenarioNotice: {
      text: targetTrain
        ? `${routeLabel} set from ${getSignalEquipmentLabel(signal)} for Train ${targetTrain.id}.`
        : `${routeLabel} set from ${getSignalEquipmentLabel(signal)}.`,
      tone: 'info',
    },
    ...(targetTrain
      ? {
          selectedTrainId: targetTrain.id,
          timetableRows: upsertTimetableRow(current.timetableRows, targetTrain.id, 'R'),
        }
      : {}),
  }
}

export function applySignalRouteUnsetSession(
  current: OccSessionState,
  signal: LineMapSignalData,
  routeLabel: string,
): OccSessionState {
  const targetTrain = getSignalRouteTargetTrain(current.trains, current.selectedTrainId)

  return {
    ...current,
    lineMap: clearLineMapSignalTrackState(current.lineMap, signal, routeLabel),
    scenarioNotice: {
      text: `${routeLabel} unset from ${getSignalEquipmentLabel(signal)}.`,
      tone: 'info',
    },
    ...(targetTrain ? { selectedTrainId: targetTrain.id } : {}),
  }
}
