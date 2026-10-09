import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import './App.css'
import controlTabIcon from './assets/control-tab-icon.png'
import type { OccSessionAction } from './backendClient'
import { applyCommsRequest, getCommsLog } from './comms/commsCatalog'
import type { CommsChannel } from './comms/commsCatalog'
import { CommonFooterSvg } from './components/LegacyScadaFooter'
import MonitorWorkspace from './components/MonitorWorkspace'
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
  getTrainDoorCommandLabel,
  getTrainDoorCommandRejectionMessage,
  getTrainDoorCommandStatusMessage,
  getTrainDoorCommandValue,
  getTrainDoorFailureState,
  getTrainDoorFaultDisplayValue,
  getTrainDoorIsolationStatus,
  getTrainDoorStateAfterCommand,
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
  MONITOR_HEIGHT,
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
  getLineMapRouteStatus,
  getSignalEquipmentLabel,
  getSignalRouteLabels,
  updateLineMapRouteState,
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
  applySignalRouteSetSession,
  applySignalRouteUnsetSession,
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
import { appendScenarioEvidence, createScenarioEvidence } from './scenario'
import {
  createMonitorEvent,
  createSummaryEvent,
  formatAlarmSummaryTimestamp,
  formatScenarioTime,
  rejectScenarioAction,
  scenarioSteps,
  submitBackendScenarioAction,
  upsertTimetableRow,
} from './scenarioWorkflow'
import type { MonitorLaunchRequest, ScreenRegistration } from './sessionTransport'
import {
  getAlarmSummaryCounts,
  getTimetablePlaybackTrainIdSet,
  trainingModeDetails,
  useOccSession,
} from './sessionState'
import { getTimetableClockNow } from './timetableClockState'
import {
  applyTrainingScenarioRuntimeEvent,
  applyTrainingScenarioTrainSelection,
  createTrainingScenarioStartSession,
  pickRandomFaultLocation,
  getActiveTrainingScenarioTargetTrainId,
  getTrainingScenarioTrainActionDetail,
  getTrainingScenarioDefinition,
  isActiveTrainingScenarioTargetTrain,
  scoreTrainingScenario,
} from './trainingScenarios'
import type { TrainingScenarioKind } from './trainingScenarios'
import LoginPage from './screens/LoginPage'
import type {
  AlarmSummaryRow,
  AppRoute,
  LineMapRuntimeState,
  MonitorAlarmRow,
  OccSessionState,
  RouteControlMode,
  ScenarioNoticeTone,
  TrainingMode,
  TrainCommand,
  TrainReadinessMode,
  TrainState,
  TrainStatus,
} from './types'

const AssessmentRubricScreen = lazy(() => import('./screens/AssessmentRubricScreen'))
const IosModulesScreen = lazy(() => import('./screens/IosModulesScreen'))
const ReportScreen = lazy(() => import('./screens/ReportScreen'))
const ScenarioBuilderScreen = lazy(() => import('./screens/ScenarioBuilderScreen'))
const TraineeLobbyScreen = lazy(() => import('./screens/TraineeLobbyScreen'))

if (import.meta.env.DEV) {
  warnLineMapRouteValidationIssues()
}

function getActiveScenarioTargetTrainId(session: OccSessionState) {
  return getActiveTrainingScenarioTargetTrainId(session)
}

function isRt1LaunchToSkgAuthority(authority: AllowedTrainMovementAuthority) {
  return authority.service === 'NB' && authority.routeLabels.includes(RT1_LAUNCH_ROUTE_LABEL)
}

function isActiveScenarioTargetTrain(session: OccSessionState, trainId: string) {
  return isActiveTrainingScenarioTargetTrain(session, trainId)
}

function normalizeTrainTimeSelectionValue(value: string | undefined) {
  return (value ?? '').trim().toUpperCase()
}

function isRt2DepotDestinationSelection(selection: TrainTimeSelection | undefined) {
  return normalizeTrainTimeSelectionValue(selection?.station) === 'NED'
    && normalizeTrainTimeSelectionValue(selection?.platformSiding) === 'RT2D'
}

function isManualDestinationSelection(selection: TrainTimeSelection | undefined) {
  const station = normalizeTrainTimeSelectionValue(selection?.station)
  const platformSiding = normalizeTrainTimeSelectionValue(selection?.platformSiding)

  return (station === 'NED' && platformSiding === 'RT2D')
    || (station === 'SKG' && platformSiding === 'SKGS')
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

function isTrainingScenarioDefinitionTaskComplete(session: OccSessionState, taskId: string) {
  return scoreTrainingScenario(session).taskResults.some((task) => task.id === taskId && task.complete)
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
    path === '/report'
  ) {
    return path
  }

  return '/'
}

// Routes that should register as active backend participants in the OCC training session.
const screenRegistrationByRoute: Partial<Record<AppRoute, ScreenRegistration>> = {
  '/ios': { label: 'IOS Trainer Control', role: 'IOS', route: '/ios' },
  '/ios/modules': { label: 'IOS Trainer Modules', role: 'IOS', route: '/ios/modules' },
  '/ios/scenarios': { label: 'Scenario Builder', role: 'IOS', route: '/ios/scenarios' },
  '/report': { label: 'Post-Session Report', role: 'REPORT', route: '/report' },
  '/screen/alarms': { label: 'Monitor 01 - Alarms', role: 'ALARM', route: '/screen/alarms' },
  '/screen/line-map': { label: 'Monitor 02 - Line Map', role: 'LINE_MAP', route: '/screen/line-map' },
  '/screen/timetable': { label: 'Monitor 03 - Timetable', role: 'TIMETABLE', route: '/screen/timetable' },
  '/session/join': { label: 'Session Lobby', role: 'LOBBY', route: '/session/join' },
}

