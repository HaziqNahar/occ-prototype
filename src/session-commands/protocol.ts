import type { OccSessionState } from '../types'
import type { SessionDelta } from './sessionDelta'
import type { SessionActor, SessionCommand } from './types'

// Messages between browsers and the server (POST /api/session/commands and the
// /api/session/events stream). Each change bumps the session's version by one.

export type SessionSnapshotMessage = {
  session: OccSessionState
  sessionId: string
  type: 'session:snapshot'
  version: number
}

export type SessionUpdateMessage = {
  baseVersion: number
  commandId?: string
  delta: SessionDelta
  sessionId: string
  sourceId?: string
  type: 'session:update'
  version: number
}

export type SessionCommandRequest = {
  actor: SessionActor
  command: SessionCommand
  commandId: string
  sessionId?: string
  sourceId: string
}

export type SessionCommandResponse = {
  accepted: boolean
  ok: true
  reason: string | null
  sessionId: string
  // The change this command made, also sent to every screen of the session.
  update: SessionUpdateMessage | null
  version: number
}

// 409: the named session ended (it was reset). Carries the current session.
export type StaleSessionResponse = SessionSnapshotMessage & {
  error: 'stale_session'
  message: string
}
