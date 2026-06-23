import assert from 'node:assert/strict'
import type { LineMapRuntimeState, TrainState } from '../../src/types'
import { createLineMapRuntimeState } from '../../src/screens/line-map/lineMapRuntimeState'
import {
  lowerSignals,
  upperSignals,
} from '../../src/screens/line-map/model'
import type { LineMapSignalData } from '../../src/screens/line-map/model'
import {
  S608_R608_803_REAL_ROUTE_SEGMENT_IDS,
  S700_R700_610_REAL_ROUTE_SEGMENT_IDS,
  S700_REAL_ROUTE_SEGMENT_IDS,
  S704_REAL_ROUTE_SEGMENT_IDS,
  S1102_R1102_706_REAL_ROUTE_SEGMENT_IDS,
  SIGNAL_ROUTE_DEFINITIONS,
} from '../../src/screens/line-map/routeDefinitions'
import { getSignalRouteSetLabels } from '../../src/screens/line-map/signalRouteState'
import {
  clearLineMapSignalTrackState,
  createRouteAutomationSummary,
  createTrainOccupancyRouteSegmentStates,
  getLineMapRouteStatus,
  getSignalEquipmentLabel,
  isPanelTimetableAutomatic,
  updateLineMapRouteState,
  updateLineMapSignalTrackState,
} from '../../src/screens/line-map/lineMapRouteState'

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
    status: 'RUN',
    x: 0,
    y: 0,
    ...overrides,
  }
}

function state(segmentId: string, status: 'SET' | 'UNSET' | 'DISPATCHED' = 'SET') {
  return {
    segmentId,
    status,
    trainId: '312',
    updatedAt: 1,
  }
}

{
  assert.equal(getLineMapRouteStatus('RUN'), 'DISPATCHED')
  assert.equal(getLineMapRouteStatus('HOLD'), 'HELD')
  assert.equal(getLineMapRouteStatus('WAIT'), 'SET')
}

{
  assert.equal(isPanelTimetableAutomatic('SKG', {}), true)
  assert.equal(isPanelTimetableAutomatic('SKG', { SKG: 'OCCM' }), false)

  const summary = createRouteAutomationSummary({ SKG: 'OCCM' })

  assert.equal(summary.manualPanels, 1)
  assert.equal(summary.text.includes('TIMETABLE AUTO'), true)
}

{
  const updated = updateLineMapRouteState(createLineMapRuntimeState(), { id: '314' }, 'DISPATCHED')

  assert.equal(updated.routeSegments['pgc-depot'].status, 'DISPATCHED')
  assert.equal(updated.routeSegments['pgc-depot'].trainId, '314')
}

{
  const occupancy = createTrainOccupancyRouteSegmentStates([
    train('312', { occupancySegmentId: 'rail-618' }),
    train('999', { lineMapVisible: false, occupancySegmentId: 'rail-hidden' }),
  ], createLineMapRuntimeState())

  assert.equal(occupancy['rail-618'].status, 'DISPATCHED')
  assert.equal(occupancy['rail-hidden'], undefined)
}

{
  const updated = updateLineMapSignalTrackState(
    createLineMapRuntimeState(),
    signal('S700'),
    { id: '312' },
    'SET',
    'Route R700_608',
  )

  assert.deepEqual(getSignalRouteSetLabels('S700', updated), ['Route R700_608'])
  assert.deepEqual(getSignalRouteSetLabels('S709', updated), [])
  S700_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(updated.routeSegments[segmentId].status, 'SET')
  })
}

{
  const setMap = updateLineMapSignalTrackState(
    createLineMapRuntimeState(),
    signal('S704'),
    { id: '312' },
    'SET',
    'Route R704_700',
  )
  const cleared = clearLineMapSignalTrackState(setMap, signal('S704'), 'Route R704_700')

  assert.deepEqual(getSignalRouteSetLabels('S704', cleared), [])
  S704_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(cleared.routeSegments[segmentId].status, 'UNSET')
  })
}

