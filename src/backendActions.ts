import { submitOccSessionAction } from './backendClient'
import type { OccSessionAction } from './backendClient'
import { normalizeClientSession } from './sessionState'
import type { OccSessionState } from './types'

// Sends a scored action to the backend, then applies the backend's result. If the
// backend cannot be reached, the local fallback keeps the exercise running.
export function submitBackendScenarioAction(
  session: OccSessionState,
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void,
  action: OccSessionAction,
  fallback?: (current: OccSessionState) => OccSessionState,
  onComplete?: (accepted: boolean, reason: string | null) => void,
) {
  void submitOccSessionAction(session, action)
    .then((payload) => {
      const normalized = normalizeClientSession(payload.session)
      const nextSession = payload.accepted && fallback
        ? fallback(normalized)
        : normalized

      updateSession(() => ({
        ...nextSession,
        selectedTrainId: action.trainId ?? nextSession.selectedTrainId,
      }))
      onComplete?.(payload.accepted, payload.reason)
    })
    .catch(() => {
      if (fallback) {
        updateSession(fallback)
      }
      onComplete?.(false, 'Backend unavailable. Used local fallback.')
    })
}
