import assert from 'node:assert/strict'
import { createInitialSession } from '../../src/sessionState'
import type { OccSessionState, TimetableRow } from '../../src/types'
import {
  applyTimetablePlaybackStepSession,
  createAutomaticTimetablePlaybackPlans,
  createTimetablePlaybackRouteModeKey,
  createTimetablePlaybackRunKey,
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
  assert.equal(
    createTimetablePlaybackRouteModeKey({ SKG: 'OCCA', PGC: 'OCCM' }),
    'PGC:OCCM|SKG:OCCA',
  )
  assert.equal(
    createTimetablePlaybackRunKey('created', { SKG: 'OCCA' }, 3),
    'created:SKG:OCCA:3',
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
