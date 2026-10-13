import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startBackend, stopBackend } from './support/backend'

// The LAN host: one port serves the app and the API, and the database is
// backed up daily and on request. See docs/lan-setup.md.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-host-'))
const appDir = path.join(dataDir, 'app')

await mkdir(path.join(appDir, 'assets'), { recursive: true })
await writeFile(path.join(appDir, 'index.html'), '<!doctype html><title>OCC app</title>')
await writeFile(path.join(appDir, 'assets', 'index-abc123.js'), 'console.log("app")')
await writeFile(path.join(dataDir, 'secret.txt'), 'outside the app folder')

const server = await startBackend(dataDir, { OCC_STATIC_DIR: appDir })

try {
  const get = (pathName: string) => fetch(`${server.baseUrl}${pathName}`)

  // The app and its routes.
  const home = await get('/')

  assert.equal(home.status, 200)
  assert.match(home.headers.get('content-type') ?? '', /text\/html/)
  assert.equal(home.headers.get('cache-control'), 'no-cache')
  assert.match(await home.text(), /OCC app/)

  for (const route of ['/ios/modules', '/screen/line-map?session=K7M2', '/history']) {
    assert.match(await (await get(route)).text(), /OCC app/, `${route} opens the app`)
  }

  const asset = await get('/assets/index-abc123.js')

  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('content-type') ?? '', /javascript/)
  assert.match(asset.headers.get('cache-control') ?? '', /immutable/)
  assert.equal((await get('/assets/missing.js')).status, 404)

  // Nothing outside the app folder is served.
  for (const attempt of ['/../secret.txt', '/%2e%2e/secret.txt', '/assets/..%2F..%2Fsecret.txt']) {
    const response = await get(attempt)

    assert.doesNotMatch(await response.text(), /outside the app folder/, attempt)
  }

  // The API still answers on the same port.
  assert.equal((await (await get('/api/health')).json() as { status: string }).status, 'ok')

  // A backup is made at start-up, and an admin can make one on request.
  const backupDir = path.join(dataDir, 'backups')

  assert.equal(readdirSync(backupDir).filter((name) => name.endsWith('.sqlite')).length, 1)

  const trainee = await fetch(`${server.baseUrl}/api/admin/backups`, {
    body: '{}',
    headers: { authorization: `Bearer ${server.tokens.trainee}`, 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(trainee.status, 403)

  const made = await server.post('/api/admin/backups', {})
  const result = await made.json() as { backup: { bytes: number; name: string }; backups: unknown[] }

  assert.equal(made.status, 201)
  assert.ok(result.backup.bytes > 0)
  assert.equal(result.backups.length, 2)
  assert.ok(existsSync(path.join(backupDir, result.backup.name)))
  assert.equal(server.stderr(), '')
} finally {
  await stopBackend(server.backend)
  await rm(dataDir, { force: true, recursive: true })
}
