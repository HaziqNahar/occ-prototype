import type { TrainDoorFailureState, TrainReadinessMode, TrainState } from '../../types'
import { getTrainReadinessMode } from '../../screens/line-map/model'

export type TrainDoorCommand =
  | 'cycle-door'
  | 'confirm-closed-locked'
  | 'authorize-door-isolation'
  | 'authorize-move'
  | 'withdraw-service'

export function getTrainReadinessRequestValue(train: Pick<TrainState, 'readinessMode'>) {
  switch (getTrainReadinessMode(train)) {
    case 'ASLEEP':
      return 'Asleep'
    case 'DEPOT_MOVEMENT':
      return 'Depot movement'
    case 'HV_ISOLATED':
      return 'HV isolated'
    case 'MAINLINE_OFF_SERVICE':
      return 'Mainline off service'
    case 'MAINLINE_SERVICE':
    default:
      return 'Mainline service'
  }
}

export function getTrainReadinessModeFromCommand(command: string): TrainReadinessMode {
  switch (command) {
    case 'ASLEEP':
      return 'ASLEEP'
    case 'DEPOT MOVEMENT':
      return 'DEPOT_MOVEMENT'
    case 'HV ISOLATED':
      return 'HV_ISOLATED'
    case 'MAINLINE OFF SERVICE':
      return 'MAINLINE_OFF_SERVICE'
    case 'MAINLINE SERVICE':
    default:
      return 'MAINLINE_SERVICE'
  }
}

export function getTrainDoorFailureState(train: Pick<TrainState, 'doorFailureState'>): TrainDoorFailureState {
  return train.doorFailureState ?? 'NORMAL'
}

export function getTrainDoorFaultDisplayValue(state: TrainDoorFailureState) {
  return state === 'NORMAL' || state === 'CLOSED_LOCKED_CONFIRMED'
    ? 'NO'
    : 'YES'
}

export function getTrainDoorSummaryStatus(state: TrainDoorFailureState) {
  switch (state) {
    case 'FAULT_ALARM':
      return 'NOT OPEN/CLOSE'
    case 'CYCLE_DOOR_REQUESTED':
      return 'CYCLE DOOR REQUESTED'
    case 'CLOSED_LOCKED_CONFIRMED':
      return 'CLOSED/LOCKED'
    case 'ISOLATION_REQUIRED':
      return 'ISOLATION REQUIRED'
    case 'DOOR_ISOLATED':
      return 'DOOR ISOLATED'
    case 'AUTHORIZED_TO_MOVE':
      return 'AUTHORISED TO MOVE'
    case 'WITHDRAW_FROM_SERVICE':
      return 'WITHDRAW FROM SERVICE'
    case 'NORMAL':
    default:
      return 'CLOSED/LOCKED'
  }
}

export function getTrainDoorIsolationStatus(state: TrainDoorFailureState) {
  return state === 'DOOR_ISOLATED' || state === 'AUTHORIZED_TO_MOVE' || state === 'WITHDRAW_FROM_SERVICE'
    ? 'ISOLATED'
    : 'NOT ISOLATED'
}

export function getTrainDoorCommandLabel(command: TrainDoorCommand) {
  switch (command) {
    case 'cycle-door':
      return 'Cycle Door'
    case 'confirm-closed-locked':
      return 'Confirm Closed/Locked'
    case 'authorize-door-isolation':
      return 'Authorize Door Isolation'
    case 'authorize-move':
      return 'Authorize Movement'
    case 'withdraw-service':
      return 'Withdraw From Service'
    default:
      return ''
  }
}

export function getTrainDoorCommandValue(command: TrainDoorCommand) {
  switch (command) {
    case 'cycle-door':
      return 'CYCLE DOOR'
    case 'confirm-closed-locked':
      return 'CONFIRM CLOSED/LOCKED'
    case 'authorize-door-isolation':
      return 'AUTHORIZE ISOLATION'
    case 'authorize-move':
      return 'AUTHORIZE MOVEMENT'
    case 'withdraw-service':
      return 'WITHDRAW SERVICE'
    default:
      return ''
  }
}

export function getTrainDoorCommandFromRequest(value: string): TrainDoorCommand | null {
  switch (value) {
    case 'Cycle Door':
      return 'cycle-door'
    case 'Confirm Closed/Locked':
      return 'confirm-closed-locked'
    case 'Authorize door isolation':
      return 'authorize-door-isolation'
    case 'Authorize movement':
      return 'authorize-move'
    case 'Withdraw from service':
      return 'withdraw-service'
    default:
      return null
  }
}

export function getAllowedTrainDoorCommands(state: TrainDoorFailureState): TrainDoorCommand[] {
  switch (state) {
    case 'FAULT_ALARM':
      return ['cycle-door']
    case 'CYCLE_DOOR_REQUESTED':
      return ['confirm-closed-locked', 'authorize-door-isolation']
    case 'DOOR_ISOLATED':
      return ['authorize-move', 'withdraw-service']
    case 'CLOSED_LOCKED_CONFIRMED':
      return ['authorize-move']
    default:
      return []
  }
}

export function getTrainDoorCommandRejectionMessage(state: TrainDoorFailureState, command: TrainDoorCommand) {
  if (state === 'NORMAL') {
    return `${getTrainDoorCommandLabel(command)} rejected\nNo active train door failure`
  }

  if (state === 'WITHDRAW_FROM_SERVICE' || state === 'AUTHORIZED_TO_MOVE') {
    return `${getTrainDoorCommandLabel(command)} rejected\nDoor failure workflow already completed`
  }

  return `${getTrainDoorCommandLabel(command)} rejected\nFollow train door failure sequence`
}

export function getTrainDoorStateAfterCommand(command: TrainDoorCommand): TrainDoorFailureState {
  switch (command) {
    case 'cycle-door':
      return 'CYCLE_DOOR_REQUESTED'
    case 'confirm-closed-locked':
      return 'CLOSED_LOCKED_CONFIRMED'
    case 'authorize-door-isolation':
      return 'DOOR_ISOLATED'
    case 'authorize-move':
      return 'AUTHORIZED_TO_MOVE'
    case 'withdraw-service':
      return 'WITHDRAW_FROM_SERVICE'
    default:
      return 'NORMAL'
  }
}

export function getTrainDoorCommandStatusMessage(command: TrainDoorCommand) {
  return `${getTrainDoorCommandLabel(command)} request\nCommand successful`
}
