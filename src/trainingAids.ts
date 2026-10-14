import type { OccSessionState } from './types'

// Practice-mode aids drawn over the trainee monitors (docs/training-layer-plan.md).
// They show only in Practice with the trainer's Aids switch on; Assessment and
// Player never show them, whatever the switch says.
export function areTrainingAidsOn(session: Pick<OccSessionState, 'trainingAids' | 'trainingMode'>) {
  return session.trainingMode === 'PRACTICE' && session.trainingAids !== false
}
