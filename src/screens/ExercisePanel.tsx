import { useEffect, useId, useMemo, useState } from 'react'
import SelectField from '../components/SelectField'
import { nelTimetableOptions } from '../data/nelTimetable'
import type { NelTimetableName } from '../data/nelTimetable'
import type { ExerciseSummary, TraineeAccount } from '../exerciseClient'
import { categoriseScenarioEvidence } from '../iosEvidenceTrail'
import { getScenarioTaskOwner } from '../iosScenarioRoles'
import { openOccMonitors } from '../occMonitors'
import { scenarioTemplates } from '../scenarioLibrary'
import type { SessionActor } from '../session-commands/types'
import { getOnlineMonitors, occMonitors } from '../sessionPresence'
import {
  findTrainingScenarioDefinition,
  getActiveTrainingScenarioTargetTrainId,
  getEligibleLaunchScenarioTargetOptions,
  getTrainingScenarioDefinition,
  resolveFaultText,
  scoreTrainingScenario,
} from '../trainingScenarios'
import type { TrainingMode } from '../types'
import { useOccSession } from '../useOccSession'

type ExercisePanelProps = {
  // Null without a training server: one exercise, kept in this page.
  exercise: ExerciseSummary | null
  exercises: ExerciseSummary[]
  getActor: () => SessionActor
  onAssign: (traineeId: string, sessionId: string) => void
  onClose: (sessionId: string) => void
  onOpenReport: (sessionCode: string) => void
  onSignedOut: () => void
  token: string | null
  trainees: TraineeAccount[]
}

const trainingModeOptions: Array<{ label: string; value: TrainingMode }> = [
  { label: 'Practice', value: 'PRACTICE' },
  { label: 'Assessment', value: 'ASSESSMENT' },
  { label: 'Player', value: 'PLAYER' },
]

// Scenario families the console can arm; fault families pick their SOP variant by incident.
const consoleTemplates = scenarioTemplates.filter((template) => template.trainingScenarioKind)

function formatElapsed(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))

  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function getTemplateIdForScenario(scenarioId: string) {
  const definition = getTrainingScenarioDefinition(scenarioId)

  return consoleTemplates.find((template) => template.trainingScenarioKind === definition.kind)?.id ?? consoleTemplates[0].id
}

