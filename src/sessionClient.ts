import { buildOccApiUrl, getOccBackendBaseUrl, requestOccMonitorLaunch } from './backendClient'
import type {
  SessionCommandRequest,
  SessionCommandResponse,
  SessionSnapshotMessage,
  SessionUpdateMessage,
  StaleSessionResponse,
} from './session-commands/protocol'
import type {
  AppRoute,
  MonitorLaunchTransport,
  SessionMonitorLaunch,
  SessionScreenRole,
  SessionTransportHealth,
  SessionTransportSnapshot,
} from './types'

// The browser's connection to the server: commands go up, the session's
// snapshot and deltas come back down an event stream. Monitor launches also
// travel over a SharedWorker and BroadcastChannel so the three windows on one
// PC can open each other without the backend.

const OCC_MONITOR_CHANNEL = 'sbs-occ-monitor-launch'
const EVENTS_RETRY_MS = 2000
// The server sends a heartbeat every 25 s; this long without any message means
// the link is dead even if the browser has not noticed.
const EVENTS_SILENCE_MS = 60_000

type MonitorLaunchPayload = SessionMonitorLaunch & {
  type: 'monitor-launch:request'
}

export type MonitorLaunchRequest = MonitorLaunchPayload & {
  transport: MonitorLaunchTransport
}

type ServerMessage =
  | SessionSnapshotMessage
  | SessionUpdateMessage
  | { type: 'heartbeat' }
  | (MonitorLaunchPayload & { transport?: MonitorLaunchTransport })

export type ScreenRegistration = {
  label: string
  role: SessionScreenRole
  route: AppRoute
  // Line Map windows offer to run the train simulation.
  wantsSimulation?: boolean
}

export type CommandSendResult =
  | { response: SessionCommandResponse; stale?: undefined }
  | { snapshot: StaleSessionResponse; stale: true }

type SessionClientOptions = {
  onMonitorLaunchRequest?: (request: MonitorLaunchRequest) => void
  onSnapshot: (message: SessionSnapshotMessage) => void
  onUpdate: (message: SessionUpdateMessage) => void
  // This window's id; the server names the simulation owner by it.
  sourceId: string
}

export type OccSessionClient = ReturnType<typeof createSessionClient>

