import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import './App.css'
import controlTabIcon from './assets/control-tab-icon.png'
import { getCommsLog } from './comms/commsCatalog'
import type { CommsChannel } from './comms/commsCatalog'
import MonitorWorkspace from './components/MonitorWorkspace'
import { LINE_MAP_PAN_EVENT } from './components/coachTargets'
import { getStationPanelTrain } from './screens/line-map/stationTrains'
import type { LineMapPanRequest } from './components/coachTargets'
import { OperatorNameContext } from './components/operatorName'
import SignalRouteDefinitionWindow from './components/route-definition/SignalRouteDefinitionWindow'
import CommsDialog from './components/CommsDialog'
import ChangeEndsDialog from './components/train-control/ChangeEndsDialog'
import { SignalContextMenu, TrainAuxiliaryPanel, TrainContextMenu } from './components/train-control/LineMapContextMenus'
import PtiInitialisationDialog from './components/train-control/PtiInitialisationDialog'
import ScadaCommandDialog from './components/train-control/ScadaCommandDialog'
import SkipStopDialog from './components/train-control/SkipStopDialog'
import {
  InspectorCommandRow,
  InspectorCommandSection,
  InspectorInfoRow,
  ScadaDropdown,
  TrainInspectorScrollbar,
} from './components/train-control/TrainInspectorControls'
import TrainHoldDialog from './components/train-control/TrainHoldDialog'
import TrainTimeDialog from './components/train-control/TrainTimeDialog'
import {
  getTrainMarkerDirectionForTimeSelection,
  getTrainServiceDirectionLabel,
} from './components/train-control/trainTimeOptions'
import type { TrainTimeSelection } from './components/train-control/trainTimeOptions'
import type { InspectorPage, TrainAuxiliaryView, TrainDepartureCommandResult } from './components/train-control/trainControlTypes'
import {
  getAllowedTrainDoorCommands,
  getTrainDoorCommandFromRequest,
  getTrainDoorCommandRejectionMessage,
  getTrainDoorCommandStatusMessage,
  getTrainDoorCommandValue,
  getTrainDoorFailureState,
  getTrainDoorFaultDisplayValue,
  getTrainDoorIsolationStatus,
  getTrainDoorSummaryStatus,
  getTrainReadinessModeFromCommand,
} from './components/train-control/trainCommandState'
import type { TrainDoorCommand } from './components/train-control/trainCommandState'
import usePopupDrag from './components/train-control/usePopupDrag'
import Win98HtmlButton from './components/train-control/Win98HtmlButton'
import {
  DEFAULT_LINE_MAP_PAN,
  LINE_VIEWPORT_PANS,
  MAP_PAN_MAX,
  MAP_PAN_STEP,
  MONITOR_WIDTH,
  getTrainItamaStatusValue,
  getTrainReadinessDisplayValue,
  getTrainReadinessMode,
  platformData,
} from './screens/line-map/model'
import type { LineMapSignalData } from './screens/line-map/model'
import {
  getSignalRouteCommandLabels,
  getSignalRouteFleetControlDisabledLabels,
  getSignalRouteSetLabels,
} from './screens/line-map/signalRouteState'
import {
  normalizeLineMapRuntimeState,
} from './screens/line-map/lineMapRuntimeState'
import {
  createRouteAutomationSummary,
  createTrainOccupancyRouteSegmentStates,
  getSignalEquipmentLabel,
  getSignalRouteLabels,
} from './screens/line-map/lineMapRouteState'
import {
  MANUAL_TRAIN_ROUTE_STEP_DURATION_MS,
  TRAIN_ROUTE_RENDER_STEPS,
} from './screens/line-map/trainMovementRoutes'
import {
  applyManualTrainRouteStepState,
  clearManualTrainRouteSegmentOverrides,
  createManualTrainRoutePlan,
} from './screens/line-map/trainMovementState'
import type { AllowedTrainMovementAuthority } from './screens/line-map/trainMovementState'
import {
  createSignalRouteSetOverrideSegments,
  createSignalRouteUnsetOverrideSegments,
  getSignalRouteTargetTrainForSession,
  hasSignalRouteCommand,
} from './screens/line-map/signalRouteCommands'
import {
  getTrainRouteStepFromTrainOccupancyOrLineMap,
} from './screens/line-map/trainRoutePlaybackState'
import { warnLineMapRouteValidationIssues } from './screens/line-map/routeValidation'
import { clearTimetableGuideRouteState } from './screens/line-map/timetableRouteStateCleanup'
import {
  RT1_LAUNCH_ROUTE_LABEL,
} from './screens/line-map/timetableLaunchHandoff'
import {
  createTimetableRouteDiagnostics,
  createTimetableRouteDiagnosticsSummary,
} from './screens/line-map/timetableDiagnostics'
import LineMapMonitorDom from './screens/line-map/LineMapDom'
import useLineMapRunOverrides from './screens/line-map/useLineMapRunOverrides'
import useManualTrainRoutePlayback from './screens/line-map/useManualTrainRoutePlayback'
import useTimetablePlaybackScheduler from './screens/line-map/useTimetablePlaybackScheduler'
import AlarmsScreen from './screens/AlarmsScreen'
import TimetableScreen from './screens/TimetableScreen'
import { isManualDestinationSelection, isRt2DepotDestinationSelection } from './session-commands/lineMapCommands'
import type { PublicUser } from './accounts'
import type { SessionActor } from './session-commands/types'
import type { MonitorLaunchRequest, ScreenRegistration } from './sessionClient'
import {
  getAlarmBannerRows,
  getAlarmSummaryCounts,
  getTimetablePlaybackTrainIdSet,
} from './sessionState'
import { useOccSession } from './useOccSession'
import type { DispatchSessionCommand, SimulateSession } from './useOccSession'
import { getTimetableClockNow } from './timetableClockState'
import {
  getTrainingScenarioDefinition,
  isActiveTrainingScenarioTargetTrain,
} from './trainingScenarios'
import LoginPage, { AccessNotice } from './screens/LoginPage'
import SignInPage from './screens/SignInPage'
import TrainingCoach from './components/TrainingCoach'
import { useCommandFeedback } from './components/useCommandFeedback'
import type { TrainingAid } from './trainingAids'
import { exerciseApi } from './exerciseClient'
import { useAuth } from './useAuth'
import type {
  AppRoute,
  LineMapRuntimeState,
  OccSessionState,
  RouteControlMode,
  TrainCommand,
  TrainReadinessMode,
  TrainState,
} from './types'

const IosModulesScreen = lazy(() => import('./screens/IosModulesScreen'))
const ReportScreen = lazy(() => import('./screens/ReportScreen'))
const TraineeScreen = lazy(() => import('./screens/TraineeScreen'))
const PeopleScreen = lazy(() => import('./screens/PeopleScreen'))
const HistoryScreen = lazy(() => import('./screens/HistoryScreen'))
const ProgressScreen = lazy(() => import('./screens/ProgressScreen'))

if (import.meta.env.DEV) {
  warnLineMapRouteValidationIssues()
}

function isRt1LaunchToSkgAuthority(authority: AllowedTrainMovementAuthority) {
  return authority.service === 'NB' && authority.routeLabels.includes(RT1_LAUNCH_ROUTE_LABEL)
}

function isActiveScenarioTargetTrain(session: OccSessionState, trainId: string) {
  return isActiveTrainingScenarioTargetTrain(session, trainId)
}

function toManualArrivalDestination(selection: TrainTimeSelection | undefined) {
  if (!selection || !isManualDestinationSelection(selection)) {
    return undefined
  }

  return {
    ...selection,
    kind: 'arrival' as const,
  }
}

type SignalMenuState = {
  signal: LineMapSignalData
  x: number
  y: number
}

function clampPan(value: number) {
  return Math.min(MAP_PAN_MAX, Math.max(0, value))
}

function snapLineMapPan(value: number) {
  const clamped = clampPan(value)

  return LINE_VIEWPORT_PANS.reduce((closest, pan) => (
    Math.abs(pan - clamped) < Math.abs(closest - clamped) ? pan : closest
  ), LINE_VIEWPORT_PANS[0])
}

// The section view (as the pan arrows give) that shows world x nearest the middle.
function lineMapPanShowing(x: number) {
  const distance = (pan: number) => Math.abs(x - (clampPan(pan) + MONITOR_WIDTH / 2))

  return clampPan(LINE_VIEWPORT_PANS.reduce((best, pan) => (distance(pan) < distance(best) ? pan : best), LINE_VIEWPORT_PANS[0]))
}

type TrainItamaDisplayStatus = ReturnType<typeof getTrainItamaStatusValue>

function getCurrentRoute(): AppRoute {
  const path = window.location.pathname as AppRoute
  if (
    path === '/login' ||
    path === '/screen/alarms' ||
    path === '/screen/line-map' ||
    path === '/screen/timetable' ||
    path === '/ios' ||
    path === '/ios/modules' ||
    path === '/ios/scenarios' ||
    path === '/ios/assessment' ||
    path === '/session/join' ||
    path === '/report' ||
    path === '/admin' ||
    path === '/history' ||
    path === '/progress'
  ) {
    return path
  }

  return '/'
}

// Routes that should register as active backend participants in the OCC training session.
const screenRegistrationByRoute: Partial<Record<AppRoute, ScreenRegistration>> = {
  '/ios/modules': { label: 'Trainer Console', role: 'IOS', route: '/ios/modules' },
  '/report': { label: 'Post-Session Report', role: 'REPORT', route: '/report' },
  '/screen/alarms': { label: 'Monitor 01 - Alarms', role: 'ALARM', route: '/screen/alarms' },
  '/screen/line-map': { label: 'Monitor 02 - Line Map', role: 'LINE_MAP', route: '/screen/line-map', wantsSimulation: true },
  '/screen/timetable': { label: 'Monitor 03 - Timetable', role: 'TIMETABLE', route: '/screen/timetable' },
  '/session/join': { label: 'Trainee', role: 'LOBBY', route: '/session/join' },
}

const TRAINER_ROUTES = new Set<AppRoute>(['/ios', '/ios/modules', '/ios/scenarios', '/ios/assessment', '/report', '/admin'])
// The console follows each exercise itself; the page-wide session connection is not used there.
const CONSOLE_ROUTES = new Set<AppRoute>(['/ios', '/ios/modules', '/ios/scenarios', '/ios/assessment'])

// ?session=<code or id>: the exercise a monitor or report shows. Without it a page
// shows the signed-in trainee's own exercise, otherwise Exercise 1.
function getRequestedSession() {
  return new URLSearchParams(window.location.search).get('session')
}

