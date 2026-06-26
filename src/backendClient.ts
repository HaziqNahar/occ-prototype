import type { OccSessionState, SessionMonitorLaunch, SessionScreenJoin, SessionTransportEvent } from './types'

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

export type OccSessionActionType =
  | 'ACK_ALARM'
  | 'COMPLETE_SCENARIO'
  | 'DISPATCH_TRAIN'
  | 'SELECT_TRAIN'
  | 'SET_ROUTE'

export type OccSessionAction = {
  detail?: string
  source: string
  trainId?: string
  type: OccSessionActionType
}

export type OccSessionActionResponse = {
  accepted: boolean
  action: OccSessionActionType
  ok: boolean
  reason: string | null
  session: OccSessionState
}

export type MonitorLaunchResponse = {
  ok: boolean
  request: SessionMonitorLaunch
  session: OccSessionState | null
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

// Archives the current scored session into the local backend report log.
export async function archiveOccReport(
  session: OccSessionState,
  notes: string,
  summary?: Record<string, unknown>,
) {
  const backendBaseUrl = getOccBackendBaseUrl()

  if (backendBaseUrl === null) {
    throw new Error('Backend API is disabled.')
  }

  const response = await fetch(buildOccApiUrl(backendBaseUrl, '/api/reports'), {
    body: JSON.stringify({ notes, session, summary }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Backend report archive failed (${response.status}).`)
  }

  return await response.json() as ArchivedReportResponse
}

// Sends one scored operator action to the backend validator. The returned
// session is already mutated, scored, and ready to broadcast/render.
export async function submitOccSessionAction(session: OccSessionState, action: OccSessionAction) {
  const backendBaseUrl = getOccBackendBaseUrl()

  if (backendBaseUrl === null) {
    throw new Error('Backend API is disabled.')
  }

  const response = await fetch(buildOccApiUrl(backendBaseUrl, '/api/session/actions'), {
    body: JSON.stringify({ action, session }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Backend action failed (${response.status}).`)
  }

  return await response.json() as OccSessionActionResponse
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
      accept: 'application/json',
    },
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Backend transport status failed (${response.status}).`)
  }

  return await response.json() as OccTransportStatusResponse
}
