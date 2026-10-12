import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createInitialSession, createResetSessionState } from '../../src/sessionState'
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

async function startBackend(dataDir: string) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const backend = spawn(process.execPath, [path.resolve('server/server.mjs')], {
    env: { ...process.env, OCC_BACKEND_DATA_DIR: dataDir, OCC_BACKEND_HOST: '127.0.0.1', OCC_BACKEND_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''

  backend.stderr?.on('data', (chunk) => {
    stderr += String(chunk)
  })

  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/api/health`)).ok) {
        return { backend, baseUrl, stderr: () => stderr }
      }
    } catch {
      // Still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error(`Backend did not start: ${stderr}`)
}

async function stopBackend(backend: ChildProcess) {
  backend.kill()
  await Promise.race([once(backend, 'exit'), new Promise((resolve) => setTimeout(resolve, 2000))])
}

const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-database-'))

try {
  // The old JavaScript backend left a session.json and a reports.ndjson behind.
  const legacySession = createTrainingScenarioStartSession(createInitialSession(), 'PSD_FAULT', 'PSD obstructed')
  await writeFile(path.join(dataDir, 'session.json'), JSON.stringify(legacySession))
  await writeFile(path.join(dataDir, 'reports.ndjson'), `${JSON.stringify({ id: 'legacy-report', notes: '', summary: { score: 80 } })}\n`)

  const first = await startBackend(dataDir)
  let sessionCode: string

  try {
    const migrated = (await (await fetch(`${first.baseUrl}/api/session`)).json()) as { session: OccSessionState }

    assert.equal(migrated.session.activeScenario.id, 'psd-fault-obstructed', 'legacy session is imported')
    assert.equal(existsSync(path.join(dataDir, 'session.json')), false)
    assert.equal(existsSync(path.join(dataDir, 'session.json.migrated')), true)
    assert.equal(existsSync(path.join(dataDir, 'occ-training.sqlite')), true)
    sessionCode = migrated.session.sessionMeta.code

    // Scored actions, screen joins and resets go into the action log.
    const post = (pathName: string, body: unknown) => fetch(`${first.baseUrl}${pathName}`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await post('/api/session/screens', { label: 'Monitor 02 - Line Map', role: 'LINE_MAP', route: '/screen/line-map', sourceId: 'test-line-map' })
    await post('/api/session/actions', { action: { source: 'Monitor 01 Alarms', trainId: '999', type: 'ACK_ALARM' } })

    const log = (await (await fetch(`${first.baseUrl}/api/session/actions`)).json()) as {
      actions: Array<{ accepted: number | null; action_type: string | null; kind: string }>
    }

    assert.deepEqual(log.actions.map((entry) => entry.kind), ['screen.joined', 'scenario.action'])
    assert.equal(log.actions[1].action_type, 'ACK_ALARM')
    assert.equal(log.actions[1].accepted, 0, 'acknowledging for the wrong train is rejected and logged')
    assert.equal(first.stderr(), '', 'no warnings are printed (the SQLite experimental warning is silenced)')
  } finally {
    await stopBackend(first.backend)
  }

  // The session is kept in the database across a restart.
  const second = await startBackend(dataDir)

  try {
    const restored = (await (await fetch(`${second.baseUrl}/api/session`)).json()) as { session: OccSessionState }

    assert.equal(restored.session.sessionMeta.code, sessionCode)
    assert.equal(restored.session.activeScenario.id, 'psd-fault-obstructed')
    assert.equal(restored.session.assessmentMetrics.rejectedActions, 1)

    // A reset starts a new session, with its own log.
    const reset = createResetSessionState('PRACTICE', Date.now(), 99)
    await fetch(`${second.baseUrl}/api/session/reset`, {
      body: JSON.stringify({ session: reset }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    const newLog = (await (await fetch(`${second.baseUrl}/api/session/actions`)).json()) as { actions: Array<{ kind: string }> }

    assert.deepEqual(newLog.actions.map((entry) => entry.kind), ['session.reset'])
  } finally {
    await stopBackend(second.backend)
  }
} finally {
  await rm(dataDir, { force: true, recursive: true })
}
