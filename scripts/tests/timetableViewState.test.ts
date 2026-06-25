import assert from 'node:assert/strict'
import {
  getActiveTimetableView,
  getTimetableStationOptions,
  getTimetableViewKey,
  getTimetableViewRows,
  normalizeTimetableViewState,
} from '../../src/timetableViewState'
import type { TimetableRow } from '../../src/types'

function row(overrides: Partial<TimetableRow>): TimetableRow {
  return {
    state: 'RUN',
    train: '301',
    sched: '1000',
    originPoint: 'SKG',
    originTime: '05:30:00',
    selectedStation: '',
    stationPoint: 'SKGN',
    stationTime: '05:32:00',
    dwell: '',
    run: 'NB',
    destinationPoint: 'PGCN',
    destinationTime: '05:38:00',
    revision: '',
    speed: '',
    ...overrides,
  }
}

const rows = [
  row({ train: '301', run: 'NB', stationPoint: 'SKGN' }),
  row({ train: '302', run: 'SB', stationPoint: 'SKGS' }),
  row({ train: '401', run: 'NB', stationPoint: 'PGLN' }),
]

assert.deepEqual(getTimetableStationOptions(rows), ['PGL', 'SKG'])
assert.deepEqual(normalizeTimetableViewState(undefined), { direction: 'NB', station: 'SKG' })
assert.deepEqual(normalizeTimetableViewState({ direction: 'SB', station: 'skg' }), { direction: 'SB', station: 'SKG' })
assert.deepEqual(getActiveTimetableView(rows, { direction: 'SB', station: 'missing' }), { direction: 'SB', station: 'PGL' })
assert.deepEqual(getTimetableViewRows(rows, { direction: 'NB', station: 'SKG' }).map((item) => item.train), ['301'])
assert.deepEqual(getTimetableViewRows(rows, { direction: 'SB', station: 'SKG' }).map((item) => item.train), ['302'])
assert.equal(getTimetableViewKey({ direction: 'SB', station: 'SKG' }), 'SKG:SB')