{
  const updated = updateLineMapSignalTrackState(
    createLineMapRuntimeState(),
    signal('S608'),
    { id: '312' },
    'SET',
    'Route R608_803',
  )

  assert.deepEqual(getSignalRouteSetLabels('S608', updated), ['Route R608_803'])
  S608_R608_803_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(updated.routeSegments[segmentId].status, 'SET')
  })
}

{
  const lineMap: LineMapRuntimeState = {
    ...createLineMapRuntimeState(),
    routeSegments: {
      ...createLineMapRuntimeState().routeSegments,
      'rail-704': state('rail-704'),
      'rail-705': state('rail-705'),
    },
  }
  const updated = updateLineMapSignalTrackState(
    lineMap,
    signal('S700'),
    { id: '312' },
    'SET',
    'Route R700_610',
  )

  assert.deepEqual(getSignalRouteSetLabels('S700', updated), ['Route R700_610'])
  S700_R700_610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(updated.routeSegments[segmentId].status, 'SET')
  })
  assert.equal(updated.routeSegments['rail-704'], undefined)
  assert.equal(updated.routeSegments['rail-705'], undefined)
}

{
  const lineMap: LineMapRuntimeState = {
    ...createLineMapRuntimeState(),
    routeSegments: {
      ...createLineMapRuntimeState().routeSegments,
      'rail-1104': state('rail-1104'),
      'rail-1107': state('rail-1107'),
    },
  }
  const updated = updateLineMapSignalTrackState(
    lineMap,
    signal('S1104'),
    { id: '312' },
    'SET',
    'Route R1104_704',
  )

  assert.equal(updated.routeSegments['rail-P1100'].status, 'SET')
  assert.equal(updated.routeSegments['rail-P1103'].status, 'SET')
  assert.equal(updated.routeSegments['rail-1104'], undefined)
  assert.equal(updated.routeSegments['rail-1107'], undefined)
}

{
  const lineMap: LineMapRuntimeState = {
    ...createLineMapRuntimeState(),
    routeSegments: {
      ...createLineMapRuntimeState().routeSegments,
      'rail-1105': state('rail-1105'),
      'rail-1106': state('rail-1106'),
    },
  }
  const updated = updateLineMapSignalTrackState(
    lineMap,
    signal('S1102'),
    { id: '312' },
    'SET',
    'Route R1102_706',
  )

  assert.deepEqual(getSignalRouteSetLabels('S1102', updated), ['Route R1102_706'])
  S1102_R1102_706_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    assert.equal(updated.routeSegments[segmentId].status, 'SET')
  })
  assert.equal(updated.routeSegments['rail-1105'], undefined)
  assert.equal(updated.routeSegments['rail-1106'], undefined)
}

{
  assert.equal(getSignalEquipmentLabel(signal('S1104')), 'SIG/PGC/N01/SIGN1104')
  assert.equal(getSignalEquipmentLabel(signal('S608')), 'SIG/SKG/S03/SIGN0608')
}

{
  const settableRoutes = SIGNAL_ROUTE_DEFINITIONS.filter((route) => route.commandStateSegmentIds.length > 0)

  settableRoutes.forEach((route) => {
    const updated = updateLineMapSignalTrackState(
      createLineMapRuntimeState(),
      signal(route.signalLabel),
      { id: '312' },
      'SET',
      route.routeLabel,
    )

    settableRoutes.forEach((otherRoute) => {
      const setLabels = getSignalRouteSetLabels(otherRoute.signalLabel, updated)

      if (otherRoute.signalLabel === route.signalLabel) {
        assert.deepEqual(setLabels, [route.routeLabel])
        return
      }

      assert.deepEqual(setLabels, [], `${route.signalLabel} ${route.routeLabel} must not set ${otherRoute.signalLabel}`)
    })
  })
}
