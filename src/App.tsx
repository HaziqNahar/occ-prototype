import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import './App.css'
import occMonitorBackground from './assets/occ-monitor-bg.png'
import sbsTransitLogo from './assets/sbs-transit-logo.png'

type AppRoute =
  | '/'
  | '/login'
  | '/screen/alarms'
  | '/screen/line-map'
  | '/screen/timetable'
  | '/ios'

type ScreenRole = {
  number: string
  title: string
  description: string
  path: AppRoute
  featured?: boolean
}

type CycleMode = 'NONE' | 'AUTO'
type TrainCommand = 'ROUTE' | 'DISPATCH' | 'HOLD'
type TrainDirection = 'left' | 'right'
type TrainStatus = 'RUN' | 'HOLD' | 'WAIT'

type TrainState = {
  id: string
  x: number
  y: number
  direction: TrainDirection
  status: TrainStatus
  service: string
}

type AlarmSummaryRow = {
  ack: 'Y' | 'N'
  avl: string
  mms: string
  timestamp: string
  asset: string
  description: string
  value: string
  tone: 'yellow' | 'red' | 'grey'
}

type MonitorAlarmRow = {
  level: string
  time: string
  asset: string
  message: string
  value: string
  tone: 'orange' | 'red' | 'yellow'
}

type TimetableRow = {
  state: string
  train: string
  sched: string
  originPoint: string
  originTime: string
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

type OccSessionState = {
  alarmSummaryRows: AlarmSummaryRow[]
  cycleMode: CycleMode
  eventRows: MonitorAlarmRow[]
  selectedTrainId: string
  timetableRows: TimetableRow[]
  trains: TrainState[]
  updatedAt: number
}

const screenRoles: ScreenRole[] = [
  {
    number: '01',
    title: 'Alarms',
    description: 'Fault monitoring',
    path: '/screen/alarms',
  },
  {
    number: '02',
    title: 'Line Map',
    description: 'Main control view',
    path: '/screen/line-map',
    featured: true,
  },
  {
    number: '03',
    title: 'Timetable',
    description: 'Coordination view',
    path: '/screen/timetable',
  },
]

const sessionStats = [
  {
    label: 'Alarm',
    value: 'Door fault pending',
    tone: 'alert',
  },
  {
    label: 'Line',
    value: '5 trains active',
    tone: 'map',
  },
  {
    label: 'Timer',
    value: '05:00 target',
    tone: 'time',
  },
]

const launchSteps = [
  'Trainer creates session',
  'Open three monitor views',
  'Start synchronized scenario',
]

const stationCodes = [
  'HBF',
  'OTP',
  'CNT',
  'CQY',
  'DBG',
  'LTI',
  'FRP',
  'BNK',
  'PTP',
  'WLH',
  'SER',
  'KVN',
  'HGN',
  'BGK',
  'SKG',
  'PGL',
  'PGC',
  'O C C\nDEPOT',
]

const OCC_SESSION_KEY = 'sbs-occ-training-session-v1'
const OCC_SESSION_CHANNEL = 'sbs-occ-training-session'

const alarmRows: MonitorAlarmRow[] = [
  {
    level: 'S',
    time: '05/11 11:00:06',
    asset: 'SIG/SKG/RT1/SIGN0655',
    message: 'Signal S655: Signal Lamp Filament Status',
    value: 'BURNT',
    tone: 'orange',
  },
  {
    level: 'S',
    time: '05/11 11:02:17',
    asset: 'EMU/032/TRN/XXXXXXX',
    message: 'Train 032: Action Needed (from operator for recovery)',
    value: 'YES',
    tone: 'red',
  },
  {
    level: 'S',
    time: '05/11 11:02:17',
    asset: 'EMU/032/TRN/XXXXXXX',
    message: 'Train 032: Train ITAMA Status',
    value: 'NOT GRANTED',
    tone: 'yellow',
  },
  {
    level: 'S',
    time: '05/11 11:02:21',
    asset: 'EMU/049/TRN/XXXXXXX',
    message: 'Train 049: Train Hold',
    value: 'APPLIED',
    tone: 'yellow',
  },
]

const MONITOR_WIDTH = 1275
const MONITOR_HEIGHT = 1019
const MAP_WORLD_WIDTH = 1850
const MAP_PAN_STEP = 260
const MAP_PAN_MAX = MAP_WORLD_WIDTH - MONITOR_WIDTH

const stationRibbonPositions = [
  24, 84, 147, 211, 276, 345, 410, 477, 536, 602, 671, 736, 801, 877, 938,
  1001, 1064, 1128,
]

const stationRibbonItems = [
  ...stationCodes.map((station, index) => ({
    label: station,
    x: stationRibbonPositions[index],
  })),
  { label: 'DPT\nYARD', x: 1310 },
  { label: 'STBL\nA', x: 1450 },
  { label: 'STBL\nB', x: 1590 },
  { label: 'SPARE\nRD', x: 1730 },
]

const initialTrains: TrainState[] = [
  { id: '320', x: 272, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '317', x: 748, y: 205, direction: 'right', status: 'HOLD', service: 'NB' },
  { id: '917', x: 1236, y: 205, direction: 'right', status: 'WAIT', service: 'NB' },
  { id: '305', x: 1510, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '301', x: 324, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '304', x: 1196, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '308', x: 1604, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
]

const alarmSummaryRows: AlarmSummaryRow[] = [
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/BNK/B2/DMS0901',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/HGN/B2/DMS0401',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/OTP/B4/DMS1501',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:55:50',
    asset: 'EMU/042/TRN/XXXXXXX',
    description: 'Train 042: Action Needed (from operator for recovery)',
    value: 'YES',
    tone: 'red',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:55:52',
    asset: 'EMU/037/TRN/XXXXXXX',
    description: 'Train 037: Status of Train Hold Request',
    value: 'AUTOMATIC HOLD',
    tone: 'yellow',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:56:50',
    asset: 'SIG/NED/1133/DMS0003',
    description: 'DMS:HMI Status',
    value: 'OK',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:57:09',
    asset: 'EMU/017/TRN/XXXXXXX',
    description: 'Train 017: Train Hold',
    value: 'NOT APPLIED',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: '',
    timestamp: '05/11/25 10:57:48',
    asset: 'EMU/032/TRN/XXXXXXX',
    description: 'Train 032: Train Skip Stop Demand',
    value: 'FAILED: RET. COND',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: '',
    timestamp: '05/11/25 10:58:31',
    asset: 'SKG_ROUT_S003',
    description: 'Route abandoned: R613_617/Management of Route Control',
    value: '',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:58:33',
    asset: 'EMU/048/TRN/XXXXXXX',
    description: 'Train 048: Emergency Brake',
    value: 'NOT APPLIED',
    tone: 'grey',
  },
]

const timetableRows: TimetableRow[] = [
  { state: 'R', train: '352', sched: '1133', originPoint: 'HBFS', originTime: '10:01:06', stationPoint: 'SKGN', stationTime: '10:31:46', dwell: '00:35', run: '02:21', destinationPoint: 'PGCN', destinationTime: '10:37:14', revision: 'Y', speed: 'Y' },
  { state: 'R', train: '355', sched: '1134', originPoint: 'HBFS', originTime: '10:04:51', stationPoint: 'SKGN', stationTime: '10:35:31', dwell: '00:35', run: '02:21', destinationPoint: 'PGCS', destinationTime: '10:41:11', revision: 'Y', speed: 'Y' },
  { state: 'R', train: '359', sched: '1135', originPoint: 'HBFS', originTime: '10:09:21', stationPoint: 'SKGN', stationTime: '10:40:01', dwell: '00:35', run: '02:21', destinationPoint: 'PGCN', destinationTime: '10:45:29', revision: 'Y', speed: 'Y' },
  { state: 'R', train: '301', sched: '1136', originPoint: 'HBFS', originTime: '10:12:21', stationPoint: 'SKGN', stationTime: '10:43:01', dwell: '00:35', run: '02:21', destinationPoint: 'PGCS', destinationTime: '10:48:41', revision: 'Y', speed: 'Y' },
  { state: 'R', train: '304', sched: '1137', originPoint: 'HBFS', originTime: '10:16:36', stationPoint: 'SKGN', stationTime: '10:47:16', dwell: '00:35', run: '02:21', destinationPoint: 'PGCN', destinationTime: '10:52:44', revision: 'Y', speed: 'Y' },
  { state: '>', train: '309', sched: '1138', originPoint: 'HBFS', originTime: '10:20:36', stationPoint: 'SKGN', stationTime: '10:51:16', dwell: '00:35', run: '02:21', destinationPoint: 'PGCS', destinationTime: '10:56:56', revision: 'Y', speed: 'Y', selected: true },
  { state: '>', train: '312', sched: '1139', originPoint: 'HBFS', originTime: '10:24:36', stationPoint: 'SKGN', stationTime: '10:55:16', dwell: '00:35', run: '02:21', destinationPoint: 'PGCN', destinationTime: '11:00:44', revision: 'Y', speed: 'Y' },
  { state: '>', train: '314', sched: '1140', originPoint: 'HBFS', originTime: '10:28:36', stationPoint: 'SKGN', stationTime: '10:59:16', dwell: '00:35', run: '02:21', destinationPoint: 'PGCS', destinationTime: '11:04:56', revision: 'Y', speed: 'Y' },
  { state: 'H>', train: '317', sched: '1141', originPoint: 'HBFS', originTime: '10:32:51', stationPoint: 'SKGN', stationTime: '11:03:46', dwell: '00:35', run: '02:21', destinationPoint: 'PGCS', destinationTime: '11:09:14', revision: 'Y', speed: 'Y' },
  { state: '>', train: '320', sched: '1142', originPoint: 'HBFS', originTime: '10:37:06', stationPoint: 'SKGN', stationTime: '11:08:01', dwell: '00:35', run: '02:21', destinationPoint: 'PGCN', destinationTime: '11:13:41', revision: 'Y', speed: 'Y' },
]

function clampPan(value: number) {
  return Math.min(MAP_PAN_MAX, Math.max(0, value))
}

function advanceTrain(train: TrainState): TrainState {
  if (train.status !== 'RUN') {
    return train
  }

  const delta = train.direction === 'right' ? 18 : -18
  const nextX = train.x + delta

  if (nextX > MAP_WORLD_WIDTH - 50) {
    return { ...train, x: 60 }
  }

  if (nextX < 40) {
    return { ...train, x: MAP_WORLD_WIDTH - 70 }
  }

  return { ...train, x: nextX }
}

function formatScenarioTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `05/11 ${hours}:${minutes}:${seconds}`
}

