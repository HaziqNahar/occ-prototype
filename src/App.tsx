import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, SetStateAction } from 'react'
import './App.css'
import controlTabIcon from './assets/control-tab-icon.png'
import footerAdminIcon from './assets/toolbar-icons/admin.png'
import footerCardIcon from './assets/toolbar-icons/card.png'
import footerCommandIcon from './assets/toolbar-icons/command.png'
import footerComsIcon from './assets/toolbar-icons/coms.png'
import footerDeviceArrowIcon from './assets/toolbar-icons/device_arrow.png'
import footerDocumentSearchIcon from './assets/toolbar-icons/document_search.png'
import footerEcsIcon from './assets/toolbar-icons/ecs.png'
import footerHelpIcon from './assets/toolbar-icons/help.png'
import footerLayoutIcon from './assets/toolbar-icons/layout.png'
import footerMoveArrowsIcon from './assets/toolbar-icons/move_arrows.png'
import footerNavLayoutLeftIcon from './assets/toolbar-icons/nav_layout_left.png'
import footerNavLayoutRightIcon from './assets/toolbar-icons/nav_layout_right.png'
import footerNavWindowLeftIcon from './assets/toolbar-icons/nav_window_left.png'
import footerNavWindowRightIcon from './assets/toolbar-icons/nav_window_right.png'
import footerNetworkGearsIcon from './assets/toolbar-icons/network_gears.png'
import footerPowerIcon from './assets/toolbar-icons/power.png'
import footerPrinterIcon from './assets/toolbar-icons/printer.png'
import footerTrafficIcon from './assets/toolbar-icons/traffic.png'
import footerUtilityIcon from './assets/toolbar-icons/utility.png'
import footerWindowPairIcon from './assets/toolbar-icons/window_pair.png'
import footerWindowPanelIcon from './assets/toolbar-icons/window_panel.png'
import type { OccSessionAction } from './backendClient'
import LiveScadaClock from './components/LiveScadaClock'
import MonitorWorkspace from './components/MonitorWorkspace'
import SignalRouteDefinitionWindow from './components/route-definition/SignalRouteDefinitionWindow'
import ScadaFooter from './components/ScadaFooter'
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
  getTrainServiceDirectionLabel,
} from './components/train-control/trainTimeOptions'
import type { TrainTimeSelection } from './components/train-control/trainTimeOptions'
import type { InspectorPage, TrainAuxiliaryView } from './components/train-control/trainControlTypes'
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
  getTrainReadinessRequestValue,
} from './components/train-control/trainCommandState'
import type { TrainDoorCommand } from './components/train-control/trainCommandState'
import usePopupDrag from './components/train-control/usePopupDrag'
import Win98HtmlButton from './components/train-control/Win98HtmlButton'
import { NEL_TIMETABLE_NAME } from './data/nelTimetable'
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
import {
  applySignalRouteSetSession,
  applySignalRouteUnsetSession,
  createSignalRouteSetOverrideSegments,
  createSignalRouteUnsetOverrideSegments,
  getSignalRouteTargetTrain,
  hasSignalRouteCommand,
} from './screens/line-map/signalRouteCommands'
import {
  getTrainRouteStepFromLineMap,
} from './screens/line-map/trainRoutePlaybackState'
import { warnLineMapRouteValidationIssues } from './screens/line-map/routeValidation'
import { clearTimetableGuideRouteState } from './screens/line-map/timetableRouteStateCleanup'
import {
  TIMETABLE_PLAYBACK_REFRESH_MS,
} from './screens/line-map/timetablePlayback'
import {
  createTimetableRouteDiagnostics,
  createTimetableRouteDiagnosticsSummary,
} from './screens/line-map/timetableDiagnostics'
import {
  applyTimetablePlaybackRunStart,
  createAutomaticTimetableMovementAuthorities,
  createTimetablePlaybackPlanKey,
  createTimetablePlaybackScopeKey,
  getActiveTimetableMovementAuthorityTrainIds,
  scheduleTimetablePlaybackPlans,
} from './screens/line-map/timetablePlaybackController'
import LineMapMonitorDom from './screens/line-map/LineMapDom'
import { ToolbarButton } from './components/ScadaSvgToolbarButton'
import { appendScenarioEvidence, createScenarioEvidence, scenarioTaskList } from './scenario'
import {
  applyScenarioStep,
  completeScenarioTask,
  createMonitorEvent,
  createSummaryEvent,
  formatAlarmSummaryTimestamp,
  formatScenarioTime,
  getScenarioStepBlocker,
  rejectScenarioAction,
  scenarioCues,
  scenarioSteps,
  submitBackendScenarioAction,
  updateScenarioTask,
  upsertTimetableRow,
} from './scenarioWorkflow'
import type { MonitorLaunchRequest, ScreenRegistration } from './sessionTransport'
import {
  alarmSummaryRows,
  createInitialSession,
  getTimetablePlaybackTrainIdSet,
  trainingModeDetails,
  updateSessionLifecycle,
  useOccSession,
} from './sessionState'
import {
  getActiveTimetableView,
  getTimetableRowsForStation,
  getTimetableStationOptions,
  getTimetableViewRows,
} from './timetableViewState'
import {
  DEFAULT_TIMETABLE_CLOCK_STATE,
  createTimetableClockKey,
  formatTimetableClockTime,
  getTimetableClockNow,
  scaleTimetablePlaybackPlansForClock,
  startTimetablePlaybackClock,
} from './timetableClockState'
import AssessmentRubricScreen from './screens/AssessmentRubricScreen'
import IosModulesScreen from './screens/IosModulesScreen'
import LoginPage from './screens/LoginPage'
import ReportScreen from './screens/ReportScreen'
import ScenarioBuilderScreen from './screens/ScenarioBuilderScreen'
import TraineeLobbyScreen from './screens/TraineeLobbyScreen'
import type {
  AlarmSummaryRow,
  AppRoute,
  LineMapRuntimeState,
  MonitorAlarmRow,
  OccSessionState,
  RouteControlMode,
  ScenarioNoticeTone,
  ScenarioTaskId,
  TrainingMode,
  TrainCommand,
  TrainReadinessMode,
  TrainState,
  TrainStatus,
} from './types'

if (import.meta.env.DEV) {
  warnLineMapRouteValidationIssues()
}

type SignalMenuState = {
  signal: LineMapSignalData
  x: number
  y: number
}

