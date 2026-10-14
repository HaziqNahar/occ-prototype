import type { OccSessionState } from './types'

export type TrainingAid = 'LOCATE' | 'SHOW_ME'

export const TRAINING_AIDS: readonly TrainingAid[] = ['LOCATE', 'SHOW_ME']

export const trainingAidLabels: Record<TrainingAid, string> = {
  LOCATE: 'Locate',
  SHOW_ME: 'Show me',
}

// Practice-mode aids drawn over the trainee monitors (docs/training-layer-plan.md).
// They show only in Practice with the trainer's Aids switch on; Assessment and
// Player never show them, whatever the switch says.
export function areTrainingAidsOn(session: Pick<OccSessionState, 'trainingAids' | 'trainingMode'>) {
  return session.trainingMode === 'PRACTICE' && session.trainingAids !== false
}
