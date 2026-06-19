import assert from 'node:assert/strict'
import {
  createNelTimetableRows,
  createNelTrainRosterItems,
} from '../../src/data/nelTimetable'

const page7Rows = createNelTimetableRows()
  .filter((row) => ['1010', '1011', '1012', '1013'].includes(row.sched))
  .sort((left, right) => left.sched.localeCompare(right.sched))

assert.deepEqual(page7Rows.map((row) => row.train), ['335', '337', '339', '341'])
assert.deepEqual(page7Rows.map((row) => row.sched), ['1010', '1011', '1012', '1013'])

assert.deepEqual(
  page7Rows.map((row) => ({
    destinationPoint: row.destinationPoint,
    destinationTime: row.destinationTime,
    originPoint: row.originPoint,
    originTime: row.originTime,
    stationTime: row.stationTime,
    state: row.state,
    train: row.train,
  })),
  [
    {
      destinationPoint: 'PGL',
      destinationTime: '6:21:57',
      originPoint: 'HBFN',
      originTime: '5:47:50',
      stationTime: '6:19:01',
      state: '',
      train: '335',
    },
    {
      destinationPoint: 'PGCN',
      destinationTime: '6:26:09',
      originPoint: 'SKG',
      originTime: '6:20:41',
      stationTime: '6:21:16',
      state: 'I>',
      train: '337',
    },
    {
      destinationPoint: 'PGL',
      destinationTime: '6:26:27',
      originPoint: 'HBFN',
      originTime: '5:52:20',
      stationTime: '6:23:31',
      state: '',
      train: '339',
    },
    {
      destinationPoint: 'PGCN',
      destinationTime: '6:30:39',
      originPoint: 'SKG',
      originTime: '6:25:11',
      stationTime: '6:25:46',
      state: 'I>',
      train: '341',
    },
  ],
)

const rosterTrainIds = new Set(createNelTrainRosterItems().map((item) => item.trainNumber))

;['335', '337', '339', '341'].forEach((trainId) => {
  assert.equal(rosterTrainIds.has(trainId), true)
})
