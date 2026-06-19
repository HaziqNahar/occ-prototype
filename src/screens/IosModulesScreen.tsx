import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import SessionRunway from '../components/SessionRunway'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import type { AlarmSummaryRow, AppRoute, MonitorAlarmRow, OccSessionState, TrainingMode } from '../types'

type IosModulesScreenProps = {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}

type TrainerModule = 'users' | 'sessions' | 'scenarios' | 'runtime' | 'reports' | 'player'

type Trainee = {
  email: string
  role: string
  status: 'Enrolled' | 'Pending'
}

const moduleTabs: Array<{ id: TrainerModule; label: string }> = [
  { id: 'users', label: 'User Management' },
  { id: 'sessions', label: 'Session Management' },
  { id: 'scenarios', label: 'Scenario Management' },
  { id: 'runtime', label: 'Dynamic Runtime' },
  { id: 'reports', label: 'Report Management' },
  { id: 'player', label: 'Player Mode' },
]

const trainingModeOptions: Array<{ label: string; value: TrainingMode }> = [
  { label: 'Practice', value: 'PRACTICE' },
  { label: 'Assessment', value: 'ASSESSMENT' },
  { label: 'Player', value: 'PLAYER' },
]

const scenarioLibrary = [
  {
    name: 'Train Launch / Withdrawal',
    status: 'Active',
    incidents: ['Door fault', 'Train hold', 'Timetable deviation'],
  },
  {
    name: 'High Train Occupancy',
    status: 'Prepared',
    incidents: ['Crowd alert', 'Station coordination'],
  },
  {
    name: 'Train System Malfunction',
    status: 'Prepared',
    incidents: ['Traction fault', 'Recovery command'],
  },
  {
    name: 'PA System Malfunction',
    status: 'Prepared',
    incidents: ['Alarm injection', 'Passenger information failure'],
  },
]

const incidentButtons = [
  {
    label: 'Door Fault',
    value: 'YES',
    tone: 'red' as const,
    summaryTone: 'red' as const,
    message: 'Dynamic injection: Train 317 door fault pending',
  },
  {
    label: 'High Occupancy',
    value: 'HIGH',
    tone: 'yellow' as const,
    summaryTone: 'yellow' as const,
    message: 'Dynamic injection: High train occupancy at SKG',
  },
  {
    label: 'System Malfunction',
    value: 'FAULT',
    tone: 'red' as const,
    summaryTone: 'red' as const,
    message: 'Dynamic injection: Train 317 system malfunction',
  },
  {
    label: 'PA Fault',
    value: 'NO PA',
    tone: 'orange' as const,
    summaryTone: 'yellow' as const,
    message: 'Dynamic injection: PA system malfunction alarm',
  },
]

function formatScenarioTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `05/11 ${hours}:${minutes}:${seconds}`
}

function createModuleEvent(message: string, value: string, tone: MonitorAlarmRow['tone']): MonitorAlarmRow {
  return {
    level: 'S',
    time: formatScenarioTime(),
    asset: 'IOS/TRAINER/OCC',
    message,
    value,
    tone,
  }
}

function createSummaryEvent(event: MonitorAlarmRow, tone: AlarmSummaryRow['tone']): AlarmSummaryRow {
  return {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: event.time.replace('05/11 ', '05/11/25 '),
    asset: event.asset,
    description: event.message,
    value: event.value,
    tone,
  }
}

