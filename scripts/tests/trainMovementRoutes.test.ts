import assert from 'node:assert/strict'
import {
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
  TRAIN_MARKER_LOWER_ROUTE_Y,
  TRAIN_MARKER_UPPER_ROUTE_Y,
  TRAIN_312_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'

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
  TRAIN_312_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS.map((step) => step.segmentId),
)

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
