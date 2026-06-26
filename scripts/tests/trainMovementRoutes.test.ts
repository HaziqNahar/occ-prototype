import assert from 'node:assert/strict'
import {
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  PGC_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS,
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
  TRAIN_MARKER_LOWER_ROUTE_Y,
  TRAIN_MARKER_UPPER_ROUTE_Y,
  TRAIN_ROUTE_RENDER_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'
import {
  createTrainMovementRouteSegmentStates,
  getTrainRouteStepFromRouteSegments,
} from '../../src/screens/line-map/scadaRouteState'
import { createLineMapRuntimeState } from '../../src/screens/line-map/lineMapRuntimeState'
import {
  getTrainRouteStepFromTrainOccupancyOrLineMap,
} from '../../src/screens/line-map/trainRoutePlaybackState'

function assertTimetableStepsExcludeGuideRails(routeName: string, segmentIds: readonly string[]) {
  assert.equal(
    segmentIds.some((segmentId) => segmentId.startsWith('rail-P') || segmentId === 'rail-1115'),
    false,
    `${routeName} must not include P-guide rails or rail-1115`,
  )
}

assertTimetableStepsExcludeGuideRails(
  'SKG to PGC timetable route',
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS.map((step) => step.segmentId),
)
assertTimetableStepsExcludeGuideRails(
  'PGC to SKG timetable route',
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS.map((step) => step.segmentId),
)
assertTimetableStepsExcludeGuideRails(
  'PGC/SKG to RT2 depot timetable route',
  PGC_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS.map((step) => step.segmentId),
)

assert.equal(
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS.some((step) => step.segmentId === 'rail-P611'),
  true,
  'RT1 launch route should explicitly include rail-P611 before entering rail-613',
)

assert.equal(
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS.find((step) => step.segmentId === 'rail-P611')?.point.y,
  260,
  'rail-P611 marker point should sit below rail-611 instead of visually conflicting with it',
)

assert.equal(
  TRAIN_ROUTE_RENDER_STEPS.findIndex((step) => step.segmentId === 'rail-P611')
    < TRAIN_ROUTE_RENDER_STEPS.findIndex((step) => step.segmentId === 'rail-613'),
  true,
  'render lookup should prefer rail-P611 over the next mainline rail-613 during RT1 launch',
)

{
  const p611StepIndex = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS.findIndex((step) => step.segmentId === 'rail-P611')
  const routeSegments = createTrainMovementRouteSegmentStates(
    {},
    '306',
    RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
    p611StepIndex,
  )
  const renderStep = getTrainRouteStepFromRouteSegments(routeSegments, '306', TRAIN_ROUTE_RENDER_STEPS)

  assert.equal(renderStep?.segmentId, 'rail-P611')
}

{
  const p609StepIndex = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS.findIndex((step) => step.segmentId === 'rail-P609')
  const lineMap = createLineMapRuntimeState()
  lineMap.routeSegments = createTrainMovementRouteSegmentStates(
    {},
    '306',
    RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
    p609StepIndex,
  )
  const renderStep = getTrainRouteStepFromTrainOccupancyOrLineMap(
    lineMap,
    { id: '306', occupancySegmentId: 'rail-P611' },
    TRAIN_ROUTE_RENDER_STEPS,
  )

  assert.equal(renderStep?.segmentId, 'rail-P611')
}

assert.equal(
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS.every((step) => step.point.y === TRAIN_MARKER_UPPER_ROUTE_Y),
  true,
  'SKG to PGC timetable route should stay on the upper mainline marker lane',
)
assert.equal(
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS.every((step) => step.point.y === TRAIN_MARKER_LOWER_ROUTE_Y),
  true,
  'PGC to SKG timetable route should stay on the lower mainline marker lane',
)

SKG_TO_PGC_MAINLINE_ROUTE_STEPS.slice(1).forEach((step, index) => {
  assert.equal(
    step.point.x > SKG_TO_PGC_MAINLINE_ROUTE_STEPS[index].point.x,
    true,
    'SKG to PGC timetable route should move right on each step',
  )
})

PGC_TO_SKG_MAINLINE_ROUTE_STEPS.slice(1).forEach((step, index) => {
  assert.equal(
    step.point.x < PGC_TO_SKG_MAINLINE_ROUTE_STEPS[index].point.x,
    true,
    'PGC to SKG timetable route should move left on each step',
  )
})
