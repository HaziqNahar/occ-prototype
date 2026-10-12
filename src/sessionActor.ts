import { toTraineeId } from './session-commands/monitorCommands'
import type { SessionActor } from './session-commands/types'
import type { AppRoute } from './types'

// Who this window acts as, sent with every command. The trainer console and
// report act as the trainer; the trainee page and monitors act as the trainee
// who joined on this PC. Phase 4 replaces this with signed-in accounts.

export type TraineeIdentity = {
  email: string
  name: string
}

const TRAINEE_IDENTITY_KEY = 'occ.trainee.identity.v1'

const TRAINER_ROUTES = new Set<AppRoute>(['/ios', '/ios/modules', '/ios/scenarios', '/ios/assessment', '/report'])

export function readTraineeIdentity(): TraineeIdentity | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(TRAINEE_IDENTITY_KEY) ?? 'null')

    return stored && typeof stored === 'object' && typeof (stored as { email?: unknown }).email === 'string'
      ? stored as TraineeIdentity
      : null
  } catch {
    return null
  }
}

export function writeTraineeIdentity(identity: TraineeIdentity | null) {
  try {
    if (identity) {
      localStorage.setItem(TRAINEE_IDENTITY_KEY, JSON.stringify(identity))
    } else {
      localStorage.removeItem(TRAINEE_IDENTITY_KEY)
    }
  } catch {
    // Without storage the trainee simply joins again after a reload.
  }
}

export function createTraineeIdentity(name: string): TraineeIdentity {
  return { email: toTraineeId(name), name: name.trim() }
}

export function getActorForRoute(route: AppRoute): SessionActor {
  if (TRAINER_ROUTES.has(route)) {
    return { name: 'Trainer', role: 'trainer' }
  }

  const identity = readTraineeIdentity()

  return identity
    ? { id: identity.email, name: identity.name, role: 'trainee' }
    : { name: 'Trainee (not joined)', role: 'trainee' }
}
