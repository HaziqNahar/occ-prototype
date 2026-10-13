import assert from 'node:assert/strict'
import { getTrainDelaySeconds, updateTrainDelay } from '../../src/trainDelay'
import type { TrainState } from '../../src/types'

const train: TrainState = { direction: 'right', id: '320', service: 'NB', status: 'RUN', x: 0, y: 0 }
const at = (seconds: number) => 1_000_000 + seconds * 1000

// Held: late for as long as the hold lasts; a second hold does not restart it.
const held = updateTrainDelay(train, 'HOLD', at(0))
assert.equal(getTrainDelaySeconds(held, at(45)), 45)
assert.equal(updateTrainDelay(held, 'HOLD', at(20)), held)

// Waiting for a route the train is still standing, so it stays held.
const waiting = updateTrainDelay(held, 'WAIT', at(30))
assert.equal(getTrainDelaySeconds(waiting, at(50)), 50)

// Running again keeps the lateness, and a later hold adds to it.
const running = updateTrainDelay(waiting, 'RUN', at(60))
assert.equal(running.heldSince, undefined)
assert.equal(getTrainDelaySeconds(running, at(500)), 60)
assert.equal(getTrainDelaySeconds(updateTrainDelay(running, 'HOLD', at(600)), at(610)), 70)

// A train never held is on time.
assert.equal(getTrainDelaySeconds(train), 0)
