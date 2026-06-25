import type { TimetablePlaybackPlan } from './timetablePlayback'

export function getTimetablePlatformStopForStep(
  plan: TimetablePlaybackPlan,
  stepIndex: number,
) {
  return plan.platformStops.find((stop) => stop.stepIndex === stepIndex)
}

export function shouldScheduleTimetablePlatformDoorCycle(
  plan: TimetablePlaybackPlan,
  stepIndex: number,
) {
  return Boolean(getTimetablePlatformStopForStep(plan, stepIndex))
}
