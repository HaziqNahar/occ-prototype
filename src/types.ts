export type AppRoute =
  | '/'
  | '/login'
  | '/screen/alarms'
  | '/screen/line-map'
  | '/screen/timetable'
  | '/ios'
  | '/ios/modules'
  | '/ios/scenarios'
  | '/ios/assessment'
  | '/session/join'
  | '/report'

export type ScreenRole = {
  number: string
  title: string
  description: string
  path: AppRoute
  featured?: boolean
}

export type CycleMode = 'NONE' | 'AUTO'
export type RouteControlMode = 'OCCA' | 'OCCM'
export type ScenarioMode = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETE'
export type ScenarioNoticeTone = 'info' | 'success' | 'warning'
export type ScenarioTaskId = 'selectTrain' | 'ackAlarm' | 'setRoute' | 'dispatchTrain' | 'completeScenario'
export type TrainingMode = 'PRACTICE' | 'ASSESSMENT' | 'PLAYER'
export type TrainCommand = 'ROUTE' | 'DISPATCH' | 'HOLD'
export type TrainDirection = 'left' | 'right'
export type TrainReadinessMode = 'ASLEEP' | 'DEPOT_MOVEMENT' | 'MAINLINE_SERVICE' | 'MAINLINE_OFF_SERVICE' | 'HV_ISOLATED'
export type TrainStatus = 'RUN' | 'HOLD' | 'WAIT'
export type TrainItamaStatus = 'GRANTED' | 'NOT_GRANTED'
export type TrainDoorFailureState =
  | 'NORMAL'
  | 'FAULT_ALARM'
  | 'CYCLE_DOOR_REQUESTED'
  | 'CLOSED_LOCKED_CONFIRMED'
  | 'ISOLATION_REQUIRED'
  | 'DOOR_ISOLATED'
  | 'AUTHORIZED_TO_MOVE'
  | 'WITHDRAW_FROM_SERVICE'
export type SessionLifecycle = 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETE'
export type SessionScreenRole = 'ALARM' | 'LINE_MAP' | 'TIMETABLE' | 'IOS' | 'LOBBY' | 'REPORT'
export type MonitorLaunchRoute = '/screen/alarms' | '/screen/timetable'
export type MonitorLaunchTransport = 'backend' | 'broadcast-channel' | 'shared-worker'
export type SessionTransportHealth = 'CONNECTED' | 'AVAILABLE' | 'UNAVAILABLE' | 'ERROR'
export type SessionUpdateTransport = 'backend' | 'broadcast-channel' | 'local' | 'shared-worker' | 'storage'
export type SessionTransportEventType =
  | 'monitor_launch_requested'
  | 'scenario_action_accepted'
  | 'scenario_action_rejected'
  | 'screen_joined'
  | 'session_reset'
  | 'session_updated'
  | 'sse_connected'
  | 'sse_disconnected'

export type TrainState = {
  id: string
  x: number
  y: number
  direction: TrainDirection
  status: TrainStatus
  service: string
  isMoving?: boolean
  lineMapVisible?: boolean
  occupancySegmentId?: string
  readinessMode?: TrainReadinessMode
  scheduleNumber?: string
  timetablePlayback?: boolean
  trainNumber?: string
  itamaAuthorisedPreparationConfirmed?: boolean
  itamaGranted?: boolean
  itamaNotAuthorisedPreparationConfirmed?: boolean
  itamaStatus?: TrainItamaStatus
  doorFailureState?: TrainDoorFailureState
}

export type AlarmSummaryRow = {
  ack: 'Y' | 'N'
  avl: string
  mms: string
  timestamp: string
  asset: string
  description: string
  value: string
  tone: 'yellow' | 'red' | 'grey'
}

export type MonitorAlarmRow = {
  level: string
  time: string
  asset: string
  message: string
  value: string
  tone: 'orange' | 'red' | 'yellow'
}

export type TimetableRow = {
  state: string
  train: string
  sched: string
  originPoint: string
  originTime: string
  selectedStation?: string
  stationPoint: string
  stationTime: string
  dwell: string
  run: string
  destinationPoint: string
  destinationTime: string
  revision: string
  speed: string
  selected?: boolean
}

export type TimetableViewDirection = 'NB' | 'SB'

export type TimetableViewState = {
  direction: TimetableViewDirection
  station: string
}

export type TimetableClockMode = 'LIVE' | 'PLAYBACK'

export type TimetableClockState = {
  mode: TimetableClockMode
  playbackSpeed: number
  playbackStartEpochMs: number
  playbackStartSeconds: number
}

export type ScenarioTaskState = Record<ScenarioTaskId, boolean>
export type AssessmentResult = 'INCOMPLETE' | 'NEEDS_REVIEW' | 'PASS'
export type AssessmentTaskStatus = 'PENDING' | 'ON_TIME' | 'LATE'

// Evidence rows are the audit trail shown in the report and populated by both
// UI exploration and backend-scored operator actions.
export type ScenarioNotice = {
  text: string
  tone: ScenarioNoticeTone
}

