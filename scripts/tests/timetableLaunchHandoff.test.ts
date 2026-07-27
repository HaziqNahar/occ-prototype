import assert from 'node:assert/strict'
import type { TrainState } from '../../src/types'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'
import {
  createManualLaunchTimetableHandoffPlan,
  shouldResumeTimetableAfterManualLaunch,
} from '../../src/screens/line-map/timetableLaunchHandoff'
import {
  SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX,
  SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'

const launchPlan: TimetablePlaybackPlan = {
  endSeconds: 600,
  firstStepIndex: 0,
  from: 'SKG',
  panelCode: 'SKG',
  platformStops: [
    { platformCode: 'SKG', stepIndex: SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX, track: 'NB' },
  ],
  routeLabel: 'Timetable path RT1 launch to SKG/PGL/PGC upper mainline',
  routeSteps: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
  scheduleNumber: '1000',
  service: 'NB',
  signalRouteRefs: ['Route R655_617'],
  startSeconds: 0,
  stationRouteId: 'timetable-skg-to-pgc-upper-mainline',
  stepOffsetsMs: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS.map((_, index) => index * 350),
  stepSignedOffsetsMs: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS.map((_, index) => (
    (index - SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX) * 350
  )),
  steps: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
  to: 'PGC',
  trainId: '301',
}

const handoffTrain: TrainState = {
  direction: 'right',
  id: '301',
  isMoving: false,
  lineMapVisible: true,
  occupancySegmentId: 'rail-617',
  service: 'NB',
  status: 'WAIT',
  timetablePlayback: true,
  x: 0,
  y: 0,
}

{
  assert.equal(
    shouldResumeTimetableAfterManualLaunch(handoffTrain, launchPlan),
    true,
    'manual launch handoff should resume timetable only after the train is visible at SKGN rail-617',
  )

  const handoffPlan = createManualLaunchTimetableHandoffPlan(launchPlan)

  assert.equal(
    handoffPlan.firstStepIndex,
    SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX,
    'manual launch handoff should resume from SKGN instead of replaying rail-655/653 lead-in',
  )
  assert.equal(handoffPlan.skipDepotLaunchLeadIn, true)
}

{
  const wrongRail = {
    ...handoffTrain,
    occupancySegmentId: 'rail-653',
  }
  const wrongRoute = {
    ...launchPlan,
    signalRouteRefs: ['Route R619_701'],
  }
  const southbound = {
    ...launchPlan,
    service: 'SB',
  }

  assert.equal(shouldResumeTimetableAfterManualLaunch(wrongRail, launchPlan), false)
  assert.equal(shouldResumeTimetableAfterManualLaunch(handoffTrain, wrongRoute), false)
  assert.equal(shouldResumeTimetableAfterManualLaunch(handoffTrain, southbound), false)
}