function createInitialSession(): OccSessionState {
  return {
    alarmSummaryRows,
    cycleMode: 'NONE',
    eventRows: alarmRows,
    selectedTrainId: '317',
    timetableRows,
    trains: initialTrains,
    updatedAt: Date.now(),
  }
}

function readStoredSession(): OccSessionState {
  try {
    const stored = window.localStorage.getItem(OCC_SESSION_KEY)

    if (!stored) {
      return createInitialSession()
    }

    const parsed = JSON.parse(stored) as Partial<OccSessionState>

    return {
      ...createInitialSession(),
      ...parsed,
      alarmSummaryRows: parsed.alarmSummaryRows ?? alarmSummaryRows,
      eventRows: parsed.eventRows ?? alarmRows,
      timetableRows: parsed.timetableRows ?? timetableRows,
      trains: parsed.trains ?? initialTrains,
    }
  } catch {
    return createInitialSession()
  }
}

function useOccSession() {
  const [session, setSession] = useState<OccSessionState>(readStoredSession)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    window.localStorage.setItem(OCC_SESSION_KEY, JSON.stringify(session))
  }, [])

  useEffect(() => {
    if ('BroadcastChannel' in window) {
      channelRef.current = new BroadcastChannel(OCC_SESSION_CHANNEL)
      channelRef.current.onmessage = (event: MessageEvent<OccSessionState>) => {
        setSession(event.data)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === OCC_SESSION_KEY && event.newValue) {
        setSession(JSON.parse(event.newValue) as OccSessionState)
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      channelRef.current?.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const updateSession = (updater: (current: OccSessionState) => OccSessionState) => {
    setSession((current) => {
      const next = {
        ...updater(current),
        updatedAt: Date.now(),
      }

      window.localStorage.setItem(OCC_SESSION_KEY, JSON.stringify(next))
      channelRef.current?.postMessage(next)

      return next
    })
  }

  const resetSession = () => {
    const next = createInitialSession()
    window.localStorage.setItem(OCC_SESSION_KEY, JSON.stringify(next))
    channelRef.current?.postMessage(next)
    setSession(next)
  }

  return { resetSession, session, updateSession }
}

function getCurrentRoute(): AppRoute {
  const path = window.location.pathname as AppRoute
  if (
    path === '/login' ||
    path === '/screen/alarms' ||
    path === '/screen/line-map' ||
    path === '/screen/timetable' ||
    path === '/ios'
  ) {
    return path
  }

  return '/'
}

function App() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
  const { resetSession, session, updateSession } = useOccSession()

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextRoute: AppRoute) => {
    window.history.pushState(null, '', nextRoute)
    setRoute(nextRoute)
  }

  if (route === '/screen/line-map') {
    return <LineMapScreen onNavigate={navigate} session={session} updateSession={updateSession} />
  }

  if (route === '/screen/alarms') {
    return <AlarmsScreen onNavigate={navigate} session={session} updateSession={updateSession} />
  }

  if (route === '/screen/timetable') {
    return <TimetableScreen onNavigate={navigate} session={session} updateSession={updateSession} />
  }

  if (route === '/ios') {
    return <PlaceholderScreen route={route} onNavigate={navigate} />
  }

  return <LoginPage onNavigate={navigate} resetSession={resetSession} />
}

function LoginPage({
  onNavigate,
  resetSession,
}: {
  onNavigate: (route: AppRoute) => void
  resetSession: () => void
}) {
  const openThreeMonitorSession = () => {
    resetSession()

    const screens: AppRoute[] = ['/screen/alarms', '/screen/line-map', '/screen/timetable']
    const width = 1280
    const height = 1040

    screens.forEach((screen, index) => {
      window.open(
        screen,
        `occ-monitor-${index + 1}`,
        `popup=yes,width=${width},height=${height},left=${index * 80},top=${index * 40}`,
      )
    })
  }

  return (
    <main
      className="login-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as React.CSSProperties}
    >
      <section className="login-card" aria-labelledby="page-title">
        <div className="brand-panel">
          <div className="brand-panel-top">
            <div className="mode-badge">OCC simulator</div>
            <div className="line-badge">NEL / DTL ready</div>
          </div>

          <div className="scenario-card" aria-label="Scenario brief">
            <p>Scenario Brief</p>
            <strong>Train Launch and Withdrawal</strong>
            <div className="scenario-meta">
              <span>Practice Mode</span>
              <span>Target: 5 min</span>
            </div>
          </div>

          <div className="system-chip">
            <span className="status-dot" />
            Prototype Console
          </div>
          <h1 id="page-title">OCC Training Simulator</h1>
          <p className="brand-copy">
            Launch a synchronized three-monitor training session for alarms,
            line map controls, and timetable coordination.
          </p>
        </div>

        <form className="access-panel">
          <img src={sbsTransitLogo} alt="SBS Transit" className="access-logo" />

          <div className="panel-heading">
            <p className="eyebrow">Secure access</p>
            <h2>Start training session</h2>
          </div>

          <label className="field">
            <span>Staff ID or email</span>
            <input
              type="text"
              placeholder="controller@sbs.local"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          <div className="session-row">
            <label className="remember">
              <input type="checkbox" defaultChecked />
              <span>Remember workstation</span>
            </label>
            <button type="button" className="text-link">
              Session help
            </button>
          </div>

          <button
            type="button"
            className="primary-action"
            onClick={() => onNavigate('/screen/line-map')}
          >
            Sign in to OCC
          </button>

          <button
            type="button"
            className="secondary-action"
            onClick={openThreeMonitorSession}
          >
            Open three-monitor session
          </button>

          <div className="monitor-launcher" aria-label="Screen roles">
            {screenRoles.map((role) => (
              <button
                type="button"
                className={`screen-tile ${role.featured ? 'is-featured' : ''}`}
                key={role.number}
                onClick={() => onNavigate(role.path)}
              >
                <span className="screen-number">{role.number}</span>
                <strong>{role.title}</strong>
                <small>{role.description}</small>
              </button>
            ))}
          </div>
        </form>
      </section>

      <aside className="session-preview" aria-label="Session preview">
        <div className="preview-header">
          <div>
            <p className="eyebrow">Ready scenario</p>
            <h2>Train launch and withdrawal</h2>
          </div>
          <span className="live-badge">IOS linked</span>
        </div>

        <div className="preview-grid">
          {sessionStats.map((stat) => (
            <div className={`preview-card ${stat.tone}`} key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="timeline">
          {launchSteps.map((step, index) => (
            <div
              className={`timeline-step ${index === 0 ? 'is-active' : ''}`}
              key={step}
            >
              <span />
              <p>{step}</p>
            </div>
          ))}
        </div>
      </aside>
    </main>
  )
}

function MonitorWorkspace({
  children,
  onNavigate,
  title,
}: {
  children: ReactNode
  onNavigate: (route: AppRoute) => void
  title: string
}) {
  return (
    <main className="occ-workspace">
      <header className="occ-workspace-header">
        <div className="occ-workspace-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>OCC Training Simulator</p>
            <h1>{title}</h1>
          </div>
        </div>
        <div className="occ-workspace-actions">
          <button type="button" onClick={() => onNavigate('/')}>Back to Launch</button>
        </div>
      </header>

      <section className="occ-monitor-frame" aria-label="Line map monitor frame">
        <div className="occ-monitor-scale">
          {children}
        </div>
      </section>
    </main>
  )
}

function LineMapScreen({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  return (
    <MonitorWorkspace onNavigate={onNavigate} title="Line Map Monitor">
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
    <MonitorWorkspace onNavigate={onNavigate} title="Alarm Summary Monitor">
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
    <MonitorWorkspace onNavigate={onNavigate} title="Traffic Timetable Monitor">
      <TimetableCanvas onNavigate={onNavigate} session={session} updateSession={updateSession} />
    </MonitorWorkspace>
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
  const [selectedIndex, setSelectedIndex] = useState(3)
  const [activeTab, setActiveTab] = useState<'Archives' | 'Events' | 'Alarms'>('Alarms')
  const selectedRow = rows[selectedIndex]
  const notAcknowledged = rows.filter((row) => row.ack === 'Y').length

  const acknowledgeSelected = () => {
    updateSession((current) => ({
      ...current,
      alarmSummaryRows: current.alarmSummaryRows.map((row, index) => (
        index === selectedIndex ? { ...row, ack: 'N', tone: 'grey', value: row.value === 'NO ACK' ? 'ACK' : row.value } : row
      )),
    }))
  }

  const acknowledgeAll = () => {
    updateSession((current) => ({
      ...current,
      alarmSummaryRows: current.alarmSummaryRows.map((row) => ({
        ...row,
        ack: 'N',
        tone: row.tone === 'red' ? 'red' : 'grey',
        value: row.value === 'NO ACK' ? 'ACK' : row.value,
      })),
    }))
  }

  return (
    <svg className="occ-monitor-svg" viewBox={`0 0 ${MONITOR_WIDTH} ${MONITOR_HEIGHT}`} role="img" aria-label="Alarm summary monitor">
      <rect width={MONITOR_WIDTH} height={MONITOR_HEIGHT} fill="#b8c7dc" />
      <AlarmBand onNavigate={onNavigate} rows={session.eventRows} />
      <StationRibbon panX={0} />

      <g transform="translate(0 171)">
        <rect width={MONITOR_WIDTH} height="755" fill="#c4c4c4" />
        <rect width={MONITOR_WIDTH} height="24" fill="#9da9bd" stroke="#ffffff" />
        <text className="svg-panel-title" x="2" y="17">Alarm summary display (filter: none)</text>

        {(['Archives', 'Events', 'Alarms'] as const).map((tab, index) => (
          <g className="svg-clickable" onClick={() => setActiveTab(tab)} transform={`translate(${index * 70} 26)`} key={tab}>
            <rect width={tab === 'Archives' ? 76 : 64} height="30" fill={activeTab === tab ? '#e6e6e6' : '#bdbdbd'} stroke="#000" />
            <text className="svg-tab-text" x={(tab === 'Archives' ? 76 : 64) / 2} y="21" textAnchor="middle">{tab}</text>
          </g>
        ))}

        <SvgButton x={888} y={28} w={80} label="Help" />
        <SvgButton x={1012} y={28} w={80} label="Filter..." />
        <SvgButton x={1102} y={28} w={80} label="Print" />
        <SvgButton x={1192} y={28} w={78} label="Close" onClick={() => onNavigate('/')} />

        <text className="svg-small" x="8" y="82">Total</text>
        <rect x="46" y="66" width="40" height="22" fill="#ffffff" stroke="#6b7280" />
        <text className="svg-cell-text" x="66" y="82" textAnchor="middle">{rows.length}</text>
        <text className="svg-small" x="102" y="82">Not Acknowledged</text>
        <rect x="225" y="66" width="40" height="22" fill="#ffffff" stroke="#6b7280" />
        <text className="svg-cell-text" x="245" y="82" textAnchor="middle">{notAcknowledged}</text>
        <SvgButton x={392} y={66} w={110} label="Ack. all" onClick={acknowledgeAll} />
        <SvgButton x={512} y={66} w={112} label="Ack. selection" onClick={acknowledgeSelected} />
        <SvgButton x={632} y={66} w={112} label="Unselect alarms" onClick={() => setSelectedIndex(-1)} />
        <text className="svg-small" x="1008" y="82">Sort column</text>
        <rect x="1088" y="66" width="174" height="22" fill="#ffffff" stroke="#6b7280" />
        <text className="svg-small" x="1094" y="82">TIMESTAMP - Descending</text>

        <AlarmSummaryTable rows={rows} selectedIndex={selectedIndex} onSelectRow={setSelectedIndex} />

        <rect x="6" y="676" width="1258" height="58" fill="#c9c9c9" stroke="#ffffff" />
        <text className="svg-status-text" x="22" y="700">
          {selectedRow ? `Selected: ${selectedRow.asset}` : 'No alarm selected'}
        </text>
        <text className="svg-status-text" x="22" y="718">
          {selectedRow ? selectedRow.description : 'Use Archives, Events, or Alarms tabs to inspect records.'}
        </text>
      </g>

      <CommonFooterSvg active="TRAFFIC" leftMode="Signal No." status={selectedRow ? `ALARM ${selectedRow.ack === 'Y' ? 'NOT ACK' : 'ACK'}` : 'ALARM --'} />
    </svg>
  )
}

function AlarmSummaryTable({
  onSelectRow,
  rows,
  selectedIndex,
}: {
  onSelectRow: (index: number) => void
  rows: AlarmSummaryRow[]
  selectedIndex: number
}) {
  const headerY = 92
  const rowY = 124
  const rowHeight = 31
  const columns = [
    { label: 'Ack', x: 6, w: 40 },
    { label: 'AVL', x: 46, w: 41 },
    { label: 'MMS', x: 87, w: 40 },
    { label: 'TIMESTAMP', x: 127, w: 140 },
    { label: 'ASSET', x: 267, w: 201 },
    { label: 'DESCRIPTION', x: 468, w: 574 },
    { label: 'VALUE', x: 1042, w: 206 },
  ]

  return (
    <g>
      <rect x="6" y={headerY} width="1242" height="32" fill="#b2b8c8" stroke="#000" strokeWidth="2" />
      {columns.map((column) => (
        <g key={column.label}>
          <line x1={column.x} y1={headerY} x2={column.x} y2={headerY + 32 + rows.length * rowHeight} stroke="#000" />
          <text className="svg-table-head" x={column.x + 6} y={headerY + 23}>{column.label}</text>
        </g>
      ))}
      <line x1="1248" y1={headerY} x2="1248" y2={headerY + 32 + rows.length * rowHeight} stroke="#000" />

      {rows.map((row, index) => {
        const y = rowY + index * rowHeight
        const fill = row.tone === 'red' ? '#ff0000' : row.tone === 'yellow' ? '#ffff00' : '#bfbfbf'

        return (
          <g className="svg-clickable" onClick={() => onSelectRow(index)} key={`${row.timestamp}-${row.asset}`}>
            <rect x="6" y={y} width="1242" height={rowHeight} fill={selectedIndex === index ? '#103c8d' : fill} stroke="#000" />
            {columns.slice(1).map((column) => (
              <line x1={column.x} y1={y} x2={column.x} y2={y + rowHeight} stroke="#000" key={column.label} />
            ))}
            <text className={selectedIndex === index ? 'svg-row-selected' : 'svg-table-text'} x="26" y={y + 21} textAnchor="middle">{row.ack}</text>
            <text className={selectedIndex === index ? 'svg-row-selected' : 'svg-table-text'} x="107" y={y + 21} textAnchor="middle">{row.mms}</text>
            <text className={selectedIndex === index ? 'svg-row-selected' : 'svg-table-text'} x="132" y={y + 21}>{row.timestamp}</text>
            <text className={selectedIndex === index ? 'svg-row-selected' : 'svg-table-text'} x="272" y={y + 21}>{row.asset}</text>
            <text className={selectedIndex === index ? 'svg-row-selected' : 'svg-table-text'} x="472" y={y + 21}>{row.description}</text>
            <text className={selectedIndex === index ? 'svg-row-selected' : 'svg-table-text'} x="1047" y={y + 21}>{row.value}</text>
          </g>
        )
      })}

      <rect x="1248" y="124" width="14" height="310" fill="#d8d6c8" stroke="#000" />
      <polygon points="1250,128 1260,128 1255,134" fill="#000" />
      <polygon points="1250,428 1260,428 1255,422" fill="#000" />
      <rect x="1250" y="298" width="10" height="88" fill="#a7a393" stroke="#777" />
    </g>
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
  const rows = session.timetableRows
  const [selectedIndex, setSelectedIndex] = useState(5)
  const [direction, setDirection] = useState<'NB' | 'SB'>('NB')
  const [actionNote, setActionNote] = useState('Loaded time table NEL_OTES_Weekday_03')
  const selectedRow = rows[selectedIndex]

  const selectTimetableRow = (index: number) => {
    setSelectedIndex(index)
    const row = rows[index]

    if (row) {
      updateSession((current) => ({
        ...current,
        selectedTrainId: row.train,
      }))
    }
  }

  const applyTripAction = (action: string) => {
    if (!selectedRow) {
      return
    }

    updateSession((current) => ({
      ...current,
      selectedTrainId: selectedRow.train,
      timetableRows: current.timetableRows.map((row, index) => (
        index === selectedIndex ? { ...row, state: action === 'Service cancellation' ? 'C>' : 'H>' } : row
      )),
    }))
    setActionNote(`${action}: Train ${selectedRow.train} schedule ${selectedRow.sched}`)
  }

  return (
    <svg className="occ-monitor-svg" viewBox={`0 0 ${MONITOR_WIDTH} ${MONITOR_HEIGHT}`} role="img" aria-label="Traffic current timetable monitor">
      <rect width={MONITOR_WIDTH} height={MONITOR_HEIGHT} fill="#b8c7dc" />
      <TimetableTrendPanel />

      <g transform="translate(0 366)">
        <rect width={MONITOR_WIDTH} height="560" fill="#c4c4c4" />
        <rect width={MONITOR_WIDTH} height="22" fill="#123070" stroke="#ffffff" />
        <text className="svg-panel-title" x="2" y="16">Traffic current time table</text>

        <rect x="4" y="32" width="1260" height="508" fill="#c6c6c6" stroke="#ffffff" />
        <text className="svg-small" x="20" y="56">Loaded time table</text>
        <rect x="20" y="66" width="288" height="24" fill="#dfdfdf" stroke="#6b7280" />
        <text className="svg-table-text" x="82" y="83">NEL_OTES_Weekday_03</text>

        <text className="svg-small" x="330" y="56">Station</text>
        <rect x="330" y="66" width="78" height="24" fill="#f7f7f7" stroke="#6b7280" />
        <rect x="331" y="67" width="58" height="20" fill="#0d3c99" />
        <text className="svg-row-selected" x="358" y="83" textAnchor="middle">SKG</text>
        <polygon points="392,75 404,75 398,82" fill="#000" />

        <text className="svg-small" x="430" y="56">Direction</text>
        <DirectionRadio x={430} y={78} active={direction === 'NB'} label="NB" onClick={() => setDirection('NB')} />
        <DirectionRadio x={486} y={78} active={direction === 'SB'} label="SB" onClick={() => setDirection('SB')} />

        <TimetableGrid rows={rows} selectedIndex={selectedIndex} onSelectRow={selectTimetableRow} />

        {['Service cancellation', 'Service restoration', 'Shift trips', 'Trip interruption', 'Trip modification', 'Creation of additional trips'].map((label, index) => (
          <SvgButton
            x={544 + index * 120}
            y={480}
            w={110}
            h={50}
            label={label}
            multiline
            onClick={() => applyTripAction(label)}
            key={label}
          />
        ))}
        <SvgButton x={4} y={552} w={80} label="Help" />
        <SvgButton x={1092} y={552} w={80} label="Print" />
        <SvgButton x={1182} y={552} w={80} label="Close" onClick={() => onNavigate('/')} />
        <text className="svg-status-text" x="96" y="568">{actionNote}</text>
      </g>

      <CommonFooterSvg active="TRAFFIC" leftMode="FB No." status={selectedRow ? `TRN ${selectedRow.train} ${direction}` : 'TRN --'} />
    </svg>
  )
}

function TimetableTrendPanel() {
  return (
    <g>
      <rect width={MONITOR_WIDTH} height="366" fill="#45697c" />
      <line x1="443" y1="0" x2="443" y2="366" stroke="#ffffff" />
      <TimetableTrend x={476} y={10} label="NORTH BOUND DIRECTION" />
      <TimetableTrend x={476} y={204} label="SOUTH BOUND DIRECTION" reverse />
    </g>
  )
}

function TimetableTrend({ x, y, label, reverse }: { x: number; y: number; label: string; reverse?: boolean }) {
  const trains = reverse ? ['335', '339', '342', '347', '352', '355', '301', '0'] : ['332', '328', '325', '323', '320', '317', '314', '312', '309']

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="798" height="142" fill="#45697c" stroke="#ffff00" />
      <line x1="0" y1="64" x2="798" y2="64" stroke="#ffff00" strokeWidth="2" />
      <text className="svg-trend-axis" x="-22" y="6">MAX.</text>
      <text className="svg-trend-axis" x="-22" y="18">1:00</text>
      <text className="svg-trend-axis" x="-10" y="67">0</text>
      <text className="svg-trend-axis" x="-22" y="132">MIN.</text>
      <text className="svg-trend-axis" x="-22" y="143">1:00</text>
      {trains.map((train, index) => (
        <text className="svg-trend-axis" x={10 + index * 52} y="-3" key={`${label}-${train}-${index}`}>{train}</text>
      ))}
      {[110, 175, 205].map((barX, index) => (
        <rect x={barX} y={index === 0 ? 54 : 58} width="24" height={index === 0 ? 10 : 6} fill="#00ff23" key={barX} />
      ))}
      <text className="svg-side-label" x={670} y={-14}>{label}</text>
      <text className="svg-arrow-text" x={610} y={-8}>{reverse ? '<' : '>'}</text>
      {Array.from({ length: 22 }, (_, index) => (
        <text className="svg-trend-axis" x={index * 36} y="139" key={index}>00:0{index % 10}</text>
      ))}
    </g>
  )
}

function DirectionRadio({ active, label, onClick, x, y }: { active: boolean; label: string; onClick: () => void; x: number; y: number }) {
  return (
    <g className="svg-clickable" onClick={onClick}>
      <circle cx={x + 8} cy={y - 4} r="7" fill="#ffffff" stroke="#000" />
      {active && <circle cx={x + 8} cy={y - 4} r="4" fill="#000000" />}
      <text className="svg-table-text" x={x + 22} y={y}>{label}</text>
    </g>
  )
}

function TimetableGrid({
  onSelectRow,
  rows,
  selectedIndex,
}: {
  onSelectRow: (index: number) => void
  rows: TimetableRow[]
  selectedIndex: number
}) {
  const y0 = 132
  const rowHeight = 17

  return (
    <g>
      <text className="svg-timetable-group" x="266" y="130">O R I G I N</text>
      <text className="svg-timetable-group" x="492" y="130">S E L E C T E D   S T A T I O N</text>
      <text className="svg-timetable-group" x="810" y="130">D E S T I N A T I O N</text>
      <rect x="14" y="182" width="1220" height="286" fill="#aeb3c3" stroke="#000" />
      <text className="svg-table-head" x="18" y="166">Stat.</text>
      <text className="svg-table-head" x="58" y="166">Train</text>
      <text className="svg-table-head" x="102" y="166">Sched.</text>
      <text className="svg-table-head" x="154" y="166">Point</text>
      <text className="svg-table-head" x="190" y="166">Time</text>
      <text className="svg-table-head" x="272" y="166">Manoeuvre before</text>
      <text className="svg-table-head" x="478" y="166">Point</text>
      <text className="svg-table-head" x="538" y="166">Time</text>
      <text className="svg-table-head" x="606" y="166">Dwell</text>
      <text className="svg-table-head" x="654" y="166">Run</text>
      <text className="svg-table-head" x="722" y="166">Point</text>
      <text className="svg-table-head" x="766" y="166">Time</text>
      <text className="svg-table-head" x="848" y="166">Manoeuvre after</text>
      <text className="svg-table-head" x="1056" y="166">Rev.</text>
      <text className="svg-table-head" x="1104" y="166">Speed</text>
      <text className="svg-table-head" x="1148" y="166">Min.</text>
      <text className="svg-table-head" x="1200" y="166">Crew</text>
      {rows.map((row, index) => {
        const y = y0 + 52 + index * rowHeight
        const selected = index === selectedIndex

        return (
          <g className="svg-clickable" onClick={() => onSelectRow(index)} key={`${row.train}-${row.sched}`}>
            <rect x="14" y={y - 13} width="1220" height={rowHeight} fill={selected ? '#103c8d' : '#aeb3c3'} />
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="18" y={y}>{row.state}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="58" y={y}>{row.train}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="98" y={y}>{row.sched}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="144" y={y}>{row.originPoint}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="190" y={y}>{row.originTime}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="268" y={y}>-</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="478" y={y}>{row.stationPoint}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="538" y={y}>{row.stationTime}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="606" y={y}>{row.dwell}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="654" y={y}>{row.run}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="722" y={y}>{row.destinationPoint}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="766" y={y}>{row.destinationTime}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="848" y={y}>-</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="1062" y={y}>{row.revision}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="1110" y={y}>{row.speed}</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="1154" y={y}>Y</text>
            <text className={selected ? 'svg-row-selected mono' : 'svg-table-text mono'} x="1208" y={y}>Y</text>
          </g>
        )
      })}
      <rect x="1234" y="182" width="16" height="286" fill="#d8d6c8" stroke="#000" />
      <polygon points="1237,186 1247,186 1242,192" fill="#000" />
      <polygon points="1237,462 1247,462 1242,456" fill="#000" />
      <rect x="1236" y="288" width="12" height="74" fill="#a7a393" stroke="#777" />
    </g>
  )
}

function SvgButton({
  h = 22,
  label,
  multiline,
  onClick,
  w,
  x,
  y,
}: {
  h?: number
  label: string
  multiline?: boolean
  onClick?: () => void
  w: number
  x: number
  y: number
}) {
  const lines = multiline ? label.split(' ') : [label]
  const midpoint = Math.ceil(lines.length / 2)
  const displayLines = multiline && lines.length > 2
    ? [lines.slice(0, midpoint).join(' '), lines.slice(midpoint).join(' ')]
    : lines

  return (
    <g className={onClick ? 'svg-clickable' : undefined} onClick={onClick} transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} fill="#c9c9d8" stroke="#ffffff" strokeWidth="2" />
      {displayLines.map((line, index) => (
        <text className="svg-button-text" x={w / 2} y={h / 2 + 4 + (index - (displayLines.length - 1) / 2) * 13} textAnchor="middle" key={line}>
          {line}
        </text>
      ))}
    </g>
  )
}

function CommonFooterSvg({ active, leftMode, status }: { active: string; leftMode: string; status: string }) {
  return (
    <g transform="translate(0 926)">
      <rect width={MONITOR_WIDTH} height="93" fill="#b8c7dc" />
      <line x1="0" y1="0" x2={MONITOR_WIDTH} y2="0" stroke="#fff" strokeWidth="3" />
      {['LAYOUT', 'COMMAND', 'POWER', 'E C S', 'TRAFFIC', 'COMS', 'UTILITY', 'ADMIN'].map((label, index) => (
        <ToolbarButton x={8 + index * 128} y={8} w={108} label={label} selected={label === active} key={label} />
      ))}
      <ToolbarButton x={30} y={54} w={60} label="Point No." selected={leftMode === 'Point No.'} />
      <ToolbarButton x={96} y={54} w={58} label="Track No." selected={leftMode === 'Track No.'} />
      <ToolbarButton x={164} y={54} w={62} label="FB No." selected={leftMode === 'FB No.'} />
      <ToolbarButton x={234} y={54} w={62} label="Signal No." selected={leftMode === 'Signal No.'} />
      <ToolbarButton x={306} y={54} w={58} label="Train" />
      <ToolbarButton x={370} y={54} w={80} label="NorthBound" selected />
      <ToolbarButton x={452} y={54} w={80} label="SouthBound" selected />
      <rect x="898" y="52" width="166" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <text className="svg-status-text" x="981" y="68" textAnchor="middle">{status}</text>
      <text className="svg-status-text" x="981" y="82" textAnchor="middle">[ TSR1 ] @ OCC</text>
      <rect x="1122" y="52" width="144" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <text className="svg-status-text" x="1194" y="68" textAnchor="middle">11:02:15</text>
      <text className="svg-status-text" x="1194" y="82" textAnchor="middle">Wed, 05/11/2025</text>
    </g>
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
  const [panX, setPanX] = useState(0)
  const dragRef = useRef<{ startX: number; startPan: number } | null>(null)
  const selectedTrain = session.trains.find((train) => train.id === session.selectedTrainId)

  const panTo = (value: number) => {
    setPanX(clampPan(value))
  }

  const panBy = (distance: number) => {
    setPanX((current) => clampPan(current + distance))
  }

  const toggleCycleMode = () => {
    updateSession((current) => ({
      ...current,
      cycleMode: current.cycleMode === 'NONE' ? 'AUTO' : 'NONE',
    }))
  }

  const applyTrainCommand = (command: TrainCommand) => {
    const targetTrain = session.trains.find((train) => train.id === session.selectedTrainId)

    if (!targetTrain) {
      return
    }

    const nextStatus: TrainStatus = command === 'DISPATCH' ? 'RUN' : command === 'HOLD' ? 'HOLD' : 'WAIT'
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
      timestamp: eventRow.time.replace('05/11 ', '05/11/25 '),
      asset: eventRow.asset,
      description: message,
      value: nextStatus,
      tone: tone === 'orange' ? 'yellow' : 'yellow',
    }

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [summaryRow, ...current.alarmSummaryRows].slice(0, 12),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      timetableRows: current.timetableRows.map((row) => (
        row.train === targetTrain.id
          ? { ...row, state: command === 'HOLD' ? 'H>' : command === 'DISPATCH' ? '>' : 'R' }
          : row
      )),
      trains: current.trains.map((train) => (
        train.id === targetTrain.id ? { ...train, status: nextStatus } : train
      )),
    }))
  }

  const getSvgUnitsPerPixel = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()

    return MONITOR_WIDTH / bounds.width
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startPan: panX,
    }
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) {
      return
    }

    const unitsPerPixel = getSvgUnitsPerPixel(event)
    const delta = (event.clientX - dragRef.current.startX) * unitsPerPixel
    panTo(dragRef.current.startPan - delta)
  }

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = null
  }

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
  }, [])

  useEffect(() => {
    if (session.cycleMode === 'NONE') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      updateSession((current) => ({
        ...current,
        trains: current.trains.map(advanceTrain),
      }))
    }, 850)

    return () => window.clearInterval(intervalId)
  }, [session.cycleMode])

  return (
    <svg
      className="occ-monitor-svg"
      viewBox={`0 0 ${MONITOR_WIDTH} ${MONITOR_HEIGHT}`}
      role="img"
      aria-label="OCC line map monitor"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onWheel={(event) => {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0

        if (delta !== 0) {
          event.preventDefault()
          panBy(delta)
        }
      }}
    >
      <defs>
        <clipPath id="station-ribbon-clip">
          <rect x="0" y="0" width={MONITOR_WIDTH} height="67" />
        </clipPath>
        <clipPath id="schematic-clip">
          <rect x="0" y="0" width={MONITOR_WIDTH} height="755" />
        </clipPath>
      </defs>
      <rect width={MONITOR_WIDTH} height={MONITOR_HEIGHT} fill="#b8c7dc" />
      <AlarmBand onNavigate={onNavigate} rows={session.eventRows} />
      <StationRibbon panX={panX} />
      <SchematicSvg
        onCommand={applyTrainCommand}
        cycleMode={session.cycleMode}
        onSelectTrain={(trainId) => updateSession((current) => ({ ...current, selectedTrainId: trainId }))}
        onToggleCycle={toggleCycleMode}
        panX={panX}
        selectedTrainId={session.selectedTrainId}
        trains={session.trains}
      />
      <ToolbarSvg
        cycleMode={session.cycleMode}
        onPanBy={panBy}
        onPanTo={panTo}
        panX={panX}
        selectedTrain={selectedTrain}
      />
    </svg>
  )
}

