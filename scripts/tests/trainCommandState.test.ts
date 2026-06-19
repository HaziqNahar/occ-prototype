import assert from 'node:assert/strict'
import {
  getAllowedTrainDoorCommands,
  getTrainDoorCommandFromRequest,
  getTrainDoorCommandRejectionMessage,
  getTrainDoorCommandStatusMessage,
  getTrainDoorCommandValue,
  getTrainDoorFailureState,
  getTrainDoorFaultDisplayValue,
  getTrainDoorIsolationStatus,
  getTrainDoorStateAfterCommand,
  getTrainDoorSummaryStatus,
  getTrainReadinessModeFromCommand,
  getTrainReadinessRequestValue,
} from '../../src/components/train-control/trainCommandState'

{
  assert.equal(getTrainReadinessRequestValue({}), 'Mainline service')
  assert.equal(getTrainReadinessRequestValue({ readinessMode: 'MAINLINE_OFF_SERVICE' }), 'Mainline off service')
  assert.equal(getTrainReadinessModeFromCommand('MAINLINE OFF SERVICE'), 'MAINLINE_OFF_SERVICE')
  assert.equal(getTrainReadinessModeFromCommand('UNKNOWN'), 'MAINLINE_SERVICE')
}

{
  assert.equal(getTrainDoorFailureState({}), 'NORMAL')
  assert.equal(getTrainDoorFaultDisplayValue('NORMAL'), 'NO')
  assert.equal(getTrainDoorFaultDisplayValue('FAULT_ALARM'), 'YES')
  assert.equal(getTrainDoorSummaryStatus('AUTHORIZED_TO_MOVE'), 'AUTHORISED TO MOVE')
  assert.equal(getTrainDoorIsolationStatus('DOOR_ISOLATED'), 'ISOLATED')
  assert.equal(getTrainDoorIsolationStatus('FAULT_ALARM'), 'NOT ISOLATED')
}

{
  assert.deepEqual(getAllowedTrainDoorCommands('FAULT_ALARM'), ['cycle-door'])
  assert.deepEqual(getAllowedTrainDoorCommands('CYCLE_DOOR_REQUESTED'), [
    'confirm-closed-locked',
    'authorize-door-isolation',
  ])
  assert.deepEqual(getAllowedTrainDoorCommands('DOOR_ISOLATED'), ['authorize-move', 'withdraw-service'])
  assert.deepEqual(getAllowedTrainDoorCommands('NORMAL'), [])
}

{
  assert.equal(getTrainDoorCommandFromRequest('Cycle Door'), 'cycle-door')
  assert.equal(getTrainDoorCommandFromRequest('Authorize movement'), 'authorize-move')
  assert.equal(getTrainDoorCommandFromRequest('not a command'), null)
  assert.equal(getTrainDoorCommandValue('authorize-door-isolation'), 'AUTHORIZE ISOLATION')
  assert.equal(getTrainDoorStateAfterCommand('withdraw-service'), 'WITHDRAW_FROM_SERVICE')
  assert.equal(getTrainDoorCommandStatusMessage('cycle-door'), 'Cycle Door request\nCommand successful')
  assert.equal(
    getTrainDoorCommandRejectionMessage('NORMAL', 'cycle-door'),
    'Cycle Door rejected\nNo active train door failure',
  )
}
