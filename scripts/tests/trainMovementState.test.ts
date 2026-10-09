import assert from 'node:assert/strict'
import type { TrainTimeSelection } from '../../src/components/train-control/trainTimeOptions'
import { createLineMapRuntimeState } from '../../src/screens/line-map/lineMapRuntimeState'
import {
  PGC_TO_S608_HOLD_UPPER_ROUTE_STEPS,
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  PGC_TO_SKG_UPPER_MAINLINE_ROUTE_STEPS,
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
  S702_TO_S608_HOLD_ROUTE_STEPS,
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from '../../src/screens/line-map/trainMovementRoutes'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'
import {
  applyManualTrainRouteStepState,
  applyTimetablePlaybackStepState,
  clearManualTrainRouteSegmentOverrides,
  completeTimetablePlaybackStepState,
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

function routeState(segmentId: string, updatedAt = 1) {
  return {
    segmentId,
    status: 'SET' as const,
    trainId: '312',
    updatedAt,
  }
}

const manualRouteModes = { SKG: 'OCCM' as const, PGL: 'OCCM' as const, PGC: 'OCCM' as const }

{
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: {},
    lineMap: createLineMapRuntimeState(),
    routeControlModes: {},
    trainId: '314',
    trains: [train('314')],
  })

  assert.equal(plan.allowed, false)
  assert.equal(plan.reason.includes('Set Arrival Time Station and Platform / Siding first'), true)
}

{
  const routeStepAtS655 = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[1]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '359': arrivalSelection('SKG', 'SKGN') },
    lineMap: {
      ...createLineMapRuntimeState(),
      routeSegments: {
        'route-r655-617-command': routeState('route-r655-617-command'),
      },
    },
    routeControlModes: manualRouteModes,
    trainId: '359',
    trains: [train('359', {
      direction: 'right',
      service: 'NB',
      x: routeStepAtS655.point.x,
      y: routeStepAtS655.point.y,
    })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.authority.routeLabel, 'Manual RT1 launch to SKG northbound')
    assert.deepEqual(
      plan.authority.movementRouteSteps.map((step) => step.segmentId),
      ['rail-655', 'rail-653', 'rail-P609', 'rail-P611', 'rail-613', 'rail-615', 'rail-617'],
    )
    assert.equal(plan.currentStepIndex, 1)

    const p609StepIndex = plan.authority.movementRouteSteps.findIndex((step) => step.segmentId === 'rail-P609')
    const p609 = applyManualTrainRouteStepState({
      lineMap: createLineMapRuntimeState(),
      selectedTrainId: '',
      trains: [train('359')],
    }, '359', plan.authority, p609StepIndex)

    assert.equal(p609.trains[0].direction, 'right')
    assert.equal(p609.trains[0].occupancySegmentId, 'rail-P609')
    assert.equal(p609.trains[0].service, 'NB')
    assert.equal(p609.trains[0].timetablePlayback, false)

    const final = applyManualTrainRouteStepState(p609, '359', plan.authority, plan.lastStepIndex)

    assert.equal(final.trains[0].direction, 'right')
    assert.equal(final.trains[0].occupancySegmentId, 'rail-617')
    assert.equal(final.trains[0].service, 'NB')
    assert.equal(final.trains[0].isMoving, false)
    assert.equal(final.lineMap.routeSegments['rail-617'].status, 'DISPATCHED')

    const appended = applyManualTrainRouteStepState({
      lineMap: createLineMapRuntimeState(),
      selectedTrainId: '',
      trains: [],
    }, '359', plan.authority, 1)

    assert.equal(appended.trains.length, 1)
    assert.equal(appended.trains[0].id, '359')
    assert.equal(appended.trains[0].direction, 'right')
    assert.equal(appended.trains[0].occupancySegmentId, 'rail-653')
    assert.equal(appended.trains[0].service, 'NB')
  }
}