function IosModulesScreen({ onNavigate, resetSession, session, updateSession }: IosModulesScreenProps) {
  const [activeModule, setActiveModule] = useState<TrainerModule>('users')
  const [traineeEmail, setTraineeEmail] = useState('controller.trainee@sbs.local')
  const [sessionMode, setSessionMode] = useState<TrainingMode>(session.trainingMode)
  const [sessionTime, setSessionTime] = useState('Wed 05/11/2025 11:15')
  const [roster, setRoster] = useState<Trainee[]>([
    { email: 'traffic.controller@sbs.local', role: 'Traffic Controller', status: 'Enrolled' },
    { email: 'station.manager@sbs.local', role: 'Station Manager', status: 'Pending' },
    { email: 'systems.engineer@sbs.local', role: 'Engineer', status: 'Pending' },
  ])
  const [selectedScenario, setSelectedScenario] = useState('Train Launch / Withdrawal')
  const [runtimeNote, setRuntimeNote] = useState('Dynamic runtime ready. Select an incident to push it to the live monitors.')

  const addTrainee = () => {
    if (!traineeEmail.trim()) {
      return
    }

    setRoster((current) => [
      { email: traineeEmail.trim(), role: 'Traffic Controller', status: 'Pending' },
      ...current,
    ])
    setTraineeEmail('')
  }

  const createSession = () => {
    resetSession(sessionMode)
    setRuntimeNote(`${sessionMode} session created for ${sessionTime}. Open IOS to start the drill.`)
  }

  const controlRuntime = (action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    const controlMeta = {
      COMPLETE: {
        actionLabel: 'Scenario completed',
        message: 'IOS Runtime control: scenario completed by trainer',
        mode: 'COMPLETE' as const,
        notice: 'Scenario completed from IOS Runtime. Report evidence is ready.',
        result: 'accepted' as const,
        step: 5,
        tone: 'yellow' as const,
        trainStatus: 'RUN' as const,
        value: 'COMPLETE',
      },
      PAUSE: {
        actionLabel: 'Scenario paused',
        message: 'IOS Runtime control: scenario paused by trainer',
        mode: 'PAUSED' as const,
        notice: 'Scenario paused from IOS Runtime. Monitors retain current state.',
        result: 'info' as const,
        step: session.scenarioStep,
        tone: 'orange' as const,
        trainStatus: undefined,
        value: 'PAUSED',
      },
      RESUME: {
        actionLabel: 'Scenario resumed',
        message: 'IOS Runtime control: scenario resumed by trainer',
        mode: 'RUNNING' as const,
        notice: 'Scenario resumed from IOS Runtime. Continue operator response.',
        result: 'info' as const,
        step: Math.max(session.scenarioStep, 1),
        tone: 'yellow' as const,
        trainStatus: undefined,
        value: 'RUNNING',
      },
      START: {
        actionLabel: 'Scenario started',
        message: 'IOS Runtime control: Train 317 scenario started',
        mode: 'RUNNING' as const,
        notice: 'Scenario started from IOS Runtime. Train 317 is held for response.',
        result: 'accepted' as const,
        step: 1,
        tone: 'red' as const,
        trainStatus: 'HOLD' as const,
        value: 'HOLD',
      },
    }[action]

    const event = createModuleEvent(controlMeta.message, controlMeta.value, controlMeta.tone)

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(event, controlMeta.tone === 'red' ? 'red' : 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
      cycleMode: action === 'COMPLETE' ? 'AUTO' : current.cycleMode,
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence('IOS Dynamic Runtime', controlMeta.actionLabel, controlMeta.result, controlMeta.notice),
      ),
      eventRows: [event, ...current.eventRows].slice(0, 4),
      scenarioMode: controlMeta.mode,
      scenarioNotice: {
        text: controlMeta.notice,
        tone: action === 'COMPLETE' ? 'success' : action === 'START' ? 'warning' : 'info',
      },
      scenarioStep: Math.max(current.scenarioStep, controlMeta.step),
      scenarioTasks: action === 'START'
        ? { ...current.scenarioTasks, selectTrain: true }
        : action === 'COMPLETE'
          ? {
            ...current.scenarioTasks,
            ackAlarm: true,
            completeScenario: true,
            dispatchTrain: true,
            selectTrain: true,
            setRoute: true,
          }
          : current.scenarioTasks,
      selectedTrainId: '317',
      timetableRows: current.timetableRows.map((row) => (
        row.train === '317'
          ? { ...row, state: action === 'START' ? 'H>' : action === 'COMPLETE' ? '>' : row.state }
          : row
      )),
      trains: current.trains.map((train) => (
        train.id === '317' && controlMeta.trainStatus ? { ...train, status: controlMeta.trainStatus } : train
      )),
    }))
    setRuntimeNote(controlMeta.notice)
  }

  const injectIncident = (incident: typeof incidentButtons[number]) => {
    const event = createModuleEvent(incident.message, incident.value, incident.tone)
    const isDoorFaultIncident = incident.label === 'Door Fault'
    const nextTrainStatus = incident.summaryTone === 'red' ? 'HOLD' : 'WAIT'

    updateSession((current) => ({
      ...current,
      activeScenario: {
        ...current.activeScenario,
        incident: incident.label,
      },
      alarmSummaryRows: [createSummaryEvent(event, incident.summaryTone), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'IOS Dynamic Runtime',
          'Incident injected',
          incident.summaryTone === 'red' ? 'accepted' : 'info',
          incident.message,
        ),
      ),
      eventRows: [event, ...current.eventRows].slice(0, 4),
      scenarioMode: 'RUNNING',
      scenarioNotice: {
        text: `${incident.label} pushed from IOS Runtime.`,
        tone: incident.summaryTone === 'red' ? 'warning' : 'info',
      },
      scenarioStep: Math.max(current.scenarioStep, 2),
      selectedTrainId: '317',
      timetableRows: current.timetableRows.map((row) => (
        row.train === '317' ? { ...row, state: incident.summaryTone === 'red' ? 'H>' : 'R' } : row
      )),
      trains: current.trains.map((train) => (
        train.id === '317'
          ? {
              ...train,
              status: nextTrainStatus,
              ...(isDoorFaultIncident ? { doorFailureState: 'FAULT_ALARM' as const } : {}),
            }
          : train
      )),
    }))
    setRuntimeNote(`${incident.label} injected into live OCC session.`)
  }

  const startPlayerMode = () => {
    resetSession('PLAYER')
    setRuntimeNote('Player Mode prepared. Open IOS and use Auto Run for playback.')
    onNavigate('/ios')
  }

  return (
    <main
      className="ios-modules-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="ios-modules-header">
        <div className="ios-modules-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Instructor Operating Station</p>
            <h1>Trainer Modules</h1>
            <span>{session.trainingMode} | {session.scenarioMode}</span>
          </div>
        </div>
        <div className="ios-modules-actions">
          <button type="button" onClick={() => onNavigate('/ios/scenarios')}>Scenario Builder</button>
          <button type="button" onClick={() => onNavigate('/ios/assessment')}>Rubric</button>
          <button type="button" onClick={() => onNavigate('/session/join')}>Trainee Lobby</button>
          <button type="button" onClick={() => onNavigate('/ios')}>Open IOS</button>
          <button type="button" onClick={() => onNavigate('/')}>Back to Launch</button>
        </div>
      </header>

      <SessionRunway session={session} />

      <section className="ios-module-layout">
        <aside className="ios-module-tabs" aria-label="IOS trainer modules">
          {moduleTabs.map((tab) => (
            <button
              type="button"
              className={activeModule === tab.id ? 'is-active' : ''}
              onClick={() => setActiveModule(tab.id)}
              key={tab.id}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="ios-module-panel">
          {activeModule === 'users' && (
            <ModuleSection
              eyebrow="1. User Management"
              title="Trainer Roster Registration"
              copy="Register or stage trainee emails before the session."
            >
              <div className="module-form-row">
                <input
                  value={traineeEmail}
                  onChange={(event) => setTraineeEmail(event.target.value)}
                  placeholder="trainee@sbs.local"
                />
                <button type="button" onClick={addTrainee}>Register User</button>
              </div>
              <div className="module-table">
                {roster.map((trainee) => (
                  <div className="module-table-row" key={`${trainee.email}-${trainee.role}`}>
                    <strong>{trainee.email}</strong>
                    <span>{trainee.role}</span>
                    <em>{trainee.status}</em>
                  </div>
                ))}
              </div>
            </ModuleSection>
          )}

          {activeModule === 'sessions' && (
            <ModuleSection
              eyebrow="2. Session Management"
              title="Create Session for Assessment"
              copy="Choose the mode, session time, and enrolled users."
            >
              <div className="module-session-grid">
                <label>
                  <span>Date and time of session</span>
                  <input value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} />
                </label>
                <label>
                  <span>Session mode</span>
                  <SelectField
                    ariaLabel="Session mode"
                    value={sessionMode}
                    options={trainingModeOptions}
                    onChange={setSessionMode}
                  />
                </label>
                <button type="button" onClick={createSession}>Create Session</button>
              </div>
              <div className="module-info-card">
                <strong>{roster.filter((trainee) => trainee.status === 'Enrolled').length} enrolled user ready</strong>
                <span>Enrolled users can access the assessment session from the training console.</span>
              </div>
            </ModuleSection>
          )}

          {activeModule === 'scenarios' && (
            <ModuleSection
              eyebrow="3. Scenario Management"
              title="Scenario Library and Incident Setup"
              copy="Manage available OCC scenarios and incident lists."
            >
              <div className="module-scenario-grid">
                {scenarioLibrary.map((scenario) => (
                  <button
                    type="button"
                    className={scenario.name === selectedScenario ? 'is-selected' : ''}
                    onClick={() => setSelectedScenario(scenario.name)}
                    key={scenario.name}
                  >
                    <strong>{scenario.name}</strong>
                    <em>{scenario.status}</em>
                    <span>{scenario.incidents.join(' / ')}</span>
                  </button>
                ))}
              </div>
              <div className="module-info-card">
                <strong>Selected: {selectedScenario}</strong>
                <span>Duration to rectify each incident can be configured during actual development.</span>
              </div>
              <button type="button" className="module-primary-link" onClick={() => onNavigate('/ios/scenarios')}>
                Open Scenario Builder
              </button>
            </ModuleSection>
          )}

          {activeModule === 'runtime' && (
            <ModuleSection
              eyebrow="4. Scenario Runtime"
              title="Dynamic Incident Injection"
              copy="Push additional incidents from IOS into the active OCC monitor session."
            >
              <div className="module-runtime-controls">
                <button type="button" className="is-primary" onClick={() => controlRuntime('START')}>Start Live Scenario</button>
                <button type="button" onClick={() => controlRuntime(session.scenarioMode === 'PAUSED' ? 'RESUME' : 'PAUSE')}>
                  {session.scenarioMode === 'PAUSED' ? 'Resume Scenario' : 'Pause Scenario'}
                </button>
                <button type="button" onClick={() => controlRuntime('COMPLETE')}>Complete Scenario</button>
                <button type="button" className="is-danger" onClick={() => { resetSession(session.trainingMode); setRuntimeNote('Runtime reset. Shared monitor state returned to initial session.') }}>
                  Reset Runtime
                </button>
              </div>
              <div className="module-runtime-grid">
                {incidentButtons.map((incident) => (
                  <button type="button" onClick={() => injectIncident(incident)} key={incident.label}>
                    {incident.label}
                  </button>
                ))}
              </div>
              <div className="module-info-card">
                <strong>Live runtime note</strong>
                <span>{runtimeNote}</span>
              </div>
            </ModuleSection>
          )}

          {activeModule === 'reports' && (
            <ModuleSection
              eyebrow="5. Report Management"
              title="Performance Report and Tracking"
              copy="Show quantitative results for trainee response, step accuracy, and rejected actions."
            >
              <div className="module-report-grid">
                <div>
                  <span>Scenario mode</span>
                  <strong>{session.scenarioMode}</strong>
                </div>
                <div>
                  <span>Training mode</span>
                  <strong>{session.trainingMode}</strong>
                </div>
                <div>
                  <span>Rejected actions</span>
                  <strong>{session.eventRows.filter((event) => event.message.toLowerCase().includes('rejected')).length}</strong>
                </div>
                <div>
                  <span>Response target</span>
                  <strong>05:00</strong>
                </div>
              </div>
              <button type="button" className="module-primary-link" onClick={() => onNavigate('/report')}>
                Open Performance Report
              </button>
              <button type="button" className="module-primary-link secondary-module-link" onClick={() => onNavigate('/ios/assessment')}>
                Open Assessment Rubric
              </button>
            </ModuleSection>
          )}

          {activeModule === 'player' && (
            <ModuleSection
              eyebrow="6. Player Mode"
              title="Single Crew Now, Multi Crew Future"
              copy="Player mode supports one operator flow. Multi-crew joining is shown as future provisioning."
            >
              <div className="module-player-grid">
                <div>
                  <strong>Single Crew</strong>
                  <span>Current mode for one trainee/operator at the OCC workstation.</span>
                </div>
                <div>
                  <strong>Multi Crew</strong>
                  <span>Future same-instance roles: Traffic Controllers, Station Managers, Engineers.</span>
                </div>
                <div>
                  <strong>Provisioning</strong>
                  <span>Identity, permissions, shared session joining, and role handoff belong in actual development.</span>
                </div>
              </div>
              <button type="button" className="module-primary-link" onClick={startPlayerMode}>
                Start Player Mode Playback
              </button>
            </ModuleSection>
          )}
        </section>
      </section>
    </main>
  )
}

function ModuleSection({
  children,
  copy,
  eyebrow,
  title,
}: {
  children: ReactNode
  copy: string
  eyebrow: string
  title: string
}) {
  return (
    <>
      <p className="module-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="module-copy">{copy}</p>
      {children}
    </>
  )
}

export default IosModulesScreen