function StationRibbon({ panX }: { panX: number }) {
  return (
    <g transform="translate(0 104)">
      <rect width={MONITOR_WIDTH} height="67" fill="#b8bdca" stroke="#818181" strokeWidth="2" />
      <g clipPath="url(#station-ribbon-clip)">
        <g transform={`translate(${-panX} 0)`}>
          {stationRibbonItems.slice(0, -1).map((station, index) => (
            <line
              x1={station.x + 13}
              y1="54"
              x2={stationRibbonItems[index + 1].x - 13}
              y2="54"
              stroke="#001dff"
              strokeWidth="3"
              key={`${station.label}-line`}
            />
          ))}
          {stationRibbonItems.map((station, index) => (
            <g transform={`translate(${station.x} 0)`} key={`${station.label}-${index}`}>
              <text className="svg-ribbon-label" x="0" y="20" textAnchor="middle">
                {station.label.split('\n').map((line, lineIndex) => (
                  <tspan x="0" dy={lineIndex === 0 ? 0 : 17} key={line}>
                    {line}
                  </tspan>
                ))}
              </text>
              <circle cx="0" cy="54" r="13" fill="#001dff" />
            </g>
          ))}
        </g>
      </g>
      <text className="svg-overall" x="1260" y="43" textAnchor="end">OVERALL</text>
    </g>
  )
}