// Without a backend there are no accounts: the page's role comes from its address.
const LOCAL_TRAINEE: PublicUser = { admin: false, createdAt: '', disabled: false, id: 'local-trainee', name: 'Trainee', role: 'trainee' }

function getLocalActor(route: AppRoute): SessionActor {
  return TRAINER_ROUTES.has(route) ? { name: 'Trainer', role: 'trainer' } : LOCAL_TRAINEE
}

function App() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
  const [sessionRef, setSessionRef] = useState(getRequestedSession)
  const auth = useAuth()
  const user = auth.state.status === 'signed-in' ? auth.state.user : null
  const token = auth.state.status === 'signed-in' ? auth.state.token : null
  const getActor = useCallback((): SessionActor => (
    user ? { id: user.id, name: user.name, role: user.role } : getLocalActor(route)
  ), [route, user])
  const {
    claimSimulation,
    dispatch,
    isSimulationOwner,
    registerScreen,
    requestMonitorPeerLaunch,
    session,
    simulate,
    subscribeMonitorLaunch,
  } = useOccSession(getActor, CONSOLE_ROUTES.has(route) ? null : token, auth.handleSignedOut, sessionRef)
  // The trainee monitors send through this, so the Practice coach can say why an action was refused.
  const { clearFeedback, dispatch: monitorDispatch, feedback } = useCommandFeedback(dispatch)
  // Counted for the run report; sent past the feedback wrapper as it is not a trainee action.
  const recordAidUse = useCallback((aid: TrainingAid) => void dispatch({ aid, type: 'USE_TRAINING_AID' }), [dispatch])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute())
      setSessionRef(getRequestedSession())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const registration = screenRegistrationByRoute[route]

    if (!registration) {
      return undefined
    }

    registerScreen(registration)

    const heartbeat = window.setInterval(() => registerScreen(registration), 15000)

    return () => window.clearInterval(heartbeat)
  }, [registerScreen, route, token])

  const navigate = (nextRoute: AppRoute, search = '') => {
    window.history.pushState(null, '', `${nextRoute}${search}`)
    setRoute(nextRoute)
    setSessionRef(getRequestedSession())
  }

  const signOut = () => {
    void auth.signOut()
    navigate('/')
  }

  if (auth.state.status === 'loading') {
    return null
  }

  // Every page needs a signed-in account when there is a training server.
  if (auth.state.status !== 'local' && !user) {
    return (
      <SignInPage
        message={auth.state.status === 'signed-out' ? auth.state.message : undefined}
        needsSetup={auth.state.status === 'needs-setup'}
        onRetry={auth.reload}
        onSetup={auth.setup}
        onSignIn={auth.signIn}
        onSignedIn={(signedIn) => {
          if (route === '/') {
            navigate(signedIn.role === 'trainer' ? '/ios/modules' : '/session/join')
          }
        }}
        unreachable={auth.state.status === 'unreachable'}
      />
    )
  }

  if (user && TRAINER_ROUTES.has(route) && user.role !== 'trainer') {
    return <AccessNotice onNavigate={navigate} onSignOut={signOut} text="The Trainer Console, reports and people are for trainers." user={user} />
  }

  if (route === '/admin') {
    return user?.admin
      ? <Suspense fallback={null}><PeopleScreen onNavigate={navigate} onSignOut={signOut} user={user} /></Suspense>
      : user
        ? <AccessNotice onNavigate={navigate} onSignOut={signOut} text="Only an admin trainer can manage people." user={user} />
        : <LoginPage onNavigate={navigate} onSignOut={signOut} user={null} />
  }

  // History and progress need accounts; trainees see only their own (the server enforces it).
  if (route === '/history' || route === '/progress') {
    if (!user) {
      return <LoginPage onNavigate={navigate} onSignOut={signOut} user={null} />
    }

    return (
      <Suspense fallback={null}>
        {route === '/history'
          ? <HistoryScreen onNavigate={navigate} onSignOut={signOut} user={user} />
          : <ProgressScreen onNavigate={navigate} onSignOut={signOut} user={user} />}
      </Suspense>
    )
  }

  if (route === '/session/join' && user?.role === 'trainer') {
    return <AccessNotice onNavigate={navigate} onSignOut={signOut} text="Trainees join here with their own account. Sign out, then sign in as the trainee." user={user} />
  }

  if (route === '/screen/line-map') {
    return (
      <OperatorNameContext.Provider value={user?.id ?? ''}>
        <LineMapScreen
          onNavigate={navigate}
          requestMonitorPeerLaunch={requestMonitorPeerLaunch}
          claimSimulation={claimSimulation}
          dispatch={monitorDispatch}
          isSimulationOwner={isSimulationOwner}
          session={session}
          simulate={simulate}
          subscribeMonitorLaunch={subscribeMonitorLaunch}
        />
        <TrainingCoach feedback={feedback} monitor="LINE_MAP" onAidUsed={recordAidUse} onDismissFeedback={clearFeedback} session={session} />
      </OperatorNameContext.Provider>
    )
  }

  if (route === '/screen/alarms') {
    return (
      <OperatorNameContext.Provider value={user?.id ?? ''}>
        <AlarmsScreen dispatch={monitorDispatch} onNavigate={navigate} session={session} />
        <TrainingCoach feedback={feedback} monitor="ALARMS" onAidUsed={recordAidUse} onDismissFeedback={clearFeedback} session={session} />
      </OperatorNameContext.Provider>
    )
  }

  if (route === '/screen/timetable') {
    return (
      <OperatorNameContext.Provider value={user?.id ?? ''}>
        <TimetableScreen dispatch={monitorDispatch} onNavigate={navigate} session={session} />
        <TrainingCoach feedback={feedback} monitor="TIMETABLE" onAidUsed={recordAidUse} onDismissFeedback={clearFeedback} session={session} />
      </OperatorNameContext.Provider>
    )
  }

  // The Trainer Console replaced the IOS window, Scenario setup and the rubric page;
  // their old addresses open the console so bookmarks keep working.
  if (route === '/ios' || route === '/ios/modules' || route === '/ios/scenarios' || route === '/ios/assessment') {
    return (
      <Suspense fallback={null}>
        <IosModulesScreen
          getActor={getActor}
          onNavigate={navigate}
          onSignOut={signOut}
          onSignedOut={auth.handleSignedOut}
          token={token}
          user={user}
        />
      </Suspense>
    )
  }

  if (route === '/session/join') {
    return (
      <Suspense fallback={null}>
        <TraineeScreen
          dispatch={dispatch}
          offline={!user}
          onJoin={user ? exerciseApi.join : undefined}
          onNavigate={navigate}
          onSignOut={signOut}
          session={session}
          user={user ?? LOCAL_TRAINEE}
        />
      </Suspense>
    )
  }

  if (route === '/report') {
    return (
      <Suspense fallback={null}>
        <ReportScreen onNavigate={navigate} onSignOut={signOut} session={session} user={user} />
      </Suspense>
    )
  }

  return <LoginPage onNavigate={navigate} onSignOut={signOut} user={user} />
}