// One exercise on the Trainer Console: its trainee, status, score, scenario,
// checklist and activity. It follows its own session live.
function ExercisePanel({
  exercise,
  exercises,
  getActor,
  onAssign,
  onClose,
  onOpenReport,
  onSignedOut,
  token,
  trainees,
}: ExercisePanelProps) {
  const { dispatch, session, synced } = useOccSession(getActor, token, onSignedOut, exercise?.id ?? null)
  const headingId = useId()
  const number = session.sessionMeta.exercise ?? exercise?.exercise ?? 1
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
  const [timeTarget, setTimeTarget] = useState('')
  const [traineeChoice, setTraineeChoice] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const score = scoreTrainingScenario(session)
  const completedTasks = score.taskResults.filter((task) => task.complete).length
  const nextTask = score.taskResults.find((task) => !task.complete)
  const targetTrainId = getActiveTrainingScenarioTargetTrainId(session)
  const needsLaunchTrain = activeDefinition.kind === 'TRAIN_LAUNCH' && !session.activeScenario.targetTrainId && !isIdle
  const startedAt = session.sessionMeta?.startedAt ? Date.parse(session.sessionMeta.startedAt) : undefined
  const isRunning = session.scenarioMode === 'RUNNING'
  const onlineMonitors = getOnlineMonitors(session, now)
  // Trainees type this code: never show the placeholder one.
  const sessionCode = synced ? session.sessionMeta.code : '----'
  const timeTargetValue = timeTarget || selectedDefinition.duration
  const timeTargetIsValid = /^\d{2}:[0-5]\d$/.test(timeTargetValue) && timeTargetValue !== '00:00'
  const elapsed = !isIdle && startedAt ? formatElapsed((now - startedAt) / 1000) : '--:--'
  const activity = categoriseScenarioEvidence(session.evidenceLog)
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
  const otherExercise = exercises.find((item) => item.id !== exercise?.id)
  const assignable = trainees.filter((trainee) => !session.trainees.some((joined) => joined.email === trainee.id))
  const assignId = assignable.some((trainee) => trainee.id === traineeChoice) ? traineeChoice : assignable[0]?.id ?? ''

  useEffect(() => {
    // Ticks the run timer each second, and monitor presence every few seconds when idle.
    const timer = window.setInterval(() => setNow(Date.now()), isRunning ? 1000 : 5000)

    return () => window.clearInterval(timer)
  }, [isRunning])

  const loadScenario = () => {
    void dispatch({
      duration: timeTargetValue,
      incident: selectedDefinition.incident,
      kind: selectedDefinition.kind,
      timetableName,
      trainingMode,
      type: 'LOAD_SCENARIO',
    })
  }

  const assignLaunchTrain = () => {
    if (launchTrainId) {
      void dispatch({ trainId: launchTrainId, type: 'ASSIGN_LAUNCH_TRAIN' })
    }
  }

  const setScenarioRuntimeState = (state: 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    void dispatch({ state, type: 'SET_SCENARIO_STATE' })
  }

  const confirmTask = (taskId: string, label: string) => {
    void dispatch({ label, taskId, type: 'CONFIRM_TASK' })
  }

  return (
    <section className="trainer-exercise" aria-labelledby={headingId}>
      <header className="trainer-console-header trainer-exercise-head">
        <h2 id={headingId}>Exercise {number}</h2>
        <dl className="trainer-console-session" aria-label="Session">
          <div>
            <dt>Session code</dt>
            <dd className="trainer-console-code">{sessionCode}</dd>
          </div>
          <div>
            <dt>Trainee</dt>
            <dd>
              {session.trainees.length > 0 ? session.trainees.map((trainee) => (
                <span className="trainer-exercise-trainee" key={trainee.email}>
                  {trainee.name}
                  {otherExercise && exercise && (
                    <button type="button" className="is-quiet" onClick={() => onAssign(trainee.email, otherExercise.id)}>
                      Move to Exercise {otherExercise.exercise}
                    </button>
                  )}
                  <button
                    type="button"
                    className="is-quiet"
                    onClick={() => void dispatch({ traineeId: trainee.email, type: 'TRAINEE_LEAVE' })}
                  >
                    Remove
                  </button>
                </span>
              )) : 'None joined yet'}
            </dd>
          </div>
          <div>
            <dt>Monitors</dt>
            <dd className={onlineMonitors.length === occMonitors.length ? 'is-ok' : 'is-warn'}>
              {onlineMonitors.length}/{occMonitors.length} open
            </dd>
          </div>
        </dl>
        <nav aria-label={`Exercise ${number} tools`}>
          {exercise && assignable.length > 0 && (
            <span className="trainer-exercise-assign">
              <SelectField
                ariaLabel={`Trainee for Exercise ${number}`}
                value={assignId}
                options={assignable.map((trainee) => ({ label: trainee.name, value: trainee.id }))}
                onChange={setTraineeChoice}
              />
              <button type="button" disabled={!assignId} onClick={() => onAssign(assignId, exercise.id)}>Assign</button>
            </span>
          )}
          <button type="button" onClick={() => openOccMonitors({ code: sessionCode, number })}>Open monitors</button>
          <button type="button" onClick={() => onOpenReport(sessionCode)}>Report</button>
          {exercise && number > 1 && (
            <button type="button" className="is-quiet" onClick={() => onClose(exercise.id)}>Close exercise</button>
          )}
        </nav>
      </header>

      <section className={`trainer-console-status is-${session.scenarioMode.toLowerCase()}`} aria-label="Scenario status">
        <div className="trainer-console-status-title">
          <span className="trainer-console-chip">{isIdle ? 'IDLE' : session.scenarioMode}</span>
          <div>
            <strong>{isIdle ? 'No scenario running' : activeDefinition.title}</strong>
            <small>
              {isIdle
                ? 'Choose a scenario below and load it.'
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
          <button type="button" disabled={isIdle} onClick={() => void dispatch({ type: 'RESET_SCENARIO' })}>
            Stop
          </button>
        </div>
      </section>

      {session.scenarioNotice.text && (
        <p className={`trainer-console-notice is-${session.scenarioNotice.tone}`} role="status">{session.scenarioNotice.text}</p>
      )}

      <div className="trainer-console-grid">
        <section className="trainer-console-panel trainer-console-scenarios" aria-labelledby={`${headingId}-scenario`}>
          <h2 id={`${headingId}-scenario`}>Scenario</h2>
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
              <span>Time target</span>
              <input
                aria-invalid={!timeTargetIsValid}
                className="trainer-console-input"
                onChange={(event) => setTimeTarget(event.target.value)}
                placeholder="mm:ss"
                value={timeTargetValue}
              />
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
          <button type="button" className="trainer-console-load" disabled={!timeTargetIsValid} onClick={loadScenario}>
            {isIdle ? 'Load scenario' : 'Restart with this scenario'}
          </button>
          {timetableName !== session.timetableName && (
            <small className="trainer-console-hint">Changing timetable resets all trains.</small>
          )}
          <button type="button" className="trainer-console-reset" onClick={() => void dispatch({ timetableName: session.timetableName, trainingMode: session.trainingMode, type: 'RESET_SESSION' })}>
            Reset whole session
          </button>
        </section>

        <section className="trainer-console-panel trainer-console-checklist" aria-labelledby={`${headingId}-checklist`}>
          <div className="trainer-console-panel-head">
            <h2 id={`${headingId}-checklist`}>Checklist</h2>
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

        <section className="trainer-console-panel trainer-console-activity" aria-labelledby={`${headingId}-activity`}>
          <div className="trainer-console-panel-head">
            <h2 id={`${headingId}-activity`}>Trainee activity</h2>
            <span>{activity.length} {activity.length === 1 ? 'event' : 'events'}</span>
          </div>
          {activity.length > 0 ? (
            <ul className="trainer-console-feed">
              {activity.map((item) => (
                <li className={`is-${item.result}`} key={item.id}>
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.action}</strong>
                    {item.actor && <small>{item.actor}</small>}
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
          <button type="button" className="trainer-console-report" disabled={isIdle} onClick={() => onOpenReport(sessionCode)}>
            Open report
          </button>
        </section>
      </div>
    </section>
  )
}

export default ExercisePanel
