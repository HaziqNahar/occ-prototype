import { useCallback, useEffect, useRef, useState } from 'react'
import { applySessionCommand } from './session-commands/applySessionCommand'
import type { SessionSnapshotMessage, SessionUpdateMessage } from './session-commands/protocol'
import { applySessionDelta } from './session-commands/sessionDelta'
import { createSimPatch } from './session-commands/simPatch'
import type { SessionActor, SessionCommand, SessionCommandType, SimScenarioEvent } from './session-commands/types'
import { getOccBackendBaseUrl } from './backendClient'
import { createSessionClient, createSourceId } from './sessionClient'
import type { MonitorLaunchRequest, OccSessionClient, ScreenRegistration } from './sessionClient'
import { createInitialSession } from './sessionState'
import type { OccSessionState } from './types'

// React hook for one window's view of the training session. The server owns the
// session: this window sends commands and shows the server's state, with its own
// not-yet-confirmed commands applied on top so the screen responds at once.

export type CommandOutcome = {
  accepted: boolean
  reason: string | null
}

export type DispatchSessionCommand = (command: SessionCommand) => Promise<CommandOutcome>

// Runs train-simulation code against the current session and sends what moved.
export type SimulateSession = (
  updater: (current: OccSessionState) => OccSessionState,
  getEvents?: (current: OccSessionState) => SimScenarioEvent[],
) => void

type PendingCommand = {
  actor: SessionActor
  // Server version that includes this command; set when the server answers.
  ackVersion?: number
  command: SessionCommand
  id: string
  predicted: boolean
}

type ServerState = {
  session: OccSessionState
  sessionId: string | null
  version: number
}

// Random (fault location) or wholesale changes: wait for the server's result.
const UNPREDICTED_COMMANDS = new Set<SessionCommandType>(['LOAD_SCENARIO', 'RESET_SESSION'])

