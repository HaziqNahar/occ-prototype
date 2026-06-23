import assert from 'node:assert/strict'
import type { TrainTimeSelection } from '../../src/components/train-control/trainTimeOptions'
import { createLineMapRuntimeState } from '../../src/screens/line-map/lineMapRuntimeState'
import {
  TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'
import {
  applyManualTrainRouteStepState,
  applyTimetablePlaybackStepState,
  clearManualTrainRouteSegmentOverrides,
  createManualTrainRoutePlan,
} from '../../src/screens/line-map/trainMovementState'
import type { LineMapRuntimeState, TrainState } from '../../src/types'

function train(id: string, overrides: Partial<TrainState> = {}): TrainState {
  return {
    direction: 'left',
    id,
    service: 'SB',
    status: 'WAIT',
    x: 0,
    y: 0,
    ...overrides,
  }
}

function arrivalSelection(station = 'SKG', platformSiding = 'SKGS'): TrainTimeSelection {
  return {
    command: `${platformSiding} - 0:0:0 - 1 - 0`,
    kind: 'arrival',
    platformSiding,
    station,
  }
}

function routeState(segmentId: string) {
  return {
    segmentId,
    status: 'SET' as const,
    trainId: '312',
    updatedAt: 1,
  }
}

{
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: {},
    lineMap: createLineMapRuntimeState(),
    trainId: '314',
    trains: [train('314')],
  })

  assert.equal(plan.allowed, false)
  assert.equal(plan.reason.includes('Set Arrival Time Station and Platform / Siding first'), true)
}

{
  const firstStep = TRAIN_314_S610_TO_RT2_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection() },
    lineMap: createLineMapRuntimeState(),
    trainId: '314',
    trains: [train('314', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.currentStepIndex, 0)
    assert.equal(plan.lastStepIndex, TRAIN_314_S610_TO_RT2_ROUTE_STEPS.length - 1)
  }
}

{
  const firstStep = TRAIN_314_S610_TO_RT2_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection() },
    lineMap: createLineMapRuntimeState(),
    trainId: '314',
    trains: [train('314', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    const first = applyManualTrainRouteStepState({
      lineMap: createLineMapRuntimeState(),
      selectedTrainId: '',
      trains: [train('314')],
    }, '314', plan.authority, 0)

    assert.equal(first.lineMap.routeSegments['rail-705'].status, 'DISPATCHED')
    assert.equal(first.lineMap.routeSegments['rail-703'].status, 'DISPATCHED')
    assert.equal(first.lineMap.routeSegments['rail-701'].status, 'SET')
    assert.equal(first.trains[0].occupancySegmentId, 'rail-705')
    assert.equal(first.trains[0].isMoving, true)

    const middle = applyManualTrainRouteStepState(first, '314', plan.authority, 2)

    assert.equal(middle.lineMap.routeSegments['rail-705'].status, 'UNSET')
    assert.equal(middle.lineMap.routeSegments['rail-703'].status, 'UNSET')
    assert.equal(middle.lineMap.routeSegments['rail-701'].status, 'DISPATCHED')
    assert.equal(middle.lineMap.routeSegments['rail-621'].status, 'DISPATCHED')

    const finalStepIndex = plan.lastStepIndex
    const final = applyManualTrainRouteStepState(middle, '314', plan.authority, finalStepIndex)
    const finalStep = TRAIN_314_S610_TO_RT2_ROUTE_STEPS[finalStepIndex]

    assert.equal(final.lineMap.routeSegments['rail-703'].status, 'UNSET')
    assert.equal(final.lineMap.routeSegments[finalStep.segmentId].status, 'DISPATCHED')
    assert.equal(final.trains[0].occupancySegmentId, finalStep.segmentId)
    assert.equal(final.trains[0].x, finalStep.point.x)
    assert.equal(final.trains[0].y, finalStep.point.y)
    assert.equal(final.trains[0].isMoving, false)
  }
}

{
  const firstStep = TRAIN_314_S610_TO_RT2_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection() },
    lineMap: createLineMapRuntimeState(),
    trainId: '314',
    trains: [train('314', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    const current: LineMapRuntimeState['routeSegments'] = {
      'rail-705': routeState('rail-705'),
      'rail-703': routeState('rail-703'),
      unrelated: routeState('unrelated'),
    }
    const cleared = clearManualTrainRouteSegmentOverrides(current, plan.authority)

    assert.equal(cleared['rail-705'], undefined)
    assert.equal(cleared['rail-703'], undefined)
    assert.equal(cleared.unrelated.status, 'SET')
  }
}

{
  const plan: TimetablePlaybackPlan = {
    endSeconds: 1200,
    firstStepIndex: 0,
    from: 'PGC',
    panelCode: 'SKG',
    routeLabel: 'Route R608_803',
    routeLabels: ['Route R608_803'],
    routeSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    scheduleNumber: '001',
    service: 'SB',
    startSeconds: 0,
    stationRouteId: 'timetable-pgc-skg-to-rt2-depot',
    stepOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map(() => 0),
    steps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    to: 'RT2_DEPOT',
    trainId: '312',
    via: ['SKG'],
  }
  const first = applyTimetablePlaybackStepState({
    lineMap: createLineMapRuntimeState(),
    selectedTrainId: '',
    trains: [],
  }, plan, plan.steps[0], 0, plan.steps.length - 1)

  assert.equal(first.lineMap.routeSegments['rail-618'].status, 'DISPATCHED')
  assert.equal(first.lineMap.routeSegments['rail-616'].status, 'DISPATCHED')
  assert.equal(first.selectedTrainId, '312')
  assert.equal(first.trains[0].lineMapVisible, true)

  const finalStepIndex = plan.steps.length - 1
  const final = applyTimetablePlaybackStepState(first, plan, plan.steps[finalStepIndex], finalStepIndex, finalStepIndex)

  assert.equal(final.lineMap.routeSegments['rail-618'].status, 'UNSET')
  assert.equal(final.lineMap.routeSegments['rail-652'].status, 'UNSET')
  assert.equal(final.trains[0].lineMapVisible, false)
  assert.equal(final.trains[0].status, 'WAIT')
}