function AlarmBand({
  onNavigate,
  rows,
}: {
  onNavigate: (route: AppRoute) => void
  rows: typeof alarmRows
}) {
  return (
    <g>
      <rect x="0" y="0" width="34" height="104" fill="#d6d6d6" stroke="#000" />
      <text className="svg-vertical" transform="translate(17 42) rotate(-90)">Alarms</text>
      <line x1="0" y1="52" x2="34" y2="52" stroke="#000" />
      <text className="svg-vertical" transform="translate(17 90) rotate(-90)">Calls</text>

      <rect x="34" y="0" width="140" height="104" fill="#b8b8b8" stroke="#000" />
      <text className="svg-small" x="38" y="18">Not Ack</text>
      <rect x="114" y="6" width="34" height="20" fill="#fff" stroke="#888" strokeWidth="2" />
      <text className="svg-cell-text" x="131" y="21" textAnchor="middle">3</text>
      <text className="svg-small" x="38" y="44">Total</text>
      <rect x="114" y="32" width="34" height="20" fill="#fff" stroke="#888" strokeWidth="2" />
      <text className="svg-cell-text" x="131" y="47" textAnchor="middle">70</text>
      <g onClick={() => undefined} className="svg-clickable">
        <rect x="38" y="58" width="112" height="24" fill="#c9c9c9" stroke="#fff" strokeWidth="2" />
        <text className="svg-button-text" x="94" y="75" textAnchor="middle">Display</text>
      </g>
      <g onClick={() => onNavigate('/')} className="svg-clickable">
        <rect x="38" y="84" width="112" height="18" fill="#c9c9c9" stroke="#fff" strokeWidth="2" />
        <text className="svg-button-text" x="94" y="98" textAnchor="middle">Exit</text>
      </g>

      <g transform="translate(174 4)">
        {rows.map((row, index) => {
          const fill = row.tone === 'red' ? '#ff0000' : row.tone === 'orange' ? '#ff9900' : '#ffff00'
          const y = index * 24

          return (
            <g transform={`translate(0 ${y})`} key={`${row.time}-${row.message}`}>
              <rect width="1088" height="24" fill={fill} stroke="#000" />
              <line x1="28" y1="0" x2="28" y2="24" stroke="#000" />
              <line x1="160" y1="0" x2="160" y2="24" stroke="#000" />
              <line x1="420" y1="0" x2="420" y2="24" stroke="#000" />
              <line x1="912" y1="0" x2="912" y2="24" stroke="#000" />
              <text className="svg-alarm-text" x="8" y="17">{row.level}</text>
              <text className="svg-alarm-text" x="38" y="17">{row.time}</text>
              <text className="svg-alarm-text" x="172" y="17">{row.asset}</text>
              <text className="svg-alarm-text" x="430" y="17">{row.message}</text>
              <text className="svg-alarm-text" x="922" y="17">{row.value}</text>
            </g>
          )
        })}
      </g>
      <g transform="translate(1260 4)">
        <rect width="14" height="96" fill="#d2d2c2" stroke="#000" />
        <polygon points="2,2 12,2 7,8" fill="#000" />
        <polygon points="2,94 12,94 7,88" fill="#000" />
        <rect x="2" y="76" width="10" height="12" fill="#9d9d91" stroke="#666" />
      </g>
    </g>
  )
}