function createCommandId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// token: this browser's sign-in; without one (and with a backend) nothing is sent.
// sessionRef: the exercise to show, or null to follow the signed-in person.
export function useOccSession(
  getActor: () => SessionActor,
  token: string | null,
  onSignedOut?: () => void,
  sessionRef: string | null = null,
) {
  const [session, setSession] = useState<OccSessionState>(createInitialSession)
  // Until the server's first snapshot arrives the page shows a placeholder
  // session (its code is not the real one). Without a server it is the session.
  const [backendEnabled] = useState(() => getOccBackendBaseUrl() !== null)
  const [synced, setSynced] = useState(!backendEnabled)
  const [sourceId] = useState(createSourceId)
  const serverRef = useRef<ServerState>({ session, sessionId: null, version: 0 })
  const pendingRef = useRef<PendingCommand[]>([])
  const displayRef = useRef(session)
  const clientRef = useRef<OccSessionClient | null>(null)
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve())
  const getActorRef = useRef(getActor)
  const monitorLaunchSubscribersRef = useRef(new Set<(request: MonitorLaunchRequest) => void>())
  const onSignedOutRef = useRef(onSignedOut)

  useEffect(() => {
    onSignedOutRef.current = onSignedOut
  }, [onSignedOut])

  useEffect(() => {
    getActorRef.current = getActor
  }, [getActor])

  const render = useCallback(() => {
    const server = serverRef.current

    // Confirmed commands are already in the server state.
    pendingRef.current = pendingRef.current.filter((pending) => pending.ackVersion === undefined || pending.ackVersion > server.version)

    const display = pendingRef.current
      .filter((pending) => pending.predicted)
      .reduce((current, pending) => applySessionCommand(current, pending.command, { actor: pending.actor }).session, server.session)

    displayRef.current = display
    setSession(display)
  }, [])

  const applySnapshot = useCallback((message: SessionSnapshotMessage) => {
    const server = serverRef.current

    if (message.sessionId === server.sessionId && message.version < server.version) {
      return
    }

    if (message.sessionId !== server.sessionId) {
      pendingRef.current = []
    }

    serverRef.current = { session: message.session, sessionId: message.sessionId, version: message.version }
    setSynced(true)
    render()
  }, [render])

  const applyUpdate = useCallback((message: SessionUpdateMessage) => {
    const server = serverRef.current

    if (message.sessionId !== server.sessionId || message.baseVersion > server.version) {
      // Missed a change (or another session): fetch the whole session once.
      void clientRef.current?.fetchSnapshot().catch(() => undefined)
      return
    }

    if (message.version <= server.version) {
      return
    }

    serverRef.current = {
      session: applySessionDelta(server.session, message.delta),
      sessionId: server.sessionId,
      version: message.version,
    }
    render()
  }, [render])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    clientRef.current = createSessionClient({
      onMonitorLaunchRequest: (request) => {
        monitorLaunchSubscribersRef.current.forEach((subscriber) => subscriber(request))
      },
      onSignedOut: () => onSignedOutRef.current?.(),
      onSnapshot: applySnapshot,
      onUpdate: applyUpdate,
      sessionRef,
      sourceId,
      token,
    })

    return () => {
      clientRef.current?.close()
      clientRef.current = null
    }
  }, [applySnapshot, applyUpdate, sessionRef, sourceId, token])

  // Without a backend (or when it cannot be reached) commands apply in this window only.
  const applyLocally = useCallback((command: SessionCommand, actor: SessionActor): CommandOutcome => {
    const server = serverRef.current
    const result = applySessionCommand(server.session, command, { actor })

    serverRef.current = { ...server, session: result.session }
    render()

    return { accepted: result.accepted, reason: result.reason ?? null }
  }, [render])

  const dispatch = useCallback<DispatchSessionCommand>(async (command) => {
    const client = clientRef.current
    const actor = getActorRef.current()

    if (!backendEnabled) {
      return applyLocally(command, actor)
    }

    if (!client) {
      return { accepted: false, reason: 'Sign in first.' }
    }

    const pending: PendingCommand = {
      actor,
      command,
      id: createCommandId(),
      predicted: !UNPREDICTED_COMMANDS.has(command.type),
    }

    pendingRef.current = [...pendingRef.current, pending]

    if (pending.predicted) {
      render()
    }

    const removePending = () => {
      pendingRef.current = pendingRef.current.filter((item) => item !== pending)
    }

    // One at a time, so the server applies this window's commands in order
    // (a destination is declared before the departure that relies on it).
    const send = sendQueueRef.current.then(() => client.sendCommand({
      actor,
      command,
      commandId: pending.id,
      sessionId: serverRef.current.sessionId ?? undefined,
    }))

    sendQueueRef.current = send.then(() => undefined, () => undefined)

    try {
      const result = await send

      if (result.signedOut) {
        removePending()
        render()
        onSignedOutRef.current?.()

        return { accepted: false, reason: 'You have been signed out. Sign in again.' }
      }

      if (result.stale) {
        removePending()
        applySnapshot(result.snapshot)

        return { accepted: false, reason: result.snapshot.message }
      }

      const { response } = result

      if (response.update) {
        applyUpdate(response.update)
      }

      pending.ackVersion = response.sessionId === serverRef.current.sessionId ? response.version : 0
      render()

      return { accepted: response.accepted, reason: response.reason }
    } catch {
      removePending()

      const outcome = applyLocally(command, actor)

      return { ...outcome, reason: outcome.reason ?? 'Cannot reach the training server, so this was not saved. Check that the server window on the host PC is open, then try again.' }
    }
  }, [applyLocally, applySnapshot, applyUpdate, backendEnabled, render])

  // Only the session's clock owner runs the train simulation (phase 3).
  const isSimulationOwner = !backendEnabled || session.sessionMeta.simulationOwner?.sourceId === sourceId

  const simulate = useCallback<SimulateSession>((updater, getEvents) => {
    if (backendEnabled && serverRef.current.session.sessionMeta.simulationOwner?.sourceId !== sourceId) {
      return
    }

    const current = displayRef.current
    const next = updater(current)

    if (next === current) {
      return
    }

    const patch = createSimPatch(current, next)
    const events = getEvents?.(current) ?? []

    if (!patch && events.length === 0) {
      return
    }

    void dispatch({ ...(events.length > 0 ? { events } : {}), patch: patch ?? {}, type: 'SIM_UPDATE' })
  }, [backendEnabled, dispatch, sourceId])

  const claimSimulation = useCallback(async (label: string, takeover = false) => (
    await clientRef.current?.claimSimulation(label, takeover).catch(() => false) ?? false
  ), [])

  const requestMonitorPeerLaunch = useCallback(() => (
    clientRef.current?.requestMonitorPeerLaunch(serverRef.current.sessionId ?? undefined) ?? ''
  ), [])

  const registerScreen = useCallback((screen: ScreenRegistration) => {
    clientRef.current?.registerScreen(screen)
  }, [])

  const subscribeMonitorLaunch = useCallback((subscriber: (request: MonitorLaunchRequest) => void) => {
    monitorLaunchSubscribersRef.current.add(subscriber)

    return () => {
      monitorLaunchSubscribersRef.current.delete(subscriber)
    }
  }, [])

  return {
    claimSimulation,
    dispatch,
    isSimulationOwner,
    synced,
    registerScreen,
    requestMonitorPeerLaunch,
    session,
    simulate,
    subscribeMonitorLaunch,
  }
}
