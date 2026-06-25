import assert from 'node:assert/strict'
import {
  createNelTimetableRows,
  createNelTrainRosterItems,
} from '../../src/data/nelTimetable'

const page7Rows = createNelTimetableRows()
  .filter((row) => ['1010', '1011', '1012', '1013'].includes(row.sched))
  .sort((left, right) => left.sched.localeCompare(right.sched))
const correctedPage7Rows = createNelTimetableRows()
  .filter((row) => Number(row.sched) >= 1000 && Number(row.sched) <= 1013)
  .sort((left, right) => left.sched.localeCompare(right.sched))
const firstServicePairRows = createNelTimetableRows({ focus: 'first-service-pair' })
const firstServicePairRosterTrainIds = createNelTrainRosterItems({ focus: 'first-service-pair' })
  .map((item) => item.trainNumber)

assert.equal(createNelTimetableRows().length, 759)
assert.equal(createNelTrainRosterItems().length, 61)
assert.deepEqual(
  correctedPage7Rows.map((row) => row.train),
  ['301', '309', '312', '314', '317', '320', '323', '325', '328', '332', '335', '337', '339', '341'],
)
assert.deepEqual(
  correctedPage7Rows.map((row) => row.sched),
  ['1000', '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010', '1011', '1012', '1013'],
)
assert.equal(firstServicePairRows.length, 28)
assert.deepEqual(
  firstServicePairRows
    .filter((row) => row.run === 'NB')
    .map((row) => row.sched),
  ['1000', '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010', '1011', '1012', '1013'],
)
assert.deepEqual(
  firstServicePairRows
    .filter((row) => row.run === 'SB')
    .map((row) => row.sched),
  ['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013'],
)
assert.deepEqual(
  firstServicePairRosterTrainIds,
  ['301', '304', '309', '312', '314', '317', '320', '323', '325', '328', '332', '335', '337', '339', '341'],
)

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
