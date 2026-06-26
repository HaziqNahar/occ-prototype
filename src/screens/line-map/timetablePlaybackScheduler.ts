import type { TimetablePlaybackPlan } from './timetablePlayback'
import type { TimetablePlatformDoorPhase } from './platformDoorState'
import {
  TIMETABLE_PLATFORM_DOOR_HOLD_MS,
  createTimetableStationStopDoorPhaseEntries,
  getTimetableStationStopNextRailDelayMs,
  isTimetableStationStopHolding as isStationStopDoorCycleHolding,
} from './timetableStationStopState'
import type { TimetableStationStopPhase } from './timetableStationStopState'
import { shouldScheduleTimetablePlatformDoorCycle } from './timetablePlatformStops'

export type TimetablePlaybackScheduler = (callback: () => void, delayMs: number) => number

export type TimetablePlaybackScheduleEntry = {
  completeRoute?: boolean
  delayMs: number
  platformDoorPhase?: TimetablePlatformDoorPhase
  plan: TimetablePlaybackPlan
  stationStopPhase?: TimetableStationStopPhase
  stepIndex: number
}

export function createTimetablePlaybackSchedule(
  plans: readonly TimetablePlaybackPlan[],
): TimetablePlaybackScheduleEntry[] {
  return plans.flatMap((plan) => (
    getTimetablePlaybackScheduledStepIndexes(plan).flatMap((stepIndex) => {
      const routeStepSignedDelayMs = getTimetablePlaybackSignedStepDelay(plan, stepIndex)
      const routeStepDelayMs = Math.max(0, routeStepSignedDelayMs)
      const routeStepEntry = {
        delayMs: routeStepDelayMs,
        plan,
        stationStopPhase: shouldScheduleTimetablePlatformDoorCycle(plan, stepIndex)
          ? 'ARRIVED' as const
          : undefined,
        stepIndex,
      }
      if (!shouldScheduleTimetablePlatformDoorCycle(plan, stepIndex)) {
        return [routeStepEntry]
      }

      return [
        routeStepEntry,
        ...createTimetablePlatformDoorPhaseEntries(plan, stepIndex, routeStepSignedDelayMs),
        ...createTimetableRouteCompletionEntries(plan, stepIndex, routeStepSignedDelayMs),
      ]
    })
  ))
}

function getTimetablePlaybackScheduledStepIndexes(plan: TimetablePlaybackPlan) {
  const signedStepDelays = plan.steps.map((_, stepIndex) => (
    getTimetablePlaybackSignedStepDelay(plan, stepIndex)
  ))
  const currentStepIndex = signedStepDelays.reduce<number | undefined>((current, delayMs, stepIndex) => (
    delayMs <= 0 ? stepIndex : current
  ), undefined)
  const stepIndexes = new Set<number>()

  signedStepDelays.forEach((delayMs, stepIndex) => {
    if (stepIndex >= plan.firstStepIndex && delayMs >= 0) {
      stepIndexes.add(stepIndex)
    }
  })

  if (
    currentStepIndex !== undefined
    && (
      currentStepIndex >= plan.firstStepIndex
      || isTimetablePlatformStopHolding(plan, currentStepIndex)
    )
  ) {
    stepIndexes.add(currentStepIndex)
  }

  return [...stepIndexes].sort((left, right) => left - right)
}

function isTimetablePlatformStopHolding(plan: TimetablePlaybackPlan, stepIndex: number) {
  const platformStop = getTimetablePlatformStopForStepIndex(plan, stepIndex)
  const routeStepSignedDelayMs = getTimetablePlaybackBaseSignedStepDelay(plan, stepIndex)

  return Boolean(platformStop) && isStationStopDoorCycleHolding(routeStepSignedDelayMs)
}

function getTimetablePlatformStopForStepIndex(plan: TimetablePlaybackPlan, stepIndex: number) {
  return plan.platformStops.find((stop) => stop.stepIndex === stepIndex)
}

function getTimetablePlaybackSignedStepDelay(plan: TimetablePlaybackPlan, stepIndex: number) {
  const routeStepSignedDelayMs = getTimetablePlaybackBaseSignedStepDelay(plan, stepIndex)
  const priorPlatformStops = plan.platformStops.filter((stop) => (
    stop.stepIndex < stepIndex
    && getTimetablePlaybackBaseSignedStepDelay(plan, stop.stepIndex) + TIMETABLE_PLATFORM_DOOR_HOLD_MS > 0
  ))

  return routeStepSignedDelayMs + (priorPlatformStops.length * TIMETABLE_PLATFORM_DOOR_HOLD_MS)
}

function getTimetablePlaybackBaseSignedStepDelay(plan: TimetablePlaybackPlan, stepIndex: number) {
  return plan.stepSignedOffsetsMs[stepIndex] ?? plan.stepOffsetsMs[stepIndex] ?? 0
}

function createTimetablePlatformDoorPhaseEntries(
  plan: TimetablePlaybackPlan,
  stepIndex: number,
  routeStepSignedDelayMs: number,
): TimetablePlaybackScheduleEntry[] {
  return createTimetableStationStopDoorPhaseEntries(routeStepSignedDelayMs)
    .map(({ delayMs, platformDoorPhase, stationStopPhase }) => ({
      delayMs,
      platformDoorPhase,
      plan,
      stationStopPhase,
      stepIndex,
    }))
}

function createTimetableRouteCompletionEntries(
  plan: TimetablePlaybackPlan,
  stepIndex: number,
  routeStepSignedDelayMs: number,
): TimetablePlaybackScheduleEntry[] {
  if (stepIndex !== plan.steps.length - 1) {
    return []
  }

  const delayMs = getTimetableStationStopNextRailDelayMs(routeStepSignedDelayMs)

  if (delayMs < 0) {
    return []
  }

  return [{
    completeRoute: true,
    delayMs,
    plan,
    stepIndex,
  }]
}

export function scheduleTimetablePlaybackEntries({
  runEntry,
  schedule,
  scheduleTimeout,
}: {
  runEntry: (entry: TimetablePlaybackScheduleEntry) => void
  schedule: readonly TimetablePlaybackScheduleEntry[]
  scheduleTimeout: TimetablePlaybackScheduler
}) {
  return schedule.map((entry) => (
    scheduleTimeout(() => {
      runEntry(entry)
    }, entry.delayMs)
  ))
}
