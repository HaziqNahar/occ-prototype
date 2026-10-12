import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { PublicUser } from '../../src/accounts'
import { hashPassword, verifyPassword } from '../../server/auth'
import { startBackend, stopBackend, TEST_PASSWORD, testTrainee, testTrainer } from './support/backend'

// Passwords are stored as salted scrypt hashes.
{
  const stored = await hashPassword('correct-horse-1')

  assert.match(stored, /^scrypt\$/)
  assert.notEqual(stored, await hashPassword('correct-horse-1'), 'each hash has its own salt')
  assert.equal(await verifyPassword('correct-horse-1', stored), true)
  assert.equal(await verifyPassword('wrong-horse-1', stored), false)
}

// Accounts, sign-in and who may do what. See docs/production-plan.md, phase 4.
const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-auth-'))
const server = await startBackend(dataDir)

try {
  const request = async (pathName: string, options: { body?: unknown; method?: string; token?: string } = {}) => {
    const response = await fetch(`${server.baseUrl}${pathName}`, {
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      headers: {
        'content-type': 'application/json',
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    })

    return { body: await response.json() as Record<string, unknown>, status: response.status }
  }
  const trainer = server.tokens.trainer
  const trainee = server.tokens.trainee

  // Only health and sign-in work without an account.
  assert.equal((await request('/api/health')).status, 200)
  assert.equal((await request('/api/session')).status, 401)
  assert.equal((await request('/api/session/commands', { body: { command: { type: 'RESET_SCENARIO' } } })).status, 401)
  assert.equal((await fetch(`${server.baseUrl}/api/session/events`)).status, 401, 'the live stream needs a token too')
  assert.equal((await request('/api/auth/status')).body.needsSetup, false)
  assert.equal((await request('/api/auth/setup', { body: { name: 'Mallory', password: TEST_PASSWORD, username: 'mallory' } })).status, 409, 'setup only works once')

  // Signed in, each account sees its own name and role.
  assert.equal(((await request('/api/auth/me', { token: trainee })).body.user as PublicUser).role, 'trainee')
  assert.equal(((await request('/api/auth/me', { token: trainer })).body.user as PublicUser).admin, true)

  // Trainees cannot see the console's data or manage people.
  assert.equal((await request('/api/session/actions', { token: trainee })).status, 403)
  assert.equal((await request('/api/reports/latest', { token: trainee })).status, 403)
  assert.equal((await request('/api/users', { token: trainee })).status, 403)
  assert.equal((await request('/api/session/runtime', { body: {}, token: trainee })).status, 403)

  // Commands act as the signed-in account, whatever the page claims.
  const forged = await request('/api/session/commands', {
    body: { actor: { name: 'Trainer', role: 'trainer' }, command: { type: 'RESET_SCENARIO' } },
    token: trainee,
  })
  const log = await server.getJson<{ actions: Array<{ action_type: string; actor: string; actor_role: string }> }>('/api/session/actions')
  const reset = log.actions.find((entry) => entry.action_type === 'RESET_SCENARIO')

  assert.equal(forged.body.accepted, false)
  assert.equal(reset?.actor, 'Alex Tan')
  assert.equal(reset?.actor_role, 'trainee')

  // The admin adds people; usernames are unique and passwords have a minimum length.
  const created = await request('/api/users', { body: { name: 'Sam Lee', password: TEST_PASSWORD, role: 'trainee', username: 'Sam.Lee' }, token: trainer })

  assert.equal(created.status, 201)
  assert.equal((created.body.user as PublicUser).id, 'sam.lee', 'usernames are stored in lower case')
  assert.equal((await request('/api/users', { body: { name: 'Sam', password: TEST_PASSWORD, role: 'trainee', username: 'sam.lee' }, token: trainer })).status, 409)
  assert.equal((await request('/api/users', { body: { name: 'Kim', password: 'short', role: 'trainee', username: 'kim' }, token: trainer })).status, 400)
  assert.equal((await request('/api/users', { body: { admin: true, name: 'Kim', password: TEST_PASSWORD, role: 'trainee', username: 'kim' }, token: trainer })).status, 201)
  assert.equal((await request('/api/users', { token: trainer })).body.users instanceof Array, true)

  const kim = ((await request('/api/users', { token: trainer })).body.users as PublicUser[]).find((user) => user.id === 'kim')

  assert.equal(kim?.admin, false, 'only trainers can be admins')

  // Wrong passwords are refused, and repeated failures lock the username briefly.
  const signIn = (username: string, password: string) => request('/api/auth/login', { body: { password, username } })

  assert.equal((await signIn('sam.lee', 'not-the-password')).status, 401)

  const samToken = (await signIn('SAM.LEE', TEST_PASSWORD)).body.token as string

  assert.equal((await request('/api/auth/me', { token: samToken })).status, 200)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await signIn('kim', 'not-the-password')
  }

  assert.equal((await signIn('kim', TEST_PASSWORD)).status, 429, 'locked after five wrong passwords')

  // A password reset or switching an account off signs it out everywhere.
  assert.equal((await request('/api/users/sam.lee', { body: { password: 'another-pass-2' }, method: 'PATCH', token: trainer })).status, 200)
  assert.equal((await request('/api/auth/me', { token: samToken })).status, 401)
  assert.equal((await signIn('sam.lee', 'another-pass-2')).status, 200)
  assert.equal((await request('/api/users/sam.lee', { body: { disabled: true }, method: 'PATCH', token: trainer })).status, 200)

  const switchedOff = await signIn('sam.lee', 'another-pass-2')

  assert.equal(switchedOff.status, 401)
  assert.match(String(switchedOff.body.message), /switched off/)

  // An admin cannot lock themselves out.
  assert.equal((await request(`/api/users/${testTrainer.id}`, { body: { disabled: true }, method: 'PATCH', token: trainer })).status, 400)
  assert.equal((await request(`/api/users/${testTrainer.id}`, { body: { admin: false }, method: 'PATCH', token: trainer })).status, 400)

  // Signing out ends the token.
  const second = (await signIn(testTrainee.id!, TEST_PASSWORD)).body.token as string

  await request('/api/auth/logout', { body: {}, token: second })
  assert.equal((await request('/api/auth/me', { token: second })).status, 401)
  assert.equal(server.stderr(), '')
} finally {
  await stopBackend(server.backend)
  await rm(dataDir, { force: true, recursive: true })
}
