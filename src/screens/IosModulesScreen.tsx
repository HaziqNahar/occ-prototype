import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import { nelTimetableOptions } from '../data/nelTimetable'
import type { NelTimetableName } from '../data/nelTimetable'
import { categoriseScenarioEvidence } from '../iosEvidenceTrail'
import { getScenarioTaskOwner } from '../iosScenarioRoles'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import { scenarioTemplates } from '../scenarioLibrary'
import { createResetSessionState, updateSessionLifecycle } from '../sessionState'
import {
  applyTrainingScenarioRuntimeEvent,
  applyTrainingScenarioTrainSelection,
  completeTrainingScenarioDefinitionTask,
  createTrainingScenarioStartSession,
  findTrainingScenarioDefinition,
  getActiveTrainingScenarioTargetTrainId,
  getEligibleLaunchScenarioTargetOptions,
  getTrainingScenarioCompletionBlockers,
  getTrainingScenarioDefinition,
  pickRandomFaultLocation,
  resetTrainingScenarioRuntime,
  resolveFaultText,
  scoreTrainingScenario,
} from '../trainingScenarios'
import type { AlarmSummaryRow, AppRoute, MonitorAlarmRow, OccSessionState, TrainingMode } from '../types'

type IosModulesScreenProps = {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}

const trainingModeOptions: Array<{ label: string; value: TrainingMode }> = [
  { label: 'Practice', value: 'PRACTICE' },
  { label: 'Assessment', value: 'ASSESSMENT' },
  { label: 'Player', value: 'PLAYER' },
]

// Scenario families the console can arm; fault families pick their SOP variant by incident.
const consoleTemplates = scenarioTemplates.filter((template) => template.trainingScenarioKind)

const monitorRoutes: Array<{ name: string; route: AppRoute }> = [
  { name: 'occ-monitor-1-alarms', route: '/screen/alarms' },
  { name: 'occ-monitor-2-line-map', route: '/screen/line-map' },
  { name: 'occ-monitor-3-timetable', route: '/screen/timetable' },
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

function formatElapsed(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))

  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function getTemplateIdForScenario(scenarioId: string) {
  const definition = getTrainingScenarioDefinition(scenarioId)

  return consoleTemplates.find((template) => template.trainingScenarioKind === definition.kind)?.id ?? consoleTemplates[0].id
}

