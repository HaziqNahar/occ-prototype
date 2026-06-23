import assert from 'node:assert/strict'
import {
  LINE_MAP_ROUTE_PATH_DEFINITIONS,
  MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS,
  TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS,
  TRAIN_ROUTE_STEP_SEQUENCES_BY_TRAIN_ID,
  getManualLineMapRoutePath,
  getManualLineMapRoutePathSegmentIds,
  getManualLineMapRoutePathStateStepIndex,
  getSignalRouteSegmentIds,
} from '../../src/screens/line-map/lineMapRoutePaths'
import { resolveTimetableRailPath } from '../../src/screens/line-map/timetablePathResolver'
import { isTimetableIneligibleGuideRailId } from '../../src/screens/line-map/timetableRouteStateCleanup'
import {
  TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
  TRAIN_312_TO_RT2_DEPOT_ROUTE_STEPS,
  TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'

assert.equal(
  new Set(LINE_MAP_ROUTE_PATH_DEFINITIONS.map((routePath) => routePath.id)).size,
  LINE_MAP_ROUTE_PATH_DEFINITIONS.length,
)

{
  const path = getManualLineMapRoutePath('314', 'ANY')

  assert.equal(path?.id, 'manual-train-314-s610-to-rt2')
  assert.equal(path?.routeLabel, 'Route R610_652')
  assert.deepEqual(path?.routeLabels, ['Route R610_652'])
  assert.strictEqual(path?.movementRouteSteps, TRAIN_314_S610_TO_RT2_ROUTE_STEPS)
}

{
  const path = getManualLineMapRoutePath('312', 'RT2_DEPOT')

  assert.equal(path?.id, 'manual-train-312-s1104-to-rt2-depot')
  assert.deepEqual(
    path?.stateRouteSteps.map((step) => step.segmentId),
    TRAIN_312_TO_RT2_DEPOT_ROUTE_STEPS.map((step) => step.segmentId),
  )
  assert.equal(getManualLineMapRoutePathStateStepIndex(path!, 1), TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS.length)
}

assert.equal(getManualLineMapRoutePath('999', 'ANY'), undefined)
assert.deepEqual(Object.keys(TRAIN_ROUTE_STEP_SEQUENCES_BY_TRAIN_ID).sort(), ['312', '314'])

MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS.forEach((path) => {
  const stateSegmentIds = path.stateRouteSteps.map((step) => step.segmentId)
  const routeDefinitionSegmentIds = [...getManualLineMapRoutePathSegmentIds(path)]

  assert.deepEqual(
    [...stateSegmentIds].sort(),
    routeDefinitionSegmentIds.sort(),
    `${path.id} state rails must match its backing signal route definitions`,
  )
})

{
  const path = resolveTimetableRailPath({
    destinationPoint: 'RT2D',
    originPoint: 'PGC',
    run: 'SB',
    stationPoint: 'SKGS',
  })

  assert.equal(path?.routeLabel, 'Timetable path PGC/SKG to RT2 depot')
  assert.equal(path?.panelCode, 'SKG')
  assert.equal(path?.from, 'PGC')
  assert.deepEqual(path?.via, ['SKG'])
  assert.equal(path?.to, 'RT2_DEPOT')
}

{
  const path = resolveTimetableRailPath({
    destinationPoint: 'PGC',
    originPoint: 'SKG',
    run: 'NB',
    stationPoint: 'SKGS',
  })

  assert.equal(path?.routeLabel, 'Timetable path SKG to PGC upper mainline')
  assert.equal(path?.from, 'SKG')
  assert.equal(path?.to, 'PGC')
}

{
  const path = resolveTimetableRailPath({
    destinationPoint: 'HBF',
    originPoint: 'PGC',
    run: 'SB',
    stationPoint: 'PGLS',
  })

  assert.equal(path?.routeLabel, 'Timetable path PGC to SKG lower mainline')
  assert.equal(path?.from, 'PGC')
  assert.equal(path?.to, 'SKG')
}

TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS.forEach((routePath) => {
  assert.equal(routePath.routeLabels.length > 0, true, `${routePath.id} should name its signal route chain`)

  const backingRouteSegmentIds = new Set(getSignalRouteSegmentIds(routePath.routeLabels))

  routePath.steps.forEach((step) => {
    assert.equal(
      backingRouteSegmentIds.has(step.segmentId),
      true,
      `${routePath.id} timetable step ${step.segmentId} must be backed by a signal route`,
    )
    assert.equal(step.segmentId.startsWith('rail-P'), false, `${routePath.id} should not timetable-drive P-rails`)
    assert.notEqual(step.segmentId, 'rail-1115', `${routePath.id} should not timetable-drive rail-1115`)
  })

  assert.equal(
    routePath.steps.some((step) => isTimetableIneligibleGuideRailId(step.segmentId)),
    false,
    `${routePath.id} should not include guide rails`,
  )
})
