import assert from 'node:assert/strict'
import { DEFAULT_TIMETABLE_CLOCK_STATE } from '../../src/timetableClockState'
import {
  createInitialSession,
  createResetSessionState,
} from '../../src/sessionState'

{
  const reset = createResetSessionState('ASSESSMENT', 12345, 7)
  const baseline = createInitialSession('ASSESSMENT')

  assert.equal(reset.trainingMode, 'ASSESSMENT')
  assert.equal(reset.updatedAt, 12345)
  assert.equal(reset.scenarioMode, 'IDLE')
  assert.equal(reset.scenarioRevision, 7)
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
      itamaAuthorisedPreparationConfirmed: train.itamaAuthorisedPreparationConfirmed,
      itamaGranted: train.itamaGranted,
      itamaNotAuthorisedPreparationConfirmed: train.itamaNotAuthorisedPreparationConfirmed,
      itamaStatus: train.itamaStatus,
      lineMapVisible: train.lineMapVisible,
      occupancySegmentId: train.occupancySegmentId,
      readinessMode: train.readinessMode,
      status: train.status,
      timetablePlayback: train.timetablePlayback,
    })),
    baseline.trains.map((train) => ({
      doorFailureState: train.doorFailureState,
      id: train.id,
      isMoving: train.isMoving,
      itamaAuthorisedPreparationConfirmed: train.itamaAuthorisedPreparationConfirmed,
      itamaGranted: train.itamaGranted,
      itamaNotAuthorisedPreparationConfirmed: train.itamaNotAuthorisedPreparationConfirmed,
      itamaStatus: train.itamaStatus,
      lineMapVisible: train.lineMapVisible,
      occupancySegmentId: train.occupancySegmentId,
      readinessMode: train.readinessMode,
      status: train.status,
      timetablePlayback: train.timetablePlayback,
    })),
  )

  assert.equal(reset.trains.every((train) => train.readinessMode === 'MAINLINE_SERVICE'), true)
  assert.equal(reset.trains.every((train) => train.itamaGranted === true), true)
  assert.equal(reset.trains.every((train) => train.itamaStatus === 'GRANTED'), true)
}