export type ScenarioEvidence = {
  action: string
  detail: string
  id: string
  result: 'accepted' | 'info' | 'rejected'
  source: string
  time: string
}

export type ActiveScenario = {
  duration: string
  id: string
  incident: string
  target: string
  title: string
}

export type TraineeRole = 'Traffic Controller' | 'Station Manager' | 'Engineer' | 'Observer'

export type TraineeParticipant = {
  email: string
  joinedAt: string
  monitor: string
  name: string
  role: TraineeRole
  status: 'Joined' | 'Waiting'
}

export type SessionScreenJoin = {
  joinedAt: string
  label: string
  lastSeenAt: string
  role: SessionScreenRole
  route: AppRoute
  sourceId?: string
  status: 'ONLINE'
  transport?: SessionTransportSnapshot
}

// One monitor orchestration command. Monitor 02 emits this when the Line Map
// view should bring up Monitor 01 and Monitor 03 through the available bus.
export type SessionMonitorLaunch = {
  launchId: string
  originRoute: '/screen/line-map'
  requestedAt: number
  sourceId: string
  targets: MonitorLaunchRoute[]
}

// Browser capability heartbeat sent with each screen registration. It lets the
// backend tell whether a screen has SSE, SharedWorker, BroadcastChannel, and
// localStorage available without relying on visual inspection.
export type SessionTransportSnapshot = {
  backendSse: SessionTransportHealth
  broadcastChannel: SessionTransportHealth
  lastMonitorLaunchTransport?: MonitorLaunchTransport
  lastSessionTransport: SessionUpdateTransport
  reportedAt: string
  sharedWorker: SessionTransportHealth
  sourceId: string
  storage: SessionTransportHealth
}

export type SessionTransportEvent = {
  detail?: string
  id: string
  role?: SessionScreenRole
  route?: AppRoute
  sourceId?: string
  time: string
  transport?: MonitorLaunchTransport | SessionUpdateTransport
  type: SessionTransportEventType
}

// Session metadata is backend-owned. It is what proves to reviewers that the
// three monitor routes joined one shared OCC session instead of independent tabs.
export type OccSessionMeta = {
  code: string
  completedAt?: string
  createdAt: string
  lastMonitorLaunch?: SessionMonitorLaunch
  lifecycle: SessionLifecycle
  screens: Partial<Record<SessionScreenRole, SessionScreenJoin>>
  startedAt?: string
  trainer: string
}

// One row in the backend scoring model. Thresholds are intentionally stored
// with the session so archived reports can be interpreted later.
export type AssessmentTaskMetric = {
  completedAt?: string
  label: string
  responseSeconds?: number
  score: number
  source?: string
  status: AssessmentTaskStatus
  taskId: ScenarioTaskId
  thresholdSeconds: number
}

// Backend assessment summary for the golden-path scenario. The browser renders
// this, but the score itself is produced by `/api/session/actions`.
export type OccAssessmentMetrics = {
  completedAt?: string
  lateTasks: number
  onTimeTasks: number
  rejectedActions: number
  result: AssessmentResult
  score: number
  startedAt?: string
  tasks: Record<ScenarioTaskId, AssessmentTaskMetric>
}

export type LineMapRouteSegmentStatus = 'UNSET' | 'SET' | 'DISPATCHED' | 'HELD'

export type LineMapRouteSegmentState = {
  segmentId: string
  status: LineMapRouteSegmentStatus
  trainId: string
  updatedAt: number
}

export type LineMapPlatformDoorStatus = 'NORMAL' | 'UNKNOWN' | 'CYCLING'

export type LineMapPlatformDoorState = {
  platformCode: string
  status: LineMapPlatformDoorStatus
  track: 'NB' | 'SB'
  trainId: string
  updatedAt: number
}

export type LineMapRuntimeState = {
  layoutVersion: number
  platformDoorStates: Record<string, LineMapPlatformDoorState>
  routeSegments: Record<string, LineMapRouteSegmentState>
}
// The complete state model rendered by all screens. The backend publishes this
// through SSE, while SharedWorker/BroadcastChannel carry fallback copies.
export type OccSessionState = {
  activeScenario: ActiveScenario
  alarmSummaryRows: AlarmSummaryRow[]
  assessmentMetrics: OccAssessmentMetrics
  cycleMode: CycleMode
  evidenceLog: ScenarioEvidence[]
  lineMap: LineMapRuntimeState
  eventRows: MonitorAlarmRow[]
  scenarioMode: ScenarioMode
  sessionMeta: OccSessionMeta
  scenarioNotice: ScenarioNotice
  scenarioStep: number
  scenarioTasks: ScenarioTaskState
  selectedTrainId: string
  timetableClock: TimetableClockState
  timetableRows: TimetableRow[]
  timetableView: TimetableViewState
  trainingMode: TrainingMode
  trainees: TraineeParticipant[]
  trains: TrainState[]
  updatedAt: number
}
