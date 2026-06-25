import type { LineMapPlatformDoorStatus, LineMapRuntimeState } from '../../types'
import type { TimetablePlatformStopDefinition } from './lineMapRoutePaths'

export type TimetablePlatformDoorPhase = 'UNKNOWN_BEFORE' | 'CYCLING' | 'UNKNOWN_AFTER' | 'NORMAL'

export const TIMETABLE_PLATFORM_DOOR_PHASE_OFFSETS_MS: Record<TimetablePlatformDoorPhase, number> = {
  UNKNOWN_BEFORE: 0,
  CYCLING: 2500,
  UNKNOWN_AFTER: 9500,
  NORMAL: 12000,
}

export const TIMETABLE_PLATFORM_DOOR_HOLD_MS = TIMETABLE_PLATFORM_DOOR_PHASE_OFFSETS_MS.NORMAL + 500

export const TIMETABLE_PLATFORM_DOOR_PHASES: readonly TimetablePlatformDoorPhase[] = [
  'UNKNOWN_BEFORE',
  'CYCLING',
  'UNKNOWN_AFTER',
  'NORMAL',
] as const

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