{
  const lineMap = {
    ...createLineMapRuntimeState(),
    routeSegments: {
      'route-r702-608-command': routeState('route-r702-608-command'),
    },
  }
  const firstStep = S702_TO_S608_HOLD_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '347': arrivalSelection('SKG', 'SKGS') },
    lineMap,
    routeControlModes: manualRouteModes,
    trainId: '347',
    trains: [train('347', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.authority.routeLabel, 'Manual destination SKG/SKGS via S702 to S608 hold')
    assert.deepEqual(
      plan.authority.movementRouteSteps.map((step) => step.segmentId),
      ['rail-P703', 'rail-P702', 'rail-704', 'rail-702', 'rail-700', 'rail-622', 'rail-620', 'rail-618'],
    )
    assert.equal(plan.currentStepIndex, 0)
  }
}

{
  const lineMap = {
    ...createLineMapRuntimeState(),
    routeSegments: {
      'route-r1105-1107-command': routeState('route-r1105-1107-command'),
      'route-r1101-1105-command': routeState('route-r1101-1105-command'),
      'route-r707-1101-command': routeState('route-r707-1101-command'),
      'route-r702-608-command': routeState('route-r702-608-command'),
    },
  }
  const firstStep = S702_TO_S608_HOLD_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '347': arrivalSelection('SKG', 'SKGS') },
    lineMap,
    routeControlModes: manualRouteModes,
    trainId: '347',
    trains: [train('347', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.authority.routeLabel, 'Manual destination SKG/SKGS via S702 to S608 hold')
    assert.equal(plan.authority.movementRouteSteps.at(-1)?.segmentId, 'rail-618')
  }
}

{
  const lineMap = {
    ...createLineMapRuntimeState(),
    routeSegments: {
      'route-r1105-1107-command': routeState('route-r1105-1107-command', 1),
      'route-r1101-1105-command': routeState('route-r1101-1105-command', 2),
      'route-r707-1101-command': routeState('route-r707-1101-command', 3),
      'route-r705-707-command': routeState('route-r705-707-command', 4),
      'route-r701-705-command': routeState('route-r701-705-command', 5),
      'route-r619-701-command': routeState('route-r619-701-command', 6),
      'route-r702-608-command': routeState('route-r702-608-command', 100),
    },
  }
  const topRouteStep = PGC_TO_S608_HOLD_UPPER_ROUTE_STEPS.find((step) => step.segmentId === 'rail-705')
    ?? PGC_TO_S608_HOLD_UPPER_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '347': arrivalSelection('SKG', 'SKGS') },
    lineMap,
    routeControlModes: manualRouteModes,
    trainId: '347',
    trains: [train('347', { x: topRouteStep.point.x, y: topRouteStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.authority.routeLabel, 'Manual destination SKG/SKGS via S702 to S608 hold')
    assert.deepEqual(
      plan.authority.movementRouteSteps.map((step) => step.segmentId),
      ['rail-P703', 'rail-P702', 'rail-704', 'rail-702', 'rail-700', 'rail-622', 'rail-620', 'rail-618'],
    )
  }
}

{
  const firstStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: {},
    trainId: '314',
    trains: [train('314', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)
}

{
  const firstStep = PGC_TO_SKG_UPPER_MAINLINE_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '335': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '335',
    trains: [train('335', {
      readinessMode: 'MAINLINE_OFF_SERVICE',
      x: firstStep.point.x,
      y: firstStep.point.y,
    })],
  })

  assert.equal(plan.allowed, false)
  assert.equal(plan.reason.includes('must be waiting at S608'), true)
}

{
  const firstStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '314',
    trains: [train('314', {
      readinessMode: 'ASLEEP',
      x: firstStep.point.x,
      y: firstStep.point.y,
    })],
  })

  assert.equal(plan.allowed, false)
  assert.equal(plan.reason.includes('Mainline Service or Mainline Off Service'), true)
}

{
  const firstStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '314',
    trains: [train('314', {
      readinessMode: 'MAINLINE_OFF_SERVICE',
      x: firstStep.point.x,
      y: firstStep.point.y,
    })],
  })

  assert.equal(plan.allowed, true)
}

