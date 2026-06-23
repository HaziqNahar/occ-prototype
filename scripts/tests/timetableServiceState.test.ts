import assert from 'node:assert/strict'
import { createNelTimetableRows } from '../../src/data/nelTimetable'
import {
  createTimetableServiceDecisions,
} from '../../src/screens/line-map/timetableServiceState'
import type { TimetableRow } from '../../src/types'

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

{
  const decisions = createTimetableServiceDecisions(
    [
      timetableRow(),
      timetableRow({
        sched: '002',
        train: '314',
      }),
    ],
    new Date(2026, 0, 1, 10, 6, 0),
  )

  assert.deepEqual(decisions.map((decision) => decision.trainId).sort(), ['312', '314'])
  decisions.forEach((decision) => {
    assert.equal(decision.status, 'RUNNING')
    assert.equal(decision.route.id, 'timetable-pgc-skg-to-rt2-depot')
    assert.equal(decision.route.from, 'PGC')
    assert.equal(decision.route.to, 'RT2_DEPOT')
  })
}

{
  const decisions = createTimetableServiceDecisions(
    [
      timetableRow(),
      timetableRow({
        destinationPoint: 'PGCN',
        originPoint: 'HBFN',
        run: 'NB',
        stationPoint: 'HBFN',
        train: '999',
      }),
    ],
    new Date(2026, 0, 1, 10, 6, 0),
  )

  assert.deepEqual(decisions.map((decision) => decision.trainId), ['312'])
}

{
  const decisions = createTimetableServiceDecisions(
    [
      timetableRow({
        destinationTime: '10:30:00',
        sched: '001',
      }),
      timetableRow({
        originTime: '10:10:00',
        sched: '002',
        stationTime: '10:15:00',
      }),
    ],
    new Date(2026, 0, 1, 10, 16, 0),
  )

  assert.equal(decisions.length, 1)
  assert.equal(decisions[0].trainId, '312')
  assert.equal(decisions[0].row.sched, '001')
}

{
  const decisions = createTimetableServiceDecisions(
    createNelTimetableRows(),
    new Date(2026, 0, 1, 6, 22, 0),
  )
  const trainIds = decisions.map((decision) => decision.trainId)

  assert.equal(decisions.length > 0, true)
  assert.equal(new Set(trainIds).size, trainIds.length, 'each active timetable train must have exactly one route decision')
}
