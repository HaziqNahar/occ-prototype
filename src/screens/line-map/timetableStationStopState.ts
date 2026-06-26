export type TimetablePlatformDoorPhase = 'UNKNOWN_BEFORE' | 'CYCLING' | 'UNKNOWN_AFTER' | 'NORMAL'

export type TimetableStationStopPhase =
  | 'ARRIVED'
  | 'DOOR_UNKNOWN_BEFORE'
  | 'DOOR_CYCLING'
  | 'DOOR_UNKNOWN_AFTER'
  | 'READY_TO_DEPART'

export type TimetableStationStopDoorPhaseEntry = {
  delayMs: number
  platformDoorPhase: TimetablePlatformDoorPhase
  stationStopPhase: TimetableStationStopPhase
}

export const TIMETABLE_PLATFORM_DOOR_PHASE_OFFSETS_MS: Record<TimetablePlatformDoorPhase, number> = {
  UNKNOWN_BEFORE: 1000,
  CYCLING: 3500,
  UNKNOWN_AFTER: 10500,
  NORMAL: 13000,
}

export const TIMETABLE_PLATFORM_DOOR_HOLD_MS = TIMETABLE_PLATFORM_DOOR_PHASE_OFFSETS_MS.NORMAL + 500

export const TIMETABLE_PLATFORM_DOOR_PHASES: readonly TimetablePlatformDoorPhase[] = [
  'UNKNOWN_BEFORE',
  'CYCLING',
  'UNKNOWN_AFTER',
  'NORMAL',
] as const

export const TIMETABLE_STATION_STOP_PHASES: readonly TimetableStationStopPhase[] = [
  'ARRIVED',
  'DOOR_UNKNOWN_BEFORE',
  'DOOR_CYCLING',
  'DOOR_UNKNOWN_AFTER',
  'READY_TO_DEPART',
] as const

export function createTimetableStationStopDoorPhaseEntries(
  routeStepSignedDelayMs: number,
): TimetableStationStopDoorPhaseEntry[] {
  const elapsedMs = getTimetableStationStopElapsedMs(routeStepSignedDelayMs)

  return TIMETABLE_PLATFORM_DOOR_PHASES.flatMap((platformDoorPhase, phaseIndex) => {
    const phaseOffsetMs = TIMETABLE_PLATFORM_DOOR_PHASE_OFFSETS_MS[platformDoorPhase]
    const nextPlatformDoorPhase = TIMETABLE_PLATFORM_DOOR_PHASES[phaseIndex + 1]
    const nextPhaseOffsetMs = nextPlatformDoorPhase
      ? TIMETABLE_PLATFORM_DOOR_PHASE_OFFSETS_MS[nextPlatformDoorPhase]
      : TIMETABLE_PLATFORM_DOOR_HOLD_MS
    const isCurrentPhase = routeStepSignedDelayMs < 0
      && elapsedMs >= phaseOffsetMs
      && elapsedMs < nextPhaseOffsetMs
    const delayMs = isCurrentPhase
      ? 0
      : routeStepSignedDelayMs + phaseOffsetMs

    if (delayMs < 0) {
      return []
    }

    return [{
      delayMs,
      platformDoorPhase,
      stationStopPhase: getTimetableStationStopPhaseForDoorPhase(platformDoorPhase),
    }]
  })
}

export function getTimetableStationStopElapsedMs(routeStepSignedDelayMs: number) {
  return Math.max(0, -routeStepSignedDelayMs)
}

export function getTimetableStationStopNextRailDelayMs(routeStepSignedDelayMs: number) {
  return routeStepSignedDelayMs + TIMETABLE_PLATFORM_DOOR_HOLD_MS
}

export function isTimetableStationStopHolding(routeStepSignedDelayMs: number) {
  return routeStepSignedDelayMs < 0
    && getTimetableStationStopNextRailDelayMs(routeStepSignedDelayMs) > 0
}

export function getTimetableStationStopPhaseForDoorPhase(
  phase: TimetablePlatformDoorPhase,
): TimetableStationStopPhase {
  if (phase === 'UNKNOWN_BEFORE') {
    return 'DOOR_UNKNOWN_BEFORE'
  }

  if (phase === 'CYCLING') {
    return 'DOOR_CYCLING'
  }

  if (phase === 'UNKNOWN_AFTER') {
    return 'DOOR_UNKNOWN_AFTER'
  }

  return 'READY_TO_DEPART'
}
