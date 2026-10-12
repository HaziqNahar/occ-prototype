import { getAuthHeaders } from './authClient'
import type { SessionMonitorLaunch, SessionScreenJoin, SessionTransportEvent } from './types'

const OCC_BACKEND_PORT = '8787'

export type ArchivedReportResponse = {
  ok: boolean
  report: {
    id: string
    notes: string
    summary: {
      [key: string]: unknown
      averageResponseSeconds?: number
      generatedAt: string
      lateTasks?: number
      onTimeTasks?: number
      rejectedActions?: number
      result: string
      score: number
      sessionCode?: string
    }
  }
}

export type MonitorLaunchResponse = {
  ok: boolean
  request: SessionMonitorLaunch
}

export type OccTransportStatusResponse = {
  clients: number
  connectedChannelScreens: number
  connectedSseScreens: number
  connectedWorkerScreens: number
  events: SessionTransportEvent[]
  lastMonitorLaunch: SessionMonitorLaunch | null
  screens: SessionScreenJoin[]
  sessionCode: string | null
  updatedAt: number | null
}

export function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getOccBackendBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_OCC_API_BASE

  if (typeof configuredBaseUrl === 'string') {
    const trimmed = configuredBaseUrl.trim()

    if (!trimmed || trimmed === 'disabled') {
      return null
    }

    if (trimmed === 'same-origin') {
      return ''
    }

    return stripTrailingSlash(trimmed)
  }

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    const host = window.location.hostname || '127.0.0.1'
    return `${window.location.protocol}//${host}:${OCC_BACKEND_PORT}`
  }

  return `http://127.0.0.1:${OCC_BACKEND_PORT}`
}

export function buildOccApiUrl(baseUrl: string, path: string) {
  return baseUrl ? `${baseUrl}${path}` : path
}

// Saves trainer notes with the current run's report. The server builds and
// scores the report itself; a browser cannot change the score.
export async function archiveOccReport(sessionId: string, notes: string) {
  const backendBaseUrl = getOccBackendBaseUrl()

  if (backendBaseUrl === null) {
    throw new Error('Backend API is disabled.')
  }

  const response = await fetch(buildOccApiUrl(backendBaseUrl, '/api/reports'), {
    body: JSON.stringify({ notes, sessionId }),
    headers: {
      ...getAuthHeaders(),
      'content-type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Backend report archive failed (${response.status}).`)
  }

  return await response.json() as ArchivedReportResponse
}

// Promotes the Monitor 02 launch command into a backend event. SSE subscribers
// receive the same launch request even if SharedWorker is unavailable.
export async function requestOccMonitorLaunch(request: SessionMonitorLaunch) {
  const backendBaseUrl = getOccBackendBaseUrl()

  if (backendBaseUrl === null) {
    throw new Error('Backend API is disabled.')
  }

  const response = await fetch(buildOccApiUrl(backendBaseUrl, '/api/session/monitor-launches'), {
    body: JSON.stringify(request),
    headers: {
      ...getAuthHeaders(),
      'content-type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Backend monitor launch failed (${response.status}).`)
  }

  return await response.json() as MonitorLaunchResponse
}

// Pulls the backend's transport diagnostics snapshot for IOS/report tooling.
export async function fetchOccTransportStatus() {
  const backendBaseUrl = getOccBackendBaseUrl()

  if (backendBaseUrl === null) {
    throw new Error('Backend API is disabled.')
  }

  const response = await fetch(buildOccApiUrl(backendBaseUrl, '/api/session/transport-status'), {
    headers: {
      ...getAuthHeaders(),
      accept: 'application/json',
    },
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Backend transport status failed (${response.status}).`)
  }

  return await response.json() as OccTransportStatusResponse
}
