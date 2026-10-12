import type { IncomingMessage, ServerResponse } from 'node:http'
import { MAX_TRANSPORT_EVENTS, SSE_HEARTBEAT_MS } from './config'
import { createId, getIsoNow, setCorsHeaders } from './http'
import type { SessionSnapshotMessage, SessionUpdateMessage } from '../src/session-commands/protocol'
import type { SessionMonitorLaunch, SessionTransportEvent } from '../src/types'

// Server-sent events: the backend's live path to every open screen. Each stream
// belongs to one session; a stream opened without one follows the current session.

type SseClient = {
  // null: follow whichever session is current.
  sessionId: string | null
  response: ServerResponse
}

const transportEvents: SessionTransportEvent[] = []

export function getTransportEvents() {
  return transportEvents
}

export function recordTransportEvent(type: SessionTransportEvent['type'], event: Omit<SessionTransportEvent, 'id' | 'time' | 'type'> = {}) {
  transportEvents.unshift({ ...event, id: createId(), time: getIsoNow(), type })

  if (transportEvents.length > MAX_TRANSPORT_EVENTS) {
    transportEvents.length = MAX_TRANSPORT_EVENTS
  }
}

function writeSse(response: ServerResponse, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export class RealtimeHub {
  private readonly clients = new Set<SseClient>()
  private readonly getCurrentSessionId: () => string

  constructor(getCurrentSessionId: () => string) {
    this.getCurrentSessionId = getCurrentSessionId
  }

  get clientCount() {
    return this.clients.size
  }

  private sessionOf(client: SseClient) {
    return client.sessionId ?? this.getCurrentSessionId()
  }

  send(sessionId: string, payload: SessionSnapshotMessage | SessionUpdateMessage) {
    this.clients.forEach((client) => {
      if (this.sessionOf(client) === sessionId) {
        writeSse(client.response, payload)
      }
    })
  }

  // A reset replaces a session: its screens move to the new one.
  moveClients(fromSessionId: string, snapshot: SessionSnapshotMessage) {
    this.clients.forEach((client) => {
      if (this.sessionOf(client) === fromSessionId) {
        if (client.sessionId !== null) {
          client.sessionId = snapshot.sessionId
        }

        writeSse(client.response, snapshot)
      }
    })
  }

  broadcastMonitorLaunch(launchRequest: SessionMonitorLaunch) {
    const payload = { ...launchRequest, transport: 'backend', type: 'monitor-launch:request' }

    this.clients.forEach((client) => writeSse(client.response, payload))
  }

  open(request: IncomingMessage, response: ServerResponse, options: {
    onClose?: () => void
    snapshot: SessionSnapshotMessage
    sourceId: string
    subscribedSessionId: string | null
  }) {
    setCorsHeaders(response)
    response.writeHead(200, {
      connection: 'keep-alive',
      'cache-control': 'no-cache, no-transform',
      'content-type': 'text/event-stream',
      'x-accel-buffering': 'no',
    })
    response.write(': connected\n\n')

    const client: SseClient = { response, sessionId: options.subscribedSessionId }

    this.clients.add(client)
    recordTransportEvent('sse_connected', { detail: 'Browser opened backend event stream.', sourceId: options.sourceId, transport: 'backend' })
    writeSse(response, options.snapshot)

    // A message rather than a comment, so screens can tell a silent dead link from a quiet session.
    const heartbeat = setInterval(() => writeSse(response, { type: 'heartbeat' }), SSE_HEARTBEAT_MS)

    request.on('close', () => {
      clearInterval(heartbeat)
      this.clients.delete(client)
      options.onClose?.()
      recordTransportEvent('sse_disconnected', { detail: 'Browser closed backend event stream.', sourceId: options.sourceId, transport: 'backend' })
    })
  }
}