function SchematicSvg({
  cycleMode,
  onCommand,
  onSelectTrain,
  onToggleCycle,
  panX,
  selectedTrainId,
  trains,
}: {
  cycleMode: CycleMode
  onCommand: (command: TrainCommand) => void
  onSelectTrain: (trainId: string) => void
  onToggleCycle: () => void
  panX: number
  selectedTrainId: string
  trains: TrainState[]
}) {
  const platformData = [
    { code: 'SER', x: 82 },
    { code: 'KVN', x: 236 },
    { code: 'HGN', x: 388 },
    { code: 'BGK', x: 760 },
    { code: 'SKG', x: 1195 },
    { code: 'PGC', x: 1470 },
  ]

  const commandData = [
    { x: 82 },
    { x: 236 },
    { x: 388 },
    { x: 760 },
    { x: 1195 },
    { x: 1470 },
  ]

  const upperSignals = [
    { x: 52, label: 'S501', sub: '505', tone: 'white' },
    { x: 106, label: 'S505', sub: '507', tone: 'white' },
    { x: 208, label: 'S509', sub: '513', tone: 'white' },
    { x: 358, label: 'S517', sub: '521', tone: 'white' },
    { x: 520, label: 'S521', sub: '523', tone: 'white' },
    { x: 578, label: 'S603', tone: 'white' },
    { x: 634, label: 'S625', tone: 'red' },
    { x: 898, label: 'S613', sub: '611', tone: 'white' },
    { x: 1108, label: 'S617', sub: '615', tone: 'white' },
    { x: 1216, label: 'S619', sub: '621', tone: 'white' },
    { x: 1384, label: 'S701', sub: '703', tone: 'white' },
    { x: 1520, label: 'S705', sub: '707', tone: 'white' },
    { x: 1668, label: 'S709', tone: 'red' },
  ] as const

  const lowerSignals = [
    { x: 46, label: 'S502', tone: 'red' },
    { x: 96, label: 'S506', tone: 'red' },
    { x: 204, label: 'S510', tone: 'red' },
    { x: 252, label: 'S514', tone: 'red' },
    { x: 354, label: 'S518', tone: 'red' },
    { x: 402, label: 'S522', tone: 'red' },
    { x: 724, label: 'S602', tone: 'red' },
    { x: 776, label: 'S608', tone: 'red' },
    { x: 844, label: 'S655', tone: 'red' },
    { x: 1170, label: 'S610', tone: 'red' },
    { x: 1342, label: 'S702', tone: 'red' },
    { x: 1490, label: 'S706', tone: 'red' },
    { x: 1628, label: 'S710', tone: 'red' },
  ] as const

  const pointLabels = [
    { x: 600, y: 286, label: 'P602' },
    { x: 632, y: 304, label: 'P603' },
    { x: 608, y: 446, label: 'P600' },
    { x: 936, y: 350, label: 'P611' },
    { x: 968, y: 350, label: 'P613' },
    { x: 1006, y: 446, label: 'P608' },
    { x: 1078, y: 446, label: 'P610' },
    { x: 1138, y: 350, label: 'P615' },
    { x: 1328, y: 350, label: 'P701' },
    { x: 1444, y: 446, label: 'P700' },
    { x: 1574, y: 350, label: 'P703' },
  ]

  return (
    <g transform="translate(0 171)">
      <rect width={MONITOR_WIDTH} height="755" fill="#45697c" />

      <text className="svg-title" x="532" y="30" textAnchor="middle">DETAIL SIGNALLING SYSTEM</text>
      <text className="svg-title" x="532" y="56" textAnchor="middle">HBF TO PGC</text>

      <CycleBlock mode={cycleMode} onToggle={onToggleCycle} x={1080} y={16} />
      <g clipPath="url(#schematic-clip)">
        <g transform={`translate(${-panX} 0)`}>
          <line x1="578" y1="0" x2="578" y2="755" stroke="#d8d8d8" strokeWidth="2" />
          <AtcBlock x={176} y={56} label="ATC05" />
          <AtcBlock x={702} y={6} label="ATC06" />
          <AtcBlock x={1392} y={56} label="ATC07" />

          <ArrowRow y={150} direction="right" width={MAP_WORLD_WIDTH} />
          <Track y={220} start={0} end={MAP_WORLD_WIDTH} />
          <Track y={458} start={0} end={MAP_WORLD_WIDTH} alternate />
          <TrackLabels y={240} start={500} width={MAP_WORLD_WIDTH} />
          <TrackLabels y={478} start={502} width={MAP_WORLD_WIDTH} />
          <ArrowRow y={548} direction="left" width={MAP_WORLD_WIDTH} />

          <Branch x={244} y={238} />
          <Branch x={612} y={238} />
          <Branch x={870} y={238} />
          <Branch x={1320} y={238} />
          <Yard />
          <DepotExtension />

          {upperSignals.map((signal) => (
            <SignalMarker y={220} key={`${signal.label}-upper`} {...signal} />
          ))}
          {lowerSignals.map((signal) => (
            <SignalMarker y={458} below key={`${signal.label}-lower`} {...signal} />
          ))}
          {pointLabels.map((point) => (
            <text className="svg-point-label" x={point.x} y={point.y} key={point.label}>
              {point.label}
            </text>
          ))}

          {trains.map((train) => (
            <TrainBadge
              key={train.id}
              onSelect={onSelectTrain}
              selected={train.id === selectedTrainId}
              train={train}
            />
          ))}

          {platformData.map((platform) => (
            <PlatformBlock key={platform.code} {...platform} />
          ))}

          {commandData.map((command) => (
            <CommandStack key={command.x} onCommand={onCommand} x={command.x} />
          ))}

          <rect x="0" y="706" width="64" height="34" fill="#f2f2f2" stroke="#fff" strokeWidth="3" />
          <text className="svg-gh" x="32" y="730" textAnchor="middle">GH</text>
        </g>
      </g>

      <text className="svg-side-label" x="1254" y="274">NB</text>
      <text className="svg-side-label" x="1254" y="394">SB</text>
    </g>
  )
}

