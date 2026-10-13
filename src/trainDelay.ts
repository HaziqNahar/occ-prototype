import type { TrainState, TrainStatus } from './types'

// A train runs late for as long as it is held: from the hold until it runs
// again, plus any lateness from earlier holds. A train waiting for its route
// (WAIT) is still standing, so it stays late. The timetable regulation graph
// shows this as the train's deviation.

export function updateTrainDelay(train: TrainState, nextStatus: TrainStatus, nowMs = Date.now()): TrainState {
  if (nextStatus === 'HOLD') {
    return train.heldSince === undefined ? { ...train, heldSince: nowMs } : train
  }

  if (nextStatus !== 'RUN' || train.heldSince === undefined) {
    return train
  }

  return {
    ...train,
    heldSince: undefined,
    lateSeconds: (train.lateSeconds ?? 0) + Math.max(0, Math.round((nowMs - train.heldSince) / 1000)),
  }
}

export function getTrainDelaySeconds(train: Pick<TrainState, 'heldSince' | 'lateSeconds'>, nowMs = Date.now()) {
  const heldSeconds = train.heldSince === undefined ? 0 : Math.max(0, Math.round((nowMs - train.heldSince) / 1000))

  return (train.lateSeconds ?? 0) + heldSeconds
}
