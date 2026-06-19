import assert from 'node:assert/strict'
import {
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
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
