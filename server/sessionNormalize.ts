import { createSessionCode, isSessionCode } from '../src/sessionCode'
import { createSessionMeta, inferTrain317DoorFailureState } from '../src/sessionState'
import { LINE_MAP_LAYOUT_VERSION } from '../src/screens/line-map/lineMapRuntimeState'
import { normalizeAssessmentMetrics } from './legacyAssessment'
import type { LineMapRuntimeState, OccSessionMeta, OccSessionState, SessionLifecycle } from '../src/types'

// Shapes browser-published sessions before the backend stores them. Phase 2
// replaces snapshot publishing with server-applied actions.

function normalizeSessionCode(code: unknown) {
  return isSessionCode(code) ? code : createSessionCode()
}

export function normalizeSessionMeta(session: Partial<OccSessionState> | null | undefined, lifecycle?: SessionLifecycle): OccSessionMeta {
  const existingMeta: Partial<OccSessionMeta> = session?.sessionMeta ?? {}
  const fallbackLifecycle = lifecycle ?? existingMeta.lifecycle ?? 'CREATED'

  return {
    ...createSessionMeta(fallbackLifecycle),
    ...existingMeta,
    code: normalizeSessionCode(existingMeta.code),
    lifecycle: fallbackLifecycle,
    screens: existingMeta.screens ?? {},
  }
}

function mergeSessionMeta(existingMeta: OccSessionMeta | undefined, incomingMeta: OccSessionMeta): OccSessionMeta {
  return {
    ...createSessionMeta(incomingMeta.lifecycle ?? existingMeta?.lifecycle ?? 'CREATED'),
    ...existingMeta,
    ...incomingMeta,
    // The backend's code stands until a reset (which does not merge), so a freshly
    // opened page with its own generated code cannot change it.
    code: isSessionCode(existingMeta?.code) ? existingMeta.code : normalizeSessionCode(incomingMeta.code),
    screens: { ...(existingMeta?.screens ?? {}), ...(incomingMeta.screens ?? {}) },
  }
}

export function normalizeLineMap(lineMap: Partial<LineMapRuntimeState> | undefined): LineMapRuntimeState {
  return {
    ...(lineMap ?? {}),
    layoutVersion: LINE_MAP_LAYOUT_VERSION,
    platformDoorStates: lineMap?.platformDoorStates ?? {},
    routeSegments: lineMap?.routeSegments ?? {},
  }
}

// The minimum a published session needs before the backend will store and score it.
export function isSessionCandidate(value: unknown): value is OccSessionState {
  const session = value as Partial<OccSessionState> | null

  return Boolean(
    session
      && typeof session === 'object'
      && !Array.isArray(session)
      && typeof session.updatedAt === 'number'
      && session.activeScenario
      && session.scenarioTasks
      && Array.isArray(session.trains)
      && Array.isArray(session.timetableRows),
  )
}

export function normalizeSession(session: OccSessionState, existingSession: OccSessionState | null = null): OccSessionState {
  const incomingLifecycle: SessionLifecycle | undefined = session.scenarioMode === 'COMPLETE'
    ? 'COMPLETE'
    : session.scenarioMode === 'RUNNING'
      ? 'RUNNING'
      : session.sessionMeta?.lifecycle

  return {
    ...session,
    assessmentMetrics: normalizeAssessmentMetrics(session, {
      ...(existingSession?.assessmentMetrics ?? {}),
      ...(session.assessmentMetrics ?? {}),
      tasks: {
        ...(existingSession?.assessmentMetrics?.tasks ?? {}),
        ...(session.assessmentMetrics?.tasks ?? {}),
      },
    }),
    lineMap: normalizeLineMap(session.lineMap),
    scenarioRevision: Number(session.scenarioRevision ?? existingSession?.scenarioRevision ?? 0),
    sessionMeta: mergeSessionMeta(existingSession?.sessionMeta, normalizeSessionMeta(session, incomingLifecycle)),
    trains: inferTrain317DoorFailureState(session, Array.isArray(session.trains) ? session.trains : []),
  }
}
