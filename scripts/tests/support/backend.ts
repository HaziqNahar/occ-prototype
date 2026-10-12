import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import path from 'node:path'
import type { SessionCommandResponse, SessionSnapshotMessage, SessionUpdateMessage } from '../../../src/session-commands/protocol'
import type { SessionActor, SessionCommand } from '../../../src/session-commands/types'

// Starts a real backend (server/server.mjs) on a free port for integration tests.

export const testTrainer: SessionActor = { name: 'Trainer', role: 'trainer' }
export const testTrainee: SessionActor = { id: 'alex.tan@trainee.local', name: 'Alex Tan', role: 'trainee' }

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

export async function startBackend(dataDir: string) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const backend: ChildProcess = spawn(process.execPath, [path.resolve('server/server.mjs')], {
    env: { ...process.env, OCC_BACKEND_DATA_DIR: dataDir, OCC_BACKEND_HOST: '127.0.0.1', OCC_BACKEND_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''

  backend.stderr?.on('data', (chunk) => {
    stderr += String(chunk)
  })

  const getJson = async <T>(pathName: string) => (await (await fetch(`${baseUrl}${pathName}`)).json()) as T
  const post = (pathName: string, body: unknown) => fetch(`${baseUrl}${pathName}`, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  const command = async (actor: SessionActor, sessionCommand: SessionCommand, sessionId?: string) => {
    const response = await post('/api/session/commands', { actor, command: sessionCommand, commandId: `test-${Date.now()}`, sessionId, sourceId: 'test' })

    return { body: await response.json() as SessionCommandResponse, status: response.status }
  }
  const snapshot = () => getJson<SessionSnapshotMessage>('/api/session')

  // Reads the live event stream until `count` messages have arrived.
  const openEvents = async () => {
    const controller = new AbortController()
    const response = await fetch(`${baseUrl}/api/session/events?sourceId=test-stream`, { signal: controller.signal })
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
        return { backend, baseUrl, command, getJson, openEvents, post, snapshot, stderr: () => stderr }
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