{
  const firstStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '314',
    trains: [train('314', {
      itamaStatus: 'NOT_GRANTED',
      x: firstStep.point.x,
      y: firstStep.point.y,
    })],
  })

  assert.equal(plan.allowed, false)
  assert.equal(plan.reason.includes('ITAMA status must be Granted'), true)
}

{
  const firstStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '314',
    trains: [train('314', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.currentStepIndex, 0)
    assert.equal(plan.authority.movementRouteSteps[plan.currentStepIndex].segmentId, 'rail-618')
    assert.equal(plan.lastStepIndex, TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.length - 1)
  }
}

{
  const firstStep = PGC_TO_SKG_UPPER_MAINLINE_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '347': arrivalSelection('SKG', 'SKGS') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '347',
    trains: [train('347', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.authority.routeLabel, 'Manual destination SKG/SKGS upper route to S608 hold')
    assert.equal(plan.currentStepIndex, 0)

    const first = applyManualTrainRouteStepState({
      lineMap: createLineMapRuntimeState(),
      selectedTrainId: '',
      trains: [train('347')],
    }, '347', plan.authority, 0)

    assert.equal(first.trains[0].direction, 'left')
    assert.equal(first.trains[0].occupancySegmentId, 'rail-1109')
    assert.equal(first.trains[0].service, 'SB')
    assert.equal(first.trains[0].timetablePlayback, false)
  }
}

