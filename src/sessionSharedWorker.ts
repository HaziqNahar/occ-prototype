import type { OccSessionState, SessionMonitorLaunch } from './types'

// The SharedWorker is scoped to one browser profile. It keeps the three local
// monitor windows synchronized even when the backend is not reachable.
type SessionWorkerMessage =
  | {
    session: OccSessionState
    sourceId: string
    type: 'session:hello'
  }
  | {
    session: OccSessionState
    sourceId: string
    type: 'session:update'
  }
  | MonitorLaunchMessage

// Monitor 02 sends this message when it should open Monitor 01 and Monitor 03.
// The worker broadcasts it so any active line-map window can coordinate launch.
type MonitorLaunchMessage = SessionMonitorLaunch & {
  type: 'monitor-launch:request'
}

type SessionWorkerResponse =
  | {
    session: OccSessionState
    sourceId: string
    transport: 'shared-worker'
    type: 'session:snapshot' | 'session:update'
  }
  | (MonitorLaunchMessage & {
    transport: 'shared-worker'
  })

type SharedWorkerConnectEvent = MessageEvent & {
  ports: MessagePort[]
}

const workerScope = globalThis as unknown as {
  onconnect: ((event: SharedWorkerConnectEvent) => void) | null
}

const ports = new Set<MessagePort>()
let latestSession: OccSessionState | null = null

// `updatedAt` is the conflict guard across backend, worker, BroadcastChannel,
// and storage events. Newer snapshots win; older echoes are ignored.
function shouldAcceptSession(nextSession: OccSessionState) {
  return !latestSession || nextSession.updatedAt >= latestSession.updatedAt
}

// Dead windows throw when messaged; deleting them keeps the worker healthy
// during repeated demo runs.
function postToPort(port: MessagePort, message: SessionWorkerResponse) {
  try {
    port.postMessage(message)
  } catch {
    ports.delete(port)
  }
}

function broadcast(message: SessionWorkerResponse) {
  ports.forEach((port) => postToPort(port, message))
}

workerScope.onconnect = (event: SharedWorkerConnectEvent) => {
  const port = event.ports[0]

  if (!port) {
    return
  }

  //each port is a new monitor window connected to the same worker
  ports.add(port)

  port.onmessage = (messageEvent: MessageEvent<SessionWorkerMessage>) => {
    const message = messageEvent.data

    if (message.type === 'session:hello') {
      // A newly opened monitor gets the worker's latest known session
      // immediately, so it does not start from stale local storage.
      if (shouldAcceptSession(message.session)) {
        latestSession = message.session
      }

      if (latestSession) {
        postToPort(port, {
          session: latestSession,
          sourceId: message.sourceId,
          transport: 'shared-worker',
          type: 'session:snapshot',
        })
      }

      return
    }

    if (message.type === 'session:update' && shouldAcceptSession(message.session)) {
      // Local browser updates are fanned out to sibling windows. Backend SSE may
      // also deliver the same state, so App.tsx deduplicates with updatedAt.
      latestSession = message.session
      broadcast({
        session: latestSession,
        sourceId: message.sourceId,
        transport: 'shared-worker',
        type: 'session:update',
      })
    }

    if (message.type === 'monitor-launch:request') {
      // Launch requests are not persisted; they are one-shot coordination events.
      broadcast({
        ...message,
        transport: 'shared-worker',
      })
    }
  }

  port.start()
}

export { }