export function createSourceId() {
  if ('crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Phase 5 opens monitors on one trainee's session with ?session=<code>.
function getRequestedSession() {
  try {
    return new URLSearchParams(window.location.search).get('session')
  } catch {
    return null
  }
}

function isMonitorLaunchMessage(message: { type?: string }): message is MonitorLaunchPayload {
  return message.type === 'monitor-launch:request'
}

export function createSessionClient({ onMonitorLaunchRequest, onSnapshot, onUpdate, sourceId }: SessionClientOptions) {
  const backendBaseUrl = getOccBackendBaseUrl()
  const requestedSession = getRequestedSession()
  let channel: BroadcastChannel | null = null
  let eventSource: EventSource | null = null
  let backendSse: SessionTransportHealth = backendBaseUrl === null ? 'UNAVAILABLE' : 'AVAILABLE'
  let broadcastChannel: SessionTransportHealth = 'UNAVAILABLE'
  let sharedWorker: SessionTransportHealth = 'UNAVAILABLE'
  let lastMonitorLaunchTransport: MonitorLaunchTransport | undefined
  let worker: SharedWorker | null = null
  let closed = false
  let reconnectTimer: number | undefined
  let lastEventAt = Date.now()

  const apiUrl = (path: string, withSession = true) => {
    const url = new URL(buildOccApiUrl(backendBaseUrl ?? '', path), window.location.href)

    if (withSession && requestedSession) {
      url.searchParams.set('session', requestedSession)
    }

    return url.toString()
  }

  const postJson = (path: string, body: unknown) => fetch(apiUrl(path), {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  const acceptMonitorLaunchRequest = (message: MonitorLaunchPayload, transport: MonitorLaunchTransport) => {
    lastMonitorLaunchTransport = transport
    onMonitorLaunchRequest?.({ ...message, transport })
  }

  const getTransportSnapshot = (): SessionTransportSnapshot => ({
    backendSse,
    broadcastChannel,
    lastMonitorLaunchTransport,
    lastSessionTransport: 'backend',
    reportedAt: new Date().toISOString(),
    sharedWorker,
    sourceId,
    storage: 'UNAVAILABLE',
  })

  const fetchSnapshot = async () => {
    if (backendBaseUrl === null) {
      return
    }

    const response = await fetch(apiUrl('/api/session'), { headers: { accept: 'application/json' } })

    if (response.ok) {
      onSnapshot(await response.json() as SessionSnapshotMessage)
    }
  }

  const connectEvents = () => {
    if (backendBaseUrl === null || !('EventSource' in window)) {
      backendSse = 'UNAVAILABLE'
      return
    }

    try {
      const eventUrl = new URL(apiUrl('/api/session/events'))

      eventUrl.searchParams.set('sourceId', sourceId)
      eventSource = new EventSource(eventUrl.toString())
      lastEventAt = Date.now()
      eventSource.onopen = () => {
        backendSse = 'CONNECTED'
      }
      eventSource.onerror = () => {
        if (eventSource?.readyState !== EventSource.CLOSED) {
          backendSse = 'AVAILABLE'
          return
        }

        // The browser gives up after an error response (for example while the
        // backend restarts behind the dev proxy), so try again ourselves.
        backendSse = 'ERROR'
        eventSource.close()

        if (!closed) {
          reconnectTimer = window.setTimeout(connectEvents, EVENTS_RETRY_MS)
        }
      }
      // Every (re)connect starts with a snapshot, so a missed delta is recovered.
      eventSource.onmessage = (event: MessageEvent<string>) => {
        const payload = JSON.parse(event.data) as ServerMessage

        lastEventAt = Date.now()

        if (isMonitorLaunchMessage(payload)) {
          acceptMonitorLaunchRequest(payload, 'backend')
        } else if (payload.type === 'session:snapshot') {
          onSnapshot(payload)
        } else if (payload.type === 'session:update') {
          onUpdate(payload)
        }
      }
    } catch {
      backendSse = 'ERROR'
      eventSource = null
    }
  }

  const connectSharedWorker = () => {
    if (!('SharedWorker' in window)) {
      return
    }

    try {
      worker = new SharedWorker(new URL('./sessionSharedWorker.ts', import.meta.url), {
        name: 'sbs-occ-monitor-worker',
        type: 'module',
      })
      sharedWorker = 'CONNECTED'
      worker.port.onmessage = (event: MessageEvent<MonitorLaunchPayload>) => {
        if (isMonitorLaunchMessage(event.data)) {
          acceptMonitorLaunchRequest(event.data, 'shared-worker')
        }
      }
      worker.port.start()
    } catch {
      sharedWorker = 'ERROR'
      worker = null
    }
  }

  const connectBroadcastChannel = () => {
    if (!('BroadcastChannel' in window)) {
      return
    }

    channel = new BroadcastChannel(OCC_MONITOR_CHANNEL)
    broadcastChannel = 'CONNECTED'
    channel.onmessage = (event: MessageEvent<MonitorLaunchPayload>) => {
      if (isMonitorLaunchMessage(event.data)) {
        acceptMonitorLaunchRequest(event.data, 'broadcast-channel')
      }
    }
  }

  connectEvents()
  connectSharedWorker()
  connectBroadcastChannel()

  const watchdog = window.setInterval(() => {
    if (!closed && eventSource && Date.now() - lastEventAt > EVENTS_SILENCE_MS) {
      backendSse = 'ERROR'
      eventSource.close()
      window.clearTimeout(reconnectTimer)
      connectEvents()
    }
  }, EVENTS_SILENCE_MS / 4)

  return {
    close: () => {
      closed = true
      window.clearTimeout(reconnectTimer)
      window.clearInterval(watchdog)
      eventSource?.close()
      worker?.port.close()
      channel?.close()
    },
    enabled: backendBaseUrl !== null,
    fetchSnapshot,
    // Throws when the backend cannot be reached.
    sendCommand: async (request: Omit<SessionCommandRequest, 'sourceId'>): Promise<CommandSendResult> => {
      const response = await postJson('/api/session/commands', { ...request, sourceId })

      if (response.status === 409) {
        return { snapshot: await response.json() as StaleSessionResponse, stale: true }
      }

      if (!response.ok) {
        throw new Error(`Backend command failed (${response.status}).`)
      }

      return { response: await response.json() as SessionCommandResponse }
    },
    // Presence: the console shows which monitors are open.
    registerScreen: (screen: ScreenRegistration) => {
      if (backendBaseUrl === null) {
        return
      }

      void postJson('/api/session/screens', { ...screen, sourceId, transport: getTransportSnapshot() }).catch(() => {
        // Presence is informational; the next heartbeat retries.
      })
    },
    // Asks for the session's train simulation (takeover: even if another window has it).
    claimSimulation: async (label: string, takeover = false) => {
      if (backendBaseUrl === null) {
        return true
      }

      const response = await postJson('/api/session/simulation', { label, sourceId, takeover })

      return response.ok && (await response.json() as { owner: boolean }).owner
    },
    // Monitor 02 asks for Monitor 01 and 03 over every available path; the
    // receiver de-duplicates by launchId.
    requestMonitorPeerLaunch: () => {
      const message: MonitorLaunchPayload = {
        launchId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        originRoute: '/screen/line-map',
        requestedAt: Date.now(),
        sourceId,
        targets: ['/screen/alarms', '/screen/timetable'],
        type: 'monitor-launch:request',
      }

      if (backendBaseUrl !== null) {
        void requestOccMonitorLaunch(message).catch(() => {
          // Worker and BroadcastChannel still carry the launch on this PC.
        })
      }

      lastMonitorLaunchTransport = worker ? 'shared-worker' : channel ? 'broadcast-channel' : backendBaseUrl !== null ? 'backend' : undefined
      worker?.port.postMessage(message)
      channel?.postMessage({ ...message, transport: 'broadcast-channel' })

      return backendBaseUrl !== null || worker || channel ? message.launchId : ''
    },
    sourceId,
  }
}