function CycleBlock({
  mode,
  onToggle,
  x,
  y,
}: {
  mode: CycleMode
  onToggle: () => void
  x: number
  y: number
}) {
  return (
    <g className="svg-clickable" onClick={onToggle} transform={`translate(${x} ${y})`}>
      <rect width="216" height="30" fill={mode === 'AUTO' ? '#00c800' : '#ff8800'} stroke="#000" strokeWidth="3" />
      <rect width="80" height="30" fill="#d9d9d9" stroke="#000" strokeWidth="2" />
      <text className="svg-button-text" x="40" y="20" textAnchor="middle">CYCLE</text>
      <text className="svg-button-text" x="148" y="20" textAnchor="middle">{mode}</text>
    </g>
  )
}

function SignalMarker({
  x,
  y,
  label,
  sub,
  tone,
  below,
}: {
  x: number
  y: number
  label: string
  sub?: string
  tone: 'red' | 'white'
  below?: boolean
}) {
  const circleY = below ? y + 19 : y - 31
  const textY = below ? y + 30 : y - 47
  const fill = tone === 'red' ? '#ff1010' : '#f4f9ff'

  return (
    <g>
      <line
        x1={x}
        y1={below ? y : circleY + 7}
        x2={x}
        y2={below ? circleY - 7 : y}
        stroke="#111111"
        strokeWidth="2"
      />
      <circle cx={x} cy={circleY} r="6" fill={fill} />
      <text className="svg-signal-label" x={x - 18} y={textY}>{label}</text>
      {sub && <text className="svg-signal-label" x={x - 7} y={textY + 13}>{sub}</text>}
    </g>
  )
}

