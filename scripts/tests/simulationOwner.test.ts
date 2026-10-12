import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { SessionCommandResponse } from '../../src/session-commands/protocol'
import type { SimPatch } from '../../src/session-commands/types'
import { startBackend, stopBackend, testTrainee } from './support/backend'

// One Line Map window per session runs the train simulation; others only display.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-simulation-owner-'))
const server = await startBackend(dataDir)

try {
  const move = async (sourceId: string, x: number) => {
    const patch: SimPatch = { trains: [{ id: '317', x }] }
    const response = await server.post('/api/session/commands', {
      command: { patch, type: 'SIM_UPDATE' },
      commandId: `${sourceId}-${x}`,
      sourceId,
    }, testTrainee.role)

    return await response.json() as SessionCommandResponse
  }
  const trainX = async () => (await server.snapshot()).session.trains.find((train) => train.id === '317')?.x
  const owner = async () => (await server.snapshot()).session.sessionMeta.simulationOwner?.sourceId
  const lineMap = (sourceId: string) => ({
    label: 'Monitor 02 - Line Map',
    role: 'LINE_MAP',
    route: '/screen/line-map',
    sourceId,
    wantsSimulation: true,
  })

  // The first Line Map to report in takes the clock.
  await server.post('/api/session/screens', lineMap('window-a'))
  await server.post('/api/session/screens', lineMap('window-b'))
  assert.equal(await owner(), 'window-a')

  // The other window's train movement is refused and changes nothing.
  const refused = await move('window-b', 111)

  assert.equal(refused.accepted, false)
  assert.equal(refused.update, null)
  assert.notEqual(await trainX(), 111)

  assert.equal((await move('window-a', 222)).accepted, true)
  assert.equal(await trainX(), 222)

  // A claim while the owner is active fails; an explicit take-over succeeds.
  const claim = async (sourceId: string, takeover: boolean) => (
    await (await server.post('/api/session/simulation', { label: 'Monitor 02 - Line Map', sourceId, takeover })).json()
  ) as { owner: boolean }

  assert.equal((await claim('window-b', false)).owner, false)
  assert.equal((await claim('window-b', true)).owner, true)
  assert.equal(await owner(), 'window-b')
  assert.equal((await move('window-a', 333)).accepted, false)

  // Closing the owner's live stream frees the clock for the next window.
  const controller = new AbortController()
  const stream = await fetch(`${server.baseUrl}/api/session/events?sourceId=window-b&token=${server.tokens.trainee}`, { signal: controller.signal })

  await stream.body!.getReader().read()
  controller.abort()

  for (let attempt = 0; attempt < 100 && await owner(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  assert.equal(await owner(), undefined)
  assert.equal((await move('window-a', 444)).accepted, true, 'a window takes a free clock by moving trains')
  assert.equal(await owner(), 'window-a')

  const log = await server.getJson<{ actions: Array<{ kind: string }> }>('/api/session/actions')

  assert.deepEqual(
    log.actions.map((entry) => entry.kind).filter((kind) => kind.startsWith('simulation.')),
    ['simulation.owner', 'simulation.owner', 'simulation.released', 'simulation.owner'],
  )
  assert.equal(server.stderr(), '')
} finally {
  await stopBackend(server.backend)
  await rm(dataDir, { force: true, recursive: true })
}
