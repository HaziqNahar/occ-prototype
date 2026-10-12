import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { ExerciseSummary } from '../../src/exerciseClient'
import type { SessionSnapshotMessage } from '../../src/session-commands/protocol'
import type { SessionCommand } from '../../src/session-commands/types'
import { startBackend, stopBackend, TEST_PASSWORD, testTrainee } from './support/backend'

// One trainer, two trainees in separate exercises. See docs/production-plan.md, phase 5.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-exercises-'))
let server = await startBackend(dataDir)

const api = async (pathName: string, token: string, options: { body?: unknown; method?: string } = {}) => {
  const response = await fetch(`${server.baseUrl}${pathName}`, {
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
  })

  return { body: await response.json() as Record<string, unknown>, status: response.status }
}

// A live stream as one person; it follows them unless it names an exercise.
const openStream = async (token: string) => {
  const controller = new AbortController()
  const response = await fetch(`${server.baseUrl}/api/session/events?sourceId=stream-${Math.random()}&token=${token}`, { signal: controller.signal })
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  const snapshots: SessionSnapshotMessage[] = []
  let buffer = ''

  void (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read()

        if (done) {
          return
        }

        buffer += decoder.decode(value, { stream: true })

        let separator = buffer.indexOf('\n\n')

        while (separator >= 0) {
          buffer.slice(0, separator).split('\n').filter((line) => line.startsWith('data: ')).forEach((line) => {
            const message = JSON.parse(line.slice(6)) as SessionSnapshotMessage

            if (message.type === 'session:snapshot') {
              snapshots.push(message)
            }
          })
          buffer = buffer.slice(separator + 2)
          separator = buffer.indexOf('\n\n')
        }
      }
    } catch {
      // Closed by the test.
    }
  })()

  return {
    close: () => controller.abort(),
    waitForSession: async (sessionId: string) => {
      for (let attempt = 0; attempt < 200 && snapshots.at(-1)?.sessionId !== sessionId; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      return snapshots.at(-1)
    },
  }
}

