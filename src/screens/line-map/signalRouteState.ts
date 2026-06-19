import type { LineMapRuntimeState } from '../../types'
import type { LineMapSignalData } from './model'
import {
  getDefinedSignalRoute,
  getDefinedSignalRoutes,
  type SignalRouteDefinition,
} from './routeDefinitions'

export function getSignalTrackSegmentId(signal: Pick<LineMapSignalData, 'x'>) {
  return `track:${Math.round(signal.x)}`
}

export function getSignalRouteLabels(signalLabel: string) {
  return getDefinedSignalRoutes(signalLabel).map((route) => route.routeLabel)
}

export function getSignalRouteCommandLabels(signalLabel: string) {
  return getDefinedSignalRoutes(signalLabel)
    .filter(isSignalRouteDefinitionCommandable)
    .map((route) => route.routeLabel)
}

export function getSignalRouteDefinition(signalLabel: string, routeLabel: string): SignalRouteDefinition | undefined {
  return getDefinedSignalRoute(signalLabel, routeLabel)
}

export function isSignalRouteDefinitionCommandable(
  routeDefinition: SignalRouteDefinition | undefined,
): routeDefinition is SignalRouteDefinition {
  return Boolean(
    routeDefinition
    && !routeDefinition.pendingImplementation
    && routeDefinition.commandSegmentIds.length > 0
    && routeDefinition.commandStateSegmentIds.length > 0
    && routeDefinition.realSegmentIds.length > 0,
  )
}

export function getSignalRouteCommandStateSegmentIds(signalLabel: string, routeLabel: string) {
  return getSignalRouteDefinition(signalLabel, routeLabel)?.commandStateSegmentIds ?? []
}

export function getSignalRouteStateIds(signal: Pick<LineMapSignalData, 'label' | 'x'>) {
  return [
    getSignalTrackSegmentId(signal),
    ...getDefinedSignalRoutes(signal.label).flatMap((route) => route.commandStateSegmentIds),
  ]
}

export function getSignalRouteSetLabels(signalLabel: string, lineMap: LineMapRuntimeState) {
  return getSignalRouteLabels(signalLabel).filter((routeLabel) => (
    getSignalRouteCommandStateSegmentIds(signalLabel, routeLabel)
      .some((segmentId) => isSignalRouteCommandState(lineMap.routeSegments[segmentId]))
  ))
}

export function isLineMapRouteSegmentActive(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  return Boolean(state && ['DISPATCHED', 'HELD', 'SET'].includes(state.status))
}

export function isSignalRouteCommandState(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  return Boolean(isLineMapRouteSegmentActive(state) && state && (state.trainId || state.updatedAt > 0))
}

export function getSignalRouteLampTone(
  signal: Pick<LineMapSignalData, 'label' | 'x'>,
  lineMap: LineMapRuntimeState,
): 'red' | 'white' {
  return getSignalRouteStateIds(signal).some((segmentId) => (
    isSignalRouteCommandState(lineMap.routeSegments[segmentId])
  ))
    ? 'white'
    : 'red'
}
