import assert from 'node:assert/strict'
import {
  LINE_MAP_ROUTE_PATH_DEFINITIONS,
  MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS,
  TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS,
  getManualLineMapRoutePath,
  getManualLineMapRoutePathSegmentIds,
} from '../../src/screens/line-map/lineMapRoutePaths'
import { resolveTimetableRailPath } from '../../src/screens/line-map/timetablePathResolver'
import { isTimetableIneligibleGuideRailId } from '../../src/screens/line-map/timetableRouteStateCleanup'
import {
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'
import {
  getDefinedSignalRoutesByLabels,
} from '../../src/screens/line-map/routeDefinitions'

assert.equal(
  new Set(LINE_MAP_ROUTE_PATH_DEFINITIONS.map((routePath) => routePath.id)).size,
  LINE_MAP_ROUTE_PATH_DEFINITIONS.length,
)

{
  const path = getManualLineMapRoutePath('312', 'RT2_DEPOT')

  assert.equal(path?.id, 'manual-s608-to-rt2-depot')
  assert.deepEqual(
    path?.stateRouteSteps.map((step) => step.segmentId),
    TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map((step) => step.segmentId),
  )
  assert.strictEqual(path?.movementRouteSteps, TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS)
}

assert.equal(getManualLineMapRoutePath('999', 'ANY'), undefined)
assert.equal(getManualLineMapRoutePath('314', 'ANY'), undefined)

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
    destinationPoint: 'PGL',
    originPoint: 'SKG',
    run: 'NB',
    stationPoint: 'SKGS',
  })

  assert.equal(path?.routeLabel, 'Timetable path SKG to PGL upper mainline')
  assert.equal(path?.from, 'SKG')
  assert.equal(path?.to, 'PGL')
  assert.deepEqual(path?.platformStops.map((stop) => `${stop.platformCode}:${stop.stepIndex}:${stop.track}`), [
    'SKG:0:NB',
    'PGL:7:NB',
  ])
  assert.equal(path?.steps.at(-1)?.segmentId, 'rail-709')
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
  assert.deepEqual(path?.platformStops.map((stop) => `${stop.platformCode}:${stop.stepIndex}:${stop.track}`), [
    'SKG:0:NB',
    'PGL:7:NB',
    'PGC:14:NB',
  ])
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
  assert.deepEqual(path?.platformStops.map((stop) => `${stop.platformCode}:${stop.stepIndex}:${stop.track}`), [
    'PGC:0:SB',
    'PGL:7:SB',
    'SKG:15:SB',
  ])
}

{
  const path = resolveTimetableRailPath({
    destinationPoint: 'HBF',
    originPoint: 'PGL',
    run: 'SB',
    stationPoint: 'SKGS',
  })

  assert.equal(path?.routeLabel, 'Timetable path PGL to SKG lower mainline')
  assert.equal(path?.from, 'PGL')
  assert.equal(path?.to, 'SKG')
  assert.deepEqual(path?.platformStops.map((stop) => `${stop.platformCode}:${stop.stepIndex}:${stop.track}`), [
    'PGL:0:SB',
    'SKG:8:SB',
  ])
  assert.equal(path?.steps[0]?.segmentId, 'rail-710')
  assert.equal(path?.steps.at(-1)?.segmentId, 'rail-618')
}

TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS.forEach((routePath) => {
  assert.equal(routePath.steps.length > 0, true, `${routePath.id} should have station route rails`)

  const signalRouteRefs = routePath.signalRouteRefs ?? []

  assert.equal(signalRouteRefs.length > 0, true, `${routePath.id} should be backed by signal route refs`)
  assert.equal(
    new Set(signalRouteRefs).size,
    signalRouteRefs.length,
    `${routePath.id} should not duplicate signal route refs`,
  )
  assert.equal(
    getDefinedSignalRoutesByLabels(signalRouteRefs).length,
    signalRouteRefs.length,
    `${routePath.id} signal route refs should all exist`,
  )

  routePath.steps.forEach((step) => {
    assert.equal(step.segmentId.startsWith('rail-P'), false, `${routePath.id} should not timetable-drive P-rails`)
    assert.notEqual(step.segmentId, 'rail-1115', `${routePath.id} should not timetable-drive rail-1115`)
  })

  routePath.platformStops?.forEach((platformStop) => {
    assert.ok(
      routePath.steps[platformStop.stepIndex],
      `${routePath.id} platform stop ${platformStop.platformCode} should point to an existing route step`,
    )
  })

  assert.equal(
    routePath.steps.some((step) => isTimetableIneligibleGuideRailId(step.segmentId)),
    false,
    `${routePath.id} should not include guide rails`,
  )
})