function TrainBadge({
  onSelect,
  selected,
  train,
}: {
  onSelect: (trainId: string) => void
  selected: boolean
  train: TrainState
}) {
  const statusFill = train.status === 'HOLD' ? '#ff9f0a' : train.status === 'WAIT' ? '#77808f' : '#aab4c2'

  return (
    <g
      className="svg-clickable"
      onClick={() => onSelect(train.id)}
      transform={`translate(${train.x - 24} ${train.y})`}
    >
      <rect className="svg-train-hit" x="-12" y="-9" width="72" height="44" fill="transparent" />
      {train.direction === 'left' && <polygon points="-10,12 0,0 0,24 -10,12" fill="#3cff5c" />}
      {train.direction === 'right' && <polygon points="58,12 48,0 48,24 58,12" fill="#3cff5c" />}
      {selected && <rect x="-5" y="-5" width="58" height="34" fill="none" stroke="#ffff00" strokeWidth="3" />}
      <rect width="48" height="24" fill={statusFill} />
      <rect x="44" width="4" height="24" fill="#ff0000" />
      <text className="svg-train" x="24" y="17" textAnchor="middle">{train.id}</text>
      {train.direction === 'left' && <rect x="8" y="24" width="38" height="5" fill="#ff0000" />}
      {train.status !== 'RUN' && (
        <text className="svg-train-status" x="24" y="-4" textAnchor="middle">
          {train.status}
        </text>
      )}
    </g>
  )
}

function AtcBlock({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="104" height="66" fill="#45697c" stroke="#000" strokeWidth="3" />
      <rect width="104" height="20" fill="#6d6d6d" stroke="#000" />
      <text className="svg-atc-title" x="52" y="15" textAnchor="middle">{label}</text>
      {['GGAMA', 'GGAMA', 'GTSR', 'GTSR'].map((labelText, index) => {
        const xPos = index % 2 === 0 ? 0 : 52
        const yPos = index < 2 ? 20 : 43
        const fill = index % 2 === 0 ? '#d8d8d8' : '#45697c'

        return (
          <g transform={`translate(${xPos} ${yPos})`} key={`${labelText}-${index}`}>
            <rect width="52" height="23" fill={fill} stroke="#000" />
            <text className="svg-mini-text" x="26" y="16" textAnchor="middle">{labelText}</text>
          </g>
        )
      })}
    </g>
  )
}

function ArrowRow({ y, direction, width = MONITOR_WIDTH }: { y: number; direction: 'left' | 'right'; width?: number }) {
  const arrow = direction === 'right' ? '>' : '<'
  const mutedCount = Math.ceil(width / 126)
  const mainCount = Math.ceil(width / 98)

  return (
    <g>
      {Array.from({ length: mutedCount }, (_, index) => (
        <text className="svg-arrow-muted" x={34 + index * 126} y={y} textAnchor="middle" key={`muted-${index}`}>
          {arrow}
        </text>
      ))}
      {Array.from({ length: mainCount }, (_, index) => (
        <text className="svg-arrow-text" x={76 + index * 98} y={y} textAnchor="middle" key={`main-${index}`}>
          {arrow}
        </text>
      ))}
    </g>
  )
}

function Track({ y, alternate, start, end }: { y: number; alternate?: boolean; start: number; end: number }) {
  const markerCount = Math.ceil((end - start) / 46)

  return (
    <g transform={`translate(${start} ${y})`}>
      <rect width={end - start} height="12" fill="#eef5fa" />
      {Array.from({ length: markerCount }, (_, index) => {
        const x = index * 46
        const isRed = alternate ? index % 8 === 0 : index % 7 === 0
        const isYellow = alternate ? index % 10 === 0 : index % 9 === 0

        return (
          <g key={index}>
            <line x1={x} y1="0" x2={x} y2="12" stroke="#45697c" strokeWidth="2" />
            {isRed && <rect x={x} y="0" width="38" height="12" fill="#ff0000" />}
            {!isRed && isYellow && <rect x={x} y="0" width="54" height="12" fill="#fff59d" />}
          </g>
        )
      })}
    </g>
  )
}

function TrackLabels({ y, start, width = MONITOR_WIDTH }: { y: number; start: number; width?: number }) {
  const labelCount = Math.ceil(width / 68)

  return (
    <g>
      {Array.from({ length: labelCount }, (_, index) => (
        <text className="svg-track-label" x={36 + index * 68} y={y} textAnchor="middle" key={index}>
          {start + index * 2}
        </text>
      ))}
    </g>
  )
}

function Branch({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points="0,0 13,0 -37,238 -50,238" fill="rgba(74,103,119,0.7)" stroke="rgba(91,119,137,0.65)" strokeWidth="4" />
    </g>
  )
}

function Yard() {
  return (
    <g transform="translate(732 110)">
      <text className="svg-side-label" x="0" y="0">RT3</text>
      <text className="svg-side-label" x="58" y="0">RT2</text>
      <text className="svg-side-label" x="102" y="0">RT1</text>
      <polygon points="10,16 20,16 55,130 45,130" fill="#fff59d" stroke="#000" strokeWidth="2" />
      <polygon points="68,16 78,16 103,130 93,130" fill="#fff59d" stroke="#000" strokeWidth="2" />
      <polygon points="112,16 122,16 144,130 134,130" fill="#fff59d" stroke="#000" strokeWidth="2" />
      <rect x="24" y="116" width="118" height="9" fill="#fff59d" />
    </g>
  )
}

