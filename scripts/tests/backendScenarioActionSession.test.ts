import assert from 'node:assert/strict'
import { getScenarioActionSession } from '../../server/scenarioActionSession.mjs'

{
  const staleBackendSession = {
    activeScenario: { id: 'train-withdrawal' },
    scenarioMode: 'IDLE',
  }
  const armedMonitorSession = {
    activeScenario: { id: 'train-launch' },
    scenarioMode: 'RUNNING',
  }

  assert.equal(
    getScenarioActionSession(staleBackendSession, armedMonitorSession),
    armedMonitorSession,
    'the action must use the newly armed monitor snapshot instead of stale backend state',
  )
  assert.equal(
    getScenarioActionSession(staleBackendSession, null),
    staleBackendSession,
    'the backend snapshot remains the fallback when the request has no session',
  )
}
