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
  routeSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
  platformStops: [],
  scheduleNumber: '001',
  service: 'SB',
  signalRouteRefs: ['Route R608_803'],
  startSeconds: 0,
  stationRouteId: 'timetable-pgc-skg-to-rt2-depot',
  stepOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map((_, index) => index * 1000),
  stepSignedOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map((_, index) => index * 1000),
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
  const schedule = createTimetablePlaybackSchedule([{
    ...plan,
    platformStops: [{ platformCode: 'SKG', stepIndex: 2, track: 'SB' }],
  }]).slice(0, 5)

  assert.deepEqual(
    schedule.map((entry) => ({
      delayMs: entry.delayMs,
      platformDoorPhase: entry.platformDoorPhase ?? 'ROUTE_STEP',
      stepIndex: entry.stepIndex,
      trainId: entry.plan.trainId,
    })),
    [
      { delayMs: 2000, platformDoorPhase: 'ROUTE_STEP', stepIndex: 2, trainId: '312' },
      { delayMs: 2000, platformDoorPhase: 'UNKNOWN_BEFORE', stepIndex: 2, trainId: '312' },
      { delayMs: 4500, platformDoorPhase: 'CYCLING', stepIndex: 2, trainId: '312' },
      { delayMs: 11500, platformDoorPhase: 'UNKNOWN_AFTER', stepIndex: 2, trainId: '312' },
      { delayMs: 14000, platformDoorPhase: 'NORMAL', stepIndex: 2, trainId: '312' },
    ],
  )

  assert.equal(
    createTimetablePlaybackSchedule([{
      ...plan,
      platformStops: [{ platformCode: 'SKG', stepIndex: 2, track: 'SB' }],
    }]).find((entry) => !entry.platformDoorPhase && entry.stepIndex === 3)?.delayMs,
    15500,
    'next rail step must wait until the platform door cycle has returned to normal',
  )
}

{
  const finalStepIndex = plan.steps.length - 1
  const finalStopSchedule = createTimetablePlaybackSchedule([{
    ...plan,
    firstStepIndex: finalStepIndex,
    platformStops: [{ platformCode: 'SKG', stepIndex: finalStepIndex, track: 'SB' }],
  }]).filter((entry) => entry.stepIndex === finalStepIndex)
  const finalStepDelayMs = finalStepIndex * 1000

  assert.deepEqual(
    finalStopSchedule.map((entry) => ({
      completeRoute: entry.completeRoute ?? false,
      delayMs: entry.delayMs,
      platformDoorPhase: entry.platformDoorPhase ?? 'ROUTE_STEP',
      stepIndex: entry.stepIndex,
    })),
    [
      { completeRoute: false, delayMs: finalStepDelayMs, platformDoorPhase: 'ROUTE_STEP', stepIndex: finalStepIndex },
      { completeRoute: false, delayMs: finalStepDelayMs, platformDoorPhase: 'UNKNOWN_BEFORE', stepIndex: finalStepIndex },
      { completeRoute: false, delayMs: finalStepDelayMs + 2500, platformDoorPhase: 'CYCLING', stepIndex: finalStepIndex },
      { completeRoute: false, delayMs: finalStepDelayMs + 9500, platformDoorPhase: 'UNKNOWN_AFTER', stepIndex: finalStepIndex },
      { completeRoute: false, delayMs: finalStepDelayMs + 12000, platformDoorPhase: 'NORMAL', stepIndex: finalStepIndex },
      { completeRoute: true, delayMs: finalStepDelayMs + 12500, platformDoorPhase: 'ROUTE_STEP', stepIndex: finalStepIndex },
    ],
    'a final platform stop must hold through the door cycle before the route cleanup runs',
  )
}

{
  const refreshedAfterDoorCycle = createTimetablePlaybackSchedule([{
    ...plan,
    platformStops: [{ platformCode: 'SKG', stepIndex: 2, track: 'SB' }],
    stepOffsetsMs: plan.steps.map((_, index) => (index === 2 ? 0 : index * 1000)),
    stepSignedOffsetsMs: plan.steps.map((_, index) => (index === 2 ? -13000 : index * 1000)),
  }]).filter((entry) => entry.stepIndex === 2)

  assert.deepEqual(
    refreshedAfterDoorCycle.map((entry) => entry.platformDoorPhase ?? 'ROUTE_STEP'),
    ['ROUTE_STEP'],
    'a refreshed live schedule must not replay completed door phases for the same station stop',
  )
}

{
  const refreshedMidDoorCycle = createTimetablePlaybackSchedule([{
    ...plan,
    platformStops: [{ platformCode: 'SKG', stepIndex: 2, track: 'SB' }],
    stepOffsetsMs: plan.steps.map((_, index) => (index === 2 ? 0 : index * 1000)),
    stepSignedOffsetsMs: plan.steps.map((_, index) => (index === 2 ? -5000 : index * 1000)),
  }]).filter((entry) => entry.stepIndex === 2)

  assert.deepEqual(
    refreshedMidDoorCycle.map((entry) => ({
      delayMs: entry.delayMs,
      platformDoorPhase: entry.platformDoorPhase ?? 'ROUTE_STEP',
    })),
    [
      { delayMs: 0, platformDoorPhase: 'ROUTE_STEP' },
      { delayMs: 4500, platformDoorPhase: 'UNKNOWN_AFTER' },
      { delayMs: 7000, platformDoorPhase: 'NORMAL' },
    ],
    'a refreshed live schedule should only continue future door phases for an in-progress station stop',
  )
}

{
  const refreshedAfterRawClockAdvanced = createTimetablePlaybackSchedule([{
    ...plan,
    firstStepIndex: 3,
    platformStops: [{ platformCode: 'SKG', stepIndex: 2, track: 'SB' }],
    stepOffsetsMs: plan.steps.map((_, index) => (index === 2 ? 0 : index * 1000)),
    stepSignedOffsetsMs: plan.steps.map((_, index) => (index === 2 ? -5000 : index * 1000)),
  }]).filter((entry) => entry.stepIndex === 2 || entry.stepIndex === 3)

  assert.deepEqual(
    refreshedAfterRawClockAdvanced.map((entry) => ({
      delayMs: entry.delayMs,
      platformDoorPhase: entry.platformDoorPhase ?? 'ROUTE_STEP',
      stepIndex: entry.stepIndex,
    })),
    [
      { delayMs: 0, platformDoorPhase: 'ROUTE_STEP', stepIndex: 2 },
      { delayMs: 4500, platformDoorPhase: 'UNKNOWN_AFTER', stepIndex: 2 },
      { delayMs: 7000, platformDoorPhase: 'NORMAL', stepIndex: 2 },
      { delayMs: 15500, platformDoorPhase: 'ROUTE_STEP', stepIndex: 3 },
    ],
    'a refresh during a door hold must keep the train pinned at the station stop before the next rail step',
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
