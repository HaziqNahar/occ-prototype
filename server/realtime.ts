import type { IncomingMessage, ServerResponse } from 'node:http'
import { MAX_TRANSPORT_EVENTS, SSE_HEARTBEAT_MS } from './config'
import { createId, getIsoNow, setCorsHeaders } from './http'
import type { SessionSnapshotMessage, SessionUpdateMessage } from '../src/session-commands/protocol'
import type { SessionMonitorLaunch, SessionTransportEvent } from '../src/types'

// Server-sent events: the backend's live path to every open screen. A stream
// either names its exercise (?session=) or follows its user: a trainee's own
// exercise, otherwise Exercise 1. When that changes (a trainee is moved, an
// exercise is reset or removed) the stream is sent the new exercise's snapshot.

type SseClient = {
  // The exercise this stream is showing now.
  currentSessionId: string
  // Named exercise, or null to follow the user.
  sessionId: string | null
  response: ServerResponse
  userId: string | null
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
  private readonly resolveFollowed: (userId: string | null) => string
  private readonly snapshotFor: (sessionId: string) => SessionSnapshotMessage | null

  constructor(
    resolveFollowed: (userId: string | null) => string,
    snapshotFor: (sessionId: string) => SessionSnapshotMessage | null,
  ) {
    this.resolveFollowed = resolveFollowed
    this.snapshotFor = snapshotFor
  }

  get clientCount() {
    return this.clients.size
  }

  send(sessionId: string, payload: SessionSnapshotMessage | SessionUpdateMessage) {
    this.clients.forEach((client) => {
      if (client.currentSessionId === sessionId) {
        writeSse(client.response, payload)
      }
    })
  }

  // A reset or removed exercise: streams that named it now name its replacement.
  moveClients(fromSessionId: string, toSessionId: string) {
    this.clients.forEach((client) => {
      if (client.sessionId === fromSessionId) {
        client.sessionId = toSessionId
      }
    })
    this.sync()
  }

  // Sends each stream whose exercise changed the snapshot of its new one.
  sync() {
    this.clients.forEach((client) => {
      const target = client.sessionId ?? this.resolveFollowed(client.userId)

      if (target === client.currentSessionId) {
        return
      }

      const snapshot = this.snapshotFor(target)

      if (snapshot) {
        client.currentSessionId = target
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
    sourceId: string
    subscribedSessionId: string | null
    userId: string | null
  }) {
    const currentSessionId = options.subscribedSessionId ?? this.resolveFollowed(options.userId)
    const snapshot = this.snapshotFor(currentSessionId)

    setCorsHeaders(response)
    response.writeHead(200, {
      connection: 'keep-alive',
      'cache-control': 'no-cache, no-transform',
      'content-type': 'text/event-stream',
      'x-accel-buffering': 'no',
    })
    response.write(': connected\n\n')

    const client: SseClient = { currentSessionId, response, sessionId: options.subscribedSessionId, userId: options.userId }

    this.clients.add(client)
    recordTransportEvent('sse_connected', { detail: 'Browser opened backend event stream.', sourceId: options.sourceId, transport: 'backend' })

    if (snapshot) {
      writeSse(response, snapshot)
    }

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