function IosModulesScreen({ onNavigate, resetSession, session, updateSession }: IosModulesScreenProps) {
  const activeDefinition = getTrainingScenarioDefinition(session.activeScenario.id)
  const isIdle = activeDefinition.id === 'idle'
  const [templateId, setTemplateId] = useState(() => getTemplateIdForScenario(session.activeScenario.id))
  const template = consoleTemplates.find((item) => item.id === templateId) ?? consoleTemplates[0]
  const [incident, setIncident] = useState(() => (
    isIdle ? template.incidents[0] : session.activeScenario.incident
  ))
  const selectedIncident = template.incidents.includes(incident) ? incident : template.incidents[0]
  const selectedDefinition = findTrainingScenarioDefinition(template.trainingScenarioKind!, selectedIncident)
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(session.trainingMode)
  const [timetableName, setTimetableName] = useState<NelTimetableName>(session.timetableName)
  const [launchTrainChoice, setLaunchTrainChoice] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const score = scoreTrainingScenario(session)
  const completedTasks = score.taskResults.filter((task) => task.complete).length
  const nextTask = score.taskResults.find((task) => !task.complete)
  const targetTrainId = getActiveTrainingScenarioTargetTrainId(session)
  const needsLaunchTrain = activeDefinition.kind === 'TRAIN_LAUNCH' && !session.activeScenario.targetTrainId && !isIdle
  const startedAt = session.sessionMeta?.startedAt ? Date.parse(session.sessionMeta.startedAt) : undefined
  const isRunning = session.scenarioMode === 'RUNNING'
  const elapsed = !isIdle && startedAt ? formatElapsed((now - startedAt) / 1000) : '--:--'
  const activity = categoriseScenarioEvidence(session.evidenceLog)
    // Internal bookkeeping rows ("Scenario task selectTrain") repeat the action above them.
    .filter((evidence) => !evidence.action.startsWith('Scenario task '))
    .filter((evidence) => evidence.category !== 'trainer' || evidence.result === 'rejected')
    .slice(0, 14)
  const launchTrainOptions = useMemo(() => (
    getEligibleLaunchScenarioTargetOptions(session).map((option) => ({
      label: `Train ${option.trainId} · Sch ${option.scheduleNumber} · SKG → ${option.destinationPoint}`,
      value: option.trainId,
    }))
  ), [session])
  const launchTrainId = launchTrainOptions.some((option) => option.value === launchTrainChoice)
    ? launchTrainChoice
    : launchTrainOptions[0]?.value ?? ''

  useEffect(() => {
    if (!isRunning) {
      return undefined
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [isRunning])

  const loadScenario = () => {
    updateSession((loaded) => {
      // A different timetable changes the train roster, so start from a clean session.
      const base = loaded.timetableName === timetableName
        ? loaded
        : createResetSessionState(trainingMode, Date.now(), (loaded.scenarioRevision ?? 0) + 1, timetableName)

      // Each run puts the fault on a different train, station and bound.
      return createTrainingScenarioStartSession(
        { ...base, trainingMode },
        selectedDefinition.kind,
        selectedDefinition.incident,
        { faultLocation: pickRandomFaultLocation(base) },
      )
    })
  }

  const assignLaunchTrain = () => {
    if (!launchTrainId) {
      return
    }

    updateSession((current) => applyTrainingScenarioTrainSelection(current, 'IOS Scenario Runtime', launchTrainId).next)
  }

  const setScenarioRuntimeState = (action: 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    updateSession((current) => {
      const definition = getTrainingScenarioDefinition(current.activeScenario.id)
      const currentTargetTrainId = getActiveTrainingScenarioTargetTrainId(current)
      const nextMode = action === 'PAUSE' ? 'PAUSED' as const : action === 'RESUME' ? 'RUNNING' as const : 'COMPLETE' as const
      const event = createModuleEvent(
        `IOS scenario ${action.toLowerCase()}: ${definition.title}`,
        nextMode,
        action === 'PAUSE' ? 'orange' : 'yellow',
        currentTargetTrainId,
      )

      if (action === 'COMPLETE') {
        const openRequiredTasks = getTrainingScenarioCompletionBlockers(current)

        if (openRequiredTasks.length > 0) {
          return {
            ...current,
            scenarioNotice: {
              text: `Cannot complete yet. Open: ${openRequiredTasks.map((task) => task.label).join(', ')}.`,
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

      const noticeText = `${definition.title} ${action === 'PAUSE' ? 'paused' : 'resumed'} by the trainer.`

      return {
        ...current,
        alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
        evidenceLog: appendScenarioEvidence(
          current.evidenceLog,
          createScenarioEvidence('IOS Scenario Runtime', `Scenario ${action.toLowerCase()}`, 'info', noticeText),
        ),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        scenarioMode: nextMode,
        scenarioNotice: { text: noticeText, tone: 'info' as const },
        sessionMeta: updateSessionLifecycle(current.sessionMeta, nextMode),
      }
    })
  }

  const confirmTask = (taskId: string, label: string) => {
    updateSession((current) => {
      const guard = completeTrainingScenarioDefinitionTask(current, taskId, 'IOS Scenario Runtime')

      if (!guard.allowed) {
        return guard.next
      }

      const event = createModuleEvent(
        `IOS scenario task confirmed: ${label}`,
        'DONE',
        'yellow',
        getActiveTrainingScenarioTargetTrainId(current),
      )

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...guard.next.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...guard.next.eventRows].slice(0, 4),
      }
    })
  }

  const openMonitors = () => {
    monitorRoutes.forEach((monitor) => window.open(monitor.route, monitor.name))
  }

  return (
    <main
      className="trainer-console"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="trainer-console-header">
        <div className="trainer-console-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Instructor station</p>
            <h1>Trainer Console</h1>
          </div>
        </div>
        <nav aria-label="Trainer tools">
          <button type="button" onClick={openMonitors}>Open monitors</button>
          <button type="button" onClick={() => onNavigate('/ios')}>IOS</button>
          <button type="button" onClick={() => onNavigate('/report')}>Report</button>
          <button type="button" className="is-quiet" onClick={() => onNavigate('/')}>Exit</button>
        </nav>
      </header>

      <section className={`trainer-console-status is-${session.scenarioMode.toLowerCase()}`} aria-label="Scenario status">
        <div className="trainer-console-status-title">
          <span className="trainer-console-chip">{isIdle ? 'IDLE' : session.scenarioMode}</span>
          <div>
            <strong>{isIdle ? 'No scenario running' : activeDefinition.title}</strong>
            <small>
              {isIdle
                ? 'Choose a scenario on the left and load it.'
                : `${session.trainingMode.toLowerCase()} · ${targetTrainId ? `Train ${targetTrainId}` : 'train not chosen yet'} · ${session.timetableName.replace('NEL_OTES_', '')}`}
            </small>
          </div>
        </div>
        <dl className="trainer-console-figures">
          <div><dt>Time</dt><dd>{elapsed}<em> / {isIdle ? '--:--' : session.activeScenario.duration}</em></dd></div>
          <div><dt>Tasks</dt><dd>{completedTasks}<em> / {score.totalTasks}</em></dd></div>
          <div><dt>Score</dt><dd>{score.score}%</dd></div>
          <div><dt>Wrong actions</dt><dd className={score.rejectedActions > 0 ? 'is-bad' : undefined}>{score.rejectedActions}</dd></div>
        </dl>
        <div className="trainer-console-controls">
          <button
            type="button"
            disabled={isIdle || session.scenarioMode === 'COMPLETE'}
            onClick={() => setScenarioRuntimeState(session.scenarioMode === 'PAUSED' ? 'RESUME' : 'PAUSE')}
          >
            {session.scenarioMode === 'PAUSED' ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            className="is-primary"
            disabled={isIdle || session.scenarioMode === 'COMPLETE'}
            onClick={() => setScenarioRuntimeState('COMPLETE')}
          >
            Complete
          </button>
          <button type="button" disabled={isIdle} onClick={() => updateSession((current) => resetTrainingScenarioRuntime(current))}>
            Stop
          </button>
        </div>
      </section>

      {session.scenarioNotice.text && (
        <p className={`trainer-console-notice is-${session.scenarioNotice.tone}`} role="status">{session.scenarioNotice.text}</p>
      )}

      <div className="trainer-console-grid">
        <section className="trainer-console-panel trainer-console-scenarios" aria-labelledby="console-scenario-heading">
          <h2 id="console-scenario-heading">Scenario</h2>
          <div className="trainer-console-scenario-list" role="radiogroup" aria-label="Scenario">
            {consoleTemplates.map((item) => (
              <button
                aria-checked={item.id === template.id}
                className={item.id === template.id ? 'is-selected' : undefined}
                key={item.id}
                onClick={() => setTemplateId(item.id)}
                role="radio"
                type="button"
              >
                <strong>{item.title}</strong>
                {item.incidents.length > 1 && <small>{item.incidents.length} incidents</small>}
              </button>
            ))}
          </div>
          {template.incidents.length > 1 && (
            <label className="trainer-console-field">
              <span>Incident</span>
              <SelectField
                ariaLabel="Incident"
                value={selectedIncident}
                options={template.incidents.map((value) => ({ label: value, value }))}
                onChange={setIncident}
              />
            </label>
          )}
          <p className="trainer-console-objective">{resolveFaultText(selectedDefinition.objective)}</p>
          <div className="trainer-console-field-row">
            <label className="trainer-console-field">
              <span>Mode</span>
              <SelectField ariaLabel="Training mode" value={trainingMode} options={trainingModeOptions} onChange={setTrainingMode} />
            </label>
            <label className="trainer-console-field">
              <span>Timetable</span>
              <SelectField
                ariaLabel="Timetable"
                value={timetableName}
                options={nelTimetableOptions.map((option) => ({ label: option.label, value: option.value }))}
                onChange={setTimetableName}
              />
            </label>
          </div>
          <button type="button" className="trainer-console-load" onClick={loadScenario}>
            {isIdle ? 'Load scenario' : 'Restart with this scenario'}
          </button>
          {timetableName !== session.timetableName && (
            <small className="trainer-console-hint">Changing timetable resets all trains.</small>
          )}
          <button type="button" className="trainer-console-reset" onClick={() => resetSession(session.trainingMode)}>
            Reset whole session
          </button>
        </section>

        <section className="trainer-console-panel trainer-console-checklist" aria-labelledby="console-checklist-heading">
          <div className="trainer-console-panel-head">
            <h2 id="console-checklist-heading">Checklist</h2>
            {!isIdle && <span>{completedTasks} of {score.totalTasks}</span>}
          </div>
          {!isIdle && (
            <div className="trainer-console-progress" aria-hidden="true">
              <span style={{ width: `${score.totalTasks ? (completedTasks / score.totalTasks) * 100 : 0}%` }} />
            </div>
          )}
          {needsLaunchTrain && (
            <div className="trainer-console-launch">
              <SelectField ariaLabel="Launch train" value={launchTrainId} options={launchTrainOptions} onChange={setLaunchTrainChoice} />
              <button type="button" disabled={!launchTrainId} onClick={assignLaunchTrain}>Assign train</button>
            </div>
          )}
          {isIdle ? (
            <div className="trainer-console-empty">
              <strong>No checklist yet</strong>
              <span>Load a scenario to see its SOP steps here.</span>
            </div>
          ) : (
            <ol className="trainer-console-tasks">
              {score.taskResults.map((task) => {
                const isNext = task.id === nextTask?.id && session.scenarioMode !== 'COMPLETE'
                const isLive = Boolean(task.runtimeOnly || task.commsMessageIds?.length || task.mappedTaskId)
                const owner = getScenarioTaskOwner(task.monitor)
                const canConfirm = !task.complete && !isLive && owner === 'Instructor'

                return (
                  <li
                    className={`${task.complete ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`}
                    key={task.id}
                  >
                    <i aria-hidden="true">{task.complete ? '✓' : isNext ? '▶' : ''}</i>
                    <div>
                      <strong>
                        {task.label}
                        {task.critical && <b title="Critical SOP step"> ★</b>}
                      </strong>
                      <small>{task.monitor}</small>
                    </div>
                    {canConfirm && (
                      <button type="button" onClick={() => confirmTask(task.id, task.label)}>Confirm</button>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section className="trainer-console-panel trainer-console-activity" aria-labelledby="console-activity-heading">
          <div className="trainer-console-panel-head">
            <h2 id="console-activity-heading">Trainee activity</h2>
            <span>{session.trainees.map((trainee) => trainee.name).join(', ') || 'No trainee joined'}</span>
          </div>
          {activity.length > 0 ? (
            <ul className="trainer-console-feed">
              {activity.map((item) => (
                <li className={`is-${item.result}`} key={item.id}>
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.action}</strong>
                    {item.detail && <small>{item.detail}</small>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="trainer-console-empty">
              <strong>Nothing yet</strong>
              <span>Trainee actions on the monitors appear here as they happen.</span>
            </div>
          )}
          <button type="button" className="trainer-console-report" disabled={isIdle} onClick={() => onNavigate('/report')}>
            Open report
          </button>
        </section>
      </div>
    </main>
  )
}

export default IosModulesScreen