function DepotExtension() {
  return (
    <g transform="translate(1325 86)">
      <rect x="-10" y="-10" width="430" height="540" fill="rgba(55, 88, 103, 0.28)" stroke="rgba(184, 199, 220, 0.18)" />
      <text className="svg-depot-label" x="128" y="20">DEPOT / STABLING ROADS</text>
      <polygon points="38,134 48,134 116,260 106,260" fill="#fff59d" stroke="#000" strokeWidth="2" />
      <polygon points="96,134 106,134 176,260 166,260" fill="#fff59d" stroke="#000" strokeWidth="2" />
      <polygon points="156,134 166,134 238,260 228,260" fill="#fff59d" stroke="#000" strokeWidth="2" />
      <rect x="56" y="250" width="220" height="9" fill="#fff59d" />
      <rect x="280" y="250" width="120" height="9" fill="#fff59d" />
      <text className="svg-point-label" x="48" y="120">RT4</text>
      <text className="svg-point-label" x="108" y="120">RT5</text>
      <text className="svg-point-label" x="168" y="120">RT6</text>
    </g>
  )
}

function PlatformBlock({ code, x, train }: { code: string; x: number; train?: string }) {
  return (
    <g transform={`translate(${x - 40} 276)`}>
      {train && (
        <g transform="translate(18 -82)">
          <rect width="48" height="24" fill="#9ca3af" />
          <rect x="44" width="4" height="24" fill="#ff0000" />
          <text className="svg-train" x="24" y="17" textAnchor="middle">{train}</text>
        </g>
      )}
      <circle cx="8" cy="-38" r="6" fill="#ff0000" />
      <circle cx="70" cy="-38" r="6" fill="#ff0000" />
      <rect width="80" height="154" fill="#9ab0bd" stroke="#000" strokeWidth="3" />
      <rect width="80" height="8" fill="#00d000" />
      {['PSD', 'PH', 'SPKS', 'CD', 'ESB', 'ESP'].map((label, index) => (
        <Cell label={label} x={(index % 2) * 40} y={8 + Math.floor(index / 2) * 18} key={label} />
      ))}
      <rect x="0" y="62" width="80" height="32" fill="#000" stroke="#000" />
      <text className="svg-platform-code" x="40" y="85" textAnchor="middle">{code}</text>
      {['ESB', 'ESP', 'SPKS', 'PH', 'PSD'].map((label, index) => (
        <Cell label={label} x={(index % 2) * 40} y={94 + Math.floor(index / 2) * 18} key={`${label}-${index}`} />
      ))}
      <rect y="146" width="80" height="8" fill="#00d000" />
      <circle cx="10" cy="194" r="6" fill="#ff0000" />
      <circle cx="70" cy="194" r="6" fill="#ff0000" />
    </g>
  )
}

function Cell({ label, x, y }: { label: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="40" height="18" fill={label === 'PSD' || label === 'PH' ? '#e7e7e7' : '#9ab0bd'} stroke="#000" />
      <text className="svg-cell-label" x="20" y="13" textAnchor="middle">{label}</text>
    </g>
  )
}

function CommandStack({
  onCommand,
  x,
}: {
  onCommand: (command: TrainCommand) => void
  x: number
}) {
  const commands: Array<{ label: string; state: string; command: TrainCommand }> = [
    { label: 'ROUTE', state: 'OCCA', command: 'ROUTE' },
    { label: 'DISPATCH', state: 'OCCA', command: 'DISPATCH' },
    { label: 'HII', state: 'ISCS', command: 'HOLD' },
  ]

  return (
    <g transform={`translate(${x - 38} 555)`}>
      <text className="svg-arrow-text" x="38" y="-14" textAnchor="middle">{'<'}</text>
      {commands.map((item, index) => (
        <g
          className="svg-clickable"
          onClick={() => onCommand(item.command)}
          transform={`translate(0 ${index * 62})`}
          key={item.label}
        >
          <rect width="76" height="52" fill="#00ce00" stroke="#000" strokeWidth="3" />
          <rect width="76" height="24" fill="#e5e5e5" stroke="#000" />
          <text className="svg-command-text" x="38" y="17" textAnchor="middle">{item.label}</text>
          <text className="svg-command-text" x="38" y="42" textAnchor="middle">{item.state}</text>
        </g>
      ))}
    </g>
  )
}

function ToolbarSvg({
  cycleMode,
  onPanBy,
  onPanTo,
  panX,
  selectedTrain,
}: {
  cycleMode: CycleMode
  onPanBy: (distance: number) => void
  onPanTo: (value: number) => void
  panX: number
  selectedTrain?: TrainState
}) {
  const thumbWidth = 92
  const thumbX = 1028 + (panX / MAP_PAN_MAX) * (178 - thumbWidth)

  return (
    <g transform="translate(0 926)">
      <rect width={MONITOR_WIDTH} height="93" fill="#b8c7dc" />
      <line x1="0" y1="0" x2={MONITOR_WIDTH} y2="0" stroke="#fff" strokeWidth="3" />
      {['LAYOUT', 'COMMAND', 'POWER', 'E C S', 'TRAFFIC', 'COMS', 'UTILITY', 'ADMIN'].map((label, index) => (
        <ToolbarButton x={8 + index * 108} y={8} w={100} label={label} selected={label === 'TRAFFIC'} key={label} />
      ))}
      <ToolbarPanButton x={1028} y={8} label="|<" onClick={() => onPanTo(0)} />
      <ToolbarPanButton x={1074} y={8} label="<<" onClick={() => onPanBy(-MAP_PAN_STEP)} />
      <ToolbarPanButton x={1120} y={8} label=">>" onClick={() => onPanBy(MAP_PAN_STEP)} />
      <ToolbarPanButton x={1166} y={8} label=">|" onClick={() => onPanTo(MAP_PAN_MAX)} />
      <rect x="1028" y="38" width="178" height="8" fill="#9ca8b7" stroke="#ffffff" />
      <rect x={thumbX} y="38" width={thumbWidth} height="8" fill="#22324a" stroke="#000000" />
      {['Point No.', 'Track No.', 'FB No.', 'Signal No.', 'Train', 'NorthBound', 'SouthBound'].map((label, index) => (
        <ToolbarButton x={8 + index * 74} y={54} w={68} label={label} selected={label.includes('Bound')} key={label} />
      ))}
      {['+', '[]', '/', '#'].map((label, index) => (
        <ToolbarButton x={548 + index * 44} y={54} w={36} label={label} key={label} />
      ))}
      <rect x="918" y="52" width="164" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <text className="svg-status-text" x="1000" y="68" textAnchor="middle">
        {selectedTrain ? `TRAIN ${selectedTrain.id}  ${selectedTrain.status}` : 'TRAIN --'}
      </text>
      <text className="svg-status-text" x="1000" y="82" textAnchor="middle">
        {selectedTrain ? `${selectedTrain.service}  X ${Math.round(selectedTrain.x)}` : '[ TSR1 ] @ OCC'}
      </text>
      <rect x="1100" y="52" width="166" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <text className="svg-status-text" x="1183" y="68" textAnchor="middle">{cycleMode}  PAN {Math.round(panX)}</text>
      <text className="svg-status-text" x="1183" y="82" textAnchor="middle">Wed, 05/11/2025</text>
    </g>
  )
}

function ToolbarPanButton({ x, y, label, onClick }: { x: number; y: number; label: string; onClick: () => void }) {
  return (
    <g transform={`translate(${x} ${y})`} className="svg-clickable" onClick={onClick}>
      <rect width="40" height="25" fill="#c9c9c9" stroke="#fff" strokeWidth="2" />
      <text className="svg-button-text" x="20" y="17" textAnchor="middle">{label}</text>
    </g>
  )
}

function ToolbarButton({
  x,
  y,
  w,
  label,
  selected,
}: {
  x: number
  y: number
  w: number
  label: string
  selected?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height="26" fill={selected ? '#fff58c' : '#c9c9c9'} stroke="#fff" strokeWidth="2" />
      <text className="svg-button-text" x={w / 2} y="18" textAnchor="middle">{label}</text>
    </g>
  )
}

function PlaceholderScreen({
  route,
  onNavigate,
}: {
  route: AppRoute
  onNavigate: (route: AppRoute) => void
}) {
  const title =
    route === '/screen/alarms'
      ? 'Alarm and Fault Monitoring'
      : route === '/screen/timetable'
        ? 'Timetable Coordination'
        : 'Instructor Operating Station'

  return (
    <main className="placeholder-shell">
      <img src={sbsTransitLogo} alt="SBS Transit" />
      <p className="eyebrow">Next screen</p>
      <h1>{title}</h1>
      <p>This route is ready. We can build this screen after the Line Map view.</p>
      <div className="placeholder-actions">
        <button type="button" onClick={() => onNavigate('/screen/line-map')}>
          Open Line Map
        </button>
        <button type="button" onClick={() => onNavigate('/')}>
          Back to Landing
        </button>
      </div>
    </main>
  )
}

export default App
