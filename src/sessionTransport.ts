import type {
  AppRoute,
  MonitorLaunchTransport,
  OccSessionState,
  SessionMonitorLaunch,
  SessionScreenRole,
  SessionTransportHealth,
  SessionTransportSnapshot,
  SessionUpdateTransport,
} from './types'
import { buildOccApiUrl, getOccBackendBaseUrl, requestOccMonitorLaunch } from './backendClient'

export const OCC_SESSION_KEY = 'sbs-occ-training-session-v5'
const OCC_SESSION_CHANNEL = 'sbs-occ-training-session'

type SessionTransportName = 'backend' | 'broadcast-channel' | 'shared-worker' | 'storage'

type BackendSessionMessage = {
  error?: string
  message?: string
  session: OccSessionState | null
  sourceId?: string
  type?: 'session:reset' | 'session:snapshot' | 'session:update'
  updatedAt?: number | null
}

type MonitorLaunchPayload = SessionMonitorLaunch & {
  type: 'monitor-launch:request'
}

export type MonitorLaunchRequest = MonitorLaunchPayload & {
  transport: MonitorLaunchTransport
}

type BackendRealtimeMessage =
  | BackendSessionMessage
  | (MonitorLaunchPayload & {
    transport?: MonitorLaunchTransport
  })

type BroadcastSessionMessage = {
  session: OccSessionState
  sourceId: string
  transport: 'broadcast-channel'
  type: 'session:update'
}

type BroadcastChannelMessage =
  | BroadcastSessionMessage
  | (MonitorLaunchPayload & {
    transport: 'broadcast-channel'
  })

type WorkerSessionMessage = {
  session: OccSessionState
  sourceId: string
  transport: 'shared-worker'
  type: 'session:snapshot' | 'session:update'
}

type WorkerMessage =
  | WorkerSessionMessage
  | (MonitorLaunchPayload & {
    transport: 'shared-worker'
  })

type SessionTransportOptions = {
  initialSession: OccSessionState
  onMonitorLaunchRequest?: (request: MonitorLaunchRequest) => void
  onSession: (session: OccSessionState, transport: SessionTransportName) => void
}

export type OccSessionTransport = {
  close: () => void
  publish: (session: OccSessionState) => void
  registerScreen: (screen: ScreenRegistration, session: OccSessionState) => void
  requestMonitorPeerLaunch: () => string
  sourceId: string
}

export type ScreenRegistration = {
  label: string
  role: SessionScreenRole
  route: AppRoute
}

function createSourceId() {
  if ('crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readSessionFromStorage(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as OccSessionState
  } catch {
    return null
  }
}

