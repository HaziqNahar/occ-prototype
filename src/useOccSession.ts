import { useCallback, useEffect, useRef, useState } from 'react'
import type { NelTimetableName } from './data/nelTimetable'
import {
  applyOccSessionUpdate,
  createInitialSession,
  createResetSessionState,
  normalizeClientSession,
  normalizeTimetableRows,
  restoreSession,
  shouldAcceptRemoteSession,
} from './sessionState'
import { createOccSessionTransport, OCC_SESSION_KEY } from './sessionTransport'
import type { MonitorLaunchRequest, ScreenRegistration } from './sessionTransport'
import type { OccSessionState, TrainingMode } from './types'

// React hook that keeps one OCC session in sync between this browser window,
// other windows and the backend.

const LEGACY_OCC_SESSION_KEYS = [
  'sbs-occ-training-session-v1',
  'sbs-occ-training-session-v2',
  'sbs-occ-training-session-v3',
  'sbs-occ-training-session-v4',
] as const

export function clearStoredOccSessions(includeCurrent = false) {
  try {
    const keys = includeCurrent
      ? [...LEGACY_OCC_SESSION_KEYS, OCC_SESSION_KEY]
      : [...LEGACY_OCC_SESSION_KEYS]

    keys.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Storage is a fallback transport; reset still works through in-memory state.
  }
}

function readStoredSession(): OccSessionState {
  try {
    clearStoredOccSessions()

    const stored = window.localStorage.getItem(OCC_SESSION_KEY)

    return stored ? restoreSession(JSON.parse(stored) as Partial<OccSessionState>) : createInitialSession()
  } catch {
    return createInitialSession()
  }
}

export function useOccSession() {
  const [session, setSession] = useState<OccSessionState>(readStoredSession)
  const monitorLaunchSubscribersRef = useRef(new Set<(request: MonitorLaunchRequest) => void>())
  const sessionRef = useRef(session)
  const transportRef = useRef<ReturnType<typeof createOccSessionTransport> | null>(null)

  useEffect(() => {
    setSession((current) => {
      const normalizedRows = normalizeTimetableRows(current.timetableRows, current.timetableName)

      if (normalizedRows.length === current.timetableRows.length) {
        return current
      }

      const next = {
        ...current,
        timetableRows: normalizedRows,
        updatedAt: Date.now(),
      }

      transportRef.current?.publish(next)
      return next
    })
  }, [session.timetableRows.length])

  useEffect(() => {
    sessionRef.current = session

    try {
      window.localStorage.setItem(OCC_SESSION_KEY, JSON.stringify(session))
    } catch {
      // Storage is a fallback transport; the SharedWorker/BroadcastChannel bus can still run.
    }
  }, [session])

  useEffect(() => {
    transportRef.current = createOccSessionTransport({
      initialSession: sessionRef.current,
      onMonitorLaunchRequest: (request) => {
        monitorLaunchSubscribersRef.current.forEach((subscriber) => subscriber(request))
      },
      onSession: (nextSession) => {
        setSession((currentSession) => {
          const normalizedSession = normalizeClientSession(nextSession)

          if (!shouldAcceptRemoteSession(currentSession, normalizedSession)) {
            return currentSession
          }

          return normalizedSession
        })
      },
    })

    return () => {
      transportRef.current?.close()
      transportRef.current = null
    }
  }, [])

  const requestMonitorPeerLaunch = useCallback(() => (
    transportRef.current?.requestMonitorPeerLaunch() ?? ''
  ), [])

  const registerScreen = useCallback((screen: ScreenRegistration) => {
    transportRef.current?.registerScreen(screen, sessionRef.current)
  }, [])

  const subscribeMonitorLaunch = useCallback((subscriber: (request: MonitorLaunchRequest) => void) => {
    monitorLaunchSubscribersRef.current.add(subscriber)

    return () => {
      monitorLaunchSubscribersRef.current.delete(subscriber)
    }
  }, [])

  const updateSession = useCallback((updater: (current: OccSessionState) => OccSessionState) => {
    setSession((current) => {
      const next = applyOccSessionUpdate(current, updater)

      if (next === current) {
        return current
      }

      transportRef.current?.publish(next)

      return next
    })
  }, [])

  const resetSession = useCallback((
    trainingMode: TrainingMode = 'PRACTICE',
    timetableName: NelTimetableName = sessionRef.current.timetableName,
  ) => {
    clearStoredOccSessions(true)
    const next = createResetSessionState(
      trainingMode,
      Date.now(),
      (sessionRef.current.scenarioRevision ?? 0) + 1,
      timetableName,
    )

    sessionRef.current = next
    transportRef.current?.reset(next)
    setSession(next)
  }, [])

  return { registerScreen, requestMonitorPeerLaunch, resetSession, session, subscribeMonitorLaunch, updateSession }
}
