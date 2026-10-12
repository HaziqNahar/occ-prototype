import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  SESSION_CODE_ALPHABET,
  createSessionCode,
  normalizeEnteredSessionCode,
  sessionCodesMatch,
} from '../../src/sessionCode'
import { createInitialSession, createResetSessionState } from '../../src/sessionState'
import type { OccSessionState } from '../../src/types'

// Codes are four characters from an alphabet without look-alikes.
for (let index = 0; index < 200; index += 1) {
  assert.match(createSessionCode(), /^[A-Z2-9]{4}$/)
}
assert.equal([...'ILO01'].some((character) => SESSION_CODE_ALPHABET.includes(character)), false)
assert.equal(createSessionCode(() => 0), 'AAAA')
assert.equal(createSessionCode(() => 0.999999), '9999')
assert.equal(normalizeEnteredSessionCode(' k7 m2 '), 'K7M2')
assert.equal(sessionCodesMatch('k7m2', 'K7M2'), true)
assert.equal(sessionCodesMatch('K7M3', 'K7M2'), false)
assert.equal(sessionCodesMatch('', 'K7M2'), false)

// A new or reset session gets its own code.
assert.match(createInitialSession().sessionMeta.code, /^[A-Z2-9]{4}$/)
assert.match(createResetSessionState('PRACTICE', 1, 2).sessionMeta.code, /^[A-Z2-9]{4}$/)

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

// The backend keeps its code through ordinary updates and takes a new one only on reset.
{
  const port = await getAvailablePort()
  const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-session-code-'))
  const baseUrl = `http://127.0.0.1:${port}`
  const backend = spawn(process.execPath, [path.resolve('server/server.mjs')], {
    env: { ...process.env, OCC_BACKEND_DATA_DIR: dataDir, OCC_BACKEND_HOST: '127.0.0.1', OCC_BACKEND_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const publish = async (pathName: string, method: string, session: OccSessionState) => (
    (await (await fetch(`${baseUrl}${pathName}`, {
      body: JSON.stringify({ session, sourceId: 'session-code-test' }),
      headers: { 'content-type': 'application/json' },
      method,
    })).json()) as { session: OccSessionState }
  )

  try {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      try {
        if ((await fetch(`${baseUrl}/api/health`)).ok) break
      } catch {
        // Backend still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    const first = createInitialSession()
    const seeded = await publish('/api/session', 'PUT', first)
    const code = seeded.session.sessionMeta.code

    assert.equal(code, first.sessionMeta.code, 'the first session seeds the backend code')

    // Another page opened later carries its own generated code; the backend keeps the original.
    const otherPage = { ...createInitialSession(), updatedAt: Date.now() + 1000 }
    assert.notEqual(otherPage.sessionMeta.code, code)
    const updated = await publish('/api/session', 'PUT', otherPage)
    assert.equal(updated.session.sessionMeta.code, code)

    // Resetting the session issues the reset session's new code.
    const reset = createResetSessionState('PRACTICE', Date.now() + 2000, 5)
    const afterReset = await publish('/api/session/reset', 'POST', reset)
    assert.equal(afterReset.session.sessionMeta.code, reset.sessionMeta.code)
    assert.notEqual(afterReset.session.sessionMeta.code, code)

    // Sessions saved before short codes keep their old code until reset.
    const legacy = { ...createResetSessionState('PRACTICE', Date.now() + 3000, 6) }
    legacy.sessionMeta = { ...legacy.sessionMeta, code: 'OCC-TRAINING-001' }
    const legacyReset = await publish('/api/session/reset', 'POST', legacy)
    assert.equal(legacyReset.session.sessionMeta.code, 'OCC-TRAINING-001')
  } finally {
    backend.kill()
    await Promise.race([once(backend, 'exit'), new Promise((resolve) => setTimeout(resolve, 1000))])
    await rm(dataDir, { force: true, recursive: true })
  }
}
