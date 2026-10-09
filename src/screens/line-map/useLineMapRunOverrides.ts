import { useCallback, useMemo, useState } from 'react'
import type { SetStateAction } from 'react'
import { isManualMovementArrivalDestination } from '../../components/train-control/trainTimeOptions'
import type { TrainTimeSelection } from '../../components/train-control/trainTimeOptions'
import { getTrainingScenarioDefinition } from '../../training-scenarios/definitions'
import type {
  LineMapRuntimeState,
  OccSessionState,
  RouteControlMode,
  TrainReadinessMode,
} from '../../types'

type RouteFleetStatus = 'Fleet' | 'Not Fleet'

type RunScopedState<T> = {
  resetKey: string
  value: T
}

function useRunScopedRecord<T extends object>(resetKey: string) {
  const [state, setState] = useState<RunScopedState<T>>({
    resetKey,
    value: {} as T,
  })
  const value = useMemo(
    () => state.resetKey === resetKey ? state.value : {} as T,
    [resetKey, state],
  )
  const setValue = useCallback((update: SetStateAction<T>) => {
    setState((current) => {
      const currentValue = current.resetKey === resetKey ? current.value : {} as T

      return {
        resetKey,
        value: typeof update === 'function'
          ? (update as (currentValue: T) => T)(currentValue)
          : update,
      }
    })
  }, [resetKey])

  return [value, setValue] as const
}

export function createLineMapRunScopeKey(session: OccSessionState) {
  const sessionIdentity = `${session.sessionMeta.createdAt}:${session.scenarioRevision}`

  return session.scenarioMode === 'IDLE' && session.scenarioStep === 0
    ? `${sessionIdentity}:idle`
    : `${sessionIdentity}:run:${session.sessionMeta.startedAt ?? 'active'}`
}

export default function useLineMapRunOverrides(session: OccSessionState) {
  const resetKey = createLineMapRunScopeKey(session)
  const [trainItamaStatusOverrides, setTrainItamaStatusOverrides] = useRunScopedRecord<
    Record<string, 'GRANTED' | 'NOT_GRANTED'>
  >(resetKey)
  const [trainReadinessModeOverrides, setTrainReadinessModeOverrides] = useRunScopedRecord<
    Record<string, TrainReadinessMode>
  >(resetKey)
  const [routeControlModes, setRouteControlModes] = useRunScopedRecord<Record<string, RouteControlMode>>(resetKey)
  const [routeFleetStatuses, setRouteFleetStatuses] = useRunScopedRecord<Record<string, RouteFleetStatus>>(resetKey)
  const [trainArrivalDestinations, setTrainArrivalDestinations] = useRunScopedRecord<
    Record<string, TrainTimeSelection>
  >(resetKey)
  const [manualMovementTrainIdRecord, setManualMovementTrainIds] = useRunScopedRecord<Record<string, true>>(resetKey)
  const [lineMapRouteSegmentOverrides, setLineMapRouteSegmentOverrides] = useRunScopedRecord<
    LineMapRuntimeState['routeSegments']
  >(resetKey)
  const manualMovementTrainIds = useMemo(
    () => new Set(Object.keys(manualMovementTrainIdRecord)),
    [manualMovementTrainIdRecord],
  )
  const manualDestinationTrainIds = useMemo(() => (
    new Set(Object.entries(trainArrivalDestinations)
      .filter(([, selection]) => isManualMovementArrivalDestination(selection))
      .map(([trainId]) => trainId))
  ), [trainArrivalDestinations])
  const scenarioBlockedTimetableTrainIds = useMemo(() => {
    const activeScenarioDefinition = getTrainingScenarioDefinition(session.activeScenario.id)
    const targetTrainId = session.activeScenario.targetTrainId

    if (activeScenarioDefinition.kind === 'TRAIN_LAUNCH' && targetTrainId && !session.scenarioTasks.dispatchTrain) {
      return new Set([targetTrainId])
    }

    // The fault train is placed at the incident platform; timetable playback must not move it.
    if (activeScenarioDefinition.fault && targetTrainId && session.scenarioMode !== 'IDLE') {
      return new Set([targetTrainId])
    }

    return new Set<string>()
  }, [session.activeScenario.id, session.activeScenario.targetTrainId, session.scenarioMode, session.scenarioTasks.dispatchTrain])
  const timetableBlockedTrainIds = useMemo(() => (
    new Set([
      ...manualMovementTrainIds,
      ...manualDestinationTrainIds,
      ...scenarioBlockedTimetableTrainIds,
    ])
  ), [manualDestinationTrainIds, manualMovementTrainIds, scenarioBlockedTimetableTrainIds])

  return {
    lineMapRouteSegmentOverrides,
    routeControlModes,
    routeFleetStatuses,
    setLineMapRouteSegmentOverrides,
    setManualMovementTrainIds,
    setRouteControlModes,
    setRouteFleetStatuses,
    setTrainArrivalDestinations,
    setTrainItamaStatusOverrides,
    setTrainReadinessModeOverrides,
    timetableBlockedTrainIds,
    trainArrivalDestinations,
    trainItamaStatusOverrides,
    trainReadinessModeOverrides,
  }
}
