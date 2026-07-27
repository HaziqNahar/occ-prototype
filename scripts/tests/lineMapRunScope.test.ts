import assert from 'node:assert/strict'
import { createInitialSession } from '../../src/sessionState'
import { createLineMapRunScopeKey } from '../../src/screens/line-map/useLineMapRunOverrides'

{
  const session = createInitialSession()
  const key = createLineMapRunScopeKey(session)

  assert.equal(createLineMapRunScopeKey({
    ...session,
    updatedAt: session.updatedAt + 10_000,
  }), key)
  assert.notEqual(createLineMapRunScopeKey({
    ...session,
    scenarioRevision: session.scenarioRevision + 1,
  }), key)
}

{
  const session = createInitialSession()
  const runningSession = {
    ...session,
    scenarioMode: 'RUNNING' as const,
    scenarioStep: 1,
    sessionMeta: {
      ...session.sessionMeta,
      startedAt: '2026-07-17T00:00:00.000Z',
    },
  }
  const key = createLineMapRunScopeKey(runningSession)

  assert.equal(createLineMapRunScopeKey({
    ...runningSession,
    updatedAt: runningSession.updatedAt + 10_000,
  }), key)
  assert.notEqual(createLineMapRunScopeKey({
    ...runningSession,
    scenarioRevision: runningSession.scenarioRevision + 1,
  }), key)
}
