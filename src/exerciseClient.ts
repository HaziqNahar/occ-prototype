import { apiRequest } from './authClient'
import type { ScenarioMode } from './types'

// The trainer's exercises (up to two sessions at once, one per trainee) and
// who is in which. See docs/production-plan.md, phase 5.

export type ExerciseSummary = {
  code: string
  exercise: number
  id: string
  scenarioMode: ScenarioMode
  title: string
  trainees: Array<{ id: string; name: string }>
}

export type TraineeAccount = { id: string; name: string }

export const exerciseApi = {
  add: () => apiRequest<{ session: ExerciseSummary }>('/api/sessions', { body: {} }),
  assign: (traineeId: string, sessionId: string) => (
    apiRequest<{ accepted: boolean; reason: string | null; sessions: ExerciseSummary[] }>('/api/class/assign', { body: { sessionId, traineeId } })
  ),
  // A trainee joins the exercise whose code they were given.
  join: (code: string) => apiRequest<{ accepted: boolean; reason: string | null; sessionId: string }>('/api/class/join', { body: { code } }),
  list: () => apiRequest<{ sessions: ExerciseSummary[] }>('/api/sessions'),
  remove: (sessionId: string) => apiRequest<{ sessions: ExerciseSummary[] }>(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
  trainees: () => apiRequest<{ trainees: TraineeAccount[] }>('/api/trainees'),
}
