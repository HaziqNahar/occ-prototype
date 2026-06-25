import assert from 'node:assert/strict'
import {
  createTimetableExecutorSnapshot,
  createTimetableTrainDuties,
  isTimetableExecutableRowActive,
} from '../../src/screens/line-map/timetableExecutor'
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

const options = {
  getEndSeconds: (row: TimetableRow) => Number(row.destinationTime),
  getStartSeconds: (row: TimetableRow) => Number(row.originTime),
  isServiceRow: (row: TimetableRow) => row.run === 'NB' || row.run === 'SB',
}

{
  const duties = createTimetableTrainDuties([
    timetableRow({ destinationTime: '200', originTime: '100', sched: '002' }),
    timetableRow({ destinationTime: '80', originTime: '50', sched: '001' }),
    timetableRow({ destinationTime: '150', originTime: '75', run: '', sched: 'ignored' }),
    timetableRow({ destinationTime: '140', originTime: '90', train: '304' }),
  ], options)

  assert.deepEqual(duties.map((duty) => duty.trainId), ['304', '312'])
  assert.deepEqual(duties.find((duty) => duty.trainId === '312')?.rows.map((row) => row.row.sched), ['001', '002'])
}

{
  const snapshot = createTimetableExecutorSnapshot([
    timetableRow({ destinationTime: '200', originTime: '100', sched: '001' }),
    timetableRow({ destinationTime: '260', originTime: '220', sched: '002' }),
    timetableRow({ destinationTime: '180', originTime: '120', train: '314' }),
  ], 150, options)

  assert.deepEqual(
    snapshot.activeRows.map((row) => `${row.trainId}:${row.row.sched}`).sort(),
    ['312:001', '314:001'],
  )
}

assert.equal(
  isTimetableExecutableRowActive({
    endSeconds: 10 * 60,
    row: timetableRow(),
    startSeconds: (23 * 60 * 60) + (55 * 60),
  }, (24 * 60 * 60) + (5 * 60)),
  true,
)
