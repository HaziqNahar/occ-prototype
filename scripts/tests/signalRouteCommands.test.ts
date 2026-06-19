import assert from 'node:assert/strict'
import { createInitialSession } from '../../src/sessionState'
import type { LineMapRouteSegmentStatus, LineMapRuntimeState, TrainState } from '../../src/types'
import {
  lowerSignals,
  upperSignals,
} from '../../src/screens/line-map/model'
import type { LineMapSignalData } from '../../src/screens/line-map/model'
import {
  S704_REAL_ROUTE_SEGMENT_IDS,
  S704_ROUTE_STATE_SEGMENT_ID,
} from '../../src/screens/line-map/routeDefinitions'
import { getSignalRouteSetLabels } from '../../src/screens/line-map/signalRouteState'
import {
  applySignalRouteSetSession,
  applySignalRouteUnsetSession,
  createSignalRouteSetOverrideSegments,
  createSignalRouteUnsetOverrideSegments,
  getSignalRouteTargetTrain,
  hasSignalRouteCommand,
  shouldResetTrainRouteIndexForSignal,
} from '../../src/screens/line-map/signalRouteCommands'

function signal(label: string): LineMapSignalData {
  const found = [...upperSignals, ...lowerSignals].find((item) => item.label === label)

  assert.ok(found, `Expected signal ${label} to exist`)

  return found as LineMapSignalData
}

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

function routeState(
  segmentId: string,
  status: LineMapRouteSegmentStatus = 'SET',
): LineMapRuntimeState['routeSegments'][string] {
  return {
    segmentId,
    status,
    trainId: '312',
    updatedAt: 1,
  }
}

{
  const trains = [train('312'), train('314'), train('317')]

  assert.equal(getSignalRouteTargetTrain(trains, '312')?.id, '312')
  assert.equal(getSignalRouteTargetTrain(trains, 'missing')?.id, '314')
  assert.equal(getSignalRouteTargetTrain([train('312'), train('317')], 'missing')?.id, '317')
  assert.equal(getSignalRouteTargetTrain([train('312')], 'missing')?.id, '312')
}

{
  assert.equal(hasSignalRouteCommand(signal('S700'), 'Route R709_705'), true)
  assert.equal(hasSignalRouteCommand(signal('S709'), 'Route R709_705'), false)
  assert.equal(shouldResetTrainRouteIndexForSignal(signal('S610')), true)
  assert.equal(shouldResetTrainRouteIndexForSignal(signal('S700')), false)
}

{
  const setSegments = createSignalRouteSetOverrideSegments(
    {},
    signal('S704'),
    'Route R704_700',
    { id: '312' },
  )

  assert.equal(setSegments[S704_ROUTE_STATE_SEGMENT_ID].status, 'SET')
  S704_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(setSegments[segmentId].status, 'SET')
  })

  const unsetSegments = createSignalRouteUnsetOverrideSegments(
    setSegments,
    signal('S704'),
    'Route R704_700',
  )

  assert.equal(unsetSegments[S704_ROUTE_STATE_SEGMENT_ID], undefined)
  S704_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(unsetSegments[segmentId].status, 'UNSET')
  })
}

{
  const current = {
    unrelated: routeState('unrelated'),
  }

  assert.strictEqual(
    createSignalRouteSetOverrideSegments(current, signal('S709'), 'Route R709_705', { id: '312' }),
    current,
  )
  assert.strictEqual(
    createSignalRouteUnsetOverrideSegments(current, signal('S709'), 'Route R709_705'),
    current,
  )
}

{
  const session = {
    ...createInitialSession(),
    selectedTrainId: '314',
  }
  const setSession = applySignalRouteSetSession(session, signal('S700'), 'Route R709_705')

  assert.deepEqual(getSignalRouteSetLabels('S700', setSession.lineMap), ['Route R709_705'])
  assert.deepEqual(getSignalRouteSetLabels('S709', setSession.lineMap), [])
  assert.equal(setSession.selectedTrainId, '314')
  assert.equal(setSession.timetableRows.find((row) => row.train === '314')?.state, 'R')
  assert.equal(setSession.eventRows[0].message.includes('Route R709_705 set from S700'), true)

  const unsetSession = applySignalRouteUnsetSession(setSession, signal('S700'), 'Route R709_705')

  assert.deepEqual(getSignalRouteSetLabels('S700', unsetSession.lineMap), [])
  assert.deepEqual(getSignalRouteSetLabels('S709', unsetSession.lineMap), [])
  assert.equal(unsetSession.selectedTrainId, '314')
}
