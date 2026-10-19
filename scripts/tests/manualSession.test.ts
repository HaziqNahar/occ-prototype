import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { SessionSnapshotMessage } from '../../src/session-commands/protocol'
import { startBackend, stopBackend, testTrainee } from './support/backend'

// A new host has no session: the trainer creates it on the Trainer Console,
// and from then on it is kept, also across a restart.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-manual-session-'))
const server = await startBackend(dataDir, {}, { createSession: false })
let restarted: Awaited<ReturnType<typeof startBackend>> | null = null

try {
  const health = async (baseUrl: string) => (await (await fetch(`${baseUrl}/api/health`)).json()) as { hasSession: boolean; sessionCode: string | null }

  const empty = await health(server.baseUrl)

  assert.equal(empty.hasSession, false)
  assert.equal(empty.sessionCode, null)
  assert.deepEqual((await server.getJson<{ sessions: unknown[] }>('/api/sessions')).sessions, [])
  assert.equal((await fetch(`${server.baseUrl}/api/session`, { headers: { authorization: `Bearer ${server.tokens.trainer}` } })).status, 404)

  // Nothing to act on yet.
  const command = await server.command(testTrainee, { code: 'ABCD', type: 'TRAINEE_JOIN' })

  assert.equal(command.status, 404)

  // A screen opened now waits; it gets the session once the trainer creates it.
  const events = await server.openEvents()

  await new Promise((resolve) => setTimeout(resolve, 200))
  assert.equal(events.messages.filter((message) => message.type === 'session:snapshot').length, 0)
  assert.equal((await server.post('/api/sessions', {})).status, 201)

  const [snapshot] = await events.waitFor(1) as SessionSnapshotMessage[]
  const created = await health(server.baseUrl)

  assert.equal(snapshot.type, 'session:snapshot')
  assert.equal(created.hasSession, true)
  assert.equal(snapshot.session.sessionMeta.code, created.sessionCode)
  assert.equal((await server.command(testTrainee, { code: created.sessionCode!, type: 'TRAINEE_JOIN' })).body.accepted, true)
  events.close()

  // A restart brings the same session back; nothing new is created.
  await stopBackend(server.backend)
  restarted = await startBackend(dataDir, {}, { createSession: false })

  assert.equal((await health(restarted.baseUrl)).sessionCode, created.sessionCode)
} finally {
  await stopBackend(server.backend)
  if (restarted) await stopBackend(restarted.backend)
  await rm(dataDir, { force: true, recursive: true })
}
