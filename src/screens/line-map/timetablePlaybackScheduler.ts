import type { TimetablePlaybackPlan } from './timetablePlayback'

export type TimetablePlaybackScheduler = (callback: () => void, delayMs: number) => number

export type TimetablePlaybackScheduleEntry = {
  delayMs: number
  plan: TimetablePlaybackPlan
  stepIndex: number
}

export function createTimetablePlaybackSchedule(
  plans: readonly TimetablePlaybackPlan[],
): TimetablePlaybackScheduleEntry[] {
  return plans.flatMap((plan) => (
    plan.steps.flatMap((_, stepIndex) => (
      stepIndex < plan.firstStepIndex
        ? []
        : [{
            delayMs: plan.stepOffsetsMs[stepIndex] ?? 0,
            plan,
            stepIndex,
          }]
    ))
  ))
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
