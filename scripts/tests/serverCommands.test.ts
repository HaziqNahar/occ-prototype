import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { LINE_MAP_LAYOUT_VERSION } from '../../src/screens/line-map/lineMapRuntimeState'
import type { SessionSnapshotMessage, SessionUpdateMessage } from '../../src/session-commands/protocol'
import { applySessionDelta } from '../../src/session-commands/sessionDelta'
import { getAlarmRowKey } from '../../src/session-commands/types'
import { scoreTrainingScenario } from '../../src/trainingScenarios'
import { startBackend, stopBackend, testTrainee, testTrainer } from './support/backend'

// The server is the only writer: screens send commands, the server validates,
// scores, logs and streams the result. See docs/production-plan.md, phase 2.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-server-commands-'))
const server = await startBackend(dataDir)

try {
  const events = await server.openEvents()
  const [opening] = await events.waitFor(1)

  assert.equal(opening.type, 'session:snapshot', 'a stream starts with the whole session')

  const first = opening as SessionSnapshotMessage

  assert.equal(first.session.activeScenario.id, 'idle', 'the server creates the session itself')

  // Browsers can no longer publish whole sessions.
  const publish = await fetch(`${server.baseUrl}/api/session`, {
    body: JSON.stringify({ session: first.session }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  })

  assert.equal(publish.status, 410)

  // Loading a scenario is the trainer's job.
  const load = {
    duration: '06:00',
    faultLocation: { station: 'SER', track: 'SB' as const, trainId: '345' },
    incident: 'PSD obstructed',
    kind: 'PSD_FAULT' as const,
    timetableName: first.session.timetableName,
    trainingMode: 'ASSESSMENT' as const,
    type: 'LOAD_SCENARIO' as const,
  }
  const refused = await server.command(testTrainee, load)

  assert.equal(refused.body.accepted, false)
  assert.equal(refused.body.update, null)

  const loaded = await server.command(testTrainer, load, first.sessionId)

  assert.equal(loaded.body.accepted, true)
  assert.equal(loaded.body.version, first.version + 1)

  // Every screen gets the change as a delta on top of the version it has.
  const [, update] = await events.waitFor(2) as [SessionSnapshotMessage, SessionUpdateMessage]

  assert.equal(update.type, 'session:update')
  assert.equal(update.baseVersion, first.version)
  assert.deepEqual(update, loaded.body.update)

  const rebuilt = applySessionDelta(first.session, update.delta)
  const current = await server.snapshot()

  assert.deepEqual(rebuilt, current.session, 'a screen rebuilds exactly the server session from the delta')
  assert.equal(current.session.activeScenario.id, 'psd-fault-obstructed')

  // Scored trainee actions.
  const incidentAlarm = current.session.alarmSummaryRows.find((row) => row.scenarioAlarm)!

  await server.command(testTrainee, { trainId: '345', type: 'SELECT_TRAIN', view: 'menu' })

  const ack = await server.command(testTrainee, { rowKeys: [getAlarmRowKey(incidentAlarm)], type: 'ACK_ALARMS' })

  assert.equal(ack.body.accepted, true)
  assert.equal((await server.snapshot()).session.scenarioTasks.ackAlarm, true)

  // Train simulation may move the train but cannot change its door state or the checklist.
  await server.command(testTrainee, {
    patch: {
      platformDoorStates: { set: { 'SER-SB': { platformCode: 'SER', status: 'CYCLING', track: 'SB', trainId: '345', updatedAt: 1 } } },
      trains: [{ doorFailureState: 'DOOR_ISOLATED', id: '345', x: 4321 } as never],
    },
    type: 'SIM_UPDATE',
  })

  const afterSim = (await server.snapshot()).session
  const simTrain = afterSim.trains.find((train) => train.id === '345')

  assert.equal(simTrain?.x, 4321)
  assert.equal(simTrain?.doorFailureState, undefined)
  assert.equal(afterSim.lineMap.layoutVersion, LINE_MAP_LAYOUT_VERSION, 'the line map comes back in the layout the client keeps')
  assert.equal(afterSim.lineMap.platformDoorStates['SER-SB']?.status, 'CYCLING')

  // A window still on an ended session is told, and given the current one.
  const stale = await server.command(testTrainee, { trainId: '345', type: 'ITAMA_ACK' }, 'OLD1-2020-01-01T00:00:00.000Z')

  assert.equal(stale.status, 409)
  assert.equal((stale.body as unknown as SessionSnapshotMessage).sessionId, current.sessionId)

  // The action log records who did what; train movement is not an action.
  const log = await server.getJson<{ actions: Array<{ accepted: number; action_type: string; actor: string; actor_role: string; kind: string }> }>('/api/session/actions')
  const commands = log.actions.filter((entry) => entry.kind === 'command')

  assert.deepEqual(commands.map((entry) => entry.action_type), ['LOAD_SCENARIO', 'LOAD_SCENARIO', 'SELECT_TRAIN', 'ACK_ALARMS'])
  assert.deepEqual(commands.map((entry) => entry.accepted), [0, 1, 1, 1])
  assert.deepEqual(commands.map((entry) => entry.actor_role), ['trainee', 'trainer', 'trainee', 'trainee'])
  assert.equal(commands[3].actor, 'Alex Tan')

  // Reports are scored by the server; a browser can only add notes.
  const archived = await server.post('/api/reports', { notes: 'Good alarm handling.', summary: { result: 'PASS', score: 100 } })
  const report = (await archived.json()) as { report: { id: string; notes: string; summary: { result: string; score: number } } }
  const expected = scoreTrainingScenario((await server.snapshot()).session)

  assert.equal(archived.status, 201)
  assert.equal(report.report.notes, 'Good alarm handling.')
  assert.equal(report.report.summary.score, expected.score)
  assert.equal(report.report.summary.result, 'IN PROGRESS')

  // A reset starts a new session with a new code; open screens move to it.
  const reset = await server.command(testTrainer, { timetableName: first.session.timetableName, trainingMode: 'PRACTICE', type: 'RESET_SESSION' })
  const fresh = await server.snapshot()
  const isMove = (message: SessionSnapshotMessage | SessionUpdateMessage) => message.type === 'session:snapshot' && message.sessionId === fresh.sessionId

  for (let attempt = 0; attempt < 200 && !events.messages.some(isMove); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  assert.equal(reset.body.accepted, true)
  assert.notEqual(fresh.sessionId, current.sessionId)
  assert.ok(events.messages.some(isMove), 'open screens are sent the new session')
  assert.equal(fresh.session.activeScenario.id, 'idle')

  events.close()
  assert.equal(server.stderr(), '')
} finally {
  await stopBackend(server.backend)
  await rm(dataDir, { force: true, recursive: true })
}
