import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { LINE_MAP_LAYOUT_VERSION } from '../../src/screens/line-map/lineMapRuntimeState'
import { createInitialSession, normalizeClientSession } from '../../src/sessionState'
import { applyTrainingScenarioRuntimeEvent, applyTrainingScenarioWorkflowAction, createTrainingScenarioStartSession } from '../../src/trainingScenarios'
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

// The backend must hand the line map back in a form the client keeps. A layout
// version mismatch makes every client discard its routes and platform doors.
{
  const port = await getAvailablePort()
  const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-backend-line-map-'))
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

    const armed = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
    const selected = applyTrainingScenarioRuntimeEvent(armed, { source: 'Test', trainId: '306', type: 'TRAIN_SELECTED' }).next
    const prepared = applyTrainingScenarioWorkflowAction(selected, 'PREPARE_LAUNCH_ROUTE').next
    const session: OccSessionState = {
      ...prepared,
      lineMap: {
        ...prepared.lineMap,
        platformDoorStates: {
          'SKG-NB': { platformCode: 'SKG', status: 'CYCLING', track: 'NB', trainId: '306', updatedAt: 1 },
        },
      },
    }

    assert.equal(session.lineMap.routeSegments['route-r655-617-command']?.status, 'SET')

    const publishResponse = await fetch(`${baseUrl}/api/session`, {
      body: JSON.stringify({ session, sourceId: 'line-map-round-trip' }),
      headers: { 'content-type': 'application/json' },
      method: 'PUT',
    })

    assert.equal(publishResponse.ok, true)

    const snapshot = await (await fetch(`${baseUrl}/api/session`)).json() as { session: OccSessionState }
    const stored = snapshot.session.lineMap

    assert.equal(stored.layoutVersion, LINE_MAP_LAYOUT_VERSION, 'backend layout version must match the client')
    assert.equal(stored.platformDoorStates?.['SKG-NB']?.status, 'CYCLING', 'backend must keep platform door states')
    assert.equal(stored.routeSegments['route-r655-617-command']?.status, 'SET')

    // What every monitor does with a session from the backend.
    const client = normalizeClientSession(snapshot.session)

    assert.equal(client.lineMap.routeSegments['route-r655-617-command']?.status, 'SET', 'client must keep routes from the backend')
    assert.equal(client.lineMap.platformDoorStates['SKG-NB']?.status, 'CYCLING')

    // Scored actions go through the backend too and must not drop the line map.
    const actionResponse = await fetch(`${baseUrl}/api/session/actions`, {
      body: JSON.stringify({
        action: { detail: 'Route check', source: 'Monitor 02 Line Map', trainId: '306', type: 'SET_ROUTE' },
        session: snapshot.session,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    const payload = await actionResponse.json() as { accepted: boolean; session: OccSessionState }
    const afterAction = normalizeClientSession(payload.session)

    assert.equal(actionResponse.ok, true)
    assert.equal(payload.session.lineMap.layoutVersion, LINE_MAP_LAYOUT_VERSION)
    assert.equal(afterAction.lineMap.routeSegments['route-r655-617-command']?.status, 'SET')
    assert.equal(afterAction.lineMap.platformDoorStates['SKG-NB']?.status, 'CYCLING')
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
