import type { IncomingMessage, ServerResponse } from 'node:http'
import { MAX_TRANSPORT_EVENTS, SSE_HEARTBEAT_MS } from './config'
import { createId, getIsoNow, setCorsHeaders } from './http'
import type { OccSessionState, SessionMonitorLaunch, SessionTransportEvent } from '../src/types'

// Server-sent events: the backend's live path to every open screen.

const sseClients = new Set<ServerResponse>()
const transportEvents: SessionTransportEvent[] = []

export function getSseClientCount() {
  return sseClients.size
}

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

export function broadcastSession(session: OccSessionState | null, type: 'session:reset' | 'session:update', sourceId?: string) {
  const payload = { session, sourceId: sourceId ?? 'backend', type, updatedAt: session?.updatedAt ?? null }

  sseClients.forEach((client) => writeSse(client, payload))
}

export function broadcastMonitorLaunch(launchRequest: SessionMonitorLaunch) {
  const payload = { ...launchRequest, transport: 'backend', type: 'monitor-launch:request' }

  sseClients.forEach((client) => writeSse(client, payload))
}

export function openEventStream(request: IncomingMessage, response: ServerResponse, sourceId: string, session: OccSessionState | null) {
  setCorsHeaders(response)
  response.writeHead(200, {
    connection: 'keep-alive',
    'cache-control': 'no-cache, no-transform',
    'content-type': 'text/event-stream',
    'x-accel-buffering': 'no',
  })
  response.write(': connected\n\n')
  sseClients.add(response)
  recordTransportEvent('sse_connected', { detail: 'Browser opened backend event stream.', sourceId, transport: 'backend' })
  writeSse(response, { session, sourceId: 'backend', type: 'session:snapshot', updatedAt: session?.updatedAt ?? null })

  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), SSE_HEARTBEAT_MS)

  request.on('close', () => {
    clearInterval(heartbeat)
    sseClients.delete(response)
    recordTransportEvent('sse_disconnected', { detail: 'Browser closed backend event stream.', sourceId, transport: 'backend' })
  })
}
