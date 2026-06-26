import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import SessionRunway from '../components/SessionRunway'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import {
  createTrainingScenarioStartSession,
  getTrainingScenarioDefinition,
  scoreTrainingScenario,
  trainingScenarioDefinitions,
} from '../trainingScenarios'
import type { TrainingScenarioKind } from '../trainingScenarios'
import { updateSessionLifecycle } from '../sessionState'
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
  { id: 'runtime', label: 'Scenario Runtime' },
  { id: 'reports', label: 'Report Management' },
  { id: 'player', label: 'Player Mode' },
]

const trainingModeOptions: Array<{ label: string; value: TrainingMode }> = [
  { label: 'Practice', value: 'PRACTICE' },
  { label: 'Assessment', value: 'ASSESSMENT' },
  { label: 'Player', value: 'PLAYER' },
]

function formatScenarioTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `05/11 ${hours}:${minutes}:${seconds}`
}

function createModuleEvent(
  message: string,
  value: string,
  tone: MonitorAlarmRow['tone'],
  trainId?: string,
): MonitorAlarmRow {
  return {
    level: 'S',
    time: formatScenarioTime(),
    asset: trainId ? `EMU/${trainId}/TRN/OCC` : 'IOS/TRAINER/OCC',
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
  const [selectedScenarioKind, setSelectedScenarioKind] = useState<TrainingScenarioKind>('TRAIN_WITHDRAWAL')
  const [runtimeNote, setRuntimeNote] = useState('Scenario runtime ready. Select a scenario and arm it into the live OCC session.')
  const selectedScenarioDefinition = trainingScenarioDefinitions.find((scenario) => scenario.kind === selectedScenarioKind)
    ?? trainingScenarioDefinitions[0]
  const trainingScenarioScore = scoreTrainingScenario(session)

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
    setRuntimeNote(`${sessionMode} session created for ${sessionTime}. Open IOS to arm a training scenario.`)
  }

  const armSelectedScenario = () => {
    updateSession((current) => createTrainingScenarioStartSession(current, selectedScenarioKind))
    setRuntimeNote(`${selectedScenarioDefinition.title} armed for Train ${selectedScenarioDefinition.defaultTargetTrainId}.`)
  }

  const setScenarioRuntimeState = (action: 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    updateSession((current) => {
      const definition = getTrainingScenarioDefinition(current.activeScenario.id)
      const nextMode = action === 'PAUSE' ? 'PAUSED' as const : action === 'RESUME' ? 'RUNNING' as const : 'COMPLETE' as const
      const event = createModuleEvent(
        `IOS scenario ${action.toLowerCase()}: ${definition.title}`,
        nextMode,
        action === 'PAUSE' ? 'orange' : 'yellow',
        definition.defaultTargetTrainId,
      )
      const noticeText = action === 'COMPLETE'
        ? `${definition.title} marked complete. Report evidence is ready for review.`
        : `${definition.title} ${action === 'PAUSE' ? 'paused' : 'resumed'} from IOS.`

      return {
        ...current,
        alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
        evidenceLog: appendScenarioEvidence(
          current.evidenceLog,
          createScenarioEvidence('IOS Scenario Runtime', `Scenario ${action.toLowerCase()}`, action === 'COMPLETE' ? 'accepted' : 'info', noticeText),
        ),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        scenarioMode: nextMode,
        scenarioNotice: {
          text: noticeText,
          tone: action === 'COMPLETE' ? 'success' as const : 'info' as const,
        },
        scenarioTasks: action === 'COMPLETE'
          ? { ...current.scenarioTasks, completeScenario: true }
          : current.scenarioTasks,
        sessionMeta: updateSessionLifecycle(current.sessionMeta, nextMode),
      }
    })
    setRuntimeNote(action === 'COMPLETE' ? 'Scenario completed. Open Reports or Assessment Rubric for scoring.' : `Scenario ${action.toLowerCase()} applied.`)
  }

  const startPlayerMode = () => {
    resetSession('PLAYER')
    setRuntimeNote('Player Mode prepared. Open IOS to run the selected training scenario.')
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
              title="Training Scenario Library"
              copy="Select the scenario type that will be armed into the live timetable and line-map session."
            >
              <div className="module-scenario-grid">
                {trainingScenarioDefinitions.map((scenario) => (
                  <button
                    type="button"
                    className={scenario.kind === selectedScenarioKind ? 'is-selected' : ''}
                    onClick={() => setSelectedScenarioKind(scenario.kind)}
                    key={scenario.id}
                  >
                    <strong>{scenario.title}</strong>
                    <em>Train {scenario.defaultTargetTrainId}</em>
                    <span>{scenario.objective}</span>
                  </button>
                ))}
              </div>
              <div className="module-info-card">
                <strong>Selected: {selectedScenarioDefinition.title}</strong>
                <span>{selectedScenarioDefinition.target} | {selectedScenarioDefinition.duration}</span>
              </div>
              <button type="button" className="module-primary-link" onClick={armSelectedScenario}>
                Arm Selected Scenario
              </button>
            </ModuleSection>
          )}

          {activeModule === 'runtime' && (
            <ModuleSection
              eyebrow="4. Scenario Runtime"
              title="Live Scenario Control"
              copy="Control only the scenario lifecycle. Train movement, routes, timetable behavior, and scoring remain owned by the shared OCC session."
            >
              <div className="module-runtime-controls">
                <button type="button" className="is-primary" onClick={armSelectedScenario}>Arm Selected Scenario</button>
                <button type="button" onClick={() => setScenarioRuntimeState(session.scenarioMode === 'PAUSED' ? 'RESUME' : 'PAUSE')}>
                  {session.scenarioMode === 'PAUSED' ? 'Resume Scenario' : 'Pause Scenario'}
                </button>
                <button type="button" onClick={() => setScenarioRuntimeState('COMPLETE')}>Complete Scenario</button>
                <button type="button" className="is-danger" onClick={() => { resetSession(session.trainingMode); setRuntimeNote('Runtime reset. Shared monitor state returned to initial session.') }}>
                  Reset Runtime
                </button>
              </div>
              <div className="module-info-card">
                <strong>{session.activeScenario.title} | Train {getTrainingScenarioDefinition(session.activeScenario.id).defaultTargetTrainId}</strong>
                <span>{runtimeNote}</span>
              </div>
              <div className="module-runtime-grid">
                {trainingScenarioScore.taskResults.map((task) => (
                  <button type="button" className={task.complete ? 'is-primary' : ''} key={task.id}>
                    {task.complete ? 'Done' : 'Open'} | {task.label}
                  </button>
                ))}
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
                  <strong>{getTrainingScenarioDefinition(session.activeScenario.id).duration}</strong>
                </div>
                <div>
                  <span>Scenario score</span>
                  <strong>{trainingScenarioScore.score}%</strong>
                </div>
                <div>
                  <span>Scenario result</span>
                  <strong>{trainingScenarioScore.result}</strong>
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
              copy="Player mode supports one operator flow. Multi-crew joining remains a separate role and permissions feature."
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
                  <span>Identity, permissions, shared session joining, and role handoff are tracked as system-level features.</span>
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
