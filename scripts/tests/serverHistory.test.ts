import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { RunDetail, RunSummary, TraineeProgress } from '../../src/history'
import type { SessionSnapshotMessage } from '../../src/session-commands/protocol'
import { getAlarmRowKey } from '../../src/session-commands/types'
import type { SessionCommand } from '../../src/session-commands/types'
import { findTrainingScenarioDefinition } from '../../src/trainingScenarios'
import { startBackend, stopBackend, TEST_PASSWORD, testTrainee } from './support/backend'

// Past runs and trainee progress, from the reports and the action log.
// See docs/production-plan.md, phase 6.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-history-'))
const server = await startBackend(dataDir)

try {
  const api = async (pathName: string, token: string, body?: unknown) => {
    const response = await fetch(`${server.baseUrl}${pathName}`, {
      ...(body === undefined ? {} : { body: JSON.stringify(body), method: 'POST' }),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    })

    return { body: await response.json() as Record<string, unknown>, status: response.status }
  }
  const trainer = server.tokens.trainer
  const alex = server.tokens.trainee
  const command = async (token: string, sessionCommand: SessionCommand) => {
    const result = await api('/api/session/commands', token, { command: sessionCommand, sourceId: 'history-test' })

    assert.equal(result.body.accepted, true, `${sessionCommand.type}: ${String(result.body.reason)}`)
  }
  const snapshot = async () => ((await api('/api/session', trainer)).body as unknown as SessionSnapshotMessage).session
  const definition = findTrainingScenarioDefinition('PSD_FAULT', 'PSD obstructed')
  const loadPsd = () => command(trainer, {
    duration: '06:00',
    faultLocation: { station: 'SER', track: 'SB', trainId: '345' },
    incident: definition.incident,
    kind: 'PSD_FAULT',
    timetableName: 'NEL_OTES_Weekday_03',
    trainingMode: 'ASSESSMENT',
    type: 'LOAD_SCENARIO',
  })

  await api('/api/users', trainer, { name: 'Bea Ong', password: TEST_PASSWORD, role: 'trainee', username: 'bea.ong' })

  const bea = (await api('/api/auth/login', '', { password: TEST_PASSWORD, username: 'bea.ong' })).body.token as string

  // Alex joins and runs the PSD SOP to the end; the trainer completes it.
  assert.equal((await api('/api/class/join', alex, { code: (await snapshot()).sessionMeta.code })).body.accepted, true)
  await loadPsd()

  const incident = (await snapshot()).alarmSummaryRows.find((row) => row.scenarioAlarm)!

  await command(alex, { trainId: '345', type: 'SELECT_TRAIN', view: 'menu' })
  await command(alex, { rowKeys: [getAlarmRowKey(incident)], type: 'ACK_ALARMS' })
  await command(alex, { detail: 'Platform hold', trainId: '345', type: 'TRAIN_HOLD' })

  for (const messageId of definition.tasks.flatMap((task) => task.commsMessageIds ?? [])) {
    await command(alex, { request: { messageId, station: 'SER', trainId: '345' }, type: 'LOG_CALL' })
  }

  await command(alex, { command: 'DISPATCH', trainId: '345', type: 'SCADA_TRAIN_COMMAND' })
  await command(trainer, { state: 'COMPLETE', type: 'SET_SCENARIO_STATE' })

  // A second run is started and only has notes saved: it is listed, not completed.
  await new Promise((resolve) => setTimeout(resolve, 10))
  await loadPsd()
  await command(alex, { trainId: '345', type: 'SELECT_TRAIN', view: 'menu' })
  await api('/api/reports', trainer, { notes: 'Stopped early for a briefing.' })

  const runs = (await api('/api/history', trainer)).body.runs as RunSummary[]

  assert.equal(runs.length, 2)
  assert.deepEqual(runs.map((run) => [run.completed, run.result]), [[false, 'IN PROGRESS'], [true, 'PASS']], 'newest first')
  assert.equal(runs[0].notes, 'Stopped early for a briefing.')
  assert.deepEqual(runs[1].trainees, [{ id: testTrainee.id, name: testTrainee.name }])
  assert.equal(runs[1].exercise, 1)

  // A run's detail has its checklist and, from the action log, only its own actions.
  const detail = (await api(`/api/history/${encodeURIComponent(runs[1].id)}`, trainer)).body.run as RunDetail

  assert.equal(detail.score, 100)
  assert.ok(detail.tasks.length > 0 && detail.tasks.every((task) => task.complete))
  assert.equal(detail.actions[0].actionType, 'LOAD_SCENARIO')
  assert.equal(detail.actions.at(-1)?.actionType, 'SET_SCENARIO_STATE')
  assert.ok(detail.actions.some((action) => action.actionType === 'TRAIN_HOLD' && action.actor === testTrainee.name && action.actorRole === 'trainee'))
  assert.equal(detail.actions.filter((action) => action.actionType === 'LOAD_SCENARIO').length, 1, 'the next run is not included')

  // Progress: one completed and passed run of two.
  const progress = (await api(`/api/progress?trainee=${testTrainee.id}`, trainer)).body.progress as TraineeProgress

  assert.deepEqual(progress.totals, { averageScore: 100, completed: 1, passed: 1, runs: 2 })
  assert.deepEqual(progress.byScenario.map((scenario) => [scenario.scenarioTitle, scenario.runs, scenario.passes]), [['PSD Obstructed', 1, 1]])
  assert.equal((await api('/api/progress', trainer)).status, 400, 'a trainer chooses a trainee')

  // Trainees see only their own record.
  assert.equal(((await api('/api/history', alex)).body.runs as RunSummary[]).length, 2)
  assert.equal(((await api('/api/history', bea)).body.runs as RunSummary[]).length, 0)
  assert.equal((await api(`/api/history/${encodeURIComponent(runs[1].id)}`, bea)).status, 404)
  assert.equal(((await api(`/api/progress?trainee=${testTrainee.id}`, bea)).body.progress as TraineeProgress).trainee.id, 'bea.ong')
  assert.equal(server.stderr(), '')
} finally {
  await stopBackend(server.backend)
  await rm(dataDir, { force: true, recursive: true })
}
