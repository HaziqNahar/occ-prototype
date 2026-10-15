import type { OccSessionState } from '../types'
import type { SessionActor, SessionCommand } from './types'

// A run in progress: started and not yet completed or stopped.
export function isRunActive(session: Pick<OccSessionState, 'scenarioMode'>) {
  return session.scenarioMode === 'RUNNING' || session.scenarioMode === 'PAUSED'
}

// Commands that end a trainee's run without completing it. The server saves
// that run to History as not completed before applying them (a run without a
// trainee, such as Player playback, is not kept).
export function endsRunUnfinished(session: OccSessionState, command: SessionCommand) {
  return isRunActive(session)
    && session.trainees.length > 0
    && (command.type === 'RESET_SCENARIO' || command.type === 'LOAD_SCENARIO' || command.type === 'RESET_SESSION')
}

export const NO_TRAINEE_REASON = 'Assign a trainee or wait for one to join first.'
export const TRAINER_END_RUN_REASON = 'Stop or complete the run first.'
export const TRAINEE_END_RUN_REASON = 'Your trainer must end the run first.'

// The run's guardrails, checked by the server before a command is applied.
// `traineeRunElsewhere` is true when the trainee a join or assign would move
// is in the other exercise's active run. Returns the refusal, or null.
export function checkRunGuard(
  session: OccSessionState,
  command: SessionCommand,
  actor: SessionActor,
  traineeRunElsewhere = false,
): string | null {
  switch (command.type) {
    case 'LOAD_SCENARIO':
      // Player mode is playback for review, without a trainee.
      return command.trainingMode !== 'PLAYER' && session.trainees.length === 0 ? NO_TRAINEE_REASON : null
    case 'TRAINEE_LEAVE':
      if (!isRunActive(session) || !session.trainees.some((trainee) => trainee.email === command.traineeId)) return null
      return actor.role === 'trainee' ? TRAINEE_END_RUN_REASON : TRAINER_END_RUN_REASON
    case 'TRAINEE_JOIN':
    case 'ASSIGN_TRAINEE':
      if (!traineeRunElsewhere) return null
      return actor.role === 'trainee' ? TRAINEE_END_RUN_REASON : `That trainee's run in the other exercise is still going. ${TRAINER_END_RUN_REASON}`
    default:
      return null
  }
}
