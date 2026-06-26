import type { LineMapPlatformDoorStatus, LineMapRuntimeState } from '../../types'
import type { TimetablePlatformStopDefinition } from './lineMapRoutePaths'
import type { TimetablePlatformDoorPhase } from './timetableStationStopState'
export type { TimetablePlatformDoorPhase } from './timetableStationStopState'
export {
  TIMETABLE_PLATFORM_DOOR_HOLD_MS,
  TIMETABLE_PLATFORM_DOOR_PHASE_OFFSETS_MS,
  TIMETABLE_PLATFORM_DOOR_PHASES,
} from './timetableStationStopState'

export function getPlatformDoorStateKey(stop: Pick<TimetablePlatformStopDefinition, 'platformCode' | 'track'>) {
  return `${stop.platformCode}-${stop.track}`
}

export function getPlatformDoorStatusForPhase(phase: TimetablePlatformDoorPhase): LineMapPlatformDoorStatus {
  if (phase === 'CYCLING') {
    return 'CYCLING'
  }

  if (phase === 'NORMAL') {
    return 'NORMAL'
  }

  return 'UNKNOWN'
}

export function setLineMapPlatformDoorState(
  lineMap: LineMapRuntimeState,
  stop: TimetablePlatformStopDefinition,
  phase: TimetablePlatformDoorPhase,
  trainId: string,
): LineMapRuntimeState {
  const status = getPlatformDoorStatusForPhase(phase)
  const key = getPlatformDoorStateKey(stop)
  const platformDoorStates = { ...lineMap.platformDoorStates }

  if (status === 'NORMAL') {
    delete platformDoorStates[key]
  } else {
    platformDoorStates[key] = {
      platformCode: stop.platformCode,
      status,
      track: stop.track,
      trainId,
      updatedAt: Date.now(),
    }
  }

  return {
    ...lineMap,
    platformDoorStates,
  }
}

export function clearLineMapPlatformDoorStatesForTrain(
  lineMap: LineMapRuntimeState,
  trainId: string,
): LineMapRuntimeState {
  const platformDoorStates = Object.fromEntries(
    Object.entries(lineMap.platformDoorStates).filter(([, state]) => state.trainId !== trainId),
  )

  return {
    ...lineMap,
    platformDoorStates,
  }
}
