import assert from 'node:assert/strict'
import { DEFAULT_TIMETABLE_CLOCK_STATE } from '../../src/timetableClockState'
import {
  createInitialSession,
  createResetSessionState,
} from '../../src/sessionState'

{
  const reset = createResetSessionState('ASSESSMENT', 12345)
  const baseline = createInitialSession('ASSESSMENT')

  assert.equal(reset.trainingMode, 'ASSESSMENT')
  assert.equal(reset.updatedAt, 12345)
  assert.equal(reset.scenarioMode, 'IDLE')
  assert.equal(reset.scenarioStep, 0)
  assert.equal(reset.selectedTrainId, '317')
  assert.equal(reset.scenarioNotice.tone, 'success')
  assert.deepEqual(reset.timetableClock, DEFAULT_TIMETABLE_CLOCK_STATE)
  assert.deepEqual(reset.lineMap.routeSegments, {})
  assert.deepEqual(reset.lineMap.platformDoorStates, {})

  assert.deepEqual(
    reset.trains.map((train) => ({
      doorFailureState: train.doorFailureState,
      id: train.id,
      isMoving: train.isMoving,
      lineMapVisible: train.lineMapVisible,
      occupancySegmentId: train.occupancySegmentId,
      status: train.status,
      timetablePlayback: train.timetablePlayback,
    })),
    baseline.trains.map((train) => ({
      doorFailureState: train.doorFailureState,
      id: train.id,
      isMoving: train.isMoving,
      lineMapVisible: train.lineMapVisible,
      occupancySegmentId: train.occupancySegmentId,
      status: train.status,
      timetablePlayback: train.timetablePlayback,
    })),
  )
}
