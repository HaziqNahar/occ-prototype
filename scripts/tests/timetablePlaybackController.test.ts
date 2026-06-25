import assert from 'node:assert/strict'
import { createInitialSession } from '../../src/sessionState'
import type { OccSessionState, TimetableRow } from '../../src/types'
import {
  applyTimetablePlaybackCompletionSession,
  applyTimetablePlatformDoorPhaseSession,
  applyTimetablePlaybackRunStart,
  applyTimetablePlaybackStepSession,
  createAutomaticTimetablePlaybackPlans,
  createTimetablePlaybackPlanKey,
  createTimetablePlaybackRouteModeKey,
  createTimetablePlaybackRunKey,
  createTimetablePlaybackScopeKey,
  pruneInactiveTimetablePlaybackPlanSchedules,
  scheduleTimetablePlaybackPlans,
  scheduleTimetablePlaybackRun,
} from '../../src/screens/line-map/timetablePlaybackController'

function timetableRow(overrides: Partial<TimetableRow> = {}): TimetableRow {
  return {
    state: 'RUN',
    train: '312',
    sched: '001',
    originPoint: 'PGC',
    originTime: '10:00:00',
    selectedStation: '',
    stationPoint: 'SKG',
    stationTime: '10:05:00',
    dwell: '',
    run: 'SB',
    destinationPoint: 'RT2D',
    destinationTime: '10:20:00',
    revision: '',
    speed: '',
    ...overrides,
  }
}

function sessionWithRows(rows: TimetableRow[]): OccSessionState {
  return {
    ...createInitialSession(),
    timetableRows: rows,
  }
}

{
  const session = sessionWithRows([timetableRow()])
  const train = session.trains.find((currentTrain) => currentTrain.id === '312')

  assert.equal(train?.lineMapVisible, false)
  assert.notEqual(train?.x, 0)
}

{
  assert.equal(
    createTimetablePlaybackRouteModeKey({ SKG: 'OCCA', PGC: 'OCCM' }),
    'PGC:OCCM|SKG:OCCA',
  )
  assert.equal(
    createTimetablePlaybackRunKey('created', { SKG: 'OCCA' }, 3),
    'created:SKG:OCCA:3',
  )
  assert.equal(
    createTimetablePlaybackRunKey('created', { SKG: 'OCCA' }, 3, 'SKG:SB'),
    'created:SKG:OCCA:3:SKG:SB',
  )
  assert.equal(
    createTimetablePlaybackScopeKey('created', { SKG: 'OCCA' }),
    'created:SKG:OCCA',
  )
}

{
  const session = sessionWithRows([timetableRow()])
  const now = new Date(2026, 0, 1, 10, 6, 0)

  assert.equal(createAutomaticTimetablePlaybackPlans(session, {}, now).length, 1)
  assert.equal(createAutomaticTimetablePlaybackPlans(session, { SKG: 'OCCM' }, now).length, 0)
}

{
  const session = sessionWithRows([timetableRow()])
  const plan = createAutomaticTimetablePlaybackPlans(session, {}, new Date(2026, 0, 1, 10, 6, 0))[0]

  assert.ok(plan)

  const updated = applyTimetablePlaybackStepSession(session, plan, plan.firstStepIndex)

  assert.equal(updated.timetableRows.find((row) => row.train === '312')?.state, '>')
  assert.equal(updated.eventRows[0].message.includes('Timetable 001 auto route'), true)
  assert.equal(updated.scenarioNotice.text, 'Timetable playback started for Train 312, schedule 001.')
  assert.equal(updated.trains.find((train) => train.id === '312')?.timetablePlayback, true)
}

{
  const session = sessionWithRows([timetableRow()])
  const plan = createAutomaticTimetablePlaybackPlans(session, {}, new Date(2026, 0, 1, 10, 0, 0))[0]

  assert.ok(plan)
  assert.ok(plan.routeSteps)
  assert.equal(plan.steps.length > 3, true)
  assert.equal(plan.steps.some((step) => step.segmentId === 'rail-1115' || step.segmentId.startsWith('rail-P')), false)

  const first = applyTimetablePlaybackStepSession(session, plan, 0)
  const firstRail = plan.steps[0].segmentId
  const nextRail = plan.steps[1].segmentId

  assert.equal(first.lineMap.routeSegments[firstRail].status, 'DISPATCHED')
  assert.equal(first.lineMap.routeSegments[nextRail].status, 'DISPATCHED')

  const advanced = applyTimetablePlaybackStepSession(first, plan, 2)
  const currentRail = plan.steps[2].segmentId
  const nextAheadRail = plan.steps[3].segmentId

  assert.equal(advanced.lineMap.routeSegments[firstRail].status, 'UNSET')
  assert.equal(advanced.lineMap.routeSegments[nextRail].status, 'UNSET')
  assert.equal(advanced.lineMap.routeSegments[currentRail].status, 'DISPATCHED')
  assert.equal(advanced.lineMap.routeSegments[nextAheadRail].status, 'DISPATCHED')

  const finalStepIndex = plan.steps.length - 1
  const final = applyTimetablePlaybackStepSession(advanced, plan, finalStepIndex)

  assert.equal(final.lineMap.routeSegments[firstRail].status, 'UNSET')
  assert.equal(final.trains.find((train) => train.id === '312')?.lineMapVisible, false)
}