function LineMapScreen({
  claimSimulation,
  dispatch,
  isSimulationOwner,
  onNavigate,
  requestMonitorPeerLaunch,
  session,
  simulate,
  subscribeMonitorLaunch,
}: {
  claimSimulation: (label: string, takeover?: boolean) => Promise<boolean>
  dispatch: DispatchSessionCommand
  isSimulationOwner: boolean
  onNavigate: (route: AppRoute) => void
  requestMonitorPeerLaunch: () => string
  session: OccSessionState
  simulate: SimulateSession
  subscribeMonitorLaunch: (subscriber: (request: MonitorLaunchRequest) => void) => () => void
}) {
  const [monitorLaunchStatus, setMonitorLaunchStatus] = useState('Peer monitors ready')
  const simulationOwner = session.sessionMeta.simulationOwner

  // One Line Map per session runs the trains; a free clock is taken at once.
  useEffect(() => {
    if (!simulationOwner) {
      void claimSimulation('Monitor 02 - Line Map')
    }
  }, [claimSimulation, simulationOwner])
  const handledLaunchIdsRef = useRef(new Set<string>())
  const requestedLaunchRef = useRef(false)

  // Monitor 02 is the operator's main control screen, so it can launch the
  // peer monitor layout.
  const openPeerMonitorWindows = useCallback((targets: MonitorLaunchRequest['targets']) => {
    const monitorConfig: Record<MonitorLaunchRequest['targets'][number], { left: number; name: string; top: number }> = {
      '/screen/alarms': { left: 0, name: 'occ-monitor-1-alarms', top: 0 },
      '/screen/timetable': { left: 180, name: 'occ-monitor-3-timetable', top: 90 },
    }
    const blockedTargets: string[] = []

    targets.forEach((target) => {
      const config = monitorConfig[target]
      const openedWindow = window.open(
        target,
        config.name,
      )

      if (!openedWindow) {
        blockedTargets.push(target)
        return
      }

      openedWindow.focus()
    })

    if (blockedTargets.length) {
      setMonitorLaunchStatus('Tabs/Pop-ups blocked: use button')
      return
    }

    setMonitorLaunchStatus('Alarms + Timetable opened')
  }, [])

  const launchPeerMonitors = useCallback(() => {
    const launchId = requestMonitorPeerLaunch()

    if (launchId) {
      handledLaunchIdsRef.current.add(launchId)
    }

    openPeerMonitorWindows(['/screen/alarms', '/screen/timetable'])
  }, [openPeerMonitorWindows, requestMonitorPeerLaunch])

  useEffect(() => subscribeMonitorLaunch((request) => {
    if (request.originRoute !== '/screen/line-map' || handledLaunchIdsRef.current.has(request.launchId)) {
      return
    }

    handledLaunchIdsRef.current.add(request.launchId)
    openPeerMonitorWindows(request.targets)
  }), [openPeerMonitorWindows, subscribeMonitorLaunch])

  useEffect(() => {
    if (requestedLaunchRef.current) {
      return undefined
    }

    requestedLaunchRef.current = true
    let attempts = 0
    let retryTimer: number | undefined

    const requestLaunch = () => {
      attempts += 1
      const launchId = requestMonitorPeerLaunch()

      if (!launchId && attempts < 10) {
        retryTimer = window.setTimeout(requestLaunch, 120)
      }
    }

    retryTimer = window.setTimeout(requestLaunch, 0)

    return () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [requestMonitorPeerLaunch])

  return (
    <MonitorWorkspace
      extraActions={(
        <>
          <span className="monitor-peer-status">{monitorLaunchStatus}</span>
          <button type="button" onClick={launchPeerMonitors}>Open 01 + 03</button>
        </>
      )}
      monitorLabel="MONITOR 02 - LINE MAP"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Line Map Monitor"
    >
      <MonitorCanvas
        dispatch={dispatch}
        isSimulationOwner={isSimulationOwner}
        onNavigate={onNavigate}
        onTakeSimulation={() => void claimSimulation('Monitor 02 - Line Map', true)}
        session={session}
        simulate={simulate}
      />
    </MonitorWorkspace>
  )
}

function ItamaStatusPanel({
  onAcknowledge,
  onClose,
  train,
}: {
  onAcknowledge: () => void
  onClose: () => void
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const trainRef = `EMU/${train.id}/TRN/XXXXXXXX`
  const nearestPlatform = platformData.reduce((closest, platform) => (
    Math.abs(platform.x - train.x) < Math.abs(closest.x - train.x) ? platform : closest
  ))
  const statusText = train.status === 'HOLD'
    ? 'Train readiness mode request'
    : train.status === 'WAIT'
      ? 'Route command not confirmed'
      : 'ITAMA status normal'

  return (
    <div
      className="line-map-popup-window line-map-popup-window--itama"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: 318, top: 510, width: 560, ...popupDrag.style }}
    >
      <div className="line-map-popup-titlebar" {...popupDrag.titleBarProps}>
        <span>Inspecting: {trainRef} CRT TR 0032 27/02</span>
        <button type="button" onClick={onClose}>x</button>
      </div>
      <div className="line-map-popup-body">
        <div className="line-map-popup-side">
          {['Information', 'PTI Initialis...', 'Departure', 'Train Hold', 'Train Readiness Request', 'ITAMA AM/CAT Auto...'].map((label) => (
            <button disabled={label.includes('PTI') || label.includes('ITAMA')} key={label} type="button">{label}</button>
          ))}
        </div>
        <div className="line-map-popup-main">
          <strong>Train {train.id}</strong>
          <div className="line-map-popup-fieldset">
            <span>Information area</span>
            <small>Train readiness and command state shown for operator reference.</small>
            <dl>
              <dt>Station</dt>
              <dd>{nearestPlatform.code}</dd>
              <dt>Status</dt>
              <dd>{statusText}</dd>
            </dl>
          </div>
          <label className="line-map-popup-status">
            <span>Status</span>
            <output>{statusText}<br />Command not confirmed</output>
          </label>
          <div className="line-map-popup-actions">
            <button type="button">Help</button>
            <button type="button" onClick={onAcknowledge}>Apply</button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

type TrainControlSubDialog =
  | 'arrival-time'
  | 'departure-time'
  | 'pti'
  | 'change-ends'
  | 'train-hold'
  | 'skip-stop'

function TrainInspectorPanel({
  arrivalTimeSelection,
  onClose,
  onConfirmItamaAuthorised,
  onConfirmItamaAuthorisedPreparation,
  onConfirmItamaNotAuthorised,
  onConfirmItamaNotAuthorisedPreparation,
  onConfirmArrivalTime,
  onConfirmDepartureTime,
  onConfirmDoorCommand,
  onConfirmTrainHold,
  onConfirmReadiness,
  onOpenDetails,
  onPageChange,
  page,
  train,
}: {
  arrivalTimeSelection?: TrainTimeSelection
  onClose: () => void
  onConfirmItamaAuthorised: () => void
  onConfirmItamaAuthorisedPreparation: () => void
  onConfirmItamaNotAuthorised: () => void
  onConfirmItamaNotAuthorisedPreparation: () => void
  onConfirmArrivalTime: (selection: TrainTimeSelection) => void
  onConfirmDepartureTime: (selection: TrainTimeSelection) => TrainDepartureCommandResult
  onConfirmDoorCommand: (command: TrainDoorCommand) => void
  onConfirmTrainHold: (detail: string) => void
  onConfirmReadiness: (command: string) => void
  onOpenDetails: () => void
  onPageChange: (page: InspectorPage) => void
  page: InspectorPage
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const confirmationDrag = usePopupDrag()
  const trainNumber = train.trainNumber ?? '0'
  const trainIdentityLabel = trainNumber.padStart(3, '0')
  const scheduleNumber = train.scheduleNumber ?? '0'
  const trainRef = `EMU/${train.id}/TRN/XXXXXXXX`
  const nearestPlatform = platformData.reduce((closest, platform) => (
    Math.abs(platform.x - train.x) < Math.abs(closest.x - train.x) ? platform : closest
  ))
  const currentDirection = getTrainServiceDirectionLabel(train)
  const baseReadinessMode = getTrainReadinessMode(train)
  const baseItamaStatus = getTrainItamaStatusValue(train)
  const baseItamaAuthorisedPreparationConfirmed = train.itamaAuthorisedPreparationConfirmed === true
  const baseItamaNotAuthorisedPreparationConfirmed = train.itamaNotAuthorisedPreparationConfirmed === true
  const [readinessSelection, setReadinessSelection] = useState<{
    baseMode: TrainReadinessMode
    trainId: string
    value: string
  } | null>(null)
  const [doorRequest, setDoorRequest] = useState('')
  const [brakeResetRequest, setBrakeResetRequest] = useState('')
  const [controlSelections, setControlSelections] = useState<Record<string, string>>({})
  const [readinessModeOverride, setReadinessModeOverride] = useState<{
    baseMode: TrainReadinessMode
    mode: TrainReadinessMode
    trainId: string
  } | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [activeTrainControlDialog, setActiveTrainControlDialog] = useState<TrainControlSubDialog | null>(null)
  const [displayedItamaStatusOverride, setDisplayedItamaStatusOverride] = useState<{
    baseStatus: TrainItamaDisplayStatus
    trainId: string
    value: TrainItamaDisplayStatus
  } | null>(null)
  const [itamaPreparationOverride, setItamaPreparationOverride] = useState<{
    authorisedConfirmed: boolean
    baseAuthorisedConfirmed: boolean
    baseNotAuthorisedConfirmed: boolean
    notAuthorisedConfirmed: boolean
    trainId: string
  } | null>(null)
  const inspectorScrollRef = useRef<HTMLDivElement>(null)
  const [inspectorScroll, setInspectorScroll] = useState({
    clientHeight: 1,
    clientWidth: 1,
    left: 0,
    scrollHeight: 1,
    scrollWidth: 1,
    top: 0,
  })
  const [confirmationCommand, setConfirmationCommand] = useState<{
    attribute: string
    command: string
    kind:
      | 'itama-authorised-preparation'
      | 'itama-authorised-confirmation'
      | 'itama-not-authorised-preparation'
      | 'itama-not-authorised-confirmation'
      | 'door-command'
      | 'readiness-command'
    doorCommand?: TrainDoorCommand
  } | null>(null)
  const activeReadinessModeOverride = readinessModeOverride?.trainId === train.id
    && readinessModeOverride.baseMode === baseReadinessMode
    ? readinessModeOverride.mode
    : null
  const activeReadinessSelection = readinessSelection?.trainId === train.id
    && readinessSelection.baseMode === baseReadinessMode
    ? readinessSelection.value
    : null
  const effectiveReadinessMode = activeReadinessModeOverride ?? baseReadinessMode
  const readiness = activeReadinessSelection ?? ''
  const readinessInfoValue = getTrainReadinessDisplayValue({ readinessMode: effectiveReadinessMode })
  const activeItamaStatusOverride = displayedItamaStatusOverride?.trainId === train.id
    && displayedItamaStatusOverride.baseStatus === baseItamaStatus
    ? displayedItamaStatusOverride.value
    : null
  const activeItamaPreparationOverride = itamaPreparationOverride?.trainId === train.id
    && itamaPreparationOverride.baseAuthorisedConfirmed === baseItamaAuthorisedPreparationConfirmed
    && itamaPreparationOverride.baseNotAuthorisedConfirmed === baseItamaNotAuthorisedPreparationConfirmed
    ? itamaPreparationOverride
    : null
  const itamaStatus = activeItamaStatusOverride ?? baseItamaStatus
  const isItamaGranted = itamaStatus === 'GRANTED'
  const isAuthorisedCommandSideAvailable = !isItamaGranted
  const isNotAuthorisedCommandSideAvailable = isItamaGranted
  const isItamaAuthorisedPreparationConfirmed = activeItamaPreparationOverride?.authorisedConfirmed
    ?? baseItamaAuthorisedPreparationConfirmed
  const isItamaNotAuthorisedPreparationConfirmed = activeItamaPreparationOverride?.notAuthorisedConfirmed
    ?? baseItamaNotAuthorisedPreparationConfirmed
  const canRequestItamaAuthorisedPreparation = isAuthorisedCommandSideAvailable
    && !isItamaAuthorisedPreparationConfirmed
  const canRequestItamaAuthorisedConfirmation = isAuthorisedCommandSideAvailable
    && isItamaAuthorisedPreparationConfirmed
  const canRequestItamaNotAuthorisedPreparation = isNotAuthorisedCommandSideAvailable
    && !isItamaNotAuthorisedPreparationConfirmed
  const canRequestItamaNotAuthorisedConfirmation = isNotAuthorisedCommandSideAvailable
    && isItamaNotAuthorisedPreparationConfirmed
  const doorFailureState = getTrainDoorFailureState(train)
  const doorFaultActive = getTrainDoorFaultDisplayValue(doorFailureState) === 'YES'
  const doorSummaryStatus = getTrainDoorSummaryStatus(doorFailureState)
  const doorIsolationStatus = getTrainDoorIsolationStatus(doorFailureState)

  const recordStatus = (message: string) => setStatusMessage(message)

  const closeTrainControlDialog = () => setActiveTrainControlDialog(null)

  const openTrainControlDialog = (dialog: TrainControlSubDialog, status: string) => {
    setConfirmationCommand(null)
    setActiveTrainControlDialog(dialog)
    setStatusMessage(status)
  }

  const updateControlSelection = (key: string, label: string, nextValue: string) => {
    setControlSelections((current) => ({
      ...current,
      [key]: nextValue,
    }))
    setStatusMessage(`${label}${nextValue ? ` ${nextValue}` : ''} selected`)
  }

  const openTrainTimeDialog = (kind: 'arrival' | 'departure') => {
    openTrainControlDialog(
      kind === 'arrival' ? 'arrival-time' : 'departure-time',
      `${kind === 'arrival' ? 'Arrival' : 'Departure'} time selected`,
    )
  }

  const openPtiDialog = () => {
    openTrainControlDialog('pti', 'PTI initialisation selected')
  }

  const openChangeEndsDialog = () => {
    openTrainControlDialog('change-ends', 'Change of ends request selected')
  }

  const openTrainHoldDialog = () => {
    openTrainControlDialog('train-hold', 'Train hold selected')
  }

  const openSkipStopDialog = () => {
    openTrainControlDialog('skip-stop', 'Skip stop selected')
  }

  const updateInspectorScroll = useCallback(() => {
    const scrollArea = inspectorScrollRef.current

    if (!scrollArea) {
      return
    }

    setInspectorScroll({
      clientHeight: Math.max(1, scrollArea.clientHeight),
      clientWidth: Math.max(1, scrollArea.clientWidth),
      left: scrollArea.scrollLeft,
      scrollHeight: Math.max(1, scrollArea.scrollHeight),
      scrollWidth: Math.max(1, scrollArea.scrollWidth),
      top: scrollArea.scrollTop,
    })
  }, [])

  const setInspectorScrollPosition = useCallback(
    (axis: 'vertical' | 'horizontal', nextValue: number) => {
      const scrollArea = inspectorScrollRef.current

      if (!scrollArea) {
        return
      }

      if (axis === 'vertical') {
        scrollArea.scrollTop = Math.max(0, Math.min(nextValue, scrollArea.scrollHeight - scrollArea.clientHeight))
      } else {
        scrollArea.scrollLeft = Math.max(0, Math.min(nextValue, scrollArea.scrollWidth - scrollArea.clientWidth))
      }

      updateInspectorScroll()
    },
    [updateInspectorScroll],
  )

  useEffect(() => {
    const scrollArea = inspectorScrollRef.current

    if (!scrollArea) {
      return
    }

    scrollArea.scrollTop = 0
    scrollArea.scrollLeft = 0
    updateInspectorScroll()
  }, [page, train.id, updateInspectorScroll])

  useEffect(() => {
    const scrollArea = inspectorScrollRef.current

    if (!scrollArea || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(updateInspectorScroll)
    observer.observe(scrollArea)

    return () => observer.disconnect()
  }, [updateInspectorScroll])

  const renderTab = (targetPage: InspectorPage, label: string) => (
    <button
      className={`train-inspector-tab ${page === targetPage ? 'is-active' : ''}`}
      onClick={() => onPageChange(targetPage)}
      type="button"
    >
      {targetPage === 'control' ? (
        <img alt="" className="train-inspector-tab__control-icon" src={controlTabIcon} />
      ) : (
        <span
          className={`train-inspector-tab__icon ${
            targetPage === 'tag' ? 'train-inspector-tab__icon--tag' : 'train-inspector-tab__icon--information'
          }`}
        />
      )}
      {label}
    </button>
  )

  const requestItamaCommand = (
    attribute: string,
    kind:
      | 'itama-authorised-preparation'
      | 'itama-authorised-confirmation'
      | 'itama-not-authorised-preparation'
      | 'itama-not-authorised-confirmation',
  ) => {
    setConfirmationCommand({
      attribute,
      command: 'OK',
      kind,
    })
  }

  const requestDoorCommand = (request: string) => {
    setDoorRequest(request)

    if (!request) {
      setConfirmationCommand(null)
      return
    }

    const doorCommand = getTrainDoorCommandFromRequest(request)

    if (!doorCommand) {
      setConfirmationCommand(null)
      return
    }

    if (!getAllowedTrainDoorCommands(doorFailureState).includes(doorCommand)) {
      setConfirmationCommand(null)
      setStatusMessage(getTrainDoorCommandRejectionMessage(doorFailureState, doorCommand))
      return
    }

    setConfirmationCommand({
      attribute: 'Train Door Open/Close Request',
      command: getTrainDoorCommandValue(doorCommand),
      doorCommand,
      kind: 'door-command',
    })
  }

  const handleReadinessChange = (nextReadiness: string) => {
    setReadinessSelection({
      baseMode: baseReadinessMode,
      trainId: train.id,
      value: nextReadiness,
    })

    const command = nextReadiness.toUpperCase()

    setConfirmationCommand({
      attribute: 'Train Readiness Request',
      command,
      kind: 'readiness-command',
    })
    setStatusMessage(`Train readiness request ${command} selected`)
  }

  const cancelCommand = () => {
    if (confirmationCommand?.kind === 'readiness-command') {
      setReadinessSelection(null)
    }

    setConfirmationCommand(null)
  }

  const confirmCommand = () => {
    if (!confirmationCommand) {
      return
    }

    if (confirmationCommand.kind === 'itama-authorised-preparation') {
      onConfirmItamaAuthorisedPreparation()
      setItamaPreparationOverride({
        authorisedConfirmed: true,
        baseAuthorisedConfirmed: baseItamaAuthorisedPreparationConfirmed,
        baseNotAuthorisedConfirmed: baseItamaNotAuthorisedPreparationConfirmed,
        notAuthorisedConfirmed: false,
        trainId: train.id,
      })
      setStatusMessage('ITAMA authorised preparation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'itama-authorised-confirmation') {
      onConfirmItamaAuthorised()
      setDisplayedItamaStatusOverride({
        baseStatus: baseItamaStatus,
        trainId: train.id,
        value: 'GRANTED',
      })
      setItamaPreparationOverride({
        authorisedConfirmed: false,
        baseAuthorisedConfirmed: baseItamaAuthorisedPreparationConfirmed,
        baseNotAuthorisedConfirmed: baseItamaNotAuthorisedPreparationConfirmed,
        notAuthorisedConfirmed: false,
        trainId: train.id,
      })
      setStatusMessage('ITAMA authorised confirmation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'itama-not-authorised-preparation') {
      onConfirmItamaNotAuthorisedPreparation()
      setItamaPreparationOverride({
        authorisedConfirmed: false,
        baseAuthorisedConfirmed: baseItamaAuthorisedPreparationConfirmed,
        baseNotAuthorisedConfirmed: baseItamaNotAuthorisedPreparationConfirmed,
        notAuthorisedConfirmed: true,
        trainId: train.id,
      })
      setStatusMessage('ITAMA not authorised preparation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'itama-not-authorised-confirmation') {
      onConfirmItamaNotAuthorised()
      setDisplayedItamaStatusOverride({
        baseStatus: baseItamaStatus,
        trainId: train.id,
        value: 'NOT GRANTED',
      })
      setItamaPreparationOverride({
        authorisedConfirmed: false,
        baseAuthorisedConfirmed: baseItamaAuthorisedPreparationConfirmed,
        baseNotAuthorisedConfirmed: baseItamaNotAuthorisedPreparationConfirmed,
        notAuthorisedConfirmed: false,
        trainId: train.id,
      })
      setStatusMessage('ITAMA not authorised confirmation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'door-command' && confirmationCommand.doorCommand) {
      onConfirmDoorCommand(confirmationCommand.doorCommand)
      setStatusMessage(getTrainDoorCommandStatusMessage(confirmationCommand.doorCommand))
    }

    if (confirmationCommand.kind === 'readiness-command') {
      const confirmedReadinessMode = getTrainReadinessModeFromCommand(confirmationCommand.command)

      onConfirmReadiness(confirmationCommand.command)
      setReadinessSelection(null)
      setReadinessModeOverride({
        baseMode: baseReadinessMode,
        mode: confirmedReadinessMode,
        trainId: train.id,
      })
      setStatusMessage(`Train readiness request ${confirmationCommand.command}\nCommand successful`)
    }

    setConfirmationCommand(null)
  }

  const selectedArrivalParts = arrivalTimeSelection?.command.split(' - ') ?? []
  const selectedArrivalTime = selectedArrivalParts[1] ?? '08:40:18'
  const selectedArrivalPlatform = arrivalTimeSelection?.platformSiding ?? `${nearestPlatform.code}${currentDirection === 'NB' ? 'N' : 'S'}`
  const departurePlatform = `${nearestPlatform.code}${currentDirection === 'NB' ? 'S' : 'N'}`
  const trainHoldStatus = train.status === 'HOLD' ? 'REQUESTED' : 'RELEASED'
  const trainHoldValue = train.status === 'HOLD' ? 'APPLIED' : 'NOT APPLIED'
  const trainSpeed = train.isMoving ? '10' : '0'
  const computedDirection = currentDirection === 'NB' ? 'TO NORTH DIR' : 'TO SOUTH DIR'
  const trainInfoRows: Array<{
    disabled?: boolean
    label: string
    tone?: 'blue' | 'green' | 'red'
    value: string
  }> = [
    { label: 'Train number', value: trainNumber },
    { label: 'Schedule number, given by ATC', value: scheduleNumber },
    { label: 'Train Readiness State', value: train.status === 'HOLD' ? 'AUTO HOLD' : 'AUTO MODE' },
    { label: 'Train Readiness Mode: Manual', value: 'NONE' },
    { label: 'Train Readiness Mode: Auto', value: readinessInfoValue },
    { label: 'Train ITAMA Status', tone: itamaStatus === 'NOT GRANTED' ? 'red' : 'green', value: itamaStatus },
    { label: 'Action Needed (from operator for recovery)', tone: train.status === 'HOLD' || doorFaultActive ? 'red' : 'green', value: train.status === 'HOLD' || doorFaultActive ? 'YES' : 'NO' },
    { label: 'Train Emergency Brake', value: train.status === 'HOLD' || doorFaultActive ? 'APPLIED' : 'NOT APPLIED' },
    { label: 'Status of train hold request', tone: train.status === 'HOLD' ? 'green' : 'blue', value: trainHoldStatus },
    { label: 'Train hold', value: trainHoldValue },
    { label: 'Physical car number of the half-train/loco host ATC', value: '58' },
    { label: 'Physical car number of the half-train/loco host cab', value: '58' },
    { label: 'Availability', value: 'AVAILABLE' },
    { label: 'State of Train Localisation', value: 'LOCALISED' },
    { label: 'Speed of the train (Kph)', value: trainSpeed },
    { label: 'Train Saloon Doors Summary Status', tone: doorFaultActive ? 'red' : 'green', value: doorSummaryStatus },
    { label: 'Train Detrainment Doors Summary Status', value: 'CLOSED/LOCKED' },
    { label: 'Train Door Isolation Status', value: doorIsolationStatus },
    { label: 'Emergency Brake by ATC', value: 'INACTIVE CAB' },
    { label: 'Train creep mode', value: 'TRAIN STOP' },
    { label: 'Train Driving Mode Status', value: 'AM' },
    { label: 'Destination number, given by ATC', value: '1' },
    { label: 'Departure platform/siding name', value: departurePlatform },
    { label: 'Departure time', value: '08:38:15' },
    { label: 'Platform/siding name where train is stationary', value: selectedArrivalPlatform },
    { label: 'Arrival time', value: selectedArrivalTime },
    { label: 'Crew number, given by ATC', value: '0' },
    { label: 'Train Stalled in Interstation', value: 'NOT STALLED' },
    { label: 'Skip/stop platform/siding name', value: '' },
    { label: 'Train Skip Stop', value: 'NO' },
    { label: 'Platform/siding name for train hold', value: selectedArrivalPlatform },
    { label: 'Active Cab Auto-Test Status', value: 'NORMAL' },
    { label: 'Opposite Cab Auto-Test Status', value: 'NORMAL' },
    { label: 'On-board Communication Failure with C751A', value: 'NORMAL' },
    { label: 'On-board Communication Failure with C760', value: 'NORMAL' },
    { label: 'Trainborne ATC Communication State', value: 'TALKING' },
    { label: 'Physical car number of the half-train/locomotive', value: '57' },
    { label: 'Direction of Train Computed by ATC', value: computedDirection },
    { label: 'Train Wash Mode Status', tone: 'blue', value: '' },
  ]

  const renderControlDropdown = (key: string, label: string, options: readonly string[]) => (
    <ScadaDropdown
      id={`train-control-${key}`}
      onChange={(value) => updateControlSelection(key, label, value)}
      options={options}
      value={controlSelections[key] ?? ''}
    />
  )

  const renderControlOkButton = (label: string, disabled = false) => (
    <Win98HtmlButton disabled={disabled} onClick={() => recordStatus(`${label}\nCommand successful`)}>
      OK
    </Win98HtmlButton>
  )
  const trainTimeDialogKind = activeTrainControlDialog === 'arrival-time'
    ? 'arrival'
    : activeTrainControlDialog === 'departure-time'
      ? 'departure'
      : null

  return (
    <div
      aria-label={`Inspecting Train ${trainNumber}`}
      className="train-inspector-window"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="train-inspector-titlebar" {...popupDrag.titleBarProps}>
        Inspecting: {trainRef} &nbsp; (TRT_ - TR____{train.id.padStart(4, '0')} - 27/12)
      </div>
      <div className="train-inspector-body">
        <div className="train-inspector-train-label">Train {trainIdentityLabel}</div>
        <div className="train-inspector-tabs">
          {renderTab('information', 'Information')}
          {renderTab('control', 'Control')}
          {renderTab('tag', 'Tag')}
        </div>

        <section className="train-inspector-panel">
          <div className="train-inspector-scrollarea" onScroll={updateInspectorScroll} ref={inspectorScrollRef}>
            {page === 'information' ? (
              <div className="train-inspector-page train-inspector-page--information">
                {trainInfoRows.map((row) => (
                  <InspectorInfoRow
                    disabled={row.disabled}
                    key={row.label}
                    label={row.label}
                    tone={row.tone}
                    value={row.value}
                  />
                ))}
              </div>
            ) : null}

            {page === 'control' ? (
              <div className="train-inspector-page train-inspector-page--control">
                <fieldset className="train-inspector-fieldset">
                  <legend>CONTROL TRAIN ATC</legend>
                  <div className="train-inspector-atc">
                    <div className="train-inspector-command-grid">
                      <Win98HtmlButton onClick={openPtiDialog}>PTI Initialisation</Win98HtmlButton>
                      <Win98HtmlButton onClick={openChangeEndsDialog}>Change of Ends Request</Win98HtmlButton>
                      <Win98HtmlButton onClick={() => openTrainTimeDialog('departure')}>Departure Time</Win98HtmlButton>
                      <Win98HtmlButton onClick={() => openTrainTimeDialog('arrival')}>Arrival Time</Win98HtmlButton>
                      <Win98HtmlButton onClick={openTrainHoldDialog}>Train Hold</Win98HtmlButton>
                      <Win98HtmlButton onClick={openSkipStopDialog}>Skip Stop</Win98HtmlButton>
                    </div>
                    <div className="train-inspector-command-list">
                      <InspectorCommandRow label="Train Readiness Request">
                        <ScadaDropdown
                          id="train-readiness-request"
                          onChange={handleReadinessChange}
                          options={['Asleep', 'Depot movement', 'Mainline service', 'Mainline off service', 'HV isolated']}
                          value={readiness}
                        />
                      </InspectorCommandRow>
                      <InspectorCommandRow disabled={!canRequestItamaAuthorisedPreparation} label="ITAMA AM/CM Authorised Preparation">
                        <Win98HtmlButton
                          disabled={!canRequestItamaAuthorisedPreparation}
                          onClick={() => requestItamaCommand('ITAMA AM/CM Authorised Preparation', 'itama-authorised-preparation')}
                        >
                          OK
                        </Win98HtmlButton>
                      </InspectorCommandRow>
                      <InspectorCommandRow disabled={!canRequestItamaAuthorisedConfirmation} label="ITAMA AM/CM Authorised Confirmation">
                        <Win98HtmlButton
                          disabled={!canRequestItamaAuthorisedConfirmation}
                          onClick={() => requestItamaCommand('ITAMA AM/CM Authorised Confirmation', 'itama-authorised-confirmation')}
                        >
                          OK
                        </Win98HtmlButton>
                      </InspectorCommandRow>
                      <InspectorCommandRow disabled={!canRequestItamaNotAuthorisedPreparation} label="ITAMA AM/CM Not Authorised Preparation">
                        <Win98HtmlButton
                          disabled={!canRequestItamaNotAuthorisedPreparation}
                          onClick={() => requestItamaCommand('ITAMA AM/CM Not Authorised Preparation', 'itama-not-authorised-preparation')}
                        >
                          OK
                        </Win98HtmlButton>
                      </InspectorCommandRow>
                      <InspectorCommandRow disabled={!canRequestItamaNotAuthorisedConfirmation} label="ITAMA AM/CM Not Authorised Confirmation">
                        <Win98HtmlButton
                          disabled={!canRequestItamaNotAuthorisedConfirmation}
                          onClick={() => requestItamaCommand('ITAMA AM/CM Not Authorised Confirmation', 'itama-not-authorised-confirmation')}
                        >
                          OK
                        </Win98HtmlButton>
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Door Open/Close Request">
                        <ScadaDropdown
                          id="door-request"
                          onChange={requestDoorCommand}
                          options={['', 'Cycle Door', 'Confirm Closed/Locked', 'Authorize door isolation', 'Authorize movement', 'Withdraw from service']}
                          value={doorRequest}
                        />
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Emergency Brake Reset Request">
                        <ScadaDropdown
                          id="brake-reset-request"
                          onChange={(value) => {
                            setBrakeResetRequest(value)
                            recordStatus('Emergency brake reset selected')
                          }}
                          options={['', 'Reset', 'Cancel reset']}
                          value={brakeResetRequest}
                        />
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Trainborne ATC Reset Request">
                        {renderControlOkButton('Trainborne ATC reset request')}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Trainborne ATC Changeover Request">
                        {renderControlOkButton('Trainborne ATC changeover request')}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Creep Mode Request">
                        {renderControlDropdown('creep-mode', 'Creep mode request', ['', 'Train stop', 'Creep forward', 'Creep reverse'])}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Wash Request">
                        {renderControlDropdown('wash-request', 'Wash request', ['', 'Wash on', 'Wash off'])}
                      </InspectorCommandRow>
                      <InspectorCommandSection label="ROLLING STOCK" />
                      <InspectorCommandRow label="Reset Propulsion Equipment Isolation">
                        {renderControlOkButton('Reset propulsion equipment isolation')}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Reset Aux Con Equip (751C/851E) / Battery Charger Isolation">
                        {renderControlOkButton('Reset aux con equipment isolation')}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Reset Battery Isolation">
                        {renderControlOkButton('Reset battery isolation')}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Reset of 2 Pantographs (General Auto Drop)">
                        {renderControlOkButton('Reset of 2 pantographs')}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Reset of 1 Pantograph (Partial Auto Drop)">
                        {renderControlOkButton('Reset of 1 pantograph')}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Set Damper Position">
                        {renderControlDropdown('damper-position', 'Set damper position', ['', 'Open', 'Close', 'Auto'])}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Odd Exit Light">
                        {renderControlDropdown('odd-exit-light', 'Odd exit light', ['', 'On', 'Off'])}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Even Exit Light">
                        {renderControlDropdown('even-exit-light', 'Even exit light', ['', 'On', 'Off'])}
                      </InspectorCommandRow>
                      <InspectorCommandRow label="Parking Brake">
                        {renderControlDropdown('parking-brake', 'Parking brake', ['', 'Apply', 'Release'])}
                      </InspectorCommandRow>
                      <InspectorCommandRow disabled label="ATI Measurement Session">
                        {renderControlDropdown('ati-measurement-session', 'ATI measurement session', [''])}
                      </InspectorCommandRow>
                      <InspectorCommandRow disabled label="ATI THMS-HC Measurement Session On">
                        {renderControlOkButton('ATI THMS-HC measurement session', true)}
                      </InspectorCommandRow>
                      <InspectorCommandRow disabled label="ATI THMS-RC Measurement Session On">
                        {renderControlOkButton('ATI THMS-RC measurement session', true)}
                      </InspectorCommandRow>
                      <InspectorCommandSection label="MAINTENANCE" />
                      <InspectorCommandRow disabled label="Download MA Table">
                        {renderControlOkButton('Download MA table', true)}
                      </InspectorCommandRow>
                    </div>
                  </div>
                </fieldset>
              </div>
            ) : null}

            {page === 'tag' ? (
              <div className="train-inspector-page train-inspector-page--tag">
                <p>No active tag applied for Train {trainNumber}.</p>
                <Win98HtmlButton onClick={() => recordStatus('Tag page selected')}>Tag</Win98HtmlButton>
              </div>
            ) : null}
          </div>
          <TrainInspectorScrollbar
            axis="vertical"
            contentSize={inspectorScroll.scrollHeight}
            onChange={(nextValue) => setInspectorScrollPosition('vertical', nextValue)}
            value={inspectorScroll.top}
            viewportSize={inspectorScroll.clientHeight}
          />
          <TrainInspectorScrollbar
            axis="horizontal"
            contentSize={inspectorScroll.scrollWidth}
            onChange={(nextValue) => setInspectorScrollPosition('horizontal', nextValue)}
            value={inspectorScroll.left}
            viewportSize={inspectorScroll.clientWidth}
          />
          <span className="train-inspector-scrollbar-corner" />
        </section>

        <fieldset className="train-inspector-status">
          <legend>Status</legend>
          <output className="train-inspector-status-field">{statusMessage}</output>
        </fieldset>

        <div className="train-inspector-actions">
          <Win98HtmlButton onClick={() => recordStatus('Help selected')}>Help</Win98HtmlButton>
          <span />
          <Win98HtmlButton onClick={onOpenDetails}>Details...</Win98HtmlButton>
          <Win98HtmlButton onClick={onClose}>Close</Win98HtmlButton>
        </div>
      </div>

      {confirmationCommand ? (
        <div
          className="train-command-confirmation"
          onPointerDown={(event) => event.stopPropagation()}
          style={confirmationDrag.style}
        >
          <div className="train-command-confirmation__title" {...confirmationDrag.titleBarProps}>Command confirmation</div>
          <fieldset>
            <legend>Please confirm command...</legend>
            <div className="train-command-confirmation__grid">
              <label>Equipment</label>
              <div>{trainRef} Train {trainNumber}</div>
              <label>Attribute</label>
              <div>{confirmationCommand.attribute}</div>
              <label>Command</label>
              <div>{confirmationCommand.command}</div>
              <label>No wait</label>
              <input type="checkbox" />
            </div>
          </fieldset>
          <div className="train-command-confirmation__actions">
            <Win98HtmlButton onClick={() => recordStatus('Help selected')}>Help</Win98HtmlButton>
            <span />
            <Win98HtmlButton onClick={confirmCommand}>Confirm</Win98HtmlButton>
            <Win98HtmlButton onClick={cancelCommand}>Cancel</Win98HtmlButton>
          </div>
        </div>
      ) : null}

      {trainTimeDialogKind ? (
        <TrainTimeDialog
          key={`${train.id}-${trainTimeDialogKind}`}
          kind={trainTimeDialogKind}
          onApply={(message, selection) => {
            setStatusMessage(message)

            if (selection.kind === 'arrival') {
              onConfirmArrivalTime(selection)
            }
          }}
          onConfirmDeparture={onConfirmDepartureTime}
          onClose={closeTrainControlDialog}
          train={train}
        />
      ) : null}

      {activeTrainControlDialog === 'pti' ? (
        <PtiInitialisationDialog
          key={`${train.id}-pti`}
          onApply={(message) => setStatusMessage(message)}
          onClose={closeTrainControlDialog}
          train={train}
        />
      ) : null}

      {activeTrainControlDialog === 'change-ends' ? (
        <ChangeEndsDialog
          currentDirection={currentDirection}
          defaultStation={nearestPlatform.code}
          key={`${train.id}-${nearestPlatform.code}-${currentDirection}`}
          onApply={(message) => setStatusMessage(message)}
          onClose={closeTrainControlDialog}
          train={train}
        />
      ) : null}

      {activeTrainControlDialog === 'train-hold' ? (
        <TrainHoldDialog
          currentDirection={currentDirection}
          key={`${train.id}-${currentDirection}-train-hold`}
          onApply={(message) => {
            setStatusMessage(message)

            if (message.startsWith('Train hold request')) {
              onConfirmTrainHold(message.split('\n')[0])
            }
          }}
          onClose={closeTrainControlDialog}
          train={train}
        />
      ) : null}

      {activeTrainControlDialog === 'skip-stop' ? (
        <SkipStopDialog
          currentDirection={currentDirection}
          defaultStation={nearestPlatform.code}
          key={`${train.id}-${nearestPlatform.code}-${currentDirection}-skip-stop`}
          onApply={(message) => setStatusMessage(message)}
          onClose={closeTrainControlDialog}
          train={train}
        />
      ) : null}
    </div>
  )
}

// Monitor 02. Operator actions are commands to the server; train movement
// (the simulation) is reported with simulate().
function MonitorCanvas({
  dispatch,
  isSimulationOwner,
  onNavigate,
  onTakeSimulation,
  session,
  simulate,
}: {
  dispatch: DispatchSessionCommand
  isSimulationOwner: boolean
  onNavigate: (route: AppRoute) => void
  onTakeSimulation: () => void
  session: OccSessionState
  simulate: SimulateSession
}) {
  const sessionRef = useRef(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const [panX, setPanX] = useState<number>(DEFAULT_LINE_MAP_PAN)
  const [inspectorPanel, setInspectorPanel] = useState<{ page: InspectorPage; trainId: string } | null>(null)
  const [auxiliaryPanel, setAuxiliaryPanel] = useState<{ trainId: string; view: TrainAuxiliaryView } | null>(null)
  const [itamaTrainId, setItamaTrainId] = useState('')
  // A station panel command waiting for Apply, and the train at that station it will go to.
  const [pendingCommand, setPendingCommand] = useState<{ command: TrainCommand; station: string; trainId?: string } | null>(null)
  const [defineRouteSignal, setDefineRouteSignal] = useState<LineMapSignalData | null>(null)
  const [signalMenu, setSignalMenu] = useState<SignalMenuState | null>(null)
  const [trainMenu, setTrainMenu] = useState<{ trainId: string; x: number; y: number } | null>(null)
  const [commsChannel, setCommsChannel] = useState<CommsChannel | null>(null)
  const callLog = useMemo(() => getCommsLog(session.evidenceLog), [session.evidenceLog])
  const {
    lineMapRouteSegmentOverrides,
    routeControlModes,
    routeFleetStatuses,
    setLineMapRouteSegmentOverrides,
    setManualMovementTrainIds,
    setRouteControlModes,
    setRouteFleetStatuses,
    setTrainArrivalDestinations,
    setTrainItamaStatusOverrides,
    setTrainReadinessModeOverrides,
    timetableBlockedTrainIds,
    trainArrivalDestinations,
    trainItamaStatusOverrides,
    trainReadinessModeOverrides,
  } = useLineMapRunOverrides(session)
  const panAnimationRef = useRef<number | null>(null)
  const panTargetRef = useRef<number>(DEFAULT_LINE_MAP_PAN)
  const panValueRef = useRef<number>(DEFAULT_LINE_MAP_PAN)
  const dragRef = useRef<{ startX: number; startPan: number } | null>(null)

  const sessionLineMap = useMemo(() => clearTimetableGuideRouteState(
    normalizeLineMapRuntimeState(session.lineMap),
    getTimetablePlaybackTrainIdSet(session.trains),
  ), [session.lineMap, session.trains])
  const renderedTrains = session.trains.map((train) => {
    const itamaStatus = trainItamaStatusOverrides[train.id]
    const readinessMode = trainReadinessModeOverrides[train.id]
    const routeStep = getTrainRouteStepFromTrainOccupancyOrLineMap(sessionLineMap, train, TRAIN_ROUTE_RENDER_STEPS)
    const routePinnedTrain = routeStep
      ? {
          ...train,
          x: routeStep.point.x,
          y: routeStep.point.y,
        }
      : train

    return itamaStatus || readinessMode
      ? {
          ...routePinnedTrain,
          ...(itamaStatus
            ? {
                itamaGranted: itamaStatus === 'GRANTED',
                itamaStatus,
              }
            : {}),
          ...(readinessMode ? { readinessMode } : {}),
        }
      : routePinnedTrain
  })
  const selectedTrain = renderedTrains.find((train) => train.id === session.selectedTrainId)
  const routeAutomationSummary = useMemo(() => createRouteAutomationSummary(routeControlModes), [routeControlModes])
  const inspectorTrain = inspectorPanel ? renderedTrains.find((train) => train.id === inspectorPanel.trainId) : undefined
  const auxiliaryTrain = auxiliaryPanel ? renderedTrains.find((train) => train.id === auxiliaryPanel.trainId) : undefined
  const itamaTrain = itamaTrainId ? renderedTrains.find((train) => train.id === itamaTrainId) : undefined
  const menuTrain = trainMenu ? renderedTrains.find((train) => train.id === trainMenu.trainId) : undefined
  const trainOccupancyRouteSegments = createTrainOccupancyRouteSegmentStates(renderedTrains, sessionLineMap)
  const renderedRouteSegments = useMemo(() => ({
    ...lineMapRouteSegmentOverrides,
    ...sessionLineMap.routeSegments,
  }), [lineMapRouteSegmentOverrides, sessionLineMap.routeSegments])

  const renderedLineMap: LineMapRuntimeState = useMemo(() => ({
    ...sessionLineMap,
    routeSegments: renderedRouteSegments,
  }), [renderedRouteSegments, sessionLineMap])
  const effectiveLineMapSession = useMemo<OccSessionState>(() => ({
    ...session,
    lineMap: renderedLineMap,
    trains: renderedTrains,
  }), [renderedLineMap, renderedTrains, session])

  useEffect(() => {
    simulate((current) => {
      let changed = false
      const trains = current.trains.map((currentTrain) => {
        const currentRouteStep = getTrainRouteStepFromTrainOccupancyOrLineMap(
          current.lineMap,
          currentTrain,
          TRAIN_ROUTE_RENDER_STEPS,
        )

        if (!currentRouteStep) {
          return currentTrain
        }

        if (
          currentTrain.x === currentRouteStep.point.x
          && currentTrain.y === currentRouteStep.point.y
          && currentTrain.occupancySegmentId === currentRouteStep.segmentId
        ) {
          return currentTrain
        }

        changed = true

        return {
          ...currentTrain,
          occupancySegmentId: currentRouteStep.segmentId,
          x: currentRouteStep.point.x,
          y: currentRouteStep.point.y,
        }
      })

      return changed
        ? {
            ...current,
            trains,
          }
        : current
    })
  }, [session.lineMap, simulate])
  const defineRouteSetLabels = defineRouteSignal
    ? getSignalRouteSetLabels(defineRouteSignal.label, renderedLineMap)
    : []
  const defineRouteSet = defineRouteSetLabels.length > 0

  const cancelPanAnimation = useCallback(() => {
    if (panAnimationRef.current !== null) {
      window.cancelAnimationFrame(panAnimationRef.current)
      panAnimationRef.current = null
    }
  }, [])

  const {
    cancel: cancelManualTrainRoutePlayback,
    cancelAll: cancelTrainRouteAnimation,
    start: startManualTrainRoutePlayback,
  } = useManualTrainRoutePlayback()
  const timetableDiagnosticsNow = useTimetablePlaybackScheduler({
    blockedTrainIds: timetableBlockedTrainIds,
    cancelTrainRouteAnimation,
    routeControlModes,
    session: effectiveLineMapSession,
    updateSession: simulate,
  })
  const timetableClockNow = getTimetableClockNow(session.timetableClock, timetableDiagnosticsNow)
  const timetableRouteDiagnosticsSummary = createTimetableRouteDiagnosticsSummary(
    createTimetableRouteDiagnostics({
      now: timetableClockNow,
      routeControlModes,
      rows: session.timetableRows,
      trains: renderedTrains,
    }),
  )

  const setPanImmediate = useCallback((value: number) => {
    const nextPan = clampPan(value)

    cancelPanAnimation()
    panTargetRef.current = nextPan
    panValueRef.current = nextPan
    setPanX(nextPan)
  }, [cancelPanAnimation])

  const panTo = useCallback((value: number) => {
    setPanImmediate(value)
  }, [setPanImmediate])

  const panBy = useCallback((distance: number) => {
    const currentPan = snapLineMapPan(panTargetRef.current)
    const currentIndex = LINE_VIEWPORT_PANS.indexOf(currentPan as (typeof LINE_VIEWPORT_PANS)[number])
    const nextIndex = Math.min(
      LINE_VIEWPORT_PANS.length - 1,
      Math.max(0, currentIndex + (distance >= 0 ? 1 : -1)),
    )

    setPanImmediate(LINE_VIEWPORT_PANS[nextIndex])
  }, [setPanImmediate])

  const setRouteControlMode = useCallback((panelCode: string, mode: RouteControlMode) => {
    setRouteControlModes((current) => (
      current[panelCode] === mode
        ? current
        : {
            ...current,
            [panelCode]: mode,
          }
    ))
  }, [setRouteControlModes])

  const showItamaForTrain = (trainId: string) => {
    setInspectorPanel(null)
    setAuxiliaryPanel(null)
    setTrainMenu(null)
    setItamaTrainId(trainId)
    void dispatch({ trainId, type: 'SELECT_TRAIN', view: 'itama' })
  }

  const openTrainInspector = (trainId: string, page: InspectorPage) => {
    setTrainMenu(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setInspectorPanel({ trainId, page })
    void dispatch({ page, trainId, type: 'SELECT_TRAIN', view: 'inspector' })
  }

  const openTrainAuxiliary = (trainId: string, view: TrainAuxiliaryView) => {
    setTrainMenu(null)
    setInspectorPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setAuxiliaryPanel({ trainId, view })
    void dispatch({ trainId, type: 'OPEN_TRAIN_VIEW', view })
  }

  const confirmInspectorItamaAuthorisedPreparation = (trainId: string) => {
    void dispatch({ step: 'authorised-preparation', trainId, type: 'ITAMA_CONFIRM' })
  }

  const confirmInspectorItamaAuthorised = (trainId: string) => {
    setTrainItamaStatusOverrides((current) => ({
      ...current,
      [trainId]: 'GRANTED',
    }))
    void dispatch({ step: 'authorised', trainId, type: 'ITAMA_CONFIRM' })
  }

  const confirmInspectorItamaNotAuthorisedPreparation = (trainId: string) => {
    void dispatch({ step: 'not-authorised-preparation', trainId, type: 'ITAMA_CONFIRM' })
  }

  const confirmInspectorItamaNotAuthorised = (trainId: string) => {
    setTrainItamaStatusOverrides((current) => ({
      ...current,
      [trainId]: 'NOT_GRANTED',
    }))
    void dispatch({ step: 'not-authorised', trainId, type: 'ITAMA_CONFIRM' })
  }

  const confirmInspectorReadiness = (trainId: string, command: string) => {
    setTrainReadinessModeOverrides((current) => ({
      ...current,
      [trainId]: getTrainReadinessModeFromCommand(command),
    }))
    void dispatch({ command, trainId, type: 'TRAIN_READINESS' })
  }

  const confirmInspectorDoorCommand = (trainId: string, command: TrainDoorCommand) => {
    void dispatch({ command, trainId, type: 'TRAIN_DOOR_COMMAND' })
  }

  const confirmInspectorTrainHold = (trainId: string, detail: string) => {
    void dispatch({ detail, trainId, type: 'TRAIN_HOLD' })
  }

  const animateTrainDepartureRoute = useCallback((
    trainId: string,
    arrivalDestinationsOverride?: Record<string, TrainTimeSelection>,
  ): TrainDepartureCommandResult => {
    const activeArrivalDestination = arrivalDestinationsOverride?.[trainId] ?? trainArrivalDestinations[trainId]
    const isDepotWithdrawalLeg = isRt2DepotDestinationSelection(activeArrivalDestination)
    const plan = createManualTrainRoutePlan({
      arrivalDestinations: arrivalDestinationsOverride ?? trainArrivalDestinations,
      lineMap: renderedLineMap,
      routeControlModes,
      trainId,
      trains: renderedTrains,
    })

    if (!plan.allowed) {
      void dispatch({ text: plan.reason, tone: 'warning', type: 'SHOW_NOTICE' })
      return { accepted: false, message: plan.reason }
    }

    // Moving a train is simulation, which runs on one Line Map window only.
    if (!isSimulationOwner) {
      return { accepted: false, message: 'This Line Map is view only. Use Take control to move trains from here.' }
    }

    cancelManualTrainRoutePlayback(trainId)
    setManualMovementTrainIds((current) => ({
      ...current,
      [trainId]: true,
    }))
    setLineMapRouteSegmentOverrides((current) => {
      return clearManualTrainRouteSegmentOverrides(current, plan.authority)
    })

    const { authority, currentStepIndex, lastStepIndex } = plan
    const shouldHandoffLaunchToTimetable = isRt1LaunchToSkgAuthority(authority)

    simulate((current) => applyManualTrainRouteStepState(current, trainId, authority, currentStepIndex))
    void dispatch({ routeLabel: authority.routeLabel, trainId, type: 'TRAIN_DEPARTURE' })

    const setTrainAtRouteStep = (stepIndex: number) => {
      simulate((current) => applyManualTrainRouteStepState(current, trainId, authority, stepIndex))

      if (stepIndex >= lastStepIndex && isActiveScenarioTargetTrain(sessionRef.current, trainId)) {
        void dispatch({
          depotLeg: isDepotWithdrawalLeg,
          launchHandoff: shouldHandoffLaunchToTimetable,
          routeLabel: authority.routeLabel,
          trainId,
          type: 'MANUAL_ROUTE_COMPLETED',
        })
      }
    }

    startManualTrainRoutePlayback({
      currentStepIndex,
      lastStepIndex,
      onComplete: () => {
        if (!shouldHandoffLaunchToTimetable) {
          return
        }

        setManualMovementTrainIds((current) => {
          if (!current[trainId]) {
            return current
          }

          const next = { ...current }
          delete next[trainId]
          return next
        })
        setTrainArrivalDestinations((current) => {
          if (!current[trainId]) {
            return current
          }

          const next = { ...current }
          delete next[trainId]
          return next
        })
      },
      onStep: setTrainAtRouteStep,
      stepDurationMs: MANUAL_TRAIN_ROUTE_STEP_DURATION_MS,
      trainId,
    })

    return { accepted: true }
  }, [cancelManualTrainRoutePlayback, dispatch, isSimulationOwner, renderedLineMap, renderedTrains, routeControlModes, setLineMapRouteSegmentOverrides, setManualMovementTrainIds, setTrainArrivalDestinations, simulate, startManualTrainRoutePlayback, trainArrivalDestinations])

  const openTrainContextMenu = (trainId: string, x: number, y: number) => {
    setInspectorPanel(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setDefineRouteSignal(null)
    setSignalMenu(null)
    setTrainMenu({ trainId, x, y })
    void dispatch({ trainId, type: 'SELECT_TRAIN', view: 'menu' })
  }

  const openSignalContextMenu = (signal: LineMapSignalData, x: number, y: number) => {
    setTrainMenu(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setDefineRouteSignal(null)
    setSignalMenu({ signal, x, y })
    void dispatch({
      text: `${getSignalEquipmentLabel(signal)} selected. Define Route is available from the signal menu.`,
      tone: 'info',
      type: 'SHOW_NOTICE',
    })
  }

  const openSignalDefineRoute = (signal: LineMapSignalData) => {
    if (getSignalRouteLabels(signal).length === 0) {
      setSignalMenu(null)
      return
    }

    setSignalMenu(null)
    setDefineRouteSignal(signal)
    void dispatch({ text: `${getSignalEquipmentLabel(signal)} route definition opened.`, tone: 'info', type: 'SHOW_NOTICE' })
  }

  const setRouteFromSignal = (signal: LineMapSignalData, routeLabel: string) => {
    if (!hasSignalRouteCommand(signal, routeLabel)) {
      return
    }

    const routeOwner = getSignalRouteTargetTrainForSession(session) ?? { id: '' }

    // Shown at once on this map; the server's route state follows.
    setLineMapRouteSegmentOverrides((current) => createSignalRouteSetOverrideSegments(current, signal, routeLabel, routeOwner))
    void dispatch({ routeLabel, set: true, signalLabel: signal.label, type: 'SIGNAL_ROUTE' })
  }

  const unsetRouteFromSignal = (signal: LineMapSignalData, routeLabel: string) => {
    if (!hasSignalRouteCommand(signal, routeLabel)) {
      return
    }

    setLineMapRouteSegmentOverrides((current) => createSignalRouteUnsetOverrideSegments(current, signal, routeLabel))
    void dispatch({ routeLabel, set: false, signalLabel: signal.label, type: 'SIGNAL_ROUTE' })
  }

  // Station panel commands (route, dispatch, hold) go to the train at that station.
  const requestTrainCommand = (command: TrainCommand, station: string) => {
    const trainId = getStationPanelTrain(session, station)?.id

    setTrainMenu(null)
    setSignalMenu(null)
    setDefineRouteSignal(null)
    setAuxiliaryPanel(null)
    setPendingCommand({ command, station, trainId })
    void dispatch({
      text: `SCADA command request opened at ${station}${trainId ? ` for Train ${trainId}` : ': no train at the station'}: ${command}.`,
      tone: 'info',
      type: 'SHOW_NOTICE',
    })
  }

  // The server checks the train is still at the station (and refuses if none is).
  const applyTrainCommand = (pending: { command: TrainCommand; station: string; trainId?: string }) => {
    void dispatch({ command: pending.command, station: pending.station, trainId: pending.trainId, type: 'SCADA_TRAIN_COMMAND' })
  }

  const getSvgUnitsPerPixel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()

    return MONITOR_WIDTH / bounds.width
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setTrainMenu(null)
    setSignalMenu(null)

    if (event.button !== 0) {
      return
    }

    const interactiveTarget = event.target instanceof Element
      ? event.target.closest('a, button, input, select, textarea, [role="button"], [role="link"], [role="tab"]')
      : null

    if (interactiveTarget) {
      return
    }

    cancelPanAnimation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startPan: panValueRef.current,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return
    }

    const unitsPerPixel = getSvgUnitsPerPixel(event)
    const delta = (event.clientX - dragRef.current.startX) * unitsPerPixel
    setPanImmediate(dragRef.current.startPan - delta)
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = null
  }

  useEffect(() => {
    panValueRef.current = panX
  }, [panX])

  useEffect(() => () => {
    cancelPanAnimation()
    cancelTrainRouteAnimation()
  }, [cancelPanAnimation, cancelTrainRouteAnimation])

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return
      }

      if (event.target.closest('.line-map-cascade, .line-map-signal-menu')) {
        return
      }

      setTrainMenu(null)
      setSignalMenu(null)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true)

    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  }, [])

  // Practice coach Show me / Locate (TrainingCoach.tsx) asks to bring a target into view.
  useEffect(() => {
    const handlePanRequest = (event: Event) => {
      const { x } = (event as CustomEvent<LineMapPanRequest>).detail

      if (Number.isFinite(x)) {
        panTo(lineMapPanShowing(x))
      }
    }

    window.addEventListener(LINE_MAP_PAN_EVENT, handlePanRequest)

    return () => window.removeEventListener(LINE_MAP_PAN_EVENT, handlePanRequest)
  }, [panTo])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        panBy(-MAP_PAN_STEP)
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        panBy(MAP_PAN_STEP)
      }

      if (event.key === 'Home') {
        event.preventDefault()
        panTo(0)
      }

      if (event.key === 'End') {
        event.preventDefault()
        panTo(MAP_PAN_MAX)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panBy, panTo])


  const { notAcknowledged: alarmNotAcknowledged, total: alarmTotal } = getAlarmSummaryCounts(session.alarmSummaryRows)
  const heldTrainIds = useMemo(() => new Set(
    session.timetableRows.filter((row) => row.state.startsWith('H')).map((row) => row.train),
  ), [session.timetableRows])

  return (
    <div className="occ-monitor-canvas">
      {!isSimulationOwner && (
        <div className="line-map-view-only" data-testid="line-map-view-only" role="status">
          <span>View only: trains run on another Line Map window.</span>
          <button type="button" onClick={onTakeSimulation}>Take control</button>
        </div>
      )}
      <LineMapMonitorDom
        alarmBannerRows={getAlarmBannerRows(session.alarmSummaryRows)}
        alarmNotAcknowledged={alarmNotAcknowledged}
        alarmTotal={alarmTotal}
        callLog={callLog}
        heldTrainIds={heldTrainIds}
        lineMap={renderedLineMap}
        psdFaultPlatform={session.scenarioMode === 'RUNNING'
          && getTrainingScenarioDefinition(session.activeScenario.id).fault?.psdIndicator
          ? session.activeScenario.faultLocation
          : undefined}
        onCommand={requestTrainCommand}
        onInspectTrain={(trainId) => openTrainInspector(trainId, 'information')}
        onNavigate={onNavigate}
        onOpenComms={setCommsChannel}
        onOpenSignalMenu={openSignalContextMenu}
        onOpenTrainMenu={openTrainContextMenu}
        onPanBy={panBy}
        onPanTo={panTo}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onSetRouteControlMode={setRouteControlMode}
        onWheel={(event) => {
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0

          if (delta !== 0) {
            event.preventDefault()
            panBy(delta > 0 ? MAP_PAN_STEP : -MAP_PAN_STEP)
          }
        }}
        panX={panX}
        routeAutomationStatus={`${routeAutomationSummary.text} | ${timetableRouteDiagnosticsSummary.text}`}
        routeControlModes={routeControlModes}
        selectedTrain={selectedTrain}
        selectedTrainId={session.selectedTrainId}
        trainOccupancyRouteSegments={trainOccupancyRouteSegments}
        trains={renderedTrains}
      >
        {commsChannel && (
          <CommsDialog
            channel={commsChannel}
            onClose={() => setCommsChannel(null)}
            onSend={(request) => void dispatch({ request, type: 'LOG_CALL' })}
            selectedTrainId={session.selectedTrainId}
            trainIds={session.trains.map((train) => train.id)}
          />
        )}
        {trainMenu && menuTrain && (
          <TrainContextMenu
            onClose={() => setTrainMenu(null)}
            onOpenAuxiliary={(view) => openTrainAuxiliary(menuTrain.id, view)}
            onOpenInspector={(page) => openTrainInspector(menuTrain.id, page)}
            train={menuTrain}
            x={trainMenu.x}
            y={trainMenu.y}
          />
        )}
        {signalMenu && (
          <SignalContextMenu
            onClose={() => setSignalMenu(null)}
            onDefineRoute={() => openSignalDefineRoute(signalMenu.signal)}
            onOpenDetails={() => {
              setSignalMenu(null)
              if (selectedTrain) {
                openTrainAuxiliary(selectedTrain.id, 'details')
              }
            }}
            onOpenInspector={() => {
              setSignalMenu(null)
              if (selectedTrain) {
                openTrainInspector(selectedTrain.id, 'information')
              }
            }}
            routeAvailable={getSignalRouteLabels(signalMenu.signal).length > 0}
            title={getSignalEquipmentLabel(signalMenu.signal)}
            x={signalMenu.x}
            y={signalMenu.y}
          />
        )}
        {defineRouteSignal && (
          <SignalRouteDefinitionWindow
            equipmentLabel={getSignalEquipmentLabel(defineRouteSignal)}
            key={defineRouteSignal.label}
            onClose={() => setDefineRouteSignal(null)}
            onSetFleetStatus={(routeLabel, fleetStatus) => {
              setRouteFleetStatuses((current) => ({
                ...current,
                [routeLabel]: fleetStatus,
              }))
            }}
            onSet={(routeLabel) => setRouteFromSignal(defineRouteSignal, routeLabel)}
            onUnset={(routeLabel) => unsetRouteFromSignal(defineRouteSignal, routeLabel)}
            routeCommandLabels={getSignalRouteCommandLabels(defineRouteSignal.label)}
            routeFleetControlDisabledLabels={getSignalRouteFleetControlDisabledLabels(defineRouteSignal.label)}
            routeFleetStatuses={routeFleetStatuses}
            routeLabels={getSignalRouteLabels(defineRouteSignal)}
            routeSetLabels={defineRouteSetLabels}
            signalLabel={defineRouteSignal.label}
            statusText={defineRouteSet ? 'Route set successful' : 'Route not set'}
          />
        )}
        {auxiliaryPanel && auxiliaryTrain && (
          <TrainAuxiliaryPanel
            onClose={() => setAuxiliaryPanel(null)}
            train={auxiliaryTrain}
            view={auxiliaryPanel.view}
          />
        )}
        {pendingCommand && (
          <ScadaCommandDialog
            command={pendingCommand.command}
            onApply={() => {
              const pending = pendingCommand
              setPendingCommand(null)
              applyTrainCommand(pending)
            }}
            onClose={() => setPendingCommand(null)}
            train={session.trains.find((train) => train.id === pendingCommand.trainId)}
          />
        )}
        {itamaTrain && (
          <ItamaStatusPanel
            onAcknowledge={() => void dispatch({ trainId: itamaTrain.id, type: 'ITAMA_ACK' })}
            onClose={() => setItamaTrainId('')}
            train={itamaTrain}
          />
        )}
      </LineMapMonitorDom>
      {inspectorPanel && inspectorTrain && (
        <TrainInspectorPanel
          arrivalTimeSelection={trainArrivalDestinations[inspectorTrain.id]}
          onClose={() => setInspectorPanel(null)}
          onConfirmItamaAuthorised={() => confirmInspectorItamaAuthorised(inspectorTrain.id)}
          onConfirmItamaAuthorisedPreparation={() => confirmInspectorItamaAuthorisedPreparation(inspectorTrain.id)}
          onConfirmItamaNotAuthorised={() => confirmInspectorItamaNotAuthorised(inspectorTrain.id)}
          onConfirmItamaNotAuthorisedPreparation={() => confirmInspectorItamaNotAuthorisedPreparation(inspectorTrain.id)}
          onConfirmArrivalTime={(selection) => {
            const manualArrivalDestination = toManualArrivalDestination(selection)
            const scenarioArrivalDestination = manualArrivalDestination ?? selection

            setTrainArrivalDestinations((current) => ({
              ...current,
              [inspectorTrain.id]: scenarioArrivalDestination,
            }))
            if (manualArrivalDestination) {
              setManualMovementTrainIds((current) => ({
                ...current,
                [inspectorTrain.id]: true,
              }))
            }
            void dispatch({
              direction: getTrainMarkerDirectionForTimeSelection(scenarioArrivalDestination, inspectorTrain.direction),
              platformSiding: scenarioArrivalDestination.platformSiding,
              station: scenarioArrivalDestination.station,
              trainId: inspectorTrain.id,
              type: 'ARRIVAL_DESTINATION',
            })
          }}
          onConfirmDepartureTime={(selection) => {
            const storedArrivalDestination = trainArrivalDestinations[inspectorTrain.id]
            const manualDestination = toManualArrivalDestination(storedArrivalDestination)
              ?? toManualArrivalDestination(selection)
            const scenarioArrivalDestination = manualDestination ?? selection
            const directionSelection = manualDestination ?? selection

            const arrivalDestinationsForDeparture = manualDestination
              ? {
                  ...trainArrivalDestinations,
                  [inspectorTrain.id]: manualDestination,
                }
              : trainArrivalDestinations

            if (manualDestination && !isManualDestinationSelection(storedArrivalDestination)) {
              setTrainArrivalDestinations((current) => ({
                ...current,
                [inspectorTrain.id]: manualDestination,
              }))
            }
            if (manualDestination) {
              setManualMovementTrainIds((current) => ({
                ...current,
                [inspectorTrain.id]: true,
              }))
            }

            if (
              !storedArrivalDestination?.station.trim()
              && !storedArrivalDestination?.platformSiding.trim()
              && !selection.station.trim()
              && !selection.platformSiding.trim()
            ) {
              return { accepted: true }
            }

            // A manual destination given with the departure counts as declaring it.
            void dispatch({
              direction: getTrainMarkerDirectionForTimeSelection(directionSelection, inspectorTrain.direction),
              fromDeparture: true,
              platformSiding: scenarioArrivalDestination.platformSiding,
              station: scenarioArrivalDestination.station,
              trainId: inspectorTrain.id,
              type: 'ARRIVAL_DESTINATION',
            })
            return animateTrainDepartureRoute(inspectorTrain.id, arrivalDestinationsForDeparture)
          }}
          onConfirmDoorCommand={(command) => confirmInspectorDoorCommand(inspectorTrain.id, command)}
          onConfirmTrainHold={(detail) => confirmInspectorTrainHold(inspectorTrain.id, detail)}
          onConfirmReadiness={(command) => confirmInspectorReadiness(inspectorTrain.id, command)}
          onOpenDetails={() => showItamaForTrain(inspectorTrain.id)}
          onPageChange={(page) => setInspectorPanel({ ...inspectorPanel, page })}
          page={inspectorPanel.page}
          train={inspectorTrain}
        />
      )}
    </div>
  )
}

export default App