function App() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
  const {
    registerScreen,
    requestMonitorPeerLaunch,
    resetSession,
    session,
    subscribeMonitorLaunch,
    updateSession,
  } = useOccSession()

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute())
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
  }, [registerScreen, route])

  const navigate = (nextRoute: AppRoute) => {
    window.history.pushState(null, '', nextRoute)
    setRoute(nextRoute)
  }

  if (route === '/screen/line-map') {
    return (
      <LineMapScreen
        onNavigate={navigate}
        requestMonitorPeerLaunch={requestMonitorPeerLaunch}
        session={session}
        subscribeMonitorLaunch={subscribeMonitorLaunch}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/screen/alarms') {
    return <AlarmsScreen onNavigate={navigate} session={session} updateSession={updateSession} />
  }

  if (route === '/screen/timetable') {
    return <TimetableScreen onNavigate={navigate} session={session} updateSession={updateSession} />
  }

  if (route === '/ios') {
    return (
      <IosScreen
        onNavigate={navigate}
        resetSession={resetSession}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/ios/modules') {
    return (
      <Suspense fallback={null}>
        <IosModulesScreen
          onNavigate={navigate}
          resetSession={resetSession}
          session={session}
          updateSession={updateSession}
        />
      </Suspense>
    )
  }

  if (route === '/ios/scenarios') {
    return (
      <Suspense fallback={null}>
        <ScenarioBuilderScreen
          onNavigate={navigate}
          session={session}
          updateSession={updateSession}
        />
      </Suspense>
    )
  }

  if (route === '/ios/assessment') {
    return (
      <Suspense fallback={null}>
        <AssessmentRubricScreen onNavigate={navigate} session={session} />
      </Suspense>
    )
  }

  if (route === '/session/join') {
    return (
      <Suspense fallback={null}>
        <TraineeLobbyScreen
          session={session}
          updateSession={updateSession}
        />
      </Suspense>
    )
  }

  if (route === '/report') {
    return (
      <Suspense fallback={null}>
        <ReportScreen onNavigate={navigate} session={session} />
      </Suspense>
    )
  }

  return <LoginPage onNavigate={navigate} resetSession={resetSession} />
}

function LineMapScreen({
  onNavigate,
  requestMonitorPeerLaunch,
  session,
  subscribeMonitorLaunch,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  requestMonitorPeerLaunch: () => string
  session: OccSessionState
  subscribeMonitorLaunch: (subscriber: (request: MonitorLaunchRequest) => void) => () => void
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const [monitorLaunchStatus, setMonitorLaunchStatus] = useState('Peer monitors ready')
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
      <MonitorCanvas onNavigate={onNavigate} session={session} updateSession={updateSession} />
    </MonitorWorkspace>
  )
}

function IosScreen({
  onNavigate,
  resetSession,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  return (
    <MonitorWorkspace
      monitorLabel="IOS - TRAINER CONTROL"
      onNavigate={onNavigate}
      session={session}
      title="Instructor Operating Station"
    >
      <IosCanvas
        onNavigate={onNavigate}
        resetSession={resetSession}
        session={session}
        updateSession={updateSession}
      />
    </MonitorWorkspace>
  )
}

function IosCanvas({
  onNavigate,
  resetSession,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const selectedTrain = session.trains.find((train) => train.id === session.selectedTrainId) ?? session.trains[0]
  const trainingMode = trainingModeDetails[session.trainingMode]
  const activeScenarioDefinition = getTrainingScenarioDefinition(session.activeScenario.id)
  const trainingScenarioScore = scoreTrainingScenario(session)
  const scenarioScore = trainingScenarioScore.score
  const nextScenarioTask = trainingScenarioScore.taskResults.find((task) => !task.complete)
  const scenarioIsIdle = activeScenarioDefinition.tasks.length === 0
  const cuePrimary = nextScenarioTask
    ? `Next: ${nextScenarioTask.label}`
    : scenarioIsIdle
      ? 'No scenario armed.'
      : 'All scenario tasks complete.'
  const cueSecondary = nextScenarioTask
    ? `${nextScenarioTask.monitor} | ${nextScenarioTask.weight}%`
    : scenarioIsIdle
      ? 'Choose a scenario below or in Scenario setup.'
      : 'Press Complete, then open the Report.'
  const noticeFill = session.scenarioNotice.tone === 'warning'
    ? '#ff0000'
    : session.scenarioNotice.tone === 'success'
      ? '#008000'
      : '#000080'
  const noticeLines = wrapIosText(session.scenarioNotice.text, 76, 2)
  const checklistSpacing = Math.min(42, 196 / Math.max(1, trainingScenarioScore.taskResults.length))
  const checklistRowHeight = checklistSpacing - 6
  const iosTrainListRows = [...session.trains]
    .sort((left, right) => {
      const visibleRank = Number(right.lineMapVisible !== false) - Number(left.lineMapVisible !== false)

      return visibleRank || Number(left.id) - Number(right.id)
    })
    .slice(0, 8)

  const startTrainingScenario = (kind: TrainingScenarioKind) => {
    updateSession((current) => createTrainingScenarioStartSession(current, kind, undefined, {
      faultLocation: pickRandomFaultLocation(current),
    }))
  }

  const selectTrainingMode = (nextMode: TrainingMode) => {
    updateSession((current) => {
      const event = createMonitorEvent('317', `Trainer selected ${trainingModeDetails[nextMode].label} mode`, nextMode, 'yellow')

      return {
        ...current,
        alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        scenarioNotice: {
          text: trainingModeDetails[nextMode].cue,
          tone: 'info',
        },
        trainingMode: nextMode,
      }
    })
  }

  const setTrainStatus = (trainId: string, status: TrainStatus, reason: string, tone: MonitorAlarmRow['tone'] = 'yellow') => {
    const event = createMonitorEvent(trainId, reason, status, tone)
    const backendAction: OccSessionAction['type'] = status === 'RUN'
      ? 'DISPATCH_TRAIN'
      : status === 'WAIT'
        ? 'SET_ROUTE'
        : 'SELECT_TRAIN'

    // IOS train-control commands are scored by the backend validator first.
    submitBackendScenarioAction(session, updateSession, {
      detail: `Operator task accepted: ${reason}`,
      source: 'IOS Train Control',
      trainId,
      type: backendAction,
    }, (current) => {
      const scenarioTargetTrainId = getActiveScenarioTargetTrainId(current)

      if (trainId !== scenarioTargetTrainId) {
        return rejectScenarioAction(
          current,
          `Scenario target is Train ${scenarioTargetTrainId}. Select Train ${scenarioTargetTrainId} for route and dispatch.`,
          trainId,
          'IOS Train Control',
        )
      }

      const guard = status === 'RUN'
        ? applyTrainingScenarioRuntimeEvent(current, {
            source: 'IOS Train Control',
            trainId,
            type: 'DEPARTURE_TIME_CONFIRMED',
          })
        : status === 'WAIT'
          ? applyTrainingScenarioRuntimeEvent(current, {
              routeLabel: 'IOS Train Control route command',
              source: 'IOS Train Control',
              trainId,
              type: 'ROUTE_SET',
            })
          : applyTrainingScenarioTrainSelection(current, 'IOS Train Control', trainId)

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event, tone === 'red' ? 'red' : 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        selectedTrainId: trainId,
        lineMap: updateLineMapRouteState(current.lineMap, { id: trainId }, getLineMapRouteStatus(status)),
        timetableRows: upsertTimetableRow(current.timetableRows, trainId, status === 'HOLD' ? 'H>' : status === 'RUN' ? '>' : 'R'),
        trains: current.trains.map((train) => (
          train.id === trainId ? { ...train, status } : train
        )),
      }
    })
  }

  const completeScenarioReview = () => {
    const scenarioTargetTrainId = getActiveScenarioTargetTrainId(session)

    submitBackendScenarioAction(session, updateSession, {
      detail: 'Scenario review complete. Report is ready.',
      source: 'IOS Trainer Review',
      trainId: scenarioTargetTrainId,
      type: 'COMPLETE_SCENARIO',
    }, (current) => {
      const event = createMonitorEvent(
        scenarioTargetTrainId,
        `Scenario complete: Trainer reviewed ${current.activeScenario.title}`,
        'COMPLETE',
        'yellow',
      )
      const guard = applyTrainingScenarioRuntimeEvent(current, {
        source: 'IOS Trainer Review',
        type: 'SCENARIO_REVIEWED',
      })

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        scenarioMode: 'COMPLETE',
        scenarioStep: scenarioSteps.length - 1,
      }
    })
  }

  const openMonitor = (route: AppRoute, name: string) => {
    window.open(route, name)
  }

  return (
    <svg className="occ-monitor-svg" viewBox={`0 0 ${MONITOR_WIDTH} ${MONITOR_HEIGHT}`} role="img" aria-label="Instructor operating station">
      <rect width={MONITOR_WIDTH} height={MONITOR_HEIGHT} fill="#c0c0c0" />
      <rect x="0" y="0" width={MONITOR_WIDTH} height="44" fill="#000080" />
      <text className="svg-ios-title" x="14" y="29">Instructor Operating Station - OCC Scenario Control</text>
      <text className="svg-ios-clock" x="1260" y="28" textAnchor="end">{session.activeScenario.title}  |  {session.trainingMode}  |  {session.cycleMode}</text>

      <IosPanel x={14} y={60} w={396} h={260} title="SCENARIO CONTROL">
        <text className="svg-ios-label" x="34" y="112">Active scenario</text>
        <rect x="34" y="126" width="336" height="32" fill="#ffffff" stroke="#404040" />
        <text className="svg-ios-value" x="44" y="148">{session.scenarioMode} - {session.activeScenario.title}</text>
        {!scenarioIsIdle && <text className="svg-ios-label" x="34" y="174">Target: {activeScenarioDefinition.target}</text>}
        <rect x="34" y="184" width="336" height="46" fill="#ffffcc" stroke="#808000" />
        <text className="svg-ios-cue" x="44" y="203">{cuePrimary}</text>
        <text className="svg-ios-cue" x="44" y="219">{cueSecondary}</text>
        <IosButton x={34} y={242} w={105} label="Launch" onClick={() => startTrainingScenario('TRAIN_LAUNCH')} />
        <IosButton x={148} y={242} w={105} label="Withdraw" onClick={() => startTrainingScenario('TRAIN_WITHDRAWAL')} />
        <IosButton x={262} y={242} w={100} label="Door Fault" onClick={() => startTrainingScenario('DOOR_FAULT')} />
        <IosButton x={34} y={282} w={105} label="Reset" onClick={() => resetSession(session.trainingMode)} />
        <IosButton x={148} y={282} w={105} label="PSD Fault" onClick={() => startTrainingScenario('PSD_FAULT')} />
      </IosPanel>

      <IosPanel x={430} y={60} w={396} h={250} title="TRAIN CONTROL">
        <text className="svg-ios-label" x="450" y="112">Selected train</text>
        <rect x="450" y="126" width="90" height="46" fill="#aab4c2" stroke="#000" strokeWidth="2" />
        <text className="svg-ios-train" x="495" y="156" textAnchor="middle">{selectedTrain.id}</text>
        <text className="svg-ios-value" x="560" y="142">Service: {selectedTrain.service}</text>
        <text className="svg-ios-value" x="560" y="162">Status: {selectedTrain.status}</text>
        <text className="svg-ios-label" x="450" y="186">Incident: {session.activeScenario.incident}</text>
        <IosButton x={450} y={206} w={100} label="Hold" onClick={() => setTrainStatus(selectedTrain.id, 'HOLD', `Instructor command: Train ${selectedTrain.id} hold`, 'orange')} />
        <IosButton x={562} y={206} w={100} label="Dispatch" onClick={() => setTrainStatus(selectedTrain.id, 'RUN', `Instructor command: Train ${selectedTrain.id} dispatch`, 'yellow')} />
        <IosButton x={674} y={206} w={100} label="Route" onClick={() => setTrainStatus(selectedTrain.id, 'WAIT', `Instructor command: Train ${selectedTrain.id} route selected`, 'yellow')} />
        <text className="svg-ios-label" x="450" y="260">Training mode</text>
        <IosButton x={450} y={272} w={100} active={session.trainingMode === 'PRACTICE'} label="Practice" onClick={() => selectTrainingMode('PRACTICE')} />
        <IosButton x={562} y={272} w={100} active={session.trainingMode === 'ASSESSMENT'} label="Assess" onClick={() => selectTrainingMode('ASSESSMENT')} />
        <IosButton x={674} y={272} w={100} active={session.trainingMode === 'PLAYER'} label="Player" onClick={() => selectTrainingMode('PLAYER')} />
      </IosPanel>

      <IosPanel x={846} y={60} w={414} h={250} title="MONITOR LINKS">
        <IosLinkStatus x={868} y={116} label="Alarms monitor" route="/screen/alarms" onOpen={openMonitor} />
        <IosLinkStatus x={868} y={166} label="Line map monitor" route="/screen/line-map" onOpen={openMonitor} />
        <IosLinkStatus x={868} y={216} label="Timetable monitor" route="/screen/timetable" onOpen={openMonitor} />
        <IosButton x={868} y={258} w={112} label="Report" onClick={() => onNavigate('/report')} />
        <IosButton x={992} y={258} w={112} label="Complete" onClick={completeScenarioReview} />
        <text className="svg-ios-label" x="1118" y="278">Updated: {new Date(session.updatedAt).toLocaleTimeString()}</text>
      </IosPanel>

      <IosPanel x={14} y={330} w={580} h={330} title="OPERATOR CHECKLIST">
        <rect x="34" y="348" width="526" height="40" fill={session.scenarioNotice.tone === 'warning' ? '#fff0f0' : '#f8f8f8'} stroke={noticeFill} />
        {noticeLines.map((line, index) => (
          <text className="svg-ios-notice" x="44" y={364 + index * 16} fill={noticeFill} key={line}>{line}</text>
        ))}
        <text className="svg-ios-label" x="34" y="414">Scenario progress</text>
        <rect x="164" y="400" width="290" height="20" fill="#ffffff" stroke="#000000" />
        <rect x="166" y="402" width={Math.max(0, Math.min(286, scenarioScore * 2.86))} height="16" fill={scenarioScore === 100 ? '#00c800' : '#ffff00'} />
        <text className="svg-ios-value" x="470" y="415">{scenarioScore}%</text>
        {trainingScenarioScore.taskResults.map((task, index) => {
          const complete = task.complete
          const top = 432 + index * checklistSpacing
          const textY = top + (checklistRowHeight / 2) + 5

          return (
            <g key={task.id}>
              <rect x="34" y={top} width="526" height={checklistRowHeight} fill={complete ? '#d8ffd8' : '#ffffff'} stroke="#808080" />
              <rect x="48" y={textY - 13} width="16" height="16" fill={complete ? '#00c800' : '#c0c0c0'} stroke="#000" />
              {complete && <text className="svg-ios-value" x="50" y={textY}>OK</text>}
              <text className="svg-ios-value" x="78" y={textY}>{task.label}</text>
              <text className="svg-ios-label" x="380" y={textY}>{task.monitor}</text>
            </g>
          )
        })}
      </IosPanel>

      <IosPanel x={614} y={330} w={646} h={330} title={`TRAIN LIST - ${session.trains.length} trains - ${session.timetableName}`}>
        {iosTrainListRows.map((train, index) => (
          <g
            className="svg-clickable"
            onClick={() => submitBackendScenarioAction(session, updateSession, {
              detail: getTrainingScenarioTrainActionDetail(session, train.id, `Train ${train.id} selected`),
              source: 'IOS Train List',
              trainId: train.id,
              type: 'SELECT_TRAIN',
            }, (current) => {
              const selection = applyTrainingScenarioTrainSelection(current, 'IOS Train List', train.id)

              if (!selection.allowed) {
                return selection.next
              }

              const selected = selection.next

              return {
                ...selected,
                scenarioNotice: isActiveScenarioTargetTrain(selected, train.id)
                  ? { text: `Train ${train.id} selected for ${selected.activeScenario.title}.`, tone: 'info' }
                  : { text: `Scenario target is Train ${getActiveScenarioTargetTrainId(selected)}.`, tone: 'warning' },
                selectedTrainId: train.id,
              }
            })}
            transform={`translate(638 ${380 + index * 34})`}
            key={train.id}
          >
            <rect width="526" height="28" fill={train.id === session.selectedTrainId ? '#000080' : '#ffffff'} stroke="#808080" />
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="14" y="19">TRN {train.id}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="120" y="19">{train.service}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="220" y="19">{train.status}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="330" y="19">{train.scheduleNumber ? `Sched ${train.scheduleNumber}` : ''}</text>
          </g>
        ))}
      </IosPanel>

      <IosPanel x={14} y={682} w={580} h={244} title="SCENARIO TIMELINE">
        {trainingScenarioScore.taskResults.length > 0 ? (
          trainingScenarioScore.taskResults.map((task, index) => (
            <IosTimelineStep
              x={38}
              y={734 + index * 30}
              active={task.complete}
              current={!task.complete && task.id === nextScenarioTask?.id}
              label={String(index + 1).padStart(2, '0')}
              text={`${task.monitor}: ${task.label}`}
              key={task.id}
            />
          ))
        ) : (
          <IosTimelineStep
            x={38}
            y={734}
            active={session.scenarioMode !== 'IDLE'}
            current={session.scenarioMode === 'IDLE'}
            label="00"
            text="No scenario armed"
          />
        )}
      </IosPanel>

      <rect x="614" y="682" width="646" height="244" fill="#b8b8b8" stroke="#ffffff" />
      <text className="svg-ios-panel-title" x="630" y="710">Live Event Feed</text>
      {session.eventRows.map((row, index) => (
        <g transform={`translate(630 ${730 + index * 42})`} key={`${row.time}-${row.message}`}>
          <rect width="606" height="34" fill={row.tone === 'red' ? '#ff0000' : row.tone === 'orange' ? '#ff9900' : '#ffff00'} stroke="#000" />
          <text className="svg-ios-feed" x="12" y="22">{row.time}</text>
          <text className="svg-ios-feed" x="150" y="22">{row.asset}</text>
          <text className="svg-ios-feed" x="330" y="22">{row.value}</text>
          <text className="svg-ios-feed" x="420" y="22">{row.message.slice(0, 26)}</text>
        </g>
      ))}

      <CommonFooterSvg active="ADMIN" leftMode="Train" status={`${trainingMode.label} | IOS TRN ${selectedTrain.id} ${selectedTrain.status}`} />
    </svg>
  )
}

// SVG text does not wrap, so split IOS notices on word boundaries.
function wrapIosText(text: string, maxChars: number, maxLines: number) {
  const lines: string[] = []
  let current = ''

  text.split(/\s+/).filter(Boolean).forEach((word) => {
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  })

  if (current) {
    lines.push(current)
  }

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxChars - 3)}...`
    return kept
  }

  return lines
}

function IosPanel({
  children,
  h,
  title,
  w,
  x,
  y,
}: {
  children: ReactNode
  h: number
  title: string
  w: number
  x: number
  y: number
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#c0c0c0" stroke="#ffffff" strokeWidth="2" />
      <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill="none" stroke="#808080" />
      <rect x={x + 8} y={y + 8} width={w - 16} height="26" fill="#000080" />
      <text className="svg-ios-panel-title" x={x + 18} y={y + 27}>{title}</text>
      {children}
    </g>
  )
}

function IosButton({
  active,
  label,
  onClick,
  w,
  x,
  y,
}: {
  active?: boolean
  label: string
  onClick: () => void
  w: number
  x: number
  y: number
}) {
  return (
    <g className="svg-clickable" onClick={onClick} transform={`translate(${x} ${y})`}>
      <rect width={w} height="32" fill={active ? '#ffff00' : '#c0c0c0'} stroke="#ffffff" strokeWidth="2" />
      <rect x="2" y="2" width={w - 4} height="28" fill="none" stroke="#404040" />
      <text className="svg-ios-button" x={w / 2} y="21" textAnchor="middle">{label}</text>
    </g>
  )
}

function IosLinkStatus({
  label,
  onOpen,
  route,
  x,
  y,
}: {
  label: string
  onOpen: (route: AppRoute, name: string) => void
  route: AppRoute
  x: number
  y: number
}) {
  return (
    <g>
      <circle cx={x + 8} cy={y - 5} r="7" fill="#00c800" stroke="#006000" />
      <text className="svg-ios-value" x={x + 24} y={y}>{label}: ONLINE</text>
      <IosButton x={x + 230} y={y - 22} w={112} label="Open" onClick={() => onOpen(route, label)} />
    </g>
  )
}

function IosTimelineStep({
  active,
  current,
  label,
  text,
  x = 638,
  y,
}: {
  active: boolean
  current?: boolean
  label: string
  text: string
  x?: number
  y: number
}) {
  return (
    <g>
      <rect x={x} y={y - 22} width="532" height="26" fill={current ? '#ffffcc' : active ? '#ffffff' : '#a8a8a8'} stroke={current ? '#000080' : '#808080'} strokeWidth={current ? 2 : 1} />
      <rect x={x + 12} y={y - 15} width="12" height="12" fill={current ? '#ffff00' : active ? '#00c800' : '#808080'} stroke="#000" />
      <text className="svg-ios-value" x={x + 34} y={y - 4}>{label}</text>
      <text className="svg-ios-value" x={x + 88} y={y - 4}>{text}</text>
    </g>
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

function MonitorCanvas({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const [panX, setPanX] = useState<number>(DEFAULT_LINE_MAP_PAN)
  const [inspectorPanel, setInspectorPanel] = useState<{ page: InspectorPage; trainId: string } | null>(null)
  const [auxiliaryPanel, setAuxiliaryPanel] = useState<{ trainId: string; view: TrainAuxiliaryView } | null>(null)
  const [itamaTrainId, setItamaTrainId] = useState('')
  const [pendingCommand, setPendingCommand] = useState<TrainCommand | null>(null)
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
    updateSession((current) => {
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
  }, [session.lineMap, updateSession])
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
    updateSession,
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
    submitBackendScenarioAction(session, updateSession, {
      detail: getTrainingScenarioTrainActionDetail(session, trainId, `Train ${trainId} ITAMA opened`),
      source: 'Monitor 02 Line Map',
      trainId,
      type: 'SELECT_TRAIN',
    }, (current) => {
      const selection = applyTrainingScenarioTrainSelection(current, 'Monitor 02 Line Map', trainId)

      if (!selection.allowed) {
        return selection.next
      }

      const selected = selection.next

      return {
        ...selected,
        evidenceLog: appendScenarioEvidence(
          selected.evidenceLog,
          createScenarioEvidence(
            'Monitor 02 Line Map',
            'ITAMA opened',
            'info',
            `ITAMA status opened for Train ${trainId}.`,
          ),
        ),
        scenarioNotice: isActiveScenarioTargetTrain(selected, trainId)
          ? { text: `Train ${trainId} ITAMA status opened for ${selected.activeScenario.title}.`, tone: 'info' }
          : { text: `ITAMA status opened for Train ${trainId}. Scenario target remains Train ${getActiveScenarioTargetTrainId(selected)}.`, tone: 'warning' },
        selectedTrainId: trainId,
      }
    })
  }

  const openTrainInspector = (trainId: string, page: InspectorPage) => {
    setTrainMenu(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setInspectorPanel({ trainId, page })
    updateSession((current) => {
      const selection = applyTrainingScenarioTrainSelection(current, 'Monitor 02 Line Map', trainId)

      if (!selection.allowed) {
        return selection.next
      }

      const selected = selection.next

      return {
        ...selected,
        evidenceLog: appendScenarioEvidence(
          selected.evidenceLog,
          createScenarioEvidence(
            'Monitor 02 Line Map',
            `Inspector ${page} opened`,
            'info',
            `Inspecting page opened for Train ${trainId}.`,
          ),
        ),
        scenarioNotice: isActiveScenarioTargetTrain(selected, trainId)
          ? { text: `Train ${trainId} inspector ${page} page opened for ${selected.activeScenario.title}.`, tone: 'info' }
          : { text: `Train ${trainId} inspector opened. Active scenario target remains Train ${getActiveScenarioTargetTrainId(selected)}.`, tone: 'warning' },
        selectedTrainId: trainId,
      }
    })
  }

  const openTrainAuxiliary = (trainId: string, view: TrainAuxiliaryView) => {
    const meta: Record<TrainAuxiliaryView, {
      action: string
      message: string
      notice: string
      noticeTone: ScenarioNoticeTone
      summaryTone?: AlarmSummaryRow['tone']
      tone: MonitorAlarmRow['tone']
      value: string
    }> = {
      alarms: {
        action: 'Train alarm list opened',
        message: `Train ${trainId}: Active alarms opened`,
        notice: `Train ${trainId} active alarm list opened from line map.`,
        noticeTone: 'warning',
        summaryTone: 'red',
        tone: 'red',
        value: 'ALARM LIST',
      },
      cctv: {
        action: 'Restricted CCTV selected',
        message: `Train ${trainId}: Restricted CCTV request`,
        notice: `Restricted CCTV request opened for Train ${trainId}.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'CCTV',
      },
      details: {
        action: 'Train details opened',
        message: `Train ${trainId}: Details page opened`,
        notice: `Train ${trainId} details page opened.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'DETAILS',
      },
      'pec-reset': {
        action: 'PEC reset requested',
        message: `Train ${trainId}: PEC Reset All request`,
        notice: `PEC Reset All request prepared for Train ${trainId}. No reset applied.`,
        noticeTone: 'warning',
        summaryTone: 'yellow',
        tone: 'orange',
        value: 'PEC RESET',
      },
      pis: {
        action: 'Restricted PIS selected',
        message: `Train ${trainId}: Restricted PIS request`,
        notice: `Restricted PIS request opened for Train ${trainId}.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'PIS',
      },
      regulation: {
        action: 'Regulation parameters opened',
        message: `Train ${trainId}: Regulation parameters opened`,
        notice: `Train ${trainId} regulation parameters opened.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'REG PARAM',
      },
    }
    const item = meta[view]

    setTrainMenu(null)
    setInspectorPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setAuxiliaryPanel({ trainId, view })
    updateSession((current) => {
      const event = createMonitorEvent(trainId, item.message, item.value, item.tone)
      const selection = applyTrainingScenarioTrainSelection(current, 'Monitor 02 Line Map', trainId)

      if (!selection.allowed) {
        return selection.next
      }

      const selected = selection.next

      return {
        ...selected,
        alarmSummaryRows: item.summaryTone
          ? [createSummaryEvent(event, item.summaryTone), ...selected.alarmSummaryRows].slice(0, 12)
          : selected.alarmSummaryRows,
        eventRows: [event, ...selected.eventRows].slice(0, 4),
        evidenceLog: appendScenarioEvidence(
          selected.evidenceLog,
          createScenarioEvidence('Monitor 02 Line Map', item.action, 'info', item.notice),
        ),
        scenarioNotice: {
          text: item.notice,
          tone: item.noticeTone,
        },
        selectedTrainId: trainId,
      }
    })
  }

  const confirmInspectorItamaAuthorisedPreparation = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Authorised Preparation`,
      'OK',
      'yellow',
    )

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA authorised preparation',
          'accepted',
          `Train ${trainId} ITAMA authorised preparation confirmed.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA authorised preparation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: true,
              itamaNotAuthorisedPreparationConfirmed: false,
            }
          : train
      )),
    }))
  }

  const confirmInspectorItamaAuthorised = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Authorised Confirmation`,
      'GRANTED',
      'yellow',
    )

    setTrainItamaStatusOverrides((current) => ({
      ...current,
      [trainId]: 'GRANTED',
    }))

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA authorised confirmation',
          'accepted',
          `Train ${trainId} ITAMA status set to GRANTED.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA authorised confirmation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: false,
              itamaGranted: true,
              itamaNotAuthorisedPreparationConfirmed: false,
              itamaStatus: 'GRANTED',
            }
          : train
      )),
    }))
  }

  const confirmInspectorItamaNotAuthorisedPreparation = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Not Authorised Preparation`,
      'OK',
      'yellow',
    )

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA not authorised preparation',
          'accepted',
          `Train ${trainId} ITAMA not authorised preparation confirmed.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA not authorised preparation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: false,
              itamaNotAuthorisedPreparationConfirmed: true,
            }
          : train
      )),
    }))
  }

  const confirmInspectorItamaNotAuthorised = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Not Authorised Confirmation`,
      'NOT GRANTED',
      'yellow',
    )

    setTrainItamaStatusOverrides((current) => ({
      ...current,
      [trainId]: 'NOT_GRANTED',
    }))

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA not authorised confirmation',
          'accepted',
          `Train ${trainId} ITAMA status set to NOT GRANTED.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA not authorised confirmation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: false,
              itamaGranted: false,
              itamaNotAuthorisedPreparationConfirmed: false,
              itamaStatus: 'NOT_GRANTED',
              isMoving: false,
              status: 'WAIT',
            }
          : train
      )),
    }))
  }

  const confirmInspectorReadiness = (trainId: string, command: string) => {
    const readinessMode = getTrainReadinessModeFromCommand(command)
    const eventRow: MonitorAlarmRow = {
      level: 'S',
      time: formatScenarioTime(),
      asset: `EMU/${trainId}/TRN/OCC`,
      message: `Train ${trainId}: Train Readiness Request`,
      value: command,
      tone: 'yellow',
    }

    setTrainReadinessModeOverrides((current) => ({
      ...current,
      [trainId]: readinessMode,
    }))

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'Train readiness request confirmed',
          'accepted',
          `Train ${trainId} readiness request set to ${command}.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} readiness command successful: ${command}.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              readinessMode,
              ...(readinessMode === 'MAINLINE_SERVICE'
                ? {}
                : {
                    isMoving: false,
                    status: 'WAIT' as const,
                  }),
            }
          : train
      )),
    }))
  }

  const confirmInspectorDoorCommand = (trainId: string, command: TrainDoorCommand) => {
    const doorFailureState = getTrainDoorStateAfterCommand(command)
    const commandLabel = getTrainDoorCommandLabel(command)
    const nextTrainStatus: TrainStatus = command === 'confirm-closed-locked' || command === 'authorize-move'
      ? 'RUN'
      : 'HOLD'
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ${commandLabel}`,
      getTrainDoorSummaryStatus(doorFailureState),
      command === 'withdraw-service' ? 'red' : 'yellow',
    )

    updateSession((current) => {
      const commandState = {
        ...current,
        alarmSummaryRows: [
          createSummaryEvent(eventRow, command === 'withdraw-service' ? 'red' : 'yellow'),
          ...current.alarmSummaryRows,
        ].slice(0, 12),
        evidenceLog: appendScenarioEvidence(
          current.evidenceLog,
          createScenarioEvidence(
            'Monitor 02 Line Map',
            commandLabel,
            'accepted',
            `Train ${trainId} door failure state set to ${getTrainDoorSummaryStatus(doorFailureState)}.`,
          ),
        ),
        eventRows: [eventRow, ...current.eventRows].slice(0, 4),
        scenarioNotice: {
          text: `Train ${trainId} ${commandLabel.toLowerCase()} command successful.`,
          tone: command === 'withdraw-service' ? 'warning' as const : 'success' as const,
        },
        selectedTrainId: trainId,
        timetableRows: upsertTimetableRow(current.timetableRows, trainId, nextTrainStatus === 'HOLD' ? 'H>' : '>'),
        trains: current.trains.map((train) => (
          train.id === trainId
            ? {
                ...train,
                doorFailureState,
                status: nextTrainStatus,
              }
            : train
        )),
      }

      return applyTrainingScenarioRuntimeEvent(commandState, {
        commandLabel,
        source: 'Monitor 02 Line Map',
        summaryStatus: getTrainDoorSummaryStatus(doorFailureState),
        trainId,
        type: 'DOOR_COMMAND_CONFIRMED',
      }).next
    })
  }

  const confirmInspectorTrainHold = (trainId: string, detail: string) => {
    const eventRow = createMonitorEvent(trainId, `Train ${trainId}: Train Hold`, 'APPLIED', 'yellow')

    updateSession((current) => applyTrainingScenarioRuntimeEvent({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence('Monitor 02 Line Map', 'Train Hold', 'accepted', detail),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      selectedTrainId: trainId,
      timetableRows: upsertTimetableRow(current.timetableRows, trainId, 'H>'),
      trains: current.trains.map((train) => (
        train.id === trainId ? { ...train, isMoving: false, status: 'HOLD' as const } : train
      )),
    }, {
      source: 'Monitor 02 Line Map',
      trainId,
      type: 'TRAIN_HOLD_APPLIED',
    }).next)
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
      updateSession((current) => ({
        ...current,
        scenarioNotice: {
          text: plan.reason,
          tone: 'warning',
        },
        selectedTrainId: trainId,
      }))
      return { accepted: false, message: plan.reason }
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
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: Departure time set, stepping on ${authority.routeLabel}`,
      'RUN',
      'yellow',
    )

    updateSession((current) => {
      const moving = {
        ...applyManualTrainRouteStepState(current, trainId, authority, currentStepIndex),
        alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [eventRow, ...current.eventRows].slice(0, 4),
        scenarioNotice: {
          text: `Train ${trainId} departure confirmed. Stepping rail-by-rail on ${authority.routeLabel}.`,
          tone: 'info' as const,
        },
        timetableRows: upsertTimetableRow(current.timetableRows, trainId, '>'),
      }

      if (!isActiveScenarioTargetTrain(current, trainId)) {
        return moving
      }

      return applyTrainingScenarioRuntimeEvent(moving, {
        routeLabel: authority.routeLabel,
        source: 'Line Map Train Control',
        trainId,
        type: 'DEPARTURE_TIME_CONFIRMED',
      }).next
    })

    const setTrainAtRouteStep = (stepIndex: number) => {
      updateSession((current) => {
        const stepped = applyManualTrainRouteStepState(current, trainId, authority, stepIndex)

        if (stepIndex < lastStepIndex || !isActiveScenarioTargetTrain(current, trainId)) {
          return stepped
        }

        const activeScenarioKind = getTrainingScenarioDefinition(current.activeScenario.id).kind

        if (activeScenarioKind === 'TRAIN_LAUNCH' && shouldHandoffLaunchToTimetable) {
          return {
            ...stepped,
            scenarioNotice: {
              text: `Train ${trainId} reached SKGN and returned to automatic timetable control.`,
              tone: 'success' as const,
            },
            trains: stepped.trains.map((train) => (
              train.id === trainId
                ? {
                    ...train,
                    isMoving: false,
                    readinessMode: 'MAINLINE_SERVICE' as const,
                    status: 'WAIT' as const,
                    timetablePlayback: true,
                  }
                : train
            )),
          }
        }

        if (activeScenarioKind === 'TRAIN_WITHDRAWAL' && !isDepotWithdrawalLeg) {
          return stepped
        }

        const endpointEvent = createMonitorEvent(
          trainId,
          `Train ${trainId}: reached depot endpoint on ${authority.routeLabel}`,
          'ENDPOINT',
          'yellow',
        )

        const endpointState = {
          ...stepped,
          eventRows: [endpointEvent, ...stepped.eventRows].slice(0, 4),
          evidenceLog: appendScenarioEvidence(
            stepped.evidenceLog,
            createScenarioEvidence(
              'Monitor 02 Line Map',
              'Depot endpoint reached',
              'accepted',
              `Train ${trainId} reached depot endpoint on ${authority.routeLabel}.`,
            ),
          ),
          scenarioNotice: {
            text: `Train ${trainId} reached depot endpoint on ${authority.routeLabel}.`,
            tone: 'success' as const,
          },
        }

        return applyTrainingScenarioRuntimeEvent(endpointState, {
          routeLabel: authority.routeLabel,
          source: 'Monitor 02 Line Map',
          trainId,
          type: 'DEPOT_ENDPOINT_REACHED',
        }).next
      })
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
  }, [cancelManualTrainRoutePlayback, renderedLineMap, renderedTrains, routeControlModes, setLineMapRouteSegmentOverrides, setManualMovementTrainIds, setTrainArrivalDestinations, startManualTrainRoutePlayback, trainArrivalDestinations, updateSession])

  const openTrainContextMenu = (trainId: string, x: number, y: number) => {
    setInspectorPanel(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setDefineRouteSignal(null)
    setSignalMenu(null)
    setTrainMenu({ trainId, x, y })
    submitBackendScenarioAction(session, updateSession, {
      detail: getTrainingScenarioTrainActionDetail(
        session,
        trainId,
        `Train ${trainId} selected`,
        'Select ITAMA, hold, route, or dispatch.',
      ),
      source: 'Monitor 02 Line Map',
      trainId,
      type: 'SELECT_TRAIN',
    }, (current) => {
      const selection = applyTrainingScenarioTrainSelection(current, 'Monitor 02 Line Map', trainId)

      if (!selection.allowed) {
        return selection.next
      }

      const selected = selection.next

      return {
        ...selected,
        scenarioNotice: isActiveScenarioTargetTrain(selected, trainId)
          ? { text: `Train ${trainId} command menu opened for ${selected.activeScenario.title}.`, tone: 'info' }
          : { text: `Train ${trainId} command menu opened. Active scenario target remains Train ${getActiveScenarioTargetTrainId(selected)}.`, tone: 'warning' },
        selectedTrainId: trainId,
      }
    })
  }

  const openSignalContextMenu = (signal: LineMapSignalData, x: number, y: number) => {
    setTrainMenu(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setDefineRouteSignal(null)
    setSignalMenu({ signal, x, y })
    updateSession((current) => ({
      ...current,
      scenarioNotice: {
        text: `${getSignalEquipmentLabel(signal)} selected. Define Route is available from the signal menu.`,
        tone: 'info',
      },
    }))
  }

  const openSignalDefineRoute = (signal: LineMapSignalData) => {
    if (getSignalRouteLabels(signal).length === 0) {
      setSignalMenu(null)
      return
    }

    setSignalMenu(null)
    setDefineRouteSignal(signal)
    updateSession((current) => ({
      ...current,
      scenarioNotice: {
        text: `${getSignalEquipmentLabel(signal)} route definition opened.`,
        tone: 'info',
      },
    }))
  }

  const setRouteFromSignal = (signal: LineMapSignalData, routeLabel: string) => {
    const visibleTargetTrain = getSignalRouteTargetTrainForSession(session)

    if (!hasSignalRouteCommand(signal, routeLabel)) {
      return
    }

    const routeOwner = visibleTargetTrain ?? { id: '' }

    setLineMapRouteSegmentOverrides((current) => createSignalRouteSetOverrideSegments(current, signal, routeLabel, routeOwner))
    updateSession((current) => {
      const routed = applySignalRouteSetSession(current, signal, routeLabel)
      const routedTrain = getSignalRouteTargetTrainForSession(routed)

      if (!routedTrain || !isActiveScenarioTargetTrain(routed, routedTrain.id)) {
        return routed
      }

      return applyTrainingScenarioRuntimeEvent(routed, {
        routeLabel,
        source: 'Monitor 02 Line Map',
        trainId: routedTrain.id,
        type: 'ROUTE_SET',
      }).next
    })
  }

  const unsetRouteFromSignal = (signal: LineMapSignalData, routeLabel: string) => {
    if (!hasSignalRouteCommand(signal, routeLabel)) {
      return
    }

    setLineMapRouteSegmentOverrides((current) => createSignalRouteUnsetOverrideSegments(current, signal, routeLabel))
    updateSession((current) => applySignalRouteUnsetSession(current, signal, routeLabel))
  }

  const requestTrainCommand = (command: TrainCommand) => {
    setTrainMenu(null)
    setSignalMenu(null)
    setDefineRouteSignal(null)
    setAuxiliaryPanel(null)
    setPendingCommand(command)
    updateSession((current) => ({
      ...current,
      scenarioNotice: {
        text: `SCADA command request opened for Train ${current.selectedTrainId}: ${command}.`,
        tone: 'info',
      },
    }))
  }

  const applyTrainCommand = (command: TrainCommand) => {
    const targetTrain = session.trains.find((train) => train.id === session.selectedTrainId)

    if (!targetTrain) {
      return
    }

    const nextStatus: TrainStatus = command === 'DISPATCH' ? 'RUN' : command === 'HOLD' ? 'HOLD' : 'WAIT'
    const backendAction: OccSessionAction['type'] = command === 'DISPATCH'
      ? 'DISPATCH_TRAIN'
      : command === 'ROUTE'
        ? 'SET_ROUTE'
        : 'SELECT_TRAIN'

    const message =
      command === 'DISPATCH'
        ? `Train ${targetTrain.id}: Dispatch command executed`
        : command === 'HOLD'
          ? `Train ${targetTrain.id}: Train Hold`
          : `Train ${targetTrain.id}: Route command selected`
    const tone = command === 'HOLD' ? 'orange' : 'yellow'
    const eventRow: MonitorAlarmRow = {
      level: 'S',
      time: formatScenarioTime(),
      asset: `EMU/${targetTrain.id}/TRN/OCC`,
      message,
      value: nextStatus,
      tone,
    }
    const summaryRow: AlarmSummaryRow = {
      ack: 'Y',
      avl: '',
      mms: 'S',
      timestamp: formatAlarmSummaryTimestamp(eventRow.time),
      asset: eventRow.asset,
      description: message,
      value: nextStatus,
      tone: tone === 'orange' ? 'yellow' : 'yellow',
    }

    // Line-map train commands are the main backend-scored operator actions.
    submitBackendScenarioAction(session, updateSession, {
      detail: `${message} accepted.`,
      source: 'Monitor 02 Line Map',
      trainId: targetTrain.id,
      type: backendAction,
    }, (current) => {
      const guard = command === 'DISPATCH'
        ? applyTrainingScenarioRuntimeEvent(current, {
            source: 'Monitor 02 Line Map',
            trainId: targetTrain.id,
            type: 'DEPARTURE_TIME_CONFIRMED',
          })
        : command === 'ROUTE'
          ? applyTrainingScenarioRuntimeEvent(current, {
              routeLabel: 'Line Map route command',
              source: 'Monitor 02 Line Map',
              trainId: targetTrain.id,
              type: 'ROUTE_SET',
            })
          : applyTrainingScenarioTrainSelection(current, 'Monitor 02 Line Map', targetTrain.id)

      if (!guard.allowed) {
        return guard.next
      }

      const scenarioNext = command === 'HOLD'
        ? applyTrainingScenarioRuntimeEvent(guard.next, {
            source: 'Monitor 02 Line Map',
            trainId: targetTrain.id,
            type: 'TRAIN_HOLD_APPLIED',
          }).next
        : guard.next

      return {
        ...scenarioNext,
        alarmSummaryRows: [summaryRow, ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [eventRow, ...current.eventRows].slice(0, 4),
        lineMap: updateLineMapRouteState(
          current.lineMap,
          targetTrain,
          command === 'DISPATCH' ? 'DISPATCHED' : command === 'HOLD' ? 'HELD' : 'SET',
        ),
        timetableRows: upsertTimetableRow(current.timetableRows, targetTrain.id, command === 'HOLD' ? 'H>' : command === 'DISPATCH' ? '>' : 'R'),
        trains: current.trains.map((train) => (
          train.id === targetTrain.id ? { ...train, status: nextStatus } : train
        )),
      }
    })
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

  return (
    <div className="occ-monitor-canvas">
      <LineMapMonitorDom
        alarmNotAcknowledged={alarmNotAcknowledged}
        alarmTotal={alarmTotal}
        callLog={callLog}
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
            onSend={(request) => updateSession((current) => applyCommsRequest(current, request))}
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
            command={pendingCommand}
            onApply={() => {
              const command = pendingCommand
              setPendingCommand(null)
              applyTrainCommand(command)
            }}
            onClose={() => setPendingCommand(null)}
            train={selectedTrain}
          />
        )}
        {itamaTrain && (
          <ItamaStatusPanel
            onAcknowledge={() => {
              const trainId = itamaTrain.id
              const event = createMonitorEvent(trainId, `Train ${trainId}: Train ITAMA Status`, 'ACK', 'yellow')

              updateSession((current) => ({
                ...current,
                alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
                evidenceLog: appendScenarioEvidence(
                  current.evidenceLog,
                  createScenarioEvidence(
                    'Monitor 02 Line Map',
                    'ITAMA acknowledged',
                    'accepted',
                    `ITAMA status acknowledged for Train ${trainId}.`,
                  ),
                ),
                eventRows: [event, ...current.eventRows].slice(0, 4),
                scenarioNotice: {
                  text: `ITAMA status acknowledged for Train ${trainId}.`,
                  tone: 'info',
                },
              }))
            }}
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
            updateSession((current) => {
              const markerDirection = getTrainMarkerDirectionForTimeSelection(
                scenarioArrivalDestination,
                inspectorTrain.direction,
              )
              const directionState = {
                ...current,
                trains: current.trains.map((train) => (
                  train.id === inspectorTrain.id
                    ? { ...train, direction: markerDirection }
                    : train
                )),
              }

              if (!isActiveScenarioTargetTrain(current, inspectorTrain.id)) {
                return directionState
              }

              const event = createMonitorEvent(
                inspectorTrain.id,
                `Set arrival time destination ${scenarioArrivalDestination.station} ${scenarioArrivalDestination.platformSiding}`,
                'ARRIVAL TIME',
                'yellow',
              )

              const arrivalState = {
                ...directionState,
                eventRows: [event, ...directionState.eventRows].slice(0, 4),
                evidenceLog: appendScenarioEvidence(
                  directionState.evidenceLog,
                  createScenarioEvidence(
                    'Line Map Train Control',
                    'Arrival time destination set',
                    'accepted',
                    `Arrival time destination set for Train ${inspectorTrain.id}: ${scenarioArrivalDestination.station} / ${scenarioArrivalDestination.platformSiding}.`,
                  ),
                ),
                scenarioNotice: {
                  text: `Arrival Time set for Train ${inspectorTrain.id}: ${scenarioArrivalDestination.station} / ${scenarioArrivalDestination.platformSiding}.`,
                  tone: 'info' as const,
                },
                selectedTrainId: inspectorTrain.id,
              }

              return applyTrainingScenarioRuntimeEvent(arrivalState, {
                platformSiding: scenarioArrivalDestination.platformSiding,
                source: 'Line Map Train Control',
                station: scenarioArrivalDestination.station,
                trainId: inspectorTrain.id,
                type: 'ARRIVAL_DESTINATION_SET',
              }).next
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

            updateSession((current) => {
              const markerDirection = getTrainMarkerDirectionForTimeSelection(directionSelection, inspectorTrain.direction)
              const directionState = {
                ...current,
                trains: current.trains.map((train) => (
                  train.id === inspectorTrain.id
                    ? { ...train, direction: markerDirection }
                    : train
                )),
              }

              if (!isActiveScenarioTargetTrain(current, inspectorTrain.id)) {
                return directionState
              }

              let scenarioState = directionState

              const destinationTaskId = isRt2DepotDestinationSelection(manualDestination)
                ? 'declare-depot-destination'
                : 'declare-last-station-destination'

              if (
                manualDestination
                && !isTrainingScenarioDefinitionTaskComplete(current, destinationTaskId)
              ) {
                const event = createMonitorEvent(
                  inspectorTrain.id,
                  `Set arrival time destination ${scenarioArrivalDestination.station} ${scenarioArrivalDestination.platformSiding}`,
                  'ARRIVAL TIME',
                  'yellow',
                )

                const destinationState = {
                  ...scenarioState,
                  eventRows: [event, ...scenarioState.eventRows].slice(0, 4),
                  evidenceLog: appendScenarioEvidence(
                    scenarioState.evidenceLog,
                    createScenarioEvidence(
                      'Line Map Train Control',
                      'Arrival time destination set',
                      'accepted',
                      `Arrival time destination set for Train ${inspectorTrain.id}: ${scenarioArrivalDestination.station} / ${scenarioArrivalDestination.platformSiding}.`,
                    ),
                  ),
                  selectedTrainId: inspectorTrain.id,
                }

                scenarioState = applyTrainingScenarioRuntimeEvent(destinationState, {
                  platformSiding: scenarioArrivalDestination.platformSiding,
                  source: 'Line Map Train Control',
                  station: scenarioArrivalDestination.station,
                  trainId: inspectorTrain.id,
                  type: 'ARRIVAL_DESTINATION_SET',
                }).next
              }

              return scenarioState
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
