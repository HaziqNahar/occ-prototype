import assert from 'node:assert/strict'
import { DEFAULT_TIMETABLE_CLOCK_STATE } from '../../src/timetableClockState'
import {
  applyOccSessionUpdate,
  createInitialSession,
  createResetSessionState,
  shouldAcceptRemoteSession,
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

{
  const current = createInitialSession()

  assert.equal(applyOccSessionUpdate(current, (session) => session, current.updatedAt + 1), current)

  const updated = applyOccSessionUpdate(current, (session) => ({
    ...session,
    selectedTrainId: '301',
  }), 12345)

  assert.notEqual(updated, current)
  assert.equal(updated.selectedTrainId, '301')
  assert.equal(updated.updatedAt, 12345)
}

{
  const current = {
    ...createInitialSession(),
    scenarioRevision: 3,
    updatedAt: 100,
  }

  assert.equal(shouldAcceptRemoteSession(current, {
    ...current,
    scenarioRevision: 2,
    updatedAt: 200,
  }), false, 'a newer timestamp must not overwrite a newer scenario revision')

  assert.equal(shouldAcceptRemoteSession(current, {
    ...current,
    scenarioRevision: 4,
    updatedAt: 50,
  }), true, 'a newer scenario revision must win even if its timestamp is lower')

  assert.equal(shouldAcceptRemoteSession(current, {
    ...current,
    updatedAt: 101,
  }), true, 'timestamps order updates within the same scenario revision')
}
