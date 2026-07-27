import assert from 'node:assert/strict'
import {
  getTrainMarkerDirectionForTimeSelection,
  isManualMovementArrivalDestination,
} from '../../src/components/train-control/trainTimeOptions'
import type { TrainTimeSelection } from '../../src/components/train-control/trainTimeOptions'

function selection(station: string, platformSiding: string): TrainTimeSelection {
  return {
    command: `${platformSiding} - 0:0:0 - 1 - 0`,
    kind: 'arrival',
    platformSiding,
    station,
  }
}

{
assert.equal(getTrainMarkerDirectionForTimeSelection(selection('SKG', 'SKGS'), 'right'), 'left')
assert.equal(getTrainMarkerDirectionForTimeSelection(selection('SKG', 'SKGN'), 'left'), 'right')
assert.equal(getTrainMarkerDirectionForTimeSelection(selection('NED', 'RT2D'), 'right'), 'left')
assert.equal(getTrainMarkerDirectionForTimeSelection(selection(' ned ', ' rt2d '), 'right'), 'left')
assert.equal(getTrainMarkerDirectionForTimeSelection(selection('PGC', 'PGCN'), 'right'), 'right')
assert.equal(isManualMovementArrivalDestination(selection('SKG', 'SKGS')), true)
assert.equal(isManualMovementArrivalDestination(selection('SKG', 'SKGN')), true)
assert.equal(isManualMovementArrivalDestination(selection('NED', 'RT2D')), true)
  assert.equal(isManualMovementArrivalDestination(selection(' ned ', ' rt2d ')), true)
  assert.equal(isManualMovementArrivalDestination(selection('PGC', 'PGCN')), false)
}
