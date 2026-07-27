import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import {
  getScenarioTaskStageClass,
  getScenarioTaskStageLabel,
  withScenarioTaskStages,
} from '../iosScenarioTaskStages'
import { getScenarioAssessmentSummary } from '../iosScenarioAssessment'
import { categoriseScenarioEvidence, groupScenarioEvidenceByCategory } from '../iosEvidenceTrail'
import SessionRunway from '../components/SessionRunway'
import { getScenarioTaskOwner } from '../iosScenarioRoles'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import {
  applyTrainingScenarioRuntimeEvent,
  applyTrainingScenarioTrainSelection,
  completeTrainingScenarioDefinitionTask,
  createTrainingScenarioStartSession,
  getActiveTrainingScenarioTargetTrainId,
  getEligibleLaunchScenarioTargetOptions,
  getTrainingScenarioCompletionBlockers,
  getTrainingScenarioDefinition,
  resetTrainingScenarioRuntime,
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

const disabledModuleTabs = new Set<TrainerModule>(['users', 'sessions', 'player'])
const defaultSelectedScenarioKind: TrainingScenarioKind = 'TRAIN_LAUNCH'

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
  const [activeModule, setActiveModule] = useState<TrainerModule>('runtime')
  const [traineeEmail, setTraineeEmail] = useState('controller.trainee@sbs.local')
  const [sessionMode, setSessionMode] = useState<TrainingMode>(session.trainingMode)
  const [sessionTime, setSessionTime] = useState('Wed 05/11/2025 11:15')
  const [roster, setRoster] = useState<Trainee[]>([
    { email: 'traffic.controller@sbs.local', role: 'Traffic Controller', status: 'Enrolled' },
  ])
  const [selectedScenarioKind, setSelectedScenarioKind] = useState<TrainingScenarioKind>(() => {
    const currentDefinition = getTrainingScenarioDefinition(session.activeScenario.id)

    return currentDefinition.id === 'idle' ? defaultSelectedScenarioKind : currentDefinition.kind
  })
  const [selectedLaunchTrainChoice, setSelectedLaunchTrainChoice] = useState('')
  const selectedScenarioDefinition = trainingScenarioDefinitions.find((scenario) => scenario.kind === selectedScenarioKind)
    ?? trainingScenarioDefinitions[0]
  const trainingScenarioScore = scoreTrainingScenario(session)
  const stagedTaskResults = withScenarioTaskStages(trainingScenarioScore.taskResults, session.scenarioMode)
  const assessmentSummary = getScenarioAssessmentSummary(session)
  const activeScenarioDefinition = getTrainingScenarioDefinition(session.activeScenario.id)
  const activeScenarioIsIdle = activeScenarioDefinition.id === 'idle'
  const activeScenarioTargetTrainId = getActiveTrainingScenarioTargetTrainId(session)
  const activeScenarioTargetLabel = activeScenarioIsIdle
    ? 'No active target'
    : activeScenarioDefinition.kind === 'TRAIN_LAUNCH' && !session.activeScenario.targetTrainId
    ? 'Select train to launch'
    : activeScenarioDefinition.kind === 'TRAIN_WITHDRAWAL' && !session.activeScenario.targetTrainId
    ? 'Select train to withdraw'
    : `Train ${activeScenarioTargetTrainId}`
  const launchTargetOptions = useMemo(() => (
    getEligibleLaunchScenarioTargetOptions(session).map((option) => ({
      label: `Train ${option.trainId} | Sch ${option.scheduleNumber} | SKG -> ${option.destinationPoint}`,
      value: option.trainId,
    }))
  ), [session])
  const selectedLaunchTrainId = useMemo(() => {
    if (launchTargetOptions.length === 0) {
      return ''
    }

    return launchTargetOptions.some((option) => option.value === selectedLaunchTrainChoice)
      ? selectedLaunchTrainChoice
      : launchTargetOptions[0].value
  }, [launchTargetOptions, selectedLaunchTrainChoice])
  const nextScenarioTask = trainingScenarioScore.taskResults.find((task) => !task.complete)
  const nextScenarioTaskOwner = nextScenarioTask ? getScenarioTaskOwner(nextScenarioTask.monitor) : 'Instructor'
  const criticalOpenTasks = trainingScenarioScore.taskResults.filter((task) => task.critical && !task.complete).length
  const completionBlockerLabels = getTrainingScenarioCompletionBlockers(session)
    .map((task) => task.label)
  const rejectedScenarioEvidence = session.evidenceLog.filter((event) => event.result === 'rejected').length
  const rejectedEvidenceRows = session.evidenceLog.filter((event) => event.result === 'rejected')
  const liveActivityTrail = categoriseScenarioEvidence(session.evidenceLog).slice(0, 8)
  const liveActivityGroups = groupScenarioEvidenceByCategory(session.evidenceLog)
  const traineeSupervisionRows = session.trainees.map((trainee) => {
    const assignedTask = stagedTaskResults.find((task) => !task.complete && getScenarioTaskOwner(task.monitor) === trainee.role)
    const traineeEvidence = session.evidenceLog.find((event) => (
      event.source === `Trainee ${trainee.role}`
        || event.source === trainee.name
        || event.detail.includes(trainee.name)
        || event.detail.includes(trainee.role)
    ))

    return {
      ...trainee,
      assignedTask,
      traineeEvidence,
    }
  })
  const reportCriticalTaskResults = trainingScenarioScore.taskResults.filter((task) => task.critical)

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
  }

  const armSelectedScenario = () => {
    updateSession((current) => createTrainingScenarioStartSession(current, selectedScenarioKind))
  }

  const assignLaunchTrain = () => {
    if (!selectedLaunchTrainId) {
      updateSession((current) => ({
        ...current,
        scenarioNotice: {
          text: 'No eligible SKG-origin launch train is available right now.',
          tone: 'warning',
        },
      }))
      return
    }

    updateSession((current) => {
      const result = applyTrainingScenarioTrainSelection(current, 'IOS Scenario Runtime', selectedLaunchTrainId)

      return result.next
    })
  }

  const setScenarioRuntimeState = (action: 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    if (action === 'COMPLETE' && completionBlockerLabels.length > 0) {
      const warningText = `Cannot complete scenario. Open required tasks: ${completionBlockerLabels.join(', ')}.`

      updateSession((current) => ({
        ...current,
        scenarioNotice: {
          text: warningText,
          tone: 'warning' as const,
        },
      }))
      return
    }

    updateSession((current) => {
      const definition = getTrainingScenarioDefinition(current.activeScenario.id)
      const targetTrainId = getActiveTrainingScenarioTargetTrainId(current)
      const nextMode = action === 'PAUSE' ? 'PAUSED' as const : action === 'RESUME' ? 'RUNNING' as const : 'COMPLETE' as const
      const event = createModuleEvent(
        `IOS scenario ${action.toLowerCase()}: ${definition.title}`,
        nextMode,
        action === 'PAUSE' ? 'orange' : 'yellow',
        targetTrainId,
      )
      const noticeText = action === 'COMPLETE'
        ? `${definition.title} marked complete. Report evidence is ready for review.`
        : `${definition.title} ${action === 'PAUSE' ? 'paused' : 'resumed'} from IOS.`

      if (action === 'COMPLETE') {
        const openRequiredTasks = getTrainingScenarioCompletionBlockers(current)

        if (openRequiredTasks.length > 0) {
          return {
            ...current,
            scenarioNotice: {
              text: `Cannot complete scenario. Open required tasks: ${openRequiredTasks.map((task) => task.label).join(', ')}.`,
              tone: 'warning' as const,
            },
          }
        }

        const guard = applyTrainingScenarioRuntimeEvent(current, {
          source: 'IOS Scenario Runtime',
          type: 'SCENARIO_REVIEWED',
        })

        if (!guard.allowed) {
          return guard.next
        }

        return {
          ...guard.next,
          alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...guard.next.alarmSummaryRows].slice(0, 12),
          eventRows: [event, ...guard.next.eventRows].slice(0, 4),
        }
      }

      return {
        ...current,
        alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
        evidenceLog: appendScenarioEvidence(
          current.evidenceLog,
          createScenarioEvidence('IOS Scenario Runtime', `Scenario ${action.toLowerCase()}`, 'info', noticeText),
        ),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        scenarioMode: nextMode,
        scenarioNotice: {
          text: noticeText,
          tone: 'info' as const,
        },
        sessionMeta: updateSessionLifecycle(current.sessionMeta, nextMode),
      }
    })
  }

  const resetScenarioRuntime = () => {
    updateSession((current) => resetTrainingScenarioRuntime(current))
    setSelectedScenarioKind(defaultSelectedScenarioKind)
    setSelectedLaunchTrainChoice('')
  }

  const confirmRuntimeTask = (taskId: string, label: string) => {
    updateSession((current) => {
      const targetTrainId = getActiveTrainingScenarioTargetTrainId(current)
      const guard = completeTrainingScenarioDefinitionTask(current, taskId, 'IOS Scenario Runtime')

      if (!guard.allowed) {
        return guard.next
      }

      const event = createModuleEvent(
        `IOS scenario task confirmed: ${label}`,
        'DONE',
        'yellow',
        targetTrainId,
      )

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...guard.next.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...guard.next.eventRows].slice(0, 4),
      }
    })
  }

  const startPlayerMode = () => {
    resetSession('PLAYER')
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
              disabled={disabledModuleTabs.has(tab.id)}
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
                    <em>
                      {scenario.kind === 'TRAIN_LAUNCH'
                        ? 'Select launch train'
                        : scenario.kind === 'TRAIN_WITHDRAWAL'
                        ? 'Select live train'
                        : `Train ${scenario.defaultTargetTrainId}`}
                    </em>
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
              title="Live IOS Scenario Control"
              copy="Arm, supervise, score, reset, and report the active training scenario while timetable traffic continues in the shared OCC session."
            >
              <div className="module-runtime-hero">
                <div>
                  <span>Active scenario</span>
                  <strong>{session.activeScenario.title}</strong>
                  <em>{activeScenarioDefinition.objective}</em>
                </div>
                <div>
                  <span>Target</span>
                  <strong>{activeScenarioTargetLabel}</strong>
                  <em>{activeScenarioDefinition.target}</em>
                </div>
                <div>
                  <span>Next IOS task</span>
                  <strong>{nextScenarioTask?.label ?? (activeScenarioIsIdle ? 'Arm a scenario' : 'Scenario checklist complete')}</strong>
                  <em>{nextScenarioTask ? `${nextScenarioTask.monitor} | ${nextScenarioTask.weight}%` : activeScenarioDefinition.duration}</em>
                </div>
              </div>

              <div className="module-runtime-controls">
                <button type="button" className="is-primary" onClick={armSelectedScenario}>Arm Selected Scenario</button>
                <button
                  type="button"
                  disabled={activeScenarioIsIdle}
                  onClick={() => setScenarioRuntimeState(session.scenarioMode === 'PAUSED' ? 'RESUME' : 'PAUSE')}
                >
                  {session.scenarioMode === 'PAUSED' ? 'Resume Scenario' : 'Pause Scenario'}
                </button>
                <button type="button" disabled={activeScenarioIsIdle} onClick={() => setScenarioRuntimeState('COMPLETE')}>Complete Scenario</button>
                <button type="button" disabled={activeScenarioIsIdle} onClick={resetScenarioRuntime}>Reset Scenario</button>
                <button type="button" className="is-danger" onClick={() => resetSession(session.trainingMode)}>
                  Reset Full Session
                </button>
              </div>
              <div className="module-info-card">
                <strong>{session.activeScenario.title} | {activeScenarioTargetLabel}</strong>
                <span>{session.scenarioNotice.text}</span>
              </div>
              <div className="module-runtime-outcome">
                <div>
                  <span>Scenario result</span>
                  <strong>{trainingScenarioScore.result}</strong>
                </div>
                <div>
                  <span>Scenario score</span>
                  <strong>{trainingScenarioScore.score}%</strong>
                </div>
                <div>
                  <span>Tasks complete</span>
                  <strong>{trainingScenarioScore.completedTasks}/{trainingScenarioScore.totalTasks}</strong>
                </div>
                <div>
                  <span>Mode</span>
                  <strong>{session.scenarioMode}</strong>
                </div>
                <div>
                  <span>Critical open</span>
                  <strong>{criticalOpenTasks}</strong>
                </div>
              </div>
              {activeScenarioDefinition.kind === 'TRAIN_LAUNCH' && !session.activeScenario.targetTrainId && (
                <div className="module-session-grid">
                  <label>
                    <span>Launch train</span>
                    <SelectField
                      ariaLabel="Launch train"
                      value={selectedLaunchTrainId}
                      options={launchTargetOptions}
                      onChange={setSelectedLaunchTrainChoice}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={launchTargetOptions.length === 0 || !selectedLaunchTrainId}
                    onClick={assignLaunchTrain}
                  >
                    Assign launch train
                  </button>
                </div>
              )}
              {!activeScenarioIsIdle && (
                <div className="module-role-flow-grid" aria-label="Instructor and trainee role flow">
                  <div>
                    <span>Instructor role</span>
                    <strong>Supervise and assess</strong>
                    <em>Arm, pause, reset, complete, review evidence, and close the report.</em>
                  </div>
                  <div>
                    <span>Trainee operator</span>
                    <strong>{nextScenarioTaskOwner}</strong>
                    <em>{nextScenarioTask ? `Perform "${nextScenarioTask.label}" from ${nextScenarioTask.monitor}.` : 'No trainee action is currently open.'}</em>
                  </div>
                  <div>
                    <span>Completion source</span>
                    <strong>{nextScenarioTask?.runtimeOnly ? 'Live OCC action' : 'Instructor review'}</strong>
                    <em>{nextScenarioTask?.runtimeOnly ? 'The checklist advances only when the trainee performs the monitor action.' : 'Instructor can confirm review-only steps.'}</em>
                  </div>
                </div>
              )}
              {!activeScenarioIsIdle && (
                <section className="module-trainee-supervision" aria-label="Trainer live trainee supervision">
                  <div className="module-live-activity-header">
                    <div>
                      <span>Trainer live supervision</span>
                      <strong>Connected trainee operator and open assignment</strong>
                    </div>
                    <em>{session.trainees.length} trainee</em>
                  </div>
                  <div className="module-trainee-supervision-list">
                    {traineeSupervisionRows.map((trainee) => (
                      <article className="module-trainee-supervision-row" key={`${trainee.email}-${trainee.role}`}>
                        <div>
                          <strong>{trainee.name}</strong>
                          <span>{trainee.role}</span>
                        </div>
                        <div>
                          <strong>{trainee.monitor}</strong>
                          <span>{trainee.status} | Joined {trainee.joinedAt}</span>
                        </div>
                        <div>
                          <strong>{trainee.assignedTask?.label ?? 'No open task'}</strong>
                          <span>{trainee.assignedTask?.monitor ?? 'Stand by'}</span>
                        </div>
                        <div>
                          <strong>{trainee.traineeEvidence?.time ?? '-'}</strong>
                          <span>{trainee.traineeEvidence?.action ?? 'No action yet'}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {!activeScenarioIsIdle && (
                <div className={`module-runtime-final-summary ${session.scenarioMode === 'COMPLETE' ? 'is-complete' : ''}`}>
                  <strong>{session.scenarioMode === 'COMPLETE' ? 'Final outcome' : 'Current outcome'}: {trainingScenarioScore.result}</strong>
                  <span>
                    Score {trainingScenarioScore.score}% | Critical {trainingScenarioScore.completedCriticalTasks}/{trainingScenarioScore.criticalTasks} | Rejected {rejectedScenarioEvidence}
                  </span>
                  {completionBlockerLabels.length > 0 && (
                    <em>Open required: {completionBlockerLabels.join(', ')}</em>
                  )}
                </div>
              )}
              {!activeScenarioIsIdle && (
                <section className="module-assessment-breakdown" aria-label="Live scenario scoring breakdown">
                  <div className="module-live-activity-header">
                    <div>
                      <span>Live scoring breakdown</span>
                      <strong>Same rubric used by live OCC actions and final report</strong>
                    </div>
                    <em>
                      Live {assessmentSummary.liveMonitorComplete}/{assessmentSummary.liveMonitorTotal}
                      {' | '}
                      Review {assessmentSummary.instructorReviewComplete}/{assessmentSummary.instructorReviewTotal}
                    </em>
                  </div>
                  <div className="module-assessment-breakdown-grid">
                    {assessmentSummary.rows.map((task) => (
                      <article className={task.complete ? 'is-complete' : 'is-open'} key={task.id}>
                        <span>{task.owner}</span>
                        <strong>{task.label}</strong>
                        <em>{task.completionSource} | {task.statusLabel} | {task.scoreContribution}/{task.weight}%</em>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {!activeScenarioIsIdle && (
                <section className="module-live-activity" aria-label="Live trainee activity">
                  <div className="module-live-activity-header">
                    <div>
                      <span>Live trainee activity</span>
                      <strong>Monitor actions and scenario evidence</strong>
                    </div>
                    <em>{liveActivityTrail.length} recent records</em>
                  </div>
                  <div className="module-evidence-category-grid">
                    <div>
                      <strong>{liveActivityGroups.trainee.length}</strong>
                      <span>Trainee actions</span>
                    </div>
                    <div>
                      <strong>{liveActivityGroups.trainer.length}</strong>
                      <span>Trainer actions</span>
                    </div>
                    <div>
                      <strong>{liveActivityGroups.system.length}</strong>
                      <span>System validations</span>
                    </div>
                    <div>
                      <strong>{liveActivityGroups.milestone.length}</strong>
                      <span>Milestones</span>
                    </div>
                  </div>
                  {liveActivityTrail.length > 0 ? (
                    <div className="module-live-activity-list">
                      {liveActivityTrail.map((activity) => (
                        <article className={`module-live-activity-row is-${activity.result} is-${activity.category}`} key={activity.id}>
                          <time>{activity.time}</time>
                          <div>
                            <strong>{activity.action}</strong>
                            <span>{activity.detail}</span>
                          </div>
                          <b>{activity.source}</b>
                          <em>{activity.categoryLabel}</em>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="module-runtime-empty">
                      <strong>No trainee actions captured yet</strong>
                      <span>Live selections, route commands, arrival/departure confirmations, and rejected actions will appear here.</span>
                    </div>
                  )}
                </section>
              )}
              <div className="module-runtime-task-board" aria-label="Scenario checklist">
                {stagedTaskResults.length > 0 ? (
                  stagedTaskResults.map((task, index) => {
                    const requiresLiveMonitorAction = task.runtimeOnly && !task.complete
                    const liveMonitorLabel = task.monitor.includes('Train Control')
                      ? 'Train Control'
                      : task.monitor.includes('Line Map')
                        ? 'Line Map'
                        : task.monitor

                    return (
                      <div
                        className={`module-runtime-task ${task.complete ? 'is-complete' : ''} ${task.critical ? 'is-critical' : ''} ${getScenarioTaskStageClass(task.stage)}`}
                        key={task.id}
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{task.label}</strong>
                          <em>{task.monitor} | Owner: {getScenarioTaskOwner(task.monitor)}</em>
                        </div>
                        <i className={`module-runtime-stage ${getScenarioTaskStageClass(task.stage)}`}>{getScenarioTaskStageLabel(task.stage)}</i>
                        <b>{task.critical ? 'Critical' : 'Standard'}</b>
                        <small>{task.weight}%</small>
                        <button
                          type="button"
                          disabled={task.complete || requiresLiveMonitorAction}
                          onClick={() => confirmRuntimeTask(task.id, task.label)}
                          title={
                            requiresLiveMonitorAction
                              ? `Live completion expected from ${getScenarioTaskOwner(task.monitor)} via ${task.monitor}.`
                              : getScenarioTaskOwner(task.monitor) === 'Instructor'
                                ? 'Instructor-owned confirmation.'
                                : `Instructor review for ${getScenarioTaskOwner(task.monitor)} action.`
                          }
                        >
                          {task.complete ? 'Done' : requiresLiveMonitorAction ? liveMonitorLabel : 'Confirm'}
                        </button>
                      </div>
                    )
                  })
                ) : (
                  <div className="module-runtime-empty">
                    <strong>No active checklist</strong>
                    <span>Select Train Launch, Train Withdrawal, or Train Door Fault, then arm the scenario.</span>
                  </div>
                )}
              </div>
              <div className="module-runtime-secondary-actions">
                <button type="button" onClick={() => onNavigate('/ios')}>Open IOS Monitor</button>
                <button type="button" onClick={() => onNavigate('/screen/line-map')}>Open Line Map</button>
                <button type="button" onClick={() => onNavigate('/report')}>Generate Report</button>
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
                  <strong>{rejectedScenarioEvidence}</strong>
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
              <div className="module-final-review-grid" aria-label="Trainer final review">
                <section className="module-final-review-card">
                  <div>
                    <span>Critical task closure</span>
                    <strong>{trainingScenarioScore.completedCriticalTasks}/{trainingScenarioScore.criticalTasks}</strong>
                  </div>
                  {reportCriticalTaskResults.length > 0 ? (
                    <div className="module-final-review-list">
                      {reportCriticalTaskResults.map((task) => (
                        <article className={task.complete ? 'is-complete' : 'is-open'} key={task.id}>
                          <b>{task.complete ? 'Complete' : 'Open'}</b>
                          <span>{task.label}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>No critical tasks configured for this scenario.</p>
                  )}
                </section>
                <section className="module-final-review-card">
                  <div>
                    <span>Rejected evidence</span>
                    <strong>{rejectedScenarioEvidence}</strong>
                  </div>
                  {rejectedEvidenceRows.length > 0 ? (
                    <div className="module-final-review-list">
                      {rejectedEvidenceRows.slice(0, 4).map((event) => (
                        <article className="is-open" key={event.id}>
                          <b>{event.time}</b>
                          <span>{event.detail}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>No rejected trainee actions captured.</p>
                  )}
                </section>
              </div>
              <div className="module-final-task-list" aria-label="Final task review">
                {stagedTaskResults.map((task, index) => (
                  <article className={task.complete ? 'is-complete' : 'is-open'} key={task.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{task.label}</strong>
                      <em>{task.monitor} | Owner: {getScenarioTaskOwner(task.monitor)}</em>
                    </div>
                    <b>{task.critical ? 'Critical' : 'Standard'}</b>
                    <i className={`module-runtime-stage ${getScenarioTaskStageClass(task.stage)}`}>{getScenarioTaskStageLabel(task.stage)}</i>
                    <small>{task.complete ? 'Complete' : 'Open'}</small>
                  </article>
                ))}
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
              title="Single Crew Operation"
              copy="Player mode supports the single trainee/operator flow used by this training module."
            >
              <div className="module-player-grid">
                <div>
                  <strong>Single Crew</strong>
                  <span>Current mode for one trainee/operator at the OCC workstation.</span>
                </div>
                <div>
                  <strong>Provisioning</strong>
                  <span>Identity, permissions, shared session joining, and role handoff are kept outside this module.</span>
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
