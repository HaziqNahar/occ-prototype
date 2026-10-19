import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import path from 'node:path'
import type { SessionCommandResponse, SessionSnapshotMessage, SessionUpdateMessage } from '../../../src/session-commands/protocol'
import type { SessionActor, SessionCommand } from '../../../src/session-commands/types'

// Starts a real backend (server/server.mjs) on a free port for integration
// tests, with an admin trainer and a trainee account signed in.

export const testTrainer: SessionActor = { id: 'trainer', name: 'Trainer', role: 'trainer' }
export const testTrainee: SessionActor = { id: 'alex.tan', name: 'Alex Tan', role: 'trainee' }
export const TEST_PASSWORD = 'correct-horse-1'

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

export type TestBackend = Awaited<ReturnType<typeof startBackend>>

// createSession: false starts with no session, as a new host does.
export async function startBackend(dataDir: string, env: Record<string, string> = {}, { createSession = true } = {}) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const backend: ChildProcess = spawn(process.execPath, [path.resolve('server/server.mjs')], {
    env: { ...process.env, OCC_BACKEND_DATA_DIR: dataDir, OCC_BACKEND_HOST: '127.0.0.1', OCC_BACKEND_PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''

  backend.stderr?.on('data', (chunk) => {
    stderr += String(chunk)
  })

  const tokens: Record<SessionActor['role'], string> = { trainee: '', trainer: '' }
  const authHeader = (role: SessionActor['role'] = 'trainer'): Record<string, string> => (
    tokens[role] ? { authorization: `Bearer ${tokens[role]}` } : {}
  )
  const getJson = async <T>(pathName: string) => (await (await fetch(`${baseUrl}${pathName}`, { headers: authHeader() })).json()) as T
  const post = (pathName: string, body: unknown, role: SessionActor['role'] = 'trainer') => fetch(`${baseUrl}${pathName}`, {
    body: JSON.stringify(body),
    headers: { ...authHeader(role), 'content-type': 'application/json' },
    method: 'POST',
  })
  // The server acts as the signed-in account; actor only picks which one.
  const command = async (actor: SessionActor, sessionCommand: SessionCommand, sessionId?: string) => {
    const response = await post('/api/session/commands', { command: sessionCommand, commandId: `test-${Date.now()}`, sessionId, sourceId: 'test' }, actor.role)

    return { body: await response.json() as SessionCommandResponse, status: response.status }
  }
  const snapshot = () => getJson<SessionSnapshotMessage>('/api/session')
  const signIn = async (username: string) => {
    const response = await post('/api/auth/login', { password: TEST_PASSWORD, username })

    return ((await response.json()) as { token: string }).token
  }

  // First start: set up the admin trainer and a trainee. A restart signs in again.
  const signInTestAccounts = async () => {
    const setup = await post('/api/auth/setup', { name: testTrainer.name, password: TEST_PASSWORD, username: testTrainer.id })

    if (setup.status === 201) {
      tokens.trainer = ((await setup.json()) as { token: string }).token
      await post('/api/users', { name: testTrainee.name, password: TEST_PASSWORD, role: 'trainee', username: testTrainee.id })
    } else {
      tokens.trainer = await signIn(testTrainer.id!)
    }

    tokens.trainee = await signIn(testTrainee.id!)
  }

  // Reads the live event stream until `count` messages have arrived.
  const openEvents = async () => {
    const controller = new AbortController()
    const response = await fetch(`${baseUrl}/api/session/events?sourceId=test-stream&token=${tokens.trainer}`, { signal: controller.signal })
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const messages: Array<SessionSnapshotMessage | SessionUpdateMessage> = []
    let buffer = ''

    const pump = async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read()

          if (done) {
            return
          }

          buffer += decoder.decode(value, { stream: true })

          let separator = buffer.indexOf('\n\n')

          while (separator >= 0) {
            const frame = buffer.slice(0, separator)

            buffer = buffer.slice(separator + 2)
            frame.split('\n').filter((line) => line.startsWith('data: ')).forEach((line) => {
              messages.push(JSON.parse(line.slice(6)))
            })
            separator = buffer.indexOf('\n\n')
          }
        }
      } catch {
        // Aborted when the test closes the stream.
      }
    }

    void pump()

    return {
      close: () => controller.abort(),
      messages,
      waitFor: async (count: number) => {
        for (let attempt = 0; attempt < 200 && messages.length < count; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        return messages
      },
    }
  }

  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/api/health`)).ok) {
        await signInTestAccounts()

        // The trainer creates the session, as on the Trainer Console (none exists before).
        if (createSession && !((await (await fetch(`${baseUrl}/api/health`)).json()) as { hasSession: boolean }).hasSession) {
          await post('/api/sessions', {})
        }

        return { backend, baseUrl, command, getJson, openEvents, post, snapshot, stderr: () => stderr, tokens }
      }
    } catch {
      // Still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error(`Backend did not start: ${stderr}`)
}

export async function stopBackend(backend: ChildProcess) {
  backend.kill()
  await Promise.race([once(backend, 'exit'), new Promise((resolve) => setTimeout(resolve, 2000))])
}