function writeSessionToStorage(session: OccSessionState) {
  try {
    window.localStorage.setItem(OCC_SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage can fail in private browsing or locked-down kiosk profiles.
  }
}

function isMonitorLaunchMessage(message: { type?: string }): message is MonitorLaunchPayload {
  return message.type === 'monitor-launch:request'
}

//creates a sharedWorker when app starts
export function createOccSessionTransport({
  initialSession,
  onMonitorLaunchRequest,
  onSession,
}: SessionTransportOptions): OccSessionTransport {
  const sourceId = createSourceId()
  const backendBaseUrl = getOccBackendBaseUrl()
  let channel: BroadcastChannel | null = null
  let eventSource: EventSource | null = null
  let backendSse: SessionTransportHealth = backendBaseUrl === null ? 'UNAVAILABLE' : 'AVAILABLE'
  let broadcastChannel: SessionTransportHealth = 'UNAVAILABLE'
  let lastMonitorLaunchTransport: MonitorLaunchTransport | undefined
  let lastSessionTransport: SessionUpdateTransport = 'local'
  let sharedWorker: SessionTransportHealth = 'UNAVAILABLE'
  const storage: SessionTransportHealth = 'AVAILABLE'
  let worker: SharedWorker | null = null

  const acceptRemoteSession = (
    session: OccSessionState,
    transport: SessionTransportName,
    remoteSourceId?: string,
  ) => {
    if (remoteSourceId === sourceId) {
      return
    }

    lastSessionTransport = transport
    onSession(session, transport)
  }

  const acceptMonitorLaunchRequest = (message: MonitorLaunchPayload, transport: MonitorLaunchTransport) => {
    lastMonitorLaunchTransport = transport
    onMonitorLaunchRequest?.({
      ...message,
      transport,
    })
  }

  const getTransportSnapshot = (): SessionTransportSnapshot => ({
    backendSse,
    broadcastChannel,
    lastMonitorLaunchTransport,
    lastSessionTransport,
    reportedAt: new Date().toISOString(),
    sharedWorker,
    sourceId,
    storage,
  })

  // Publish full session snapshots to the backend first. If the backend is
  // unavailable, the worker/channel/storage fallbacks still keep the demo alive.
  const publishToBackend = (session: OccSessionState) => {
    if (backendBaseUrl === null) {
      return
    }

    void fetch(buildOccApiUrl(backendBaseUrl, '/api/session'), {
      body: JSON.stringify({ session, sourceId }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'PUT',
    })
      .then(async (response) => {
        if (response.status !== 409) {
          return
        }

        const payload = (await response.json()) as BackendSessionMessage

        if (payload.session) {
          acceptRemoteSession(payload.session, 'backend', payload.sourceId)
        }
      })
      .catch(() => {
        // The local browser transports keep the demo running if the backend is offline.
      })
  }

  const publishMonitorLaunchToBackend = (request: MonitorLaunchPayload) => {
    if (backendBaseUrl === null) {
      return false
    }

    void requestOccMonitorLaunch(request).catch(() => {
      // Worker and BroadcastChannel still carry the launch inside one browser profile.
    })

    return true
  }

  // On page load, prefer the backend's latest authoritative session. If the
  // backend has no session yet, seed it with the browser's initial state.
  const syncInitialBackendState = () => {
    if (backendBaseUrl === null) {
      return
    }

    void fetch(buildOccApiUrl(backendBaseUrl, '/api/session'), {
      headers: {
        accept: 'application/json',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as BackendSessionMessage

        if (payload.session) {
          acceptRemoteSession(payload.session, 'backend', payload.sourceId)
          return
        }

        publishToBackend(initialSession)
      })
      .catch(() => {
        // Backend sync is opportunistic during the prototype demo.
      })
  }

  // SSE is the cross-window/cross-browser realtime path for backend-mutated
  // session state such as validated actions and scoring changes.
  const connectBackendEvents = () => {
    if (backendBaseUrl === null || !('EventSource' in window)) {
      backendSse = 'UNAVAILABLE'
      return
    }

    try {
      backendSse = 'AVAILABLE'
      const eventUrl = new URL(buildOccApiUrl(backendBaseUrl, '/api/session/events'), window.location.href)
      eventUrl.searchParams.set('sourceId', sourceId)
      eventSource = new EventSource(eventUrl.toString())
      eventSource.onopen = () => {
        backendSse = 'CONNECTED'
      }
      eventSource.onerror = () => {
        backendSse = eventSource?.readyState === EventSource.CLOSED ? 'ERROR' : 'AVAILABLE'
      }
      eventSource.onmessage = (event: MessageEvent<string>) => {
        const payload = JSON.parse(event.data) as BackendRealtimeMessage

        if (isMonitorLaunchMessage(payload)) {
          acceptMonitorLaunchRequest(payload, 'backend')
          return
        }

        if (payload.session) {
          acceptRemoteSession(payload.session, 'backend', payload.sourceId)
        }
      }
    } catch {
      backendSse = 'ERROR'
      eventSource = null
    }
  }

  // SharedWorker keeps multiple windows in the same browser profile aligned and
  // carries the monitor launch request for the three-screen demo layout.
  const connectSharedWorker = () => {
    if (!('SharedWorker' in window)) {
      sharedWorker = 'UNAVAILABLE'
      return
    }

    try {
      sharedWorker = 'AVAILABLE'
      worker = new SharedWorker(new URL('./sessionSharedWorker.ts', import.meta.url), {
        name: 'sbs-occ-session-worker',
        type: 'module',
      })
      sharedWorker = 'CONNECTED'

      worker.port.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data

        if (message.type === 'session:snapshot' || message.type === 'session:update') {
          acceptRemoteSession(message.session, 'shared-worker', message.sourceId)
          return
        }

        if (message.type === 'monitor-launch:request') {
          acceptMonitorLaunchRequest(message, 'shared-worker')
        }
      }

      worker.port.start()
      worker.port.postMessage({
        session: initialSession,
        sourceId,
        type: 'session:hello',
      })
    } catch {
      sharedWorker = 'ERROR'
      worker = null
    }
  }

  const connectBroadcastChannel = () => {
    if (!('BroadcastChannel' in window)) {
      broadcastChannel = 'UNAVAILABLE'
      return
    }

    broadcastChannel = 'AVAILABLE'
    channel = new BroadcastChannel(OCC_SESSION_CHANNEL)
    broadcastChannel = 'CONNECTED'
    channel.onmessage = (event: MessageEvent<BroadcastChannelMessage>) => {
      const message = event.data

      if (message.type === 'monitor-launch:request') {
        acceptMonitorLaunchRequest(message, 'broadcast-channel')
        return
      }

      if (message.type === 'session:update') {
        acceptRemoteSession(message.session, 'broadcast-channel', message.sourceId)
      }
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== OCC_SESSION_KEY) {
      return
    }

    const session = readSessionFromStorage(event.newValue)

    if (session) {
      acceptRemoteSession(session, 'storage')
    }
  }

  syncInitialBackendState()
  connectBackendEvents()
  connectSharedWorker()
  connectBroadcastChannel()
  window.addEventListener('storage', handleStorage)

  return {
    close: () => {
      eventSource?.close()
      worker?.port.close()
      channel?.close()
      window.removeEventListener('storage', handleStorage)
    },
    publish: (session: OccSessionState) => {
      lastSessionTransport = 'local'
      writeSessionToStorage(session)
      publishToBackend(session)
      worker?.port.postMessage({
        session,
        sourceId,
        type: 'session:update',
      })
      channel?.postMessage({
        session,
        sourceId,
        transport: 'broadcast-channel',
        type: 'session:update',
      })
    },
    // Screen registration is how the backend proves Monitor 01/02/03 joined
    // OCC-DEMO-001, which is useful during first-round vetting.
    registerScreen: (screen: ScreenRegistration, session: OccSessionState) => {
      if (backendBaseUrl === null) {
        return
      }

      void fetch(buildOccApiUrl(backendBaseUrl, '/api/session/screens'), {
        body: JSON.stringify({ ...screen, session, sourceId, transport: getTransportSnapshot() }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      })
        .then(async (response) => {
          if (!response.ok) {
            return
          }

          const payload = await response.json() as BackendSessionMessage

          if (payload.session) {
            acceptRemoteSession(payload.session, 'backend', payload.sourceId)
          }
        })
        .catch(() => {
          // Screen registration is a backend enhancement; local sync still works.
        })
    },
    // Monitor 02 emits one launch command across every available bus. The
    // receiver deduplicates by launchId because worker, BroadcastChannel, and
    // backend/SSE may all deliver the same request.
    requestMonitorPeerLaunch: () => {
      const launchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const message: MonitorLaunchPayload = {
        launchId,
        originRoute: '/screen/line-map',
        requestedAt: Date.now(),
        sourceId,
        targets: ['/screen/alarms', '/screen/timetable'],
        type: 'monitor-launch:request',
      }
      const sentToBackend = publishMonitorLaunchToBackend(message)
      const sentToWorker = Boolean(worker)
      const sentToChannel = Boolean(channel)

      lastMonitorLaunchTransport = sentToWorker ? 'shared-worker' : sentToChannel ? 'broadcast-channel' : sentToBackend ? 'backend' : undefined
      worker?.port.postMessage(message)
      channel?.postMessage({
        ...message,
        transport: 'broadcast-channel',
      })

      return sentToBackend || sentToWorker || sentToChannel ? launchId : ''
    },
    sourceId,
  }
}
