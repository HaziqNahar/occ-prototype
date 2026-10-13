import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startBackend, stopBackend, TEST_PASSWORD } from './support/backend'

// Host PC data tools: backup, restore (only with the server stopped) and the
// data kept aside by a restore. See docs/lan-setup.md.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-data-tools-'))

function runTool(args: string[], port: number) {
  return new Promise<{ code: number | null; output: string }>((resolve) => {
    const tool = spawn(process.execPath, [path.resolve('scripts/data-tool.mjs'), ...args], {
      env: { ...process.env, OCC_BACKEND_DATA_DIR: dataDir, OCC_BACKEND_PORT: String(port) },
    })
    let output = ''

    tool.stdout.on('data', (chunk) => {
      output += String(chunk)
    })
    tool.stderr.on('data', (chunk) => {
      output += String(chunk)
    })
    tool.on('exit', (code) => resolve({ code, output }))
  })
}

try {
  let server = await startBackend(dataDir)
  const port = Number(new URL(server.baseUrl).port)
  const accounts = async () => (await server.getJson<{ users: Array<{ id: string }> }>('/api/users')).users.map((user) => user.id).sort()

  assert.deepEqual(await accounts(), ['alex.tan', 'trainer'])

  const backup = await runTool(['backup'], port)

  assert.equal(backup.code, 0, backup.output)

  const backupName = /occ-training-\d{8}-\d{6}\.sqlite/.exec(backup.output)?.[0]

  assert.ok(backupName, backup.output)

  // A change made after the backup.
  await server.post('/api/users', { name: 'Late Joiner', password: TEST_PASSWORD, role: 'trainee', username: 'late.joiner' })
  assert.deepEqual(await accounts(), ['alex.tan', 'late.joiner', 'trainer'])

  // Restoring while the server runs is refused.
  const refused = await runTool(['restore', backupName], port)

  assert.equal(refused.code, 1)
  assert.match(refused.output, /Stop the training server first/)

  await stopBackend(server.backend)
  assert.match((await runTool(['restore', 'no-such-file.sqlite'], port)).output, /not a backup/)

  const restored = await runTool(['restore', backupName], port)

  assert.equal(restored.code, 0, restored.output)
  assert.match(restored.output, /kept in/)
  assert.equal(readdirSync(dataDir).filter((name) => name.includes('.before-restore-')).length, 1)

  // The backup's data is back.
  server = await startBackend(dataDir)
  assert.deepEqual(await accounts(), ['alex.tan', 'trainer'])
  await stopBackend(server.backend)
} finally {
  await rm(dataDir, { force: true, recursive: true })
}