{
  const session = sessionWithRows([timetableRow({
    destinationPoint: 'PGC',
    destinationTime: '10:10:00',
    originPoint: 'SKG',
    originTime: '10:00:00',
    run: 'NB',
    stationPoint: 'SKG',
    stationTime: '10:00:00',
  })])
  const plan = createAutomaticTimetablePlaybackPlans(session, {}, new Date(2026, 0, 1, 10, 5, 0))[0]

  assert.ok(plan)

  const finalStepIndex = plan.steps.length - 1
  const finalStep = plan.steps[finalStepIndex]
  const arrived = applyTimetablePlaybackStepSession(session, plan, finalStepIndex)

  assert.equal(arrived.lineMap.routeSegments[finalStep.segmentId].status, 'DISPATCHED')
  assert.equal(arrived.trains.find((train) => train.id === '312')?.lineMapVisible, true)

  const cleaned = applyTimetablePlaybackCompletionSession(arrived, plan)

  assert.equal(cleaned.lineMap.routeSegments[finalStep.segmentId].status, 'UNSET')
  assert.equal(cleaned.trains.find((train) => train.id === '312')?.lineMapVisible, false)
  assert.equal(cleaned.trains.find((train) => train.id === '312')?.timetablePlayback, false)
}

{
  const session = sessionWithRows([timetableRow({
    destinationPoint: 'PGC',
    destinationTime: '10:10:00',
    originPoint: 'SKG',
    originTime: '10:00:00',
    run: 'NB',
    stationPoint: 'SKG',
    stationTime: '10:00:00',
  })])
  const plan = createAutomaticTimetablePlaybackPlans(session, {}, new Date(2026, 0, 1, 10, 0, 0))[0]

  assert.ok(plan)
  assert.equal(plan.platformStops[0]?.platformCode, 'SKG')
  assert.equal(plan.platformStops[0]?.stepIndex, 0)

  const stoppedAtStation = applyTimetablePlaybackStepSession(session, plan, 0)
  const stoppedTrain = stoppedAtStation.trains.find((train) => train.id === '312')

  assert.equal(stoppedTrain?.status, 'WAIT')
  assert.equal(stoppedTrain?.isMoving, false)
  assert.equal(stoppedTrain?.lineMapVisible, true)

  const unknownDoors = applyTimetablePlatformDoorPhaseSession(stoppedAtStation, plan, 0, 'UNKNOWN_BEFORE')
  assert.equal(unknownDoors.lineMap.platformDoorStates['SKG-NB']?.status, 'UNKNOWN')

  const cyclingDoors = applyTimetablePlatformDoorPhaseSession(unknownDoors, plan, 0, 'CYCLING')
  assert.equal(cyclingDoors.lineMap.platformDoorStates['SKG-NB']?.status, 'CYCLING')

  const normalDoors = applyTimetablePlatformDoorPhaseSession(cyclingDoors, plan, 0, 'NORMAL')
  assert.equal(normalDoors.lineMap.platformDoorStates['SKG-NB'], undefined)

  const resumed = applyTimetablePlaybackStepSession(normalDoors, plan, 1)
  const resumedTrain = resumed.trains.find((train) => train.id === '312')

  assert.equal(resumedTrain?.status, 'RUN')
  assert.equal(resumedTrain?.isMoving, true)
}

{
  let session = sessionWithRows([timetableRow()])
  const scheduledCallbacks: Array<{ callback: () => void; delayMs: number; id: number }> = []
  const timeoutIds = scheduleTimetablePlaybackRun({
    now: new Date(2026, 0, 1, 10, 6, 0),
    routeControlModes: {},
    scheduleTimeout: (callback, delayMs) => {
      const id = scheduledCallbacks.length + 1

      scheduledCallbacks.push({ callback, delayMs, id })

      return id
    },
    session,
    updateSession: (updater) => {
      session = updater(session)
    },
  })

  assert.equal(timeoutIds.length, scheduledCallbacks.length)
  assert.equal(timeoutIds.length > 0, true)

  scheduledCallbacks[0].callback()

  assert.equal(session.timetableRows.find((row) => row.train === '312')?.state, '>')
  assert.equal(session.eventRows[0].message.includes('Train 312'), true)
}

