import assert from 'node:assert/strict'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'
import {
  createTimetablePlaybackSchedule,
  scheduleTimetablePlaybackEntries,
} from '../../src/screens/line-map/timetablePlaybackScheduler'
import {
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'

const plan: TimetablePlaybackPlan = {
  endSeconds: 1200,
  firstStepIndex: 2,
  from: 'PGC',
  panelCode: 'SKG',
  routeLabel: 'Route R608_803',
  routeLabels: ['Route R608_803'],
  routeSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
  scheduleNumber: '001',
  service: 'SB',
  startSeconds: 0,
  stationRouteId: 'timetable-pgc-skg-to-rt2-depot',
  stepOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map((_, index) => index * 1000),
  steps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
  to: 'RT2_DEPOT',
  trainId: '312',
  via: ['SKG'],
}

{
  const schedule = createTimetablePlaybackSchedule([plan])

  assert.equal(schedule.length, plan.steps.length - plan.firstStepIndex)
  assert.deepEqual(
    schedule.slice(0, 3).map((entry) => ({
      delayMs: entry.delayMs,
      stepIndex: entry.stepIndex,
      trainId: entry.plan.trainId,
    })),
    [
      { delayMs: 2000, stepIndex: 2, trainId: '312' },
      { delayMs: 3000, stepIndex: 3, trainId: '312' },
      { delayMs: 4000, stepIndex: 4, trainId: '312' },
    ],
  )
}

{
  const schedule = createTimetablePlaybackSchedule([plan]).slice(0, 2)
  const scheduledCallbacks: Array<{ callback: () => void; delayMs: number; id: number }> = []
  const runEntries: number[] = []
  const timeoutIds = scheduleTimetablePlaybackEntries({
    runEntry: (entry) => {
      runEntries.push(entry.stepIndex)
    },
    schedule,
    scheduleTimeout: (callback, delayMs) => {
      const id = scheduledCallbacks.length + 1

      scheduledCallbacks.push({ callback, delayMs, id })

      return id
    },
  })

  assert.deepEqual(timeoutIds, [1, 2])
  assert.deepEqual(scheduledCallbacks.map((entry) => entry.delayMs), [2000, 3000])

  scheduledCallbacks[1].callback()
  scheduledCallbacks[0].callback()

  assert.deepEqual(runEntries, [3, 2])
}
