import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createInitialSession } from '../../src/sessionState'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'
import type { OccSessionState } from '../../src/types'

async function getAvailablePort() {
  const probe = createServer()

  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', resolve)
  })

  const address = probe.address()
  const port = typeof address === 'object' && address ? address.port : 0

  await new Promise<void>((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()))
  })

  return port
}

async function waitForBackend(baseUrl: string) {
  let lastError: unknown

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)

      if (response.ok) {
        return
      }
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  throw lastError ?? new Error('Backend did not become ready.')
}

{
  const port = await getAvailablePort()
  const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-backend-integration-'))
  const baseUrl = `http://127.0.0.1:${port}`
  const backend = spawn(process.execPath, [path.resolve('server/server.mjs')], {
    env: {
      ...process.env,
      OCC_BACKEND_DATA_DIR: dataDir,
      OCC_BACKEND_HOST: '127.0.0.1',
      OCC_BACKEND_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let backendError = ''

  backend.stderr?.on('data', (chunk) => {
    backendError += String(chunk)
  })

  try {
    await waitForBackend(baseUrl)

    const staleBackendSession = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
    const publishResponse = await fetch(`${baseUrl}/api/session`, {
      body: JSON.stringify({ session: staleBackendSession, sourceId: 'integration-stale-backend' }),
      headers: { 'content-type': 'application/json' },
      method: 'PUT',
    })

    assert.equal(publishResponse.ok, true, 'stale backend setup should publish successfully')

    const armedLaunchSession = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
    const actionResponse = await fetch(`${baseUrl}/api/session/actions`, {
      body: JSON.stringify({
        action: {
          detail: 'Train 301 timetable row selected for Train Launch.',
          source: 'Monitor 03 Timetable',
          trainId: '301',
          type: 'SELECT_TRAIN',
        },
        session: armedLaunchSession,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    const payload = await actionResponse.json() as {
      accepted: boolean
      session: OccSessionState
    }
    const selectedTrain = payload.session.trains.find((train) => train.id === '301')

    assert.equal(actionResponse.ok, true)
    assert.equal(payload.accepted, true)
    assert.equal(payload.session.activeScenario.id, 'train-launch')
    assert.equal(payload.session.activeScenario.targetTrainId, '301')
    assert.equal(payload.session.selectedTrainId, '301')
    assert.equal(payload.session.scenarioTasks.selectTrain, true)
    assert.equal(selectedTrain?.lineMapVisible, true)
    assert.equal(selectedTrain?.occupancySegmentId, 'rail-653')

    const snapshotResponse = await fetch(`${baseUrl}/api/session`)
    const snapshot = await snapshotResponse.json() as { session: OccSessionState }

    assert.equal(snapshot.session.activeScenario.targetTrainId, '301')

    const staleIdleSession = {
      ...createInitialSession(),
      scenarioRevision: 0,
      updatedAt: payload.session.updatedAt + 10_000,
    }
    const stalePublishResponse = await fetch(`${baseUrl}/api/session`, {
      body: JSON.stringify({ session: staleIdleSession, sourceId: 'integration-stale-monitor' }),
      headers: { 'content-type': 'application/json' },
      method: 'PUT',
    })
    const stalePayload = await stalePublishResponse.json() as { session: OccSessionState }

    assert.equal(stalePublishResponse.status, 409)
    assert.equal(stalePayload.session.activeScenario.id, 'train-launch')
    assert.equal(stalePayload.session.activeScenario.targetTrainId, '301')
  } finally {
    backend.kill()
    await Promise.race([
      once(backend, 'exit'),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ])
    await rm(dataDir, { force: true, recursive: true })
  }

  assert.equal(backendError, '')
}