type RouteFleetStatus = 'Fleet' | 'Not Fleet'

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
      <IosModulesScreen
        onNavigate={navigate}
        resetSession={resetSession}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/ios/scenarios') {
    return (
      <ScenarioBuilderScreen
        onNavigate={navigate}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/ios/assessment') {
    return <AssessmentRubricScreen onNavigate={navigate} session={session} />
  }

  if (route === '/session/join') {
    return (
      <TraineeLobbyScreen
        onNavigate={navigate}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/report') {
    return <ReportScreen onNavigate={navigate} session={session} />
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
        `popup=yes,width=1280,height=1040,left=${config.left},top=${config.top}`,
      )

      if (!openedWindow) {
        blockedTargets.push(target)
        return
      }

      openedWindow.focus()
    })

    if (blockedTargets.length) {
      setMonitorLaunchStatus('Pop-ups blocked: use button')
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

function AlarmsScreen({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  return (
    <MonitorWorkspace
      monitorLabel="MONITOR 01 - ALARMS"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Alarm Summary Monitor"
    >
      <AlarmSummaryCanvas onNavigate={onNavigate} session={session} updateSession={updateSession} />
    </MonitorWorkspace>
  )
}

function TimetableScreen({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  return (
    <MonitorWorkspace
      monitorLabel="MONITOR 03 - TIMETABLE"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Traffic Timetable Monitor"
    >
      <TimetableCanvas onNavigate={onNavigate} session={session} updateSession={updateSession} />
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
  const [autoRun, setAutoRun] = useState(false)
  const currentScenario = scenarioSteps[session.scenarioStep] ?? scenarioSteps[0]
  const scenarioCue = scenarioCues[session.scenarioStep] ?? scenarioCues[0]
  const trainingMode = trainingModeDetails[session.trainingMode]
  const cuePrimary = session.trainingMode === 'PRACTICE' ? scenarioCue.primary : trainingMode.title
  const cueSecondary = session.trainingMode === 'PRACTICE' ? scenarioCue.secondary : trainingMode.cue
  const completedTasks = scenarioTaskList.filter((task) => session.scenarioTasks[task.id]).length
  const scenarioScore = Math.round((completedTasks / scenarioTaskList.length) * 100)
  const noticeFill = session.scenarioNotice.tone === 'warning'
    ? '#ff0000'
    : session.scenarioNotice.tone === 'success'
      ? '#008000'
      : '#000080'
  const noticeText = session.scenarioNotice.text.length > 68
    ? `${session.scenarioNotice.text.slice(0, 65)}...`
    : session.scenarioNotice.text
  const iosTrainListRows = [...session.trains]
    .sort((left, right) => {
      const visibleRank = Number(right.lineMapVisible !== false) - Number(left.lineMapVisible !== false)

      return visibleRank || Number(left.id) - Number(right.id)
    })
    .slice(0, 8)

  const pushInstructorEvent = (
    trainId: string,
    message: string,
    value: string,
    tone: MonitorAlarmRow['tone'] = 'yellow',
    summaryTone: AlarmSummaryRow['tone'] = tone === 'red' ? 'red' : 'yellow',
  ) => {
    const event = createMonitorEvent(trainId, message, value, tone)

    updateSession((current) => ({
      ...current,
      activeScenario: {
        ...current.activeScenario,
        incident: 'Door fault',
      },
      alarmSummaryRows: [createSummaryEvent(event, summaryTone), ...current.alarmSummaryRows].slice(0, 12),
      eventRows: [event, ...current.eventRows].slice(0, 4),
      scenarioMode: 'RUNNING',
      sessionMeta: updateSessionLifecycle(current.sessionMeta, 'RUNNING'),
      scenarioNotice: {
        text: `Door fault injected for Train ${trainId}. Await alarm acknowledgement.`,
        tone: 'warning',
      },
      scenarioStep: Math.max(current.scenarioStep, 2),
      selectedTrainId: trainId,
      timetableRows: upsertTimetableRow(current.timetableRows, trainId, 'H>'),
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              doorFailureState: 'FAULT_ALARM',
              status: 'HOLD',
            }
          : train
      )),
    }))
  }

  const selectTrainingMode = (nextMode: TrainingMode) => {
    setAutoRun(nextMode === 'PLAYER')
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
    const taskId: ScenarioTaskId = status === 'RUN' ? 'dispatchTrain' : status === 'WAIT' ? 'setRoute' : 'selectTrain'
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
      if (trainId !== '317') {
        return rejectScenarioAction(
          current,
          'Scenario target is Train 317. Select Train 317 for route and dispatch.',
          trainId,
          'IOS Train Control',
        )
      }

      const guard = completeScenarioTask(current, taskId, `Operator task accepted: ${reason}`, 'IOS Train Control')

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

  const startScenario = () => {
    setAutoRun(false)
    updateSession((current) => applyScenarioStep({
      ...createInitialSession(current.trainingMode),
      sessionMeta: updateSessionLifecycle(current.sessionMeta, 'RUNNING'),
    }, 1, { updateLineMapRouteState }))
  }

  const advanceScenario = useCallback(() => {
    const anticipatedNextStep = Math.min(session.scenarioStep + 1, scenarioSteps.length - 1)
    if (getScenarioStepBlocker(session, anticipatedNextStep)) {
      setAutoRun(false)
    }

    updateSession((current) => {
      const nextStep = Math.min(current.scenarioStep + 1, scenarioSteps.length - 1)
      const blocker = getScenarioStepBlocker(current, nextStep)

      if (blocker) {
        return rejectScenarioAction(current, blocker, '317', 'IOS Scenario Control')
      }

      return applyScenarioStep(current, nextStep, { updateLineMapRouteState })
    })
  }, [session, updateSession])

  const replayScenario = () => {
    setAutoRun(false)
    updateSession((current) => createInitialSession(current.trainingMode))
  }

  const completeScenarioReview = () => {
    setAutoRun(false)
    submitBackendScenarioAction(session, updateSession, {
      detail: 'Scenario review complete. Report is ready.',
      source: 'IOS Trainer Review',
      trainId: '317',
      type: 'COMPLETE_SCENARIO',
    }, (current) => {
      const event = createMonitorEvent('317', 'Scenario complete: Trainer reviewed Train 317 response', 'COMPLETE', 'yellow')
      const guard = completeScenarioTask(
        current,
        'completeScenario',
        'Scenario review complete. Report is ready.',
        'IOS Trainer Review',
      )

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
    window.open(route, name, 'popup=yes,width=1280,height=1040,left=120,top=80')
  }

  useEffect(() => {
    if (!autoRun) {
      return undefined
    }

    if (session.scenarioMode === 'PAUSED' || session.scenarioStep >= scenarioSteps.length - 1) {
      const stopTimer = window.setTimeout(() => setAutoRun(false), 0)

      return () => window.clearTimeout(stopTimer)
    }

    const timer = window.setTimeout(() => {
      advanceScenario()
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [advanceScenario, autoRun, session.scenarioMode, session.scenarioStep])

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
        <text className="svg-ios-label" x="34" y="174">{currentScenario.text}</text>
        <rect x="34" y="184" width="336" height="46" fill="#ffffcc" stroke="#808000" />
        <text className="svg-ios-cue" x="44" y="203">{cuePrimary}</text>
        <text className="svg-ios-cue" x="44" y="219">{cueSecondary}</text>
        <IosButton x={34} y={242} w={105} label="Start" onClick={startScenario} />
        <IosButton x={148} y={242} w={105} label="Next Step" onClick={advanceScenario} />
        <IosButton x={262} y={242} w={100} label={autoRun ? 'Pause Auto' : 'Auto Run'} onClick={() => setAutoRun((value) => !value)} />
        <IosButton x={34} y={282} w={105} label="Replay" onClick={replayScenario} />
        <IosButton x={148} y={282} w={105} label="Reset Trains" onClick={() => { setAutoRun(false); resetSession(session.trainingMode) }} />
        <IosButton x={262} y={282} w={100} label="Door Fault" onClick={() => pushInstructorEvent('317', 'Trainer injected alarm: Train 317 door fault pending', 'YES', 'red', 'red')} />
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
        <rect x="34" y="348" width="526" height="24" fill={session.scenarioNotice.tone === 'warning' ? '#fff0f0' : '#f8f8f8'} stroke={noticeFill} />
        <text className="svg-ios-notice" x="44" y="365" fill={noticeFill}>NOTICE: {noticeText}</text>
        <text className="svg-ios-label" x="34" y="394">Scenario progress</text>
        <rect x="164" y="380" width="290" height="20" fill="#ffffff" stroke="#000000" />
        <rect x="166" y="382" width={Math.max(0, Math.min(286, scenarioScore * 2.86))} height="16" fill={scenarioScore === 100 ? '#00c800' : '#ffff00'} />
        <text className="svg-ios-value" x="470" y="395">{scenarioScore}%</text>
        {scenarioTaskList.map((task, index) => {
          const complete = session.scenarioTasks[task.id]
          const y = 438 + index * 42

          return (
            <g key={task.id}>
              <rect x="34" y={y - 24} width="526" height="34" fill={complete ? '#d8ffd8' : '#ffffff'} stroke="#808080" />
              <rect x="48" y={y - 16} width="16" height="16" fill={complete ? '#00c800' : '#c0c0c0'} stroke="#000" />
              {complete && <text className="svg-ios-value" x="50" y={y - 3}>OK</text>}
              <text className="svg-ios-value" x="78" y={y - 4}>{task.label}</text>
              <text className="svg-ios-label" x="380" y={y - 4}>{task.monitor}</text>
            </g>
          )
        })}
      </IosPanel>

      <IosPanel x={614} y={330} w={646} h={330} title="TRAIN LIST">
        <text className="svg-ios-label" x="638" y="362">{session.trains.length} trains loaded from NEL_OTES_Weekday_03</text>
        {iosTrainListRows.map((train, index) => (
          <g
            className="svg-clickable"
            onClick={() => submitBackendScenarioAction(session, updateSession, {
              detail: train.id === '317'
                ? 'Train 317 selected. Acknowledge alarm before route.'
                : `Train ${train.id} selected. Active drill target remains Train 317.`,
              source: 'IOS Train List',
              trainId: train.id,
              type: 'SELECT_TRAIN',
            }, (current) => ({
              ...current,
              scenarioNotice: train.id === '317'
                ? { text: 'Train 317 selected. Acknowledge alarm before route.', tone: 'info' }
                : { text: 'Scenario target is Train 317.', tone: 'warning' },
              scenarioTasks: train.id === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
              selectedTrainId: train.id,
            }))}
            transform={`translate(638 ${380 + index * 34})`}
            key={train.id}
          >
            <rect width="526" height="28" fill={train.id === session.selectedTrainId ? '#000080' : '#ffffff'} stroke="#808080" />
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="14" y="19">TRN {train.id}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="120" y="19">{train.service}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="220" y="19">{train.status}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="330" y="19">X {Math.round(train.x)}</text>
          </g>
        ))}
      </IosPanel>

      <IosPanel x={14} y={682} w={580} h={244} title="SCENARIO TIMELINE">
        {scenarioSteps.map((step, index) => (
          <IosTimelineStep
            x={38}
            y={734 + index * 30}
            active={session.scenarioStep >= index}
            current={session.scenarioStep === index}
            label={step.label}
            text={`${step.title}: ${step.text}`}
            key={step.label}
          />
        ))}
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

function ScadaDomSurface({
  children,
  className = '',
  title,
}: {
  children: ReactNode
  className?: string
  title: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const root = rootRef.current

    if (!root) {
      return
    }

    const updateScale = () => {
      setScale(root.clientWidth > 0 ? root.clientWidth / MONITOR_WIDTH : 1)
    }
    const observer = new ResizeObserver(updateScale)

    updateScale()
    observer.observe(root)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      aria-label={title}
      className={`scada-dom-root ${className}`}
      ref={rootRef}
      role="img"
      style={{ height: MONITOR_HEIGHT * scale }}
      title={title}
    >
      <div className="scada-dom-surface" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}

function ScadaDomButton({
  className = '',
  disabled = false,
  icon,
  label,
  onClick,
  style,
}: {
  className?: string
  disabled?: boolean
  icon?: string
  label: string
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <button
      className={`scada-dom-button ${className}`}
      disabled={disabled}
      onClick={onClick}
      style={style}
      type="button"
    >
      {icon ? (
        <>
          <img alt="" draggable={false} src={icon} />
          <span>{label}</span>
        </>
      ) : label}
    </button>
  )
}

const DOM_STATIONS = ['HBF', 'OTP', 'CNT', 'CQY', 'DBG', 'LTI', 'FRP', 'BNK', 'PTP', 'WLH', 'SER', 'KVN', 'HGN', 'BGK', 'SKG', 'PGL', 'PGC']

function ScadaStationStripDom({ top = 0 }: { top?: number }) {
  return (
    <div className="scada-station-strip" style={{ top }}>
      <div className="scada-station-line" />
      {DOM_STATIONS.map((station, index) => (
        <div className="scada-station" key={station} style={{ left: 30 + index * 64 }}>
          <span>{station}</span>
          <i />
        </div>
      ))}
      <div className="scada-station-depot">
        <span>O C C</span>
        <span>DEPOT</span>
      </div>
      <div className="scada-station-overall">OVERALL</div>
    </div>
  )
}

const DOM_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDomClock(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')

  return {
    date: `${DOM_WEEKDAY_LABELS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  }
}

function ScadaDomClock() {
  const [now, setNow] = useState(() => new Date())
  const display = formatDomClock(now)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="scada-dom-clock" title={`Current workstation time: ${display.time} ${display.date}`}>
      <span>{display.time}</span>
      <span>{display.date}</span>
    </div>
  )
}

function FooterIconStrip({
  activeTool,
  compact = false,
  onSelect,
}: {
  activeTool: string | null
  compact?: boolean
  onSelect: (tool: string, label: string) => void
}) {
  const iconButtons = [
    { icon: footerMoveArrowsIcon, label: 'Move view', tool: 'MOVE', x: 550 },
    { icon: footerDocumentSearchIcon, label: 'Search document', tool: 'DOCUMENT SEARCH', x: 596 },
    { icon: footerWindowPairIcon, label: 'Open sheet', tool: 'SHEET', x: 642 },
    { icon: footerWindowPanelIcon, label: 'Open panel', tool: 'PANEL', x: 688 },
    { icon: footerNetworkGearsIcon, label: 'Comms tools', tool: 'COMMS TOOLS', x: 746 },
    { icon: footerCardIcon, label: 'Card', tool: 'CARD', x: 792 },
    { icon: footerDeviceArrowIcon, label: 'Device control', tool: 'DEVICE', x: 838 },
  ]

  return (
    <div className="line-map-footer-icon-row" style={compact ? { top: 6 } : undefined}>
      {iconButtons.map((item) => (
        <button
          aria-pressed={activeTool === item.tool}
          className={activeTool === item.tool ? 'is-selected' : undefined}
          key={item.tool}
          onClick={() => onSelect(item.tool, item.label)}
          style={{ left: item.x }}
          title={item.label}
          type="button"
        >
          <img alt="" draggable={false} src={item.icon} />
        </button>
      ))}
    </div>
  )
}

export function CommonFooterDom({ active, leftMode, status, compact = false }: { active: string; leftMode: string; status: string; compact?: boolean }) {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [footerNote, setFooterNote] = useState('')
  const primaryButtons = [
    { icon: footerLayoutIcon, label: 'LAYOUT', tool: 'LAYOUT', width: 108, x: 1 },
    { icon: footerCommandIcon, label: 'COMMAND', tool: 'COMMAND', width: 108, x: 129 },
    { icon: footerPowerIcon, label: 'POWER', tool: 'POWER', width: 108, x: 257 },
    { icon: footerEcsIcon, label: 'E C S', tool: 'E C S', width: 108, x: 385 },
    { icon: footerTrafficIcon, label: 'TRAFFIC', tool: 'TRAFFIC', width: 108, x: 513 },
    { icon: footerComsIcon, label: 'COMS', tool: 'COMS', width: 108, x: 641 },
    { icon: footerUtilityIcon, label: 'UTILITY', tool: 'UTILITY', width: 108, x: 769 },
    { icon: footerAdminIcon, label: 'ADMIN', tool: 'ADMIN', width: 108, x: 897 },
  ]
  const navButtons = [
    { icon: footerNavLayoutLeftIcon, label: 'Previous layout page', tool: 'NAV LAYOUT LEFT', width: 44, x: 1029 },
    { icon: footerNavLayoutRightIcon, label: 'Next layout page', tool: 'NAV LAYOUT RIGHT', width: 47, x: 1073 },
    { icon: footerNavWindowLeftIcon, label: 'Previous window', tool: 'NAV WINDOW LEFT', width: 44, x: 1132 },
    { icon: footerNavWindowRightIcon, label: 'Next window', tool: 'NAV WINDOW RIGHT', width: 47, x: 1176 },
  ]
  const secondaryButtons = [
    { x: 31, w: 58, label: 'Point No.' },
    { x: 96, w: 58, label: 'Track No.' },
    { x: 165, w: 60, label: 'FB No.' },
    { x: 236, w: 62, label: 'Signal No.' },
    { x: 305, w: 60, label: 'Train' },
    { x: 367, w: 84, label: 'NorthBound' },
    { x: 451, w: 83, label: 'SouthBound' },
  ]
  const statusTool = activeTool ?? active
  const statusMode = activeMode ?? leftMode

  return (
    <div className={`scada-dom-footer${compact ? ' scada-dom-footer--compact' : ''}`}>
      {!compact && primaryButtons.map((button) => (
        <ScadaDomButton
          className={`line-map-footer-primary-button${button.tool === activeTool ? ' is-selected' : ''}`}
          icon={button.icon}
          key={button.tool}
          label={button.label}
          onClick={() => {
            setActiveTool(button.tool)
            setFooterNote(`${button.label} toolbar selected`)
          }}
          style={{ left: button.x, top: 8, width: button.width }}
        />
      ))}
      {!compact && (
        <>
          <div className="line-map-footer-nav-row">
            {navButtons.map((button) => (
              <button
                aria-label={button.label}
                aria-pressed={activeTool === button.tool}
                className={activeTool === button.tool ? 'is-selected' : undefined}
                key={button.tool}
                onClick={() => {
                  setActiveTool(button.tool)
                  setFooterNote(button.label)
                }}
                style={{ left: button.x, width: button.width }}
                title={button.label}
                type="button"
              >
                <img alt="" draggable={false} src={button.icon} />
              </button>
            ))}
          </div>
          <button
            aria-label="Help"
            aria-pressed={activeTool === 'HELP'}
            className={`line-map-footer-help-button${activeTool === 'HELP' ? ' is-selected' : ''}`}
            onClick={() => {
              setActiveTool('HELP')
              setFooterNote('Help')
            }}
            type="button"
          >
            <img alt="" draggable={false} src={footerHelpIcon} />
          </button>
        </>
      )}
      {secondaryButtons.map((button) => (
        <ScadaDomButton
          className={[
            'scada-dom-footer-mode-button',
            (button.label === 'NorthBound' || button.label === 'SouthBound' ? 'scada-dom-footer-speed-button' : ''),
            (button.label === activeMode ? 'is-selected' : ''),
          ].filter(Boolean).join(' ')}
          key={button.label}
          label={button.label}
          onClick={() => {
            setActiveMode(button.label)
            setFooterNote(`${button.label} mode selected`)
          }}
          style={{ left: button.x, top: 54, width: button.w }}
        />
      ))}
      <div className="scada-dom-footer-speed-label">Temporary Speed Restriction</div>
      <FooterIconStrip
        activeTool={activeTool}
        compact={compact}
        onSelect={(tool, label) => {
          setActiveTool(tool)
          setFooterNote(label)
        }}
      />
      <button
        aria-label="Print"
        aria-pressed={activeTool === 'PRINTER'}
        className={`line-map-footer-print${activeTool === 'PRINTER' ? ' is-selected' : ''}`}
        onClick={() => {
          setActiveTool('PRINTER')
          setFooterNote('Printer')
        }}
        style={compact ? { top: 7 } : undefined}
        title="Print"
        type="button"
      >
        <img alt="" draggable={false} src={footerPrinterIcon} />
      </button>
      <div className="scada-dom-footer-status">
        <span>{footerNote || status}</span>
        <span>{footerNote ? `${statusTool} / ${statusMode}` : '[ TSR1 ] @ OCC'}</span>
      </div>
      <ScadaDomClock />
    </div>
  )
}

function AlarmSummaryCanvas({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const rows = session.alarmSummaryRows
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'Archives' | 'Events' | 'Alarms'>('Alarms')
  const [statusNote, setStatusNote] = useState('Live alarm summary ready')
  const seedRowKeys = new Set(alarmSummaryRows.map((row) => `${row.timestamp}|${row.asset}|${row.description}`))
  const liveRows = rows
    .map((row, originalIndex) => ({ originalIndex, row }))
    .filter(({ row }) => !seedRowKeys.has(`${row.timestamp}|${row.asset}|${row.description}`))
  const visibleRows = liveRows.slice(0, 20)
  const selectedEntry = selectedIndex >= 0 ? liveRows[selectedIndex] : undefined
  const selectedRow = selectedEntry?.row
  const notAcknowledged = liveRows.filter(({ row }) => row.ack === 'Y').length
  const liveRowIndexes = new Set(liveRows.map(({ originalIndex }) => originalIndex))

  const rowToneClass = (tone: AlarmSummaryRow['tone']) => {
    if (tone === 'red') {
      return 'is-red'
    }

    if (tone === 'grey') {
      return 'is-grey'
    }

    return 'is-yellow'
  }

  const selectAlarmRow = (index: number) => {
    const entry = liveRows[index]

    if (!entry) {
      setSelectedIndex(-1)
      setStatusNote('No live alarm row at this position')
      return
    }

    setSelectedIndex(index)
    setStatusNote(`Live alarm row ${index + 1} selected: ${entry.row.asset}`)
  }

  const acknowledgeSelected = () => {
    if (!selectedRow || selectedEntry === undefined) {
      setStatusNote('No live alarm selected for acknowledgement')
      return
    }

    submitBackendScenarioAction(session, updateSession, {
      detail: `Alarm acknowledgement accepted for ${selectedRow.asset}.`,
      source: 'Monitor 01 Alarms',
      trainId: '317',
      type: 'ACK_ALARM',
    }, (current) => {
      const guard = completeScenarioTask(current, 'ackAlarm', 'Alarm acknowledgement accepted.', 'Monitor 01 Alarms')

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: current.alarmSummaryRows.map((row, index) => (
          index === selectedEntry.originalIndex ? { ...row, ack: 'N', tone: 'grey', value: row.value === 'NO ACK' ? 'ACK' : row.value } : row
        )),
      }
    }, (accepted, reason) => {
      setStatusNote(accepted ? `Acknowledged selected alarm: ${selectedRow.asset}` : reason ?? 'Alarm acknowledgement rejected')
    })
  }

  const acknowledgeAll = () => {
    if (liveRows.length === 0) {
      setStatusNote('No live alarm rows to acknowledge')
      return
    }

    submitBackendScenarioAction(session, updateSession, {
      detail: 'All visible live alarms acknowledged.',
      source: 'Monitor 01 Alarms',
      trainId: '317',
      type: 'ACK_ALARM',
    }, (current) => {
      const guard = completeScenarioTask(current, 'ackAlarm', 'All visible live alarms acknowledged.', 'Monitor 01 Alarms')

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: current.alarmSummaryRows.map((row, index) => (
          liveRowIndexes.has(index)
            ? {
                ...row,
                ack: 'N',
                tone: row.tone === 'red' ? 'red' : 'grey',
                value: row.value === 'NO ACK' ? 'ACK' : row.value,
              }
            : row
        )),
      }
    }, (accepted, reason) => {
      setStatusNote(accepted ? 'Acknowledged all visible live alarms' : reason ?? 'Alarm acknowledgement rejected')
    })
  }

  const cycleAlarmFilter = () => {
    const tabs: Array<typeof activeTab> = ['Alarms', 'Events', 'Archives']
    const nextTab = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length]

    setActiveTab(nextTab)
    setStatusNote(`Filter applied: ${nextTab}`)
  }

  const printAlarmSummary = () => {
    setStatusNote('Print requested for live alarm summary')
    window.print()
  }

  return (
    <ScadaDomSurface
      className="scada-dom-root--alarms"
      title={`${activeTab} | ${statusNote} | ${selectedRow ? selectedRow.asset : 'No live alarm selected'} | ${notAcknowledged} pending`}
    >
      <ScadaStationStripDom />
      <section className="alarm-dom-panel">
        <div className="alarm-dom-strip">Alarm summary display (filter: none)</div>
        <div className="alarm-dom-tabs" role="tablist">
          {(['Archives', 'Events', 'Alarms'] as const).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'is-active' : ''}
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setStatusNote(`${tab} tab selected`)
              }}
              role="tab"
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="alarm-dom-controls">
          <label>Total <output>{liveRows.length}</output></label>
          <label>Not Acknowledged <output>{notAcknowledged}</output></label>
          <ScadaDomButton label="Ack. all" onClick={acknowledgeAll} />
          <ScadaDomButton label="Ack. selection" onClick={acknowledgeSelected} />
          <ScadaDomButton label="Unselect alarms" onClick={() => { setSelectedIndex(-1); setStatusNote('Alarm selection cleared') }} />
          <ScadaDomButton label="Help" onClick={() => setStatusNote('Select a live row, then acknowledge or inspect it.')} />
          <ScadaDomButton label="Filter..." onClick={cycleAlarmFilter} />
          <ScadaDomButton label="Print" onClick={printAlarmSummary} />
          <ScadaDomButton label="Close" onClick={() => onNavigate('/')} />
          <label className="alarm-dom-sort">Sort column <output>TIMESTAMP - Descending</output></label>
        </div>
        <div className="alarm-dom-table" role="table">
          <div className="alarm-dom-row alarm-dom-row--head" role="row">
            <span>Ack</span>
            <span>AVL</span>
            <span>MMS</span>
            <span>TIMESTAMP</span>
            <span>ASSET</span>
            <span>DESCRIPTION</span>
            <span>VALUE</span>
          </div>
          {Array.from({ length: 20 }).map((_, index) => {
            const entry = visibleRows[index]

            if (!entry) {
              return <div className="alarm-dom-row alarm-dom-row--empty" key={`empty-${index}`} role="row" />
            }

            const isSelected = liveRows[selectedIndex]?.originalIndex === entry.originalIndex

            return (
              <button
                aria-pressed={isSelected}
                className={`alarm-dom-row alarm-dom-row--data ${rowToneClass(entry.row.tone)} ${isSelected ? 'is-selected' : ''}`}
                key={`${entry.originalIndex}-${entry.row.timestamp}-${entry.row.asset}-${entry.row.description}`}
                onClick={() => selectAlarmRow(index)}
                role="row"
                type="button"
              >
                <span>{entry.row.ack}</span>
                <span>{entry.row.avl}</span>
                <span>{entry.row.mms}</span>
                <span>{entry.row.timestamp}</span>
                <span>{entry.row.asset}</span>
                <span>{entry.row.description}</span>
                <span>{entry.row.value}</span>
              </button>
            )
          })}
          <div className="scada-dom-scrollbar scada-dom-scrollbar--alarm">
            <i />
          </div>
        </div>
        {liveRows.length === 0 ? (
          <div className="alarm-dom-empty">No live alarm rows yet. Confirm a command on Monitor 02 to populate this table.</div>
        ) : null}
        <div className="alarm-dom-status">{statusNote}</div>
      </section>
      <ScadaFooter active="TRAFFIC" leftMode="Train" status="MNADZRULS" />
    </ScadaDomSurface>
  )
}

function TimetableCanvas({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const tableRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const stationOptions = useMemo(() => getTimetableStationOptions(session.timetableRows), [session.timetableRows])
  const timetableView = useMemo(
    () => getActiveTimetableView(session.timetableRows, session.timetableView),
    [session.timetableRows, session.timetableView],
  )
  const activeStation = timetableView.station
  const direction = timetableView.direction
  const rowsForStation = useMemo(
    () => getTimetableRowsForStation(session.timetableRows, activeStation),
    [activeStation, session.timetableRows],
  )
  const rows = useMemo(
    () => getTimetableViewRows(session.timetableRows, timetableView),
    [session.timetableRows, timetableView],
  )
  const [scrollState, setScrollState] = useState({ clientHeight: 0, max: 0, scrollHeight: 0, top: 0 })
  const loadedTimeTableName = NEL_TIMETABLE_NAME
  const [actionNote, setActionNote] = useState('')
  const selectedRowIndex = rows.length > 0 ? Math.min(selectedIndex, rows.length - 1) : -1
  const selectedRow = selectedRowIndex >= 0 ? rows[selectedRowIndex] : undefined
  const tripActions = ['Service cancellation', 'Service restoration', 'Shift trips', 'Trip interruption', 'Trip modification', 'Creation of additional trips']
  const timetableClockTime = formatTimetableClockTime(session.timetableClock)
  const timetableClockModeLabel = session.timetableClock.mode === 'PLAYBACK'
    ? `PLAYBACK ${session.timetableClock.playbackSpeed}x`
    : 'LIVE'
  const scrollbarHeight = 286
  const scrollbarButtonSize = 16
  const scrollbarTrackHeight = scrollbarHeight - scrollbarButtonSize * 2
  const scrollbarThumbHeight = scrollState.max > 0
    ? Math.max(38, Math.round(scrollbarTrackHeight * (scrollState.clientHeight / Math.max(scrollState.scrollHeight, 1))))
    : 106
  const scrollbarThumbTravel = Math.max(0, scrollbarTrackHeight - scrollbarThumbHeight)
  const scrollbarThumbTop = scrollbarButtonSize + (
    scrollState.max > 0 ? Math.round(scrollbarThumbTravel * (scrollState.top / scrollState.max)) : 0
  )

  const updateTimetableScroll = useCallback(() => {
    const table = tableRef.current

    if (!table) {
      return
    }

    setScrollState({
      clientHeight: table.clientHeight,
      max: Math.max(0, table.scrollHeight - table.clientHeight),
      scrollHeight: table.scrollHeight,
      top: table.scrollTop,
    })
  }, [])

  useEffect(() => {
    updateTimetableScroll()
  }, [rows.length, updateTimetableScroll])

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0
    }

    updateTimetableScroll()
  }, [activeStation, direction, updateTimetableScroll])

  const scrollTimetableBy = (delta: number) => {
    const table = tableRef.current

    if (!table) {
      return
    }

    table.scrollTop = Math.max(0, Math.min(scrollState.max, table.scrollTop + delta))
    updateTimetableScroll()
  }

  const startTimetableThumbDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (scrollState.max <= 0 || scrollbarThumbTravel <= 0) {
      return
    }

    const table = tableRef.current

    if (!table) {
      return
    }

    const startY = event.clientY
    const startTop = table.scrollTop

    const moveThumb = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      table.scrollTop = Math.max(0, Math.min(scrollState.max, startTop + (deltaY / scrollbarThumbTravel) * scrollState.max))
      updateTimetableScroll()
    }

    const stopDrag = () => {
      window.removeEventListener('pointermove', moveThumb)
      window.removeEventListener('pointerup', stopDrag)
    }

    window.addEventListener('pointermove', moveThumb)
    window.addEventListener('pointerup', stopDrag)
  }

  const selectTimetableRow = (index: number) => {
    setSelectedIndex(index)
    const row = rows[index]

    if (row) {
      submitBackendScenarioAction(session, updateSession, {
        detail: row.train === '317'
          ? 'Train 317 timetable row selected.'
          : `Train ${row.train} timetable row selected. Active drill target remains Train 317.`,
        source: 'Monitor 03 Timetable',
        trainId: row.train,
        type: 'SELECT_TRAIN',
      }, (current) => ({
        ...current,
        scenarioNotice: row.train === '317'
          ? { text: 'Train 317 timetable row selected.', tone: 'info' }
          : { text: 'Scenario target is Train 317.', tone: 'warning' },
        scenarioTasks: row.train === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
        selectedTrainId: row.train,
      }))
    }
  }

  const setDirectionFilter = (nextDirection: 'NB' | 'SB') => {
    setSelectedIndex(0)
    setActionNote(`Direction filter changed to ${nextDirection}`)
    updateSession((current) => ({
      ...current,
      timetableView: {
        ...current.timetableView,
        direction: nextDirection,
      },
    }))
  }

  const setStationSelection = (nextStation: string) => {
    setSelectedIndex(0)
    setActionNote(`Station ${nextStation} selected`)
    updateSession((current) => ({
      ...current,
      timetableView: {
        ...current.timetableView,
        station: nextStation,
      },
    }))
  }

  const setLiveTimetableClock = () => {
    setActionNote('Live timetable clock selected')
    updateSession((current) => ({
      ...current,
      timetableClock: { ...DEFAULT_TIMETABLE_CLOCK_STATE },
      updatedAt: Date.now(),
    }))
  }

  const startTimetablePlayback = () => {
    const now = new Date()
    const nextClock = startTimetablePlaybackClock(session.timetableRows, now)

    setActionNote(`Timetable playback started at ${formatTimetableClockTime(nextClock, now)}`)
    updateSession((current) => ({
      ...current,
      timetableClock: nextClock,
      updatedAt: Date.now(),
    }))
  }

  const applyTripAction = (action: string) => {
    if (!selectedRow) {
      setActionNote('No timetable row selected')
      return
    }

    const actionMeta: Record<string, { state: string; status: TrainStatus; tone: MonitorAlarmRow['tone']; value: string }> = {
      'Service cancellation': { state: 'C>', status: 'HOLD', tone: 'red', value: 'CANCELLED' },
      'Service restoration': { state: '>', status: 'RUN', tone: 'yellow', value: 'RESTORED' },
      'Shift trips': { state: 'S>', status: 'WAIT', tone: 'yellow', value: 'SHIFTED' },
      'Trip interruption': { state: 'H>', status: 'HOLD', tone: 'orange', value: 'INTERRUPT' },
      'Trip modification': { state: 'M>', status: 'WAIT', tone: 'yellow', value: 'MODIFIED' },
      'Creation of additional trips': { state: 'A>', status: 'WAIT', tone: 'yellow', value: 'ADDED' },
    }
    const meta = actionMeta[action] ?? actionMeta['Trip modification']
    const taskId: ScenarioTaskId = action === 'Service restoration' ? 'dispatchTrain' : 'setRoute'
    const event = createMonitorEvent(
      selectedRow.train,
      `Timetable ${action.toLowerCase()}: Train ${selectedRow.train}`,
      meta.value,
      meta.tone,
    )

    submitBackendScenarioAction(session, updateSession, {
      detail: `${action} accepted for Train ${selectedRow.train}.`,
      source: 'Monitor 03 Timetable',
      trainId: selectedRow.train,
      type: taskId === 'dispatchTrain' ? 'DISPATCH_TRAIN' : 'SET_ROUTE',
    }, (current) => {
      const guard = completeScenarioTask(
        current,
        taskId,
        `${action} accepted for Train ${selectedRow.train}.`,
        'Monitor 03 Timetable',
      )

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event, meta.tone === 'red' ? 'red' : 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        selectedTrainId: selectedRow.train,
        lineMap: updateLineMapRouteState(current.lineMap, { id: selectedRow.train }, getLineMapRouteStatus(meta.status)),
        timetableRows: current.timetableRows.map((row) => (
          row.train === selectedRow.train && row.sched === selectedRow.sched ? { ...row, state: meta.state } : row
        )),
        trains: current.trains.map((train) => (
          train.id === selectedRow.train ? { ...train, status: meta.status } : train
        )),
      }
    }, (accepted, reason) => {
      setActionNote(accepted ? `${action}: Train ${selectedRow.train} schedule ${selectedRow.sched}` : reason ?? 'Timetable action rejected')
    })
  }

  const printTimetable = () => {
    setActionNote('Print requested for traffic current timetable')
    window.print()
  }

  const renderTripButton = (label: string) => (
    <ScadaDomButton
      className="timetable-dom-trip-button"
      key={label}
      label={label}
      onClick={() => applyTripAction(label)}
    />
  )

  return (
    <ScadaDomSurface
      className="scada-dom-root--timetable"
      title={`${actionNote || `Loaded time table ${loadedTimeTableName}`} | ${selectedRow ? `TRN ${selectedRow.train} ${direction}` : 'TRN --'}`}
    >
      <div className="timetable-dom-title-strip">Traffic current time table</div>
      <section className="timetable-dom-panel">
        <div className="timetable-dom-filters">
          <label>
            <span>Loaded time table</span>
            <output>{loadedTimeTableName}</output>
          </label>
          <label>
            <span>Station</span>
            <select
              disabled={stationOptions.length <= 1}
              value={activeStation}
              onChange={(event) => setStationSelection(event.target.value)}
            >
              {stationOptions.map((station) => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Direction</legend>
            <label><input checked={direction === 'NB'} onChange={() => setDirectionFilter('NB')} type="radio" /> NB</label>
            <label><input checked={direction === 'SB'} onChange={() => setDirectionFilter('SB')} type="radio" /> SB</label>
          </fieldset>
          <output className="timetable-dom-filter-summary">
            {rows.length} {direction} rows shown / {rowsForStation.length} {activeStation} rows loaded
          </output>
          <output className="timetable-dom-clock-summary">
            {timetableClockModeLabel} {timetableClockTime}
          </output>
          <ScadaDomButton
            className="timetable-dom-clock-button"
            label="Live"
            onClick={setLiveTimetableClock}
          />
          <ScadaDomButton
            className="timetable-dom-clock-button"
            label="Playback"
            onClick={startTimetablePlayback}
          />
        </div>
        <div className="timetable-dom-headings">
          <span className="origin">ORIGIN</span>
          <span className="selected">SELECTED STATION</span>
          <span className="destination">DESTINATION</span>
        </div>
        <div className="timetable-dom-table" onScroll={updateTimetableScroll} ref={tableRef} role="table">
          <div className="timetable-dom-row timetable-dom-row--head" role="row">
            <span>Train<br />#</span>
            <span>Sched.<br />#</span>
            <span>Point</span>
            <span>Time</span>
            <span>Manoeuvre before</span>
            <span>Point</span>
            <span>Time</span>
            <span>Dwell</span>
            <span>Run</span>
            <span>Point</span>
            <span>Time</span>
            <span>Manoeuvre after</span>
            <span>Rev.</span>
            <span>Speed<br />inc.</span>
            <span>Min.<br />dwell</span>
            <span>Crew<br />#</span>
          </div>
          {rows.map((row, index) => (
            <button
              aria-pressed={selectedRowIndex === index}
              className={`timetable-dom-row timetable-dom-row--data ${selectedRowIndex === index ? 'is-selected' : ''}`}
              key={`${row.train}-${row.sched}-${index}`}
              onClick={() => selectTimetableRow(index)}
              role="row"
              type="button"
            >
              <span>{row.train}</span>
              <span>{row.sched}</span>
              <span>{row.originPoint}</span>
              <span>{row.originTime}</span>
              <span>-</span>
              <span>{row.stationPoint}</span>
              <span>{row.stationTime}</span>
              <span>{row.dwell}</span>
              <span>{row.run}</span>
              <span>{row.destinationPoint}</span>
              <span>{row.destinationTime}</span>
              <span>-</span>
              <span>{row.revision}</span>
              <span>{row.speed}</span>
              <span />
              <span />
            </button>
          ))}
        </div>
        <div className="timetable-dom-custom-scrollbar" aria-label="Timetable vertical scroll">
          <button
            aria-label="Scroll timetable up"
            className="timetable-dom-scroll-button timetable-dom-scroll-button--up"
            onClick={() => scrollTimetableBy(-28)}
            type="button"
          />
          <button
            aria-label="Drag timetable scroll position"
            className="timetable-dom-scroll-thumb"
            onPointerDown={startTimetableThumbDrag}
            style={{ height: scrollbarThumbHeight, top: scrollbarThumbTop }}
            type="button"
          />
          <button
            aria-label="Scroll timetable down"
            className="timetable-dom-scroll-button timetable-dom-scroll-button--down"
            onClick={() => scrollTimetableBy(28)}
            type="button"
          />
        </div>
        <div className="timetable-dom-actions">
          {tripActions.map(renderTripButton)}
        </div>
        <ScadaDomButton className="timetable-dom-help" label="Help" onClick={() => setActionNote('Help: select a train row, then apply a timetable action')} />
        <ScadaDomButton className="timetable-dom-print" label="Print" onClick={printTimetable} />
        <ScadaDomButton className="timetable-dom-close" label="Close" onClick={() => onNavigate('/')} />
      </section>
      <ScadaFooter active="TRAFFIC" leftMode="FB No." status="MNADZRULS" compact />
    </ScadaDomSurface>
  )
}
function CommonFooterSvg({ active, leftMode, status }: { active: string; leftMode: string; status: string }) {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [footerNote, setFooterNote] = useState('')
  const primaryButtons = ['LAYOUT', 'COMMAND', 'POWER', 'E C S', 'TRAFFIC', 'COMS', 'UTILITY', 'ADMIN']
  const secondaryButtons = [
    { x: 30, w: 60, label: 'Point No.' },
    { x: 96, w: 58, label: 'Track No.' },
    { x: 164, w: 62, label: 'FB No.' },
    { x: 234, w: 62, label: 'Signal No.' },
    { x: 306, w: 58, label: 'Train' },
    { x: 370, w: 80, label: 'NorthBound' },
    { x: 452, w: 80, label: 'SouthBound' },
  ]

  const selectedTool = activeTool ?? active
  const selectedMode = activeMode ?? leftMode

  return (
    <g transform="translate(0 926)">
      <rect width={MONITOR_WIDTH} height="93" fill="#b8c7dc" />
      <line x1="0" y1="0" x2={MONITOR_WIDTH} y2="0" stroke="#fff" strokeWidth="3" />
      {primaryButtons.map((label, index) => (
        <ToolbarButton
          x={8 + index * 128}
          y={8}
          w={108}
          label={label}
          selected={label === selectedTool}
          onClick={() => {
            setActiveTool(label)
            setFooterNote(`${label} toolbar selected`)
          }}
          key={label}
        />
      ))}
      {secondaryButtons.map((button) => (
        <ToolbarButton
          x={button.x}
          y={54}
          w={button.w}
          label={button.label}
          selected={button.label === selectedMode}
          onClick={() => {
            setActiveMode(button.label)
            setFooterNote(`${button.label} mode selected`)
          }}
          key={button.label}
        />
      ))}
      <rect x="898" y="52" width="166" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <text className="svg-status-text" x="981" y="68" textAnchor="middle">{footerNote || status}</text>
      <text className="svg-status-text" x="981" y="82" textAnchor="middle">{footerNote ? `${selectedTool} / ${selectedMode}` : '[ TSR1 ] @ OCC'}</text>
      <rect x="1122" y="52" width="144" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <LiveScadaClock height={36} width={144} x={1122} y={52} />
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
  onConfirmDepartureTime: () => void
  onConfirmDoorCommand: (command: TrainDoorCommand) => void
  onConfirmReadiness: (command: string) => void
  onOpenDetails: () => void
  onPageChange: (page: InspectorPage) => void
  page: InspectorPage
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const confirmationDrag = usePopupDrag()
  const trainIdentityLabel = train.id.padStart(3, '0')
  const trainNumber = train.trainNumber ?? '0'
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
  const [ptiDialogOpen, setPtiDialogOpen] = useState(false)
  const [trainTimeDialogKind, setTrainTimeDialogKind] = useState<'arrival' | 'departure' | null>(null)
  const [changeEndsDialogOpen, setChangeEndsDialogOpen] = useState(false)
  const [trainHoldDialogOpen, setTrainHoldDialogOpen] = useState(false)
  const [skipStopDialogOpen, setSkipStopDialogOpen] = useState(false)
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
  const readiness = activeReadinessSelection ?? getTrainReadinessRequestValue({ readinessMode: effectiveReadinessMode })
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

  const updateControlSelection = (key: string, label: string, nextValue: string) => {
    setControlSelections((current) => ({
      ...current,
      [key]: nextValue,
    }))
    setStatusMessage(`${label}${nextValue ? ` ${nextValue}` : ''} selected`)
  }

  const openTrainTimeDialog = (kind: 'arrival' | 'departure') => {
    setConfirmationCommand(null)
    setPtiDialogOpen(false)
    setChangeEndsDialogOpen(false)
    setTrainHoldDialogOpen(false)
    setSkipStopDialogOpen(false)
    setTrainTimeDialogKind(kind)
    setStatusMessage(`${kind === 'arrival' ? 'Arrival' : 'Departure'} time selected`)
  }

  const openPtiDialog = () => {
    setConfirmationCommand(null)
    setTrainTimeDialogKind(null)
    setChangeEndsDialogOpen(false)
    setTrainHoldDialogOpen(false)
    setSkipStopDialogOpen(false)
    setPtiDialogOpen(true)
    setStatusMessage('PTI initialisation selected')
  }

  const openChangeEndsDialog = () => {
    setConfirmationCommand(null)
    setPtiDialogOpen(false)
    setTrainTimeDialogKind(null)
    setTrainHoldDialogOpen(false)
    setSkipStopDialogOpen(false)
    setChangeEndsDialogOpen(true)
    setStatusMessage('Change of ends request selected')
  }

  const openTrainHoldDialog = () => {
    setConfirmationCommand(null)
    setPtiDialogOpen(false)
    setTrainTimeDialogKind(null)
    setChangeEndsDialogOpen(false)
    setSkipStopDialogOpen(false)
    setTrainHoldDialogOpen(true)
    setStatusMessage('Train hold selected')
  }

  const openSkipStopDialog = () => {
    setConfirmationCommand(null)
    setPtiDialogOpen(false)
    setTrainTimeDialogKind(null)
    setChangeEndsDialogOpen(false)
    setTrainHoldDialogOpen(false)
    setSkipStopDialogOpen(true)
    setStatusMessage('Skip stop selected')
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
          initialSelection={arrivalTimeSelection}
          key={`${train.id}-${trainTimeDialogKind}`}
          kind={trainTimeDialogKind}
          onApply={(message, selection) => {
            setStatusMessage(message)

            if (selection.kind === 'arrival') {
              onConfirmArrivalTime(selection)
            }
          }}
          onConfirmDeparture={onConfirmDepartureTime}
          onClose={() => setTrainTimeDialogKind(null)}
          train={train}
        />
      ) : null}

      {ptiDialogOpen ? (
        <PtiInitialisationDialog
          key={`${train.id}-pti`}
          onApply={(message) => setStatusMessage(message)}
          onClose={() => setPtiDialogOpen(false)}
          train={train}
        />
      ) : null}

      {changeEndsDialogOpen ? (
        <ChangeEndsDialog
          currentDirection={currentDirection}
          defaultStation={nearestPlatform.code}
          key={`${train.id}-${nearestPlatform.code}-${currentDirection}`}
          onApply={(message) => setStatusMessage(message)}
          onClose={() => setChangeEndsDialogOpen(false)}
          train={train}
        />
      ) : null}

      {trainHoldDialogOpen ? (
        <TrainHoldDialog
          currentDirection={currentDirection}
          key={`${train.id}-${currentDirection}-train-hold`}
          onApply={(message) => setStatusMessage(message)}
          onClose={() => setTrainHoldDialogOpen(false)}
          train={train}
        />
      ) : null}

      {skipStopDialogOpen ? (
        <SkipStopDialog
          currentDirection={currentDirection}
          defaultStation={nearestPlatform.code}
          key={`${train.id}-${nearestPlatform.code}-${currentDirection}-skip-stop`}
          onApply={(message) => setStatusMessage(message)}
          onClose={() => setSkipStopDialogOpen(false)}
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
  const [trainItamaStatusOverrides, setTrainItamaStatusOverrides] = useState<Record<string, 'GRANTED' | 'NOT_GRANTED'>>({})
  const [trainReadinessModeOverrides, setTrainReadinessModeOverrides] = useState<Record<string, TrainReadinessMode>>({})
  const [timetablePlaybackTick, setTimetablePlaybackTick] = useState(0)
  const [timetableDiagnosticsNow, setTimetableDiagnosticsNow] = useState(() => new Date())
  const resetLocalLineMapStateKey = `${session.sessionMeta.createdAt}:${session.scenarioMode}:${session.scenarioStep}`
  const shouldClearLocalLineMapState = session.scenarioMode === 'IDLE' && session.scenarioStep === 0
  const [routeControlModeState, setRouteControlModeState] = useState<{
    resetKey: string
    value: Record<string, RouteControlMode>
  }>({ resetKey: resetLocalLineMapStateKey, value: {} })
  const [routeFleetStatusState, setRouteFleetStatusState] = useState<{
    resetKey: string
    value: Record<string, RouteFleetStatus>
  }>({ resetKey: resetLocalLineMapStateKey, value: {} })
  const [trainArrivalDestinationState, setTrainArrivalDestinationState] = useState<{
    resetKey: string
    value: Record<string, TrainTimeSelection>
  }>({ resetKey: resetLocalLineMapStateKey, value: {} })
  const [lineMapRouteSegmentOverrideState, setLineMapRouteSegmentOverrideState] = useState<{
    resetKey: string
    value: LineMapRuntimeState['routeSegments']
  }>({ resetKey: resetLocalLineMapStateKey, value: {} })
  const panAnimationRef = useRef<number | null>(null)
  const trainRouteAnimationRef = useRef<number | null>(null)
  const timetablePlaybackPlanTimeoutsRef = useRef(new Map<string, number[]>())
  const timetablePlaybackScheduledPlanKeysRef = useRef(new Set<string>())
  const timetablePlaybackScopeKeyRef = useRef('')
  const latestLineMapSessionRef = useRef(session)
  const panTargetRef = useRef<number>(DEFAULT_LINE_MAP_PAN)
  const panValueRef = useRef<number>(DEFAULT_LINE_MAP_PAN)
  const dragRef = useRef<{ startX: number; startPan: number } | null>(null)
  const routeControlModes = useMemo(() => (
    shouldClearLocalLineMapState && routeControlModeState.resetKey !== resetLocalLineMapStateKey
      ? {}
      : routeControlModeState.value
  ), [resetLocalLineMapStateKey, routeControlModeState, shouldClearLocalLineMapState])
  const routeFleetStatuses = useMemo(() => (
    shouldClearLocalLineMapState && routeFleetStatusState.resetKey !== resetLocalLineMapStateKey
      ? {}
      : routeFleetStatusState.value
  ), [resetLocalLineMapStateKey, routeFleetStatusState, shouldClearLocalLineMapState])
  const timetableRowsRef = useRef(session.timetableRows)
  const trainArrivalDestinations = useMemo(() => (
    shouldClearLocalLineMapState && trainArrivalDestinationState.resetKey !== resetLocalLineMapStateKey
      ? {}
      : trainArrivalDestinationState.value
  ), [resetLocalLineMapStateKey, shouldClearLocalLineMapState, trainArrivalDestinationState])
  const lineMapRouteSegmentOverrides = useMemo(() => (
    shouldClearLocalLineMapState && lineMapRouteSegmentOverrideState.resetKey !== resetLocalLineMapStateKey
      ? {}
      : lineMapRouteSegmentOverrideState.value
  ), [lineMapRouteSegmentOverrideState, resetLocalLineMapStateKey, shouldClearLocalLineMapState])
  const setRouteControlModes = useCallback((update: SetStateAction<Record<string, RouteControlMode>>) => {
    setRouteControlModeState((current) => {
      const currentValue = shouldClearLocalLineMapState && current.resetKey !== resetLocalLineMapStateKey
        ? {}
        : current.value

      return {
        resetKey: resetLocalLineMapStateKey,
        value: typeof update === 'function'
          ? (update as (currentValue: Record<string, RouteControlMode>) => Record<string, RouteControlMode>)(currentValue)
          : update,
      }
    })
  }, [resetLocalLineMapStateKey, shouldClearLocalLineMapState])
  const setRouteFleetStatuses = useCallback((update: SetStateAction<Record<string, RouteFleetStatus>>) => {
    setRouteFleetStatusState((current) => {
      const currentValue = shouldClearLocalLineMapState && current.resetKey !== resetLocalLineMapStateKey
        ? {}
        : current.value

      return {
        resetKey: resetLocalLineMapStateKey,
        value: typeof update === 'function'
          ? (update as (currentValue: Record<string, RouteFleetStatus>) => Record<string, RouteFleetStatus>)(currentValue)
          : update,
      }
    })
  }, [resetLocalLineMapStateKey, shouldClearLocalLineMapState])
  const setTrainArrivalDestinations = useCallback((update: SetStateAction<Record<string, TrainTimeSelection>>) => {
    setTrainArrivalDestinationState((current) => {
      const currentValue = shouldClearLocalLineMapState && current.resetKey !== resetLocalLineMapStateKey
        ? {}
        : current.value

      return {
        resetKey: resetLocalLineMapStateKey,
        value: typeof update === 'function'
          ? (update as (currentValue: Record<string, TrainTimeSelection>) => Record<string, TrainTimeSelection>)(currentValue)
          : update,
      }
    })
  }, [resetLocalLineMapStateKey, shouldClearLocalLineMapState])
  const setLineMapRouteSegmentOverrides = useCallback((update: SetStateAction<LineMapRuntimeState['routeSegments']>) => {
    setLineMapRouteSegmentOverrideState((current) => {
      const currentValue = shouldClearLocalLineMapState && current.resetKey !== resetLocalLineMapStateKey
        ? {}
        : current.value

      return {
        resetKey: resetLocalLineMapStateKey,
        value: typeof update === 'function'
          ? (update as (currentValue: LineMapRuntimeState['routeSegments']) => LineMapRuntimeState['routeSegments'])(currentValue)
          : update,
      }
    })
  }, [resetLocalLineMapStateKey, shouldClearLocalLineMapState])

  useEffect(() => {
    latestLineMapSessionRef.current = session
  }, [session])

  useEffect(() => {
    timetableRowsRef.current = session.timetableRows
  }, [session.timetableRows])

  const sessionLineMap = clearTimetableGuideRouteState(
    normalizeLineMapRuntimeState(session.lineMap),
    getTimetablePlaybackTrainIdSet(session.trains),
  )
  const renderedTrains = session.trains.map((train) => {
    const itamaStatus = trainItamaStatusOverrides[train.id]
    const readinessMode = trainReadinessModeOverrides[train.id]
    const routeStep = getTrainRouteStepFromLineMap(sessionLineMap, train.id, TRAIN_ROUTE_RENDER_STEPS)
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
  const timetableClockNow = getTimetableClockNow(session.timetableClock, timetableDiagnosticsNow)
  const timetableRouteDiagnosticsSummary = createTimetableRouteDiagnosticsSummary(
    createTimetableRouteDiagnostics({
      now: timetableClockNow,
      routeControlModes,
      rows: session.timetableRows,
      trains: renderedTrains,
    }),
  )
  const inspectorTrain = inspectorPanel ? renderedTrains.find((train) => train.id === inspectorPanel.trainId) : undefined
  const auxiliaryTrain = auxiliaryPanel ? renderedTrains.find((train) => train.id === auxiliaryPanel.trainId) : undefined
  const itamaTrain = itamaTrainId ? renderedTrains.find((train) => train.id === itamaTrainId) : undefined
  const menuTrain = trainMenu ? renderedTrains.find((train) => train.id === trainMenu.trainId) : undefined
  const trainOccupancyRouteSegments = createTrainOccupancyRouteSegmentStates(renderedTrains, sessionLineMap)
  const renderedRouteSegments = {
    ...lineMapRouteSegmentOverrides,
    ...sessionLineMap.routeSegments,
  }

  const renderedLineMap: LineMapRuntimeState = {
    ...sessionLineMap,
    routeSegments: renderedRouteSegments,
  }

  useEffect(() => {
    updateSession((current) => {
      let changed = false
      const trains = current.trains.map((currentTrain) => {
        const currentRouteStep = getTrainRouteStepFromLineMap(current.lineMap, currentTrain.id, TRAIN_ROUTE_RENDER_STEPS)

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

  const cancelTrainRouteAnimation = useCallback(() => {
    if (trainRouteAnimationRef.current !== null) {
      window.clearTimeout(trainRouteAnimationRef.current)
      trainRouteAnimationRef.current = null
    }
  }, [])

  const cancelTimetablePlayback = useCallback(() => {
    timetablePlaybackPlanTimeoutsRef.current.forEach((timeoutIds) => {
      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
    })
    timetablePlaybackPlanTimeoutsRef.current.clear()
    timetablePlaybackScheduledPlanKeysRef.current.clear()
    timetablePlaybackScopeKeyRef.current = ''
  }, [])

  useEffect(() => {
    if (session.scenarioMode !== 'IDLE' || session.scenarioStep !== 0) {
      return
    }

    cancelTrainRouteAnimation()
    cancelTimetablePlayback()
  }, [cancelTimetablePlayback, cancelTrainRouteAnimation, session.scenarioMode, session.scenarioStep, session.sessionMeta.createdAt])

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
      detail: trainId === '317'
        ? 'Train 317 selected. Acknowledge alarm before route.'
        : `Train ${trainId} selected. Active drill target remains Train 317.`,
      source: 'Monitor 02 Line Map',
      trainId,
      type: 'SELECT_TRAIN',
    }, (current) => ({
      ...current,
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA opened',
          'info',
          `ITAMA status opened for Train ${trainId}.`,
        ),
      ),
      scenarioNotice: trainId === '317'
        ? { text: 'Train 317 ITAMA status opened on line map.', tone: 'info' }
        : { text: `ITAMA status opened for Train ${trainId}. Scenario target remains Train 317.`, tone: 'warning' },
      scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
      selectedTrainId: trainId,
    }))
  }

  const openTrainInspector = (trainId: string, page: InspectorPage) => {
    setTrainMenu(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setInspectorPanel({ trainId, page })
    updateSession((current) => ({
      ...current,
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          `Inspector ${page} opened`,
          'info',
          `Inspecting page opened for Train ${trainId}.`,
        ),
      ),
      scenarioNotice: trainId === '317'
        ? { text: `Train 317 inspector ${page} page opened.`, tone: 'info' }
        : { text: `Train ${trainId} inspector opened. Active drill target remains Train 317.`, tone: 'warning' },
      scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
      selectedTrainId: trainId,
    }))
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

      return {
        ...current,
        alarmSummaryRows: item.summaryTone
          ? [createSummaryEvent(event, item.summaryTone), ...current.alarmSummaryRows].slice(0, 12)
          : current.alarmSummaryRows,
        eventRows: [event, ...current.eventRows].slice(0, 4),
        evidenceLog: appendScenarioEvidence(
          current.evidenceLog,
          createScenarioEvidence('Monitor 02 Line Map', item.action, 'info', item.notice),
        ),
        scenarioNotice: {
          text: item.notice,
          tone: item.noticeTone,
        },
        scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
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
          ? { ...train, readinessMode }
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

    updateSession((current) => ({
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
        tone: command === 'withdraw-service' ? 'warning' : 'success',
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
    }))
  }

  const animateTrainDepartureRoute = useCallback((trainId: string) => {
    const plan = createManualTrainRoutePlan({
      arrivalDestinations: trainArrivalDestinations,
      lineMap: session.lineMap,
      trainId,
      trains: session.trains,
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
      return
    }

    cancelTrainRouteAnimation()
    setLineMapRouteSegmentOverrides((current) => {
      return clearManualTrainRouteSegmentOverrides(current, plan.authority)
    })

    const { authority, currentStepIndex, lastStepIndex } = plan
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: Departure time set, stepping on ${authority.routeLabel}`,
      'RUN',
      'yellow',
    )

    updateSession((current) => ({
      ...applyManualTrainRouteStepState(current, trainId, authority, currentStepIndex),
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} departure confirmed. Stepping rail-by-rail on ${authority.routeLabel}.`,
        tone: 'info',
      },
      timetableRows: upsertTimetableRow(current.timetableRows, trainId, '>'),
    }))

    const setTrainAtRouteStep = (stepIndex: number) => {
      updateSession((current) => applyManualTrainRouteStepState(current, trainId, authority, stepIndex))
    }

    const scheduleRouteStep = (stepIndex: number, delay: number) => {
      trainRouteAnimationRef.current = window.setTimeout(() => {
        if (stepIndex > lastStepIndex) {
          trainRouteAnimationRef.current = null
          return
        }

        setTrainAtRouteStep(stepIndex)

        if (stepIndex < lastStepIndex) {
          scheduleRouteStep(stepIndex + 1, MANUAL_TRAIN_ROUTE_STEP_DURATION_MS)
        } else {
          trainRouteAnimationRef.current = null
        }
      }, delay)
    }

    if (currentStepIndex < lastStepIndex) {
      scheduleRouteStep(currentStepIndex + 1, MANUAL_TRAIN_ROUTE_STEP_DURATION_MS)
    }
  }, [cancelTrainRouteAnimation, session.lineMap, session.trains, setLineMapRouteSegmentOverrides, trainArrivalDestinations, updateSession])

  const openTrainContextMenu = (trainId: string, x: number, y: number) => {
    setInspectorPanel(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setDefineRouteSignal(null)
    setSignalMenu(null)
    setTrainMenu({ trainId, x, y })
    submitBackendScenarioAction(session, updateSession, {
      detail: trainId === '317'
        ? 'Train 317 selected. Select ITAMA, hold, route, or dispatch.'
        : `Train ${trainId} selected. Active drill target remains Train 317.`,
      source: 'Monitor 02 Line Map',
      trainId,
      type: 'SELECT_TRAIN',
    }, (current) => ({
      ...current,
      scenarioNotice: trainId === '317'
        ? { text: 'Train 317 command menu opened. Select ITAMA, hold, route, or dispatch.', tone: 'info' }
        : { text: `Train ${trainId} command menu opened. Active drill target remains Train 317.`, tone: 'warning' },
      scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
      selectedTrainId: trainId,
    }))
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
    const visibleTargetTrain = getSignalRouteTargetTrain(session.trains, session.selectedTrainId)

    if (!hasSignalRouteCommand(signal, routeLabel)) {
      return
    }

    const routeOwner = visibleTargetTrain ?? { id: '' }

    setLineMapRouteSegmentOverrides((current) => createSignalRouteSetOverrideSegments(current, signal, routeLabel, routeOwner))
    updateSession((current) => applySignalRouteSetSession(current, signal, routeLabel))
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
    const taskId: ScenarioTaskId = command === 'DISPATCH' ? 'dispatchTrain' : command === 'ROUTE' ? 'setRoute' : 'selectTrain'
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
      const guard = completeScenarioTask(current, taskId, `${message} accepted.`, 'Monitor 02 Line Map')

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
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

  useEffect(() => () => {
    cancelTimetablePlayback()
  }, [cancelTimetablePlayback])

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

  useEffect(() => {
    const refreshMs = session.timetableClock.mode === 'PLAYBACK'
      ? 1000
      : TIMETABLE_PLAYBACK_REFRESH_MS
    const intervalId = window.setInterval(() => {
      setTimetablePlaybackTick((current) => current + 1)
      setTimetableDiagnosticsNow(new Date())
    }, refreshMs)

    return () => window.clearInterval(intervalId)
  }, [session.timetableClock.mode])

  useEffect(() => {
    const playbackClock = latestLineMapSessionRef.current.timetableClock
    const playbackNow = getTimetableClockNow(playbackClock, new Date())
    const scopeKey = [
      createTimetablePlaybackScopeKey(
        session.sessionMeta.createdAt,
        routeControlModes,
      ),
      createTimetableClockKey(playbackClock),
    ].join(':')

    if (timetablePlaybackScopeKeyRef.current !== scopeKey) {
      cancelTimetablePlayback()
      timetablePlaybackScopeKeyRef.current = scopeKey
    }

    const movementAuthorities = createAutomaticTimetableMovementAuthorities(
      latestLineMapSessionRef.current,
      routeControlModes,
      playbackNow,
      timetableRowsRef.current,
    )
    const playbackPlans = scaleTimetablePlaybackPlansForClock(
      movementAuthorities
        .filter((authority) => authority.allowed)
        .map((authority) => authority.plan),
      playbackClock,
    )
    const scheduledTimetableTrainIds = new Set<string>()
    timetablePlaybackScheduledPlanKeysRef.current.forEach((planKey) => {
      const [trainId] = planKey.split('|')

      if (trainId) {
        scheduledTimetableTrainIds.add(trainId)
      }
    })
    const activeTimetableTrainIds = new Set([
      ...getActiveTimetableMovementAuthorityTrainIds(movementAuthorities),
      ...scheduledTimetableTrainIds,
    ])
    const heldTimetableTrainIds = new Set(
      movementAuthorities
        .filter((authority) => !authority.allowed)
        .map((authority) => authority.trainId),
    )

    updateSession((current) => applyTimetablePlaybackRunStart(
      current,
      playbackPlans,
      activeTimetableTrainIds,
      heldTimetableTrainIds,
    ))

    playbackPlans.forEach((plan) => {
      const planKey = createTimetablePlaybackPlanKey(plan)

      if (timetablePlaybackScheduledPlanKeysRef.current.has(planKey)) {
        return
      }

      const timeoutIds = scheduleTimetablePlaybackPlans({
        plans: [plan],
        scheduleTimeout: (callback, delayMs) => {
          let timeoutId = 0

          timeoutId = window.setTimeout(() => {
            try {
              callback()
            } finally {
              const currentTimeoutIds = timetablePlaybackPlanTimeoutsRef.current.get(planKey) ?? []
              const remainingTimeoutIds = currentTimeoutIds.filter((currentTimeoutId) => currentTimeoutId !== timeoutId)

              if (remainingTimeoutIds.length > 0) {
                timetablePlaybackPlanTimeoutsRef.current.set(planKey, remainingTimeoutIds)
              } else {
                timetablePlaybackPlanTimeoutsRef.current.delete(planKey)
                timetablePlaybackScheduledPlanKeysRef.current.delete(planKey)
              }
            }
          }, delayMs)

          return timeoutId
        },
        updateSession,
      })

      timetablePlaybackScheduledPlanKeysRef.current.add(planKey)
      timetablePlaybackPlanTimeoutsRef.current.set(planKey, timeoutIds)
    })

    return undefined
  }, [
    cancelTimetablePlayback,
    routeControlModes,
    session.sessionMeta.createdAt,
    session.timetableClock,
    timetablePlaybackTick,
    updateSession,
  ])

  return (
    <div className="occ-monitor-canvas">
      <LineMapMonitorDom
        lineMap={renderedLineMap}
        onCommand={requestTrainCommand}
        onInspectTrain={(trainId) => openTrainInspector(trainId, 'information')}
        onNavigate={onNavigate}
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
            setTrainArrivalDestinations((current) => ({
              ...current,
              [inspectorTrain.id]: selection,
            }))
          }}
          onConfirmDepartureTime={() => animateTrainDepartureRoute(inspectorTrain.id)}
          onConfirmDoorCommand={(command) => confirmInspectorDoorCommand(inspectorTrain.id, command)}
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