{
  const firstStep = PGC_TO_SKG_MAINLINE_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '347': arrivalSelection('SKG', 'SKGS') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '347',
    trains: [train('347', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    assert.equal(plan.authority.routeLabel, 'Manual destination SKG/SKGS lower route to S608 hold')
    assert.equal(plan.currentStepIndex, 2)
  }
}

{
  const firstStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '314',
    trains: [train('314', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    const firstDepotLegStepIndex = 0
    const middleDepotLegStepIndex = 2
    const first = applyManualTrainRouteStepState({
      lineMap: createLineMapRuntimeState(),
      selectedTrainId: '',
      trains: [train('314')],
    }, '314', plan.authority, firstDepotLegStepIndex)

    assert.equal(first.lineMap.routeSegments['rail-618'].status, 'DISPATCHED')
    assert.equal(first.lineMap.routeSegments['rail-616'].status, 'DISPATCHED')
    assert.equal(first.lineMap.routeSegments['rail-614'].status, 'SET')
    assert.equal(first.trains[0].occupancySegmentId, 'rail-618')
    assert.equal(first.trains[0].isMoving, true)

    const middle = applyManualTrainRouteStepState(first, '314', plan.authority, middleDepotLegStepIndex)

    assert.equal(middle.lineMap.routeSegments['rail-618'].status, 'UNSET')
    assert.equal(middle.lineMap.routeSegments['rail-616'].status, 'UNSET')
    assert.equal(middle.lineMap.routeSegments['rail-614'].status, 'DISPATCHED')
    assert.equal(middle.lineMap.routeSegments['rail-P606'].status, 'DISPATCHED')

    const finalStepIndex = plan.lastStepIndex
    const final = applyManualTrainRouteStepState(middle, '314', plan.authority, finalStepIndex)
    const finalStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[finalStepIndex]

    assert.equal(final.lineMap.routeSegments['rail-616'].status, 'UNSET')
    assert.equal(final.lineMap.routeSegments[finalStep.segmentId].status, 'DISPATCHED')
    assert.equal(final.trains[0].occupancySegmentId, finalStep.segmentId)
    assert.equal(final.trains[0].x, finalStep.point.x)
    assert.equal(final.trains[0].y, finalStep.point.y)
    assert.equal(final.trains[0].isMoving, false)
  }
}

{
  const firstStep = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0]
  const plan = createManualTrainRoutePlan({
    arrivalDestinations: { '314': arrivalSelection('NED', 'RT2D') },
    lineMap: createLineMapRuntimeState(),
    routeControlModes: manualRouteModes,
    trainId: '314',
    trains: [train('314', { x: firstStep.point.x, y: firstStep.point.y })],
  })

  assert.equal(plan.allowed, true)

  if (plan.allowed) {
    const current: LineMapRuntimeState['routeSegments'] = {
      'rail-618': routeState('rail-618'),
      'rail-616': routeState('rail-616'),
      unrelated: routeState('unrelated'),
    }
    const cleared = clearManualTrainRouteSegmentOverrides(current, plan.authority)

    assert.equal(cleared['rail-618'], undefined)
    assert.equal(cleared['rail-616'], undefined)
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
    routeSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    platformStops: [],
    scheduleNumber: '001',
    service: 'SB',
    signalRouteRefs: ['Route R608_803'],
    startSeconds: 0,
    stationRouteId: 'timetable-pgc-skg-to-rt2-depot',
    stepOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map(() => 0),
    stepSignedOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map(() => 0),
    steps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    to: 'RT2_DEPOT',
    trainId: '312',
    via: ['SKG'],
  }
  const first = applyTimetablePlaybackStepState({
    lineMap: {
      ...createLineMapRuntimeState(),
      routeSegments: {
        'rail-stale': routeState('rail-stale'),
      },
    },
    selectedTrainId: '',
    trains: [],
  }, plan, plan.steps[0], 0, plan.steps.length - 1)

  assert.equal(first.lineMap.routeSegments['rail-stale'], undefined)
  assert.equal(first.lineMap.routeSegments['rail-618'].status, 'DISPATCHED')
  assert.equal(first.lineMap.routeSegments['rail-616'].status, 'DISPATCHED')
  // Background timetable playback leaves the trainee's selection alone.
  assert.equal(first.selectedTrainId, '')
  assert.equal(first.trains[0].lineMapVisible, true)

  const finalStepIndex = plan.steps.length - 1
  const final = applyTimetablePlaybackStepState(first, plan, plan.steps[finalStepIndex], finalStepIndex, finalStepIndex)

  assert.equal(final.lineMap.routeSegments['rail-618'].status, 'UNSET')
  assert.equal(final.lineMap.routeSegments['rail-652'].status, 'UNSET')
  assert.equal(final.trains[0].lineMapVisible, false)
  assert.equal(final.trains[0].status, 'WAIT')
}

{
  const plan: TimetablePlaybackPlan = {
    endSeconds: 1200,
    firstStepIndex: 0,
    from: 'PGC',
    panelCode: 'SKG',
    routeLabel: 'Route R608_803',
    routeSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    platformStops: [{ platformCode: 'SKG', stepIndex: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.length - 1, track: 'SB' }],
    scheduleNumber: '001',
    service: 'SB',
    signalRouteRefs: ['Route R608_803'],
    startSeconds: 0,
    stationRouteId: 'timetable-pgc-skg-to-rt2-depot',
    stepOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map(() => 0),
    stepSignedOffsetsMs: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map(() => 0),
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
  const finalStepIndex = plan.steps.length - 1
  const finalStep = plan.steps[finalStepIndex]
  const finalStop = applyTimetablePlaybackStepState(first, plan, finalStep, finalStepIndex, finalStepIndex, true)
  const finalStopWithDoorState = {
    ...finalStop,
    lineMap: {
      ...finalStop.lineMap,
      platformDoorStates: {
        'SKG-SB': {
          platformCode: 'SKG',
          status: 'CYCLING',
          track: 'SB',
          trainId: '312',
          updatedAt: 1,
        },
      },
    },
  }

  assert.equal(finalStop.lineMap.routeSegments[finalStep.segmentId].status, 'DISPATCHED')
  assert.equal(finalStop.trains[0].lineMapVisible, true)
  assert.equal(finalStop.trains[0].occupancySegmentId, finalStep.segmentId)
  assert.equal(finalStop.trains[0].isMoving, false)

  const cleaned = completeTimetablePlaybackStepState(finalStopWithDoorState, plan)

  assert.equal(cleaned.lineMap.routeSegments[finalStep.segmentId].status, 'UNSET')
  assert.deepEqual(cleaned.lineMap.platformDoorStates, {})
  assert.equal(cleaned.trains[0].lineMapVisible, false)
  assert.equal(cleaned.trains[0].occupancySegmentId, undefined)
  assert.equal(cleaned.trains[0].timetablePlayback, false)
}