try {
  const trainer = server.tokens.trainer
  const alex = server.tokens.trainee

  await api('/api/users', trainer, { body: { name: 'Bea Ong', password: TEST_PASSWORD, role: 'trainee', username: 'bea.ong' } })

  const bea = (await api('/api/auth/login', '', { body: { password: TEST_PASSWORD, username: 'bea.ong' } })).body.token as string
  const exercises = async () => (await api('/api/sessions', trainer)).body.sessions as ExerciseSummary[]

  // The trainer opens a second exercise, with its own code; there are at most two.
  assert.equal((await exercises()).length, 1)
  assert.equal((await api('/api/sessions', alex)).status, 403, 'trainees do not see the exercise list')
  assert.equal((await api('/api/sessions', trainer, { body: {} })).status, 201)
  assert.equal((await api('/api/sessions', trainer, { body: {} })).status, 409)

  let [one, two] = await exercises()

  assert.deepEqual([one.exercise, two.exercise], [1, 2])
  assert.notEqual(one.code, two.code)

  // Each trainee joins with their exercise's code; their screens follow them.
  const beaStream = await openStream(bea)

  assert.equal((await api('/api/class/join', alex, { body: { code: one.code } })).body.accepted, true)
  assert.equal((await api('/api/class/join', bea, { body: { code: two.code.toLowerCase() } })).body.accepted, true)
  assert.equal((await api('/api/class/join', bea, { body: { code: 'ZZZZ' } })).status, 404)
  assert.equal((await beaStream.waitForSession(two.id))?.session.sessionMeta.exercise, 2, 'the open stream moved to Exercise 2')

  const beaSession = (await api('/api/session', bea)).body as unknown as SessionSnapshotMessage

  assert.equal(beaSession.sessionId, two.id)
  assert.deepEqual(beaSession.session.trainees.map((trainee) => trainee.name), ['Bea Ong'])

  // A trainee cannot read or act in the other exercise.
  assert.equal((await api(`/api/session?session=${one.code}`, bea)).status, 403)

  const command = (token: string, sessionCommand: SessionCommand, sessionId?: string) => (
    api('/api/session/commands', token, { body: { command: sessionCommand, sessionId, sourceId: 'test' } })
  )

  assert.equal((await command(bea, { trainId: '317', type: 'SELECT_TRAIN', view: 'menu' }, one.id)).status, 403)

  // The trainer loads a scenario into Exercise 2 only.
  const load = await command(trainer, {
    duration: '06:00',
    incident: 'PSD obstructed',
    kind: 'PSD_FAULT',
    timetableName: beaSession.session.timetableName,
    trainingMode: 'ASSESSMENT',
    type: 'LOAD_SCENARIO',
  }, two.id)

  assert.equal(load.body.accepted, true)
  assert.equal(((await api(`/api/session?session=${two.code}`, trainer)).body.session as SessionSnapshotMessage['session']).scenarioMode, 'RUNNING')
  assert.equal(((await api(`/api/session?session=${one.code}`, trainer)).body.session as SessionSnapshotMessage['session']).scenarioMode, 'IDLE')

  // Without naming an exercise, Bea's commands go to hers.
  assert.equal((await command(bea, { trainId: '317', type: 'SELECT_TRAIN', view: 'menu' })).body.sessionId, two.id)

  // Each exercise has its own action log.
  const logOf = async (sessionId: string) => (
    (await api(`/api/session/actions?sessionId=${encodeURIComponent(sessionId)}`, trainer)).body.actions as Array<{ action_type: string | null; actor: string }>
  )

  assert.ok((await logOf(two.id)).some((entry) => entry.action_type === 'LOAD_SCENARIO'))
  assert.ok(!(await logOf(one.id)).some((entry) => entry.action_type === 'LOAD_SCENARIO'))

  // A whole-session reset gives Exercise 2 a new code but keeps it Exercise 2, with Bea in it.
  await command(trainer, { timetableName: beaSession.session.timetableName, trainingMode: 'PRACTICE', type: 'RESET_SESSION' }, two.id)
  ;[one, two] = await exercises()
  assert.equal(two.exercise, 2)
  assert.deepEqual(two.trainees.map((trainee) => trainee.id), ['bea.ong'])
  assert.equal((await beaStream.waitForSession(two.id))?.sessionId, two.id, 'Bea follows the reset exercise')

  // The trainer moves Alex into Exercise 2; Alex leaves Exercise 1 and Alex's screens follow.
  const alexStream = await openStream(alex)

  await alexStream.waitForSession(one.id)
  assert.equal((await api('/api/class/assign', trainer, { body: { sessionId: two.id, traineeId: testTrainee.id } })).body.accepted, true)
  ;[one, two] = await exercises()
  assert.deepEqual(one.trainees, [])
  assert.deepEqual(two.trainees.map((trainee) => trainee.id).sort(), ['alex.tan', 'bea.ong'])
  assert.equal((await alexStream.waitForSession(two.id))?.sessionId, two.id)

  // Exercise 2 closes only once nobody is in it.
  assert.equal((await api(`/api/sessions/${encodeURIComponent(two.id)}`, trainer, { method: 'DELETE' })).status, 409)
  await api('/api/class/assign', trainer, { body: { sessionId: one.id, traineeId: testTrainee.id } })
  await api('/api/class/assign', trainer, { body: { sessionId: one.id, traineeId: 'bea.ong' } })
  assert.equal((await alexStream.waitForSession(one.id))?.sessionId, one.id)

  // Both exercises survive a restart.
  alexStream.close()
  beaStream.close()
  await stopBackend(server.backend)
  server = await startBackend(dataDir)

  const restarted = (await api('/api/sessions', server.tokens.trainer)).body.sessions as ExerciseSummary[]

  assert.deepEqual(restarted.map((item) => [item.exercise, item.code]), [[1, one.code], [2, two.code]])
  assert.equal((await api(`/api/sessions/${encodeURIComponent(two.id)}`, server.tokens.trainer, { method: 'DELETE' })).status, 200)
  assert.equal(((await api('/api/sessions', server.tokens.trainer)).body.sessions as ExerciseSummary[]).length, 1)
  assert.equal(server.stderr(), '')
} finally {
  await stopBackend(server.backend)
  await rm(dataDir, { force: true, recursive: true })
}
