import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createInitialSession } from '../../src/sessionState'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'
import { startBackend, stopBackend, testTrainee, testTrainer } from './support/backend'

const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-database-'))

try {
  // The old JavaScript backend left a session.json and a reports.ndjson behind.
  const legacySession = createTrainingScenarioStartSession(createInitialSession(), 'PSD_FAULT', 'PSD obstructed')
  await writeFile(path.join(dataDir, 'session.json'), JSON.stringify(legacySession))
  await writeFile(path.join(dataDir, 'reports.ndjson'), `${JSON.stringify({ id: 'legacy-report', notes: '', summary: { score: 80 } })}\n`)

  const first = await startBackend(dataDir)
  let sessionCode: string
  let lastVersion: number

  try {
    const migrated = await first.snapshot()

    assert.equal(migrated.session.activeScenario.id, 'psd-fault-obstructed', 'legacy session is imported')
    assert.equal(existsSync(path.join(dataDir, 'session.json')), false)
    assert.equal(existsSync(path.join(dataDir, 'session.json.migrated')), true)
    assert.equal(existsSync(path.join(dataDir, 'occ-training.sqlite')), true)
    sessionCode = migrated.session.sessionMeta.code

    // Commands and screen joins go into the action log.
    await first.post('/api/session/screens', { label: 'Monitor 02 - Line Map', role: 'LINE_MAP', route: '/screen/line-map', sourceId: 'test-line-map' })
    await first.command(testTrainee, { detail: 'Hold', trainId: '999', type: 'TRAIN_HOLD' })
    await first.command(testTrainee, { command: 'cycle-door', trainId: '320', type: 'TRAIN_DOOR_COMMAND' })

    const log = await first.getJson<{
      actions: Array<{ accepted: number | null; action_type: string | null; actor_id: string | null; kind: string }>
    }>('/api/session/actions')

    const commands = log.actions.filter((entry) => entry.kind === 'command' || entry.kind === 'screen.joined')

    assert.deepEqual(commands.map((entry) => entry.kind), ['screen.joined', 'command', 'command'])
    assert.equal(commands[1].action_type, 'TRAIN_HOLD')
    assert.equal(commands[1].accepted, 0, 'a command for an unknown train is refused and logged')
    assert.equal(commands[2].actor_id, 'alex.tan')
    assert.equal(first.stderr(), '', 'no warnings are printed (the SQLite experimental warning is silenced)')
    lastVersion = (await first.snapshot()).version
  } finally {
    await stopBackend(first.backend)
  }

  // The session is kept in the database across a restart.
  const second = await startBackend(dataDir)

  try {
    const restored = await second.snapshot()

    assert.equal(restored.session.sessionMeta.code, sessionCode)
    assert.ok(restored.version > lastVersion, 'versions keep rising, so screens left open accept the restarted server')
    assert.equal(restored.session.activeScenario.id, 'psd-fault-obstructed')
    assert.equal(restored.session.trains.find((train) => train.id === '320')?.doorFailureState, 'CYCLE_DOOR_REQUESTED')

    // A reset starts a new session, with its own log.
    await second.command(testTrainer, { timetableName: restored.session.timetableName, trainingMode: 'PRACTICE', type: 'RESET_SESSION' })

    const newLog = await second.getJson<{ actions: Array<{ kind: string }> }>('/api/session/actions')

    assert.deepEqual(newLog.actions.map((entry) => entry.kind), ['session.created'])
  } finally {
    await stopBackend(second.backend)
  }
} finally {
  await rm(dataDir, { force: true, recursive: true })
}
