import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { RunSummary } from '../../src/history'
import { NO_TRAINEE_REASON, TRAINEE_END_RUN_REASON, TRAINER_END_RUN_REASON } from '../../src/session-commands/runGuards'
import { startBackend, stopBackend, testTrainee, testTrainer } from './support/backend'

// A run's guardrails, enforced by the server (src/session-commands/runGuards.ts):
// no run without a trainee, the trainee stays put until the run ends, and a run
// ended early is kept in History as not completed.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-run-guards-'))
const server = await startBackend(dataDir)

try {
  const first = await server.snapshot()
  const load = (trainingMode: 'PRACTICE' | 'PLAYER') => server.command(testTrainer, {
    duration: '06:00',
    faultLocation: { station: 'SER', track: 'SB', trainId: '345' },
    incident: 'PSD obstructed',
    kind: 'PSD_FAULT',
    timetableName: first.session.timetableName,
    trainingMode,
    type: 'LOAD_SCENARIO',
  })
  const api = async (pathName: string, body?: unknown) => {
    const response = await fetch(`${server.baseUrl}${pathName}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { authorization: `Bearer ${server.tokens.trainer}`, 'content-type': 'application/json' },
      method: body === undefined ? 'GET' : 'POST',
    })

    return { body: await response.json() as Record<string, unknown>, status: response.status }
  }

  // No trainee: Practice and Assessment are refused, Player playback is not.
  const empty = await load('PRACTICE')

  assert.equal(empty.body.accepted, false)
  assert.equal(empty.body.reason, NO_TRAINEE_REASON)
  assert.equal((await load('PLAYER')).body.accepted, true)
  assert.equal((await server.command(testTrainer, { type: 'RESET_SCENARIO' })).body.accepted, true)

  // With a trainee the run starts, and the trainee cannot leave or be removed.
  assert.equal((await server.command(testTrainee, { code: first.session.sessionMeta.code, type: 'TRAINEE_JOIN' })).body.accepted, true)
  assert.equal((await load('PRACTICE')).body.accepted, true)

  const leave = await server.command(testTrainee, { traineeId: testTrainee.id!, type: 'TRAINEE_LEAVE' })
  const remove = await server.command(testTrainer, { traineeId: testTrainee.id!, type: 'TRAINEE_LEAVE' })

  assert.equal(leave.body.accepted, false)
  assert.equal(leave.body.reason, TRAINEE_END_RUN_REASON)
  assert.equal(remove.body.accepted, false)
  assert.equal(remove.body.reason, TRAINER_END_RUN_REASON)

  // Nor moved to Exercise 2 while the run is going.
  assert.equal((await api('/api/sessions', {})).status, 201)

  const exercises = (await api('/api/sessions')).body.sessions as Array<{ exercise: number; id: string; trainees: Array<{ id: string }> }>
  const two = exercises.find((exercise) => exercise.exercise === 2)!
  const move = await api('/api/class/assign', { sessionId: two.id, traineeId: testTrainee.id })

  assert.equal(move.body.accepted, false)
  assert.match(String(move.body.reason), /Stop or complete the run first/)

  const stillIn = (await api('/api/sessions')).body.sessions as typeof exercises

  assert.ok(stillIn.find((exercise) => exercise.exercise === 1)!.trainees.some((trainee) => trainee.id === testTrainee.id), 'the trainee is still in Exercise 1')

  // Stopping the run keeps it in History as not completed, and frees the trainee.
  assert.equal((await server.command(testTrainer, { type: 'RESET_SCENARIO' })).body.accepted, true)

  const runs = (await api('/api/history')).body.runs as RunSummary[]

  assert.equal(runs.length, 1)
  assert.equal(runs[0].completed, false)
  assert.equal(runs[0].scenarioTitle, 'PSD Obstructed')
  assert.equal((await api('/api/class/assign', { sessionId: two.id, traineeId: testTrainee.id })).body.accepted, true)
  assert.equal(server.stderr(), '')
} finally {
  await stopBackend(server.backend)
  await rm(dataDir, { force: true, recursive: true })
}