{
  let session = sessionWithRows([timetableRow()])
  const plan = createAutomaticTimetablePlaybackPlans(session, {}, new Date(2026, 0, 1, 10, 6, 0))[0]
  const scheduledCallbacks: Array<{ callback: () => void; delayMs: number; id: number }> = []

  assert.ok(plan)
  assert.equal(
    createTimetablePlaybackPlanKey(plan),
    '312|001|timetable-pgc-skg-to-rt2-depot|36000|37200',
  )

  const timeoutIds = scheduleTimetablePlaybackPlans({
    plans: [plan],
    scheduleTimeout: (callback, delayMs) => {
      const id = scheduledCallbacks.length + 1

      scheduledCallbacks.push({ callback, delayMs, id })

      return id
    },
    updateSession: (updater) => {
      session = updater(session)
    },
  })

  assert.equal(timeoutIds.length, scheduledCallbacks.length)
  assert.equal(timeoutIds.length > 0, true)

  scheduledCallbacks[0].callback()

  assert.equal(session.trains.find((train) => train.id === '312')?.timetablePlayback, true)
}

{
  const scheduledPlanKeys = new Set(['active-plan', 'completed-active-plan', 'inactive-plan'])
  const planTimeouts = new Map<string, number[]>([
    ['active-plan', [101, 102]],
    ['inactive-plan', [201, 202]],
  ])
  const clearedTimeoutIds: number[] = []

  pruneInactiveTimetablePlaybackPlanSchedules({
    activePlanKeys: new Set(['active-plan', 'completed-active-plan']),
    clearTimeout: (timeoutId) => {
      clearedTimeoutIds.push(timeoutId)
    },
    planTimeouts,
    scheduledPlanKeys,
  })

  assert.deepEqual([...scheduledPlanKeys].sort(), ['active-plan', 'completed-active-plan'])
  assert.deepEqual(clearedTimeoutIds, [201, 202])
  assert.deepEqual(planTimeouts.get('active-plan'), [101, 102])
  assert.equal(planTimeouts.has('completed-active-plan'), false)
  assert.equal(planTimeouts.has('inactive-plan'), false)
}

{
  const session = {
    ...sessionWithRows([timetableRow({
      destinationPoint: 'PGC',
      destinationTime: '10:10:00',
      originPoint: 'SKG',
      originTime: '10:00:00',
      run: 'NB',
      stationPoint: 'SKG',
      stationTime: '10:00:00',
      train: '301',
    })]),
    trains: [
      {
        direction: 'right',
        id: '301',
        isMoving: true,
        lineMapVisible: true,
        occupancySegmentId: 'rail-621',
        service: 'NB',
        status: 'RUN',
        timetablePlayback: true,
        x: 0,
        y: 0,
      },
    ],
  }
  const held = applyTimetablePlaybackRunStart(session, [], new Set(['301']), new Set(['301']))
  const heldTrain = held.trains.find((train) => train.id === '301')

  assert.equal(heldTrain?.lineMapVisible, true)
  assert.equal(heldTrain?.occupancySegmentId, 'rail-621')
  assert.equal(heldTrain?.isMoving, false)
  assert.equal(heldTrain?.status, 'WAIT')

  const cleaned = applyTimetablePlaybackRunStart(session, [], new Set())
  const cleanedTrain = cleaned.trains.find((train) => train.id === '301')

  assert.equal(cleanedTrain?.lineMapVisible, false)
  assert.equal(cleanedTrain?.occupancySegmentId, undefined)
  assert.equal(cleanedTrain?.timetablePlayback, false)
}

{
  const baseSession = sessionWithRows([timetableRow()])
  const session = {
    ...baseSession,
    lineMap: {
      ...baseSession.lineMap,
      routeSegments: {
        ...baseSession.lineMap.routeSegments,
        'rail-1109': {
          segmentId: 'rail-1109',
          status: 'DISPATCHED',
          trainId: '312',
          updatedAt: 1,
        },
      },
    },
    trains: baseSession.trains.map((train) => (
      train.id === '312'
        ? {
            ...train,
            isMoving: true,
            lineMapVisible: true,
            occupancySegmentId: 'rail-1109',
            status: 'RUN' as const,
            timetablePlayback: false,
          }
        : train
    )),
  }

  const cleaned = applyTimetablePlaybackRunStart(session, [], new Set())
  const cleanedTrain = cleaned.trains.find((train) => train.id === '312')

  assert.equal(cleanedTrain?.lineMapVisible, false)
  assert.equal(cleanedTrain?.occupancySegmentId, undefined)
  assert.equal(cleanedTrain?.timetablePlayback, false)
  assert.equal(cleaned.lineMap.routeSegments['rail-1109'], undefined)
}
