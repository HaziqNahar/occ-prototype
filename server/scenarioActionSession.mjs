/**
 * Returns the session snapshot that an operator action must be applied to.
 *
 * The submitted snapshot reflects the screen state the operator acted on. An
 * in-memory backend snapshot can legitimately lag behind it because monitor
 * state is published asynchronously.
 */
export function getScenarioActionSession(currentSession, incomingSession) {
  return incomingSession ?? currentSession
}
