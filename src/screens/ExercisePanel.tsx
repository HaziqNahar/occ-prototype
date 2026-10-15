import { useEffect, useId, useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import type { ConfirmRequest } from '../components/ConfirmDialog'
import SelectField from '../components/SelectField'
import { nelTimetableOptions } from '../data/nelTimetable'
import type { NelTimetableName } from '../data/nelTimetable'
import type { ExerciseSummary, TraineeAccount } from '../exerciseClient'
import { categoriseScenarioEvidence } from '../iosEvidenceTrail'
import { getScenarioTaskOwner, getScenarioTaskPlaceTag } from '../iosScenarioRoles'
import { openOccMonitors } from '../occMonitors'
import { scenarioTemplates } from '../scenarioLibrary'
import { isRunActive, NO_TRAINEE_REASON, TRAINER_END_RUN_REASON } from '../session-commands/runGuards'
import type { SessionActor, SessionCommand } from '../session-commands/types'
import { getOnlineMonitors, occMonitors } from '../sessionPresence'
import {
  findTrainingScenarioDefinition,
  getActiveTrainingScenarioTargetTrainId,
  getEligibleLaunchScenarioTargetOptions,
  getTrainingScenarioArmNotice,
  getTrainingScenarioDefinition,
  resolveFaultText,
  scoreTrainingScenario,
} from '../trainingScenarios'
import { areTrainingAidsOn } from '../trainingAids'
import type { TrainingMode } from '../types'
import { useOccSession } from '../useOccSession'

type ExercisePanelProps = {
  // Null without a training server: one exercise, kept in this page.
  exercise: ExerciseSummary | null
  exercises: ExerciseSummary[]
  getActor: () => SessionActor
  // Hidden behind another exercise's tab: it keeps following its session.
  hidden?: boolean
  onAssign: (traineeId: string, sessionId: string) => void
  // Whether this exercise is waiting on the trainer (a step to confirm, a run to complete).
  onAttention?: (needsTrainer: boolean) => void
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

// One line under each scenario card: what it trains.
const scenarioBlurbs: Record<string, string> = {
  'door-fault': 'Door failure, EHS, cover open',
  'psd-fault': 'Platform screen door faults',
  'service-disruption': 'Disruption calls and notices',
  'train-launch': 'Depot into mainline service',
  'train-withdrawal': 'Mainline train back to depot',
  'unscheduled-withdrawal': 'CC-ordered withdrawal at a station',
}

// Small line icons for the scenario cards (24 × 24, stroked).
const scenarioIconPaths: Record<string, string> = {
  'door-fault': 'M5 3h14v18H5zM12 3v18M9 12h1M14 12h1',
  'psd-fault': 'M3 4h18M5 4v16M19 4v16M9 8v12M15 8v12M12 13l-2-2m2 2l2-2',
  'service-disruption': 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  'train-launch': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  'train-withdrawal': 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  'unscheduled-withdrawal': 'M12 3l10 18H2zM12 10v5M12 18v.5',
}

function ScenarioIcon({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" className="tc-scenario-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
      <path d={scenarioIconPaths[id] ?? 'M4 12h16M12 4v16'} />
    </svg>
  )
}

// Copies text, also on a LAN page (plain http), where the clipboard API is off.
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const field = document.createElement('textarea')

    field.value = text
    document.body.append(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
}

// Upcoming steps shown under the current one; the rest fold behind "+N more".
const UPCOMING_SHOWN = 2

// Scenario families the console can arm; fault families pick their SOP variant by incident.
const consoleTemplates = scenarioTemplates.filter((template) => template.trainingScenarioKind)

// mm:ss, or h:mm:ss once a run passes an hour (a run left open overnight
// would otherwise read 1378:49).
function formatElapsed(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const pad = (value: number) => String(value).padStart(2, '0')
  const hours = Math.floor(seconds / 3600)

  return hours > 0
    ? `${hours}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
    : `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}

function durationSeconds(duration: string) {
  const [minutes, seconds] = duration.split(':').map(Number)

  return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : 0
}

function getTemplateIdForScenario(scenarioId: string) {
  const definition = getTrainingScenarioDefinition(scenarioId)

  return consoleTemplates.find((template) => template.trainingScenarioKind === definition.kind)?.id ?? consoleTemplates[0].id
}

// One exercise on the Trainer Console, built to read at a glance: who and
// where, the run's numbers, the step the trainee is on, and what just
// happened. Choosing a scenario is a separate "New run" card.
function ExercisePanel({
  exercise,
  exercises,
  getActor,
  hidden = false,
  onAssign,
  onAttention,
  onClose,
  onOpenReport,
  onSignedOut,
  token,
  trainees,
}: ExercisePanelProps) {
  const { dispatch: dispatchCommand, session, synced } = useOccSession(getActor, token, onSignedOut, exercise?.id ?? null)
  const [commandProblem, setCommandProblem] = useState('')
  // Say when the server refused a command or could not be reached, rather than
  // leaving the trainer to wonder why nothing happened.
  const dispatch = (command: SessionCommand) => dispatchCommand(command).then((outcome) => {
    setCommandProblem(outcome.accepted && !outcome.reason ? '' : outcome.reason ?? 'The training server did not accept that.')

    return outcome
  })
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
  const [setupOpen, setSetupOpen] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  const score = scoreTrainingScenario(session)
  const completedTasks = score.taskResults.filter((task) => task.complete).length
  const isComplete = session.scenarioMode === 'COMPLETE'
  const targetTrainId = getActiveTrainingScenarioTargetTrainId(session)
  const needsLaunchTrain = activeDefinition.kind === 'TRAIN_LAUNCH' && !session.activeScenario.targetTrainId && !isIdle
  const startedAt = session.sessionMeta?.startedAt ? Date.parse(session.sessionMeta.startedAt) : undefined
  const isRunning = session.scenarioMode === 'RUNNING'
  const aidsOn = areTrainingAidsOn(session)
  const notice = session.scenarioNotice
  const onlineMonitors = getOnlineMonitors(session, now)
  // Trainees type this code: never show the placeholder one.
  const sessionCode = synced ? session.sessionMeta.code : '----'
  const [copied, setCopied] = useState(false)
  const copyCode = async () => {
    await copyText(sessionCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  // The run's guardrails (the server enforces them too; see runGuards.ts).
  const runActive = isRunActive(session)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const closeConfirm = () => setConfirmRequest(null)
  const keptAsNotCompleted = session.trainees.length > 0 ? ' It is kept in History as not completed.' : ''
  const needsTrainee = trainingMode !== 'PLAYER' && session.trainees.length === 0
  const lineMapOpen = onlineMonitors.some((monitor) => monitor.role === 'LINE_MAP')
  const timeTargetValue = timeTarget || selectedDefinition.duration
  const timeTargetIsValid = /^\d{2}:[0-5]\d$/.test(timeTargetValue) && timeTargetValue !== '00:00'
  // A completed run's time stops at completion.
  const completedAt = isComplete && session.sessionMeta?.completedAt ? Date.parse(session.sessionMeta.completedAt) : undefined
  const elapsedSeconds = !isIdle && startedAt ? ((completedAt ?? now) - startedAt) / 1000 : 0
  const elapsed = !isIdle && startedAt ? formatElapsed(elapsedSeconds) : '--:--'
  const overTarget = !isIdle && Boolean(startedAt) && elapsedSeconds > durationSeconds(session.activeScenario.duration)
  const brief = activeDefinition.armNotice
    ? getTrainingScenarioArmNotice(activeDefinition, session.activeScenario.faultLocation
      ? { ...session.activeScenario.faultLocation, trainId: targetTrainId }
      : undefined)
    : ''
  const subtitle = [
    session.activeScenario.incident.toLowerCase() !== activeDefinition.title.toLowerCase() ? session.activeScenario.incident : '',
    targetTrainId ? `Train ${targetTrainId}` : activeDefinition.noTargetTrain ? 'line-wide' : 'train not chosen yet',
    session.trainingMode.toLowerCase(),
  ].filter(Boolean).join(' · ')

  // Steps: the one the trainee is on, a couple ahead, and every step the
  // trainer has to confirm; finished steps fold into a count.
  const isTrainerStep = (task: (typeof score.taskResults)[number]) => getScenarioTaskOwner(task.monitor) === 'Instructor'
  const canConfirm = (task: (typeof score.taskResults)[number]) => (
    !task.complete && isTrainerStep(task) && !(task.runtimeOnly || task.commsMessageIds?.length || task.mappedTaskId)
  )
  const doneSteps = score.taskResults.filter((task) => task.complete)
  const openSteps = score.taskResults.filter((task) => !task.complete)
  const currentStep = isComplete ? undefined : openSteps[0]
  const upcoming = openSteps.slice(1)
  const upcomingShown = showAllUpcoming || isComplete
    ? upcoming
    : upcoming.filter((task, index) => index < UPCOMING_SHOWN || canConfirm(task))
  const hiddenUpcoming = upcoming.length - upcomingShown.length
  const waitingOnTrainer = !isIdle && !isComplete && (
    needsLaunchTrain
    || openSteps.some(canConfirm)
    || (openSteps.length > 0 && openSteps.every((task) => task.mappedTaskId === 'completeScenario'))
  )

  // One line per thing that happened. Step-completion records repeat the action
  // that completed the step (the steps already show it), so they are left out.
  const stepLabels = new Set(activeDefinition.tasks.map((task) => task.label))
  const traineeNames = new Set(session.trainees.map((trainee) => trainee.name))
  const activity = categoriseScenarioEvidence(session.evidenceLog)
    .filter((evidence) => evidence.category !== 'trainer' || evidence.result === 'rejected')
    .filter((evidence) => evidence.result === 'rejected' || !stepLabels.has(evidence.action))
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
  // A trainee is in one exercise at a time: assigning one from the other
  // exercise moves them, so the list says where they are and lists them last.
  const exerciseOf = (traineeId: string) => exercises.find((item) => item.id !== exercise?.id && item.trainees.some((joined) => joined.id === traineeId))
  const assignable = trainees
    .filter((trainee) => !session.trainees.some((joined) => joined.email === trainee.id))
    .map((trainee) => ({ ...trainee, elsewhere: exerciseOf(trainee.id)?.exercise }))
    .sort((left, right) => Number(Boolean(left.elsewhere)) - Number(Boolean(right.elsewhere)))
  const assignId = assignable.some((trainee) => trainee.id === traineeChoice) ? traineeChoice : assignable[0]?.id ?? ''
  const assignMoves = Boolean(assignable.find((trainee) => trainee.id === assignId)?.elsewhere)
  const assignFromActiveRun = assignMoves && isRunActive(exerciseOf(assignId) ?? { scenarioMode: 'IDLE' })

  useEffect(() => {
    // Ticks the run timer each second, and monitor presence every few seconds when idle.
    const timer = window.setInterval(() => setNow(Date.now()), isRunning ? 1000 : 5000)

    return () => window.clearInterval(timer)
  }, [isRunning])

  useEffect(() => {
    onAttention?.(waitingOnTrainer)
  }, [onAttention, waitingOnTrainer])

  const loadScenario = () => {
    setSetupOpen(false)
    setShowDone(false)
    setShowAllUpcoming(false)
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

  const renderStep = (task: (typeof score.taskResults)[number], isNow = false) => (
    <li className={`${task.complete ? 'is-done' : ''} ${isNow ? 'is-next' : ''}`} key={task.id}>
      <i aria-hidden="true">{task.complete ? '✓' : isNow ? '▶' : ''}</i>
      <strong>
        {isNow && <small className="tc-now-label">Now</small>}
        {task.label}
        {task.critical && <b title="Critical SOP step"> ★</b>}
      </strong>
      <small
        className={`trainer-console-task-tag ${isTrainerStep(task) ? 'is-trainer' : ''}`}
        title={isTrainerStep(task)
          ? task.mappedTaskId === 'completeScenario' ? 'Click Complete when the trainee is done' : 'Click Confirm when the trainee has done it'
          : task.monitor}
      >
        {isTrainerStep(task) ? 'Trainer' : getScenarioTaskPlaceTag(task.monitor)}
      </small>
      {canConfirm(task) && (
        <button type="button" onClick={() => confirmTask(task.id, task.label)}>Confirm</button>
      )}
    </li>
  )

  return (
    <section className="trainer-exercise" aria-labelledby={headingId} hidden={hidden}>
      <h2 className="tc-sr-only" id={headingId}>Exercise {number}</h2>

      <header className="tc-exercise-bar">
        <dl className="tc-facts" aria-label="Session">
          <div>
            <dt>Trainee</dt>
            <dd>
              {session.trainees.length > 0 ? session.trainees.map((trainee) => (
                <span className="trainer-exercise-trainee" key={trainee.email}>
                  <span className="trainer-exercise-trainee-name">{trainee.name}</span>
                  <span className="trainer-exercise-trainee-actions">
                    {otherExercise && exercise && (
                      <button
                        type="button"
                        className="is-quiet"
                        disabled={runActive}
                        onClick={() => onAssign(trainee.email, otherExercise.id)}
                        title={runActive ? TRAINER_END_RUN_REASON : undefined}
                      >
                        Move to Exercise {otherExercise.exercise}
                      </button>
                    )}
                    <button
                      type="button"
                      className="is-quiet"
                      disabled={runActive}
                      onClick={() => void dispatch({ traineeId: trainee.email, type: 'TRAINEE_LEAVE' })}
                      title={runActive ? TRAINER_END_RUN_REASON : undefined}
                    >
                      Remove
                    </button>
                  </span>
                </span>
              )) : <span className="tc-muted">Waiting for a trainee</span>}
            </dd>
          </div>
          <div>
            <dt>Code</dt>
            <dd className="tc-code">
              <span className="trainer-console-code">{sessionCode}</span>
              <button type="button" className="tc-copy" aria-label="Copy session code" onClick={() => void copyCode()}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </dd>
          </div>
          <div>
            <dt>Monitors</dt>
            <dd className={onlineMonitors.length === occMonitors.length ? 'is-ok' : 'is-warn'}>
              {onlineMonitors.length}/{occMonitors.length}
            </dd>
          </div>
        </dl>
        <nav aria-label={`Exercise ${number} tools`}>
          {exercise && assignable.length > 0 && (
            <span className="trainer-exercise-assign">
              <SelectField
                ariaLabel={`Trainee for Exercise ${number}`}
                value={assignId}
                options={assignable.map((trainee) => ({
                  label: trainee.elsewhere ? `${trainee.name} (in Exercise ${trainee.elsewhere})` : trainee.name,
                  value: trainee.id,
                }))}
                onChange={setTraineeChoice}
              />
              <button
                type="button"
                disabled={!assignId || assignFromActiveRun}
                onClick={() => onAssign(assignId, exercise.id)}
                title={assignFromActiveRun ? `Their run in Exercise ${exerciseOf(assignId)?.exercise} is still going. ${TRAINER_END_RUN_REASON}` : undefined}
              >
                {assignMoves ? 'Move here' : 'Assign'}
              </button>
            </span>
          )}
          <button type="button" onClick={() => setCommandProblem(openOccMonitors({ code: sessionCode, number }))}>Open monitors</button>
          <button type="button" onClick={() => onOpenReport(sessionCode)}>Report</button>
          {exercise && number > 1 && (
            <button type="button" className="is-quiet" onClick={() => onClose(exercise.id)}>Close exercise</button>
          )}
        </nav>
      </header>

      {commandProblem && (
        <p className="trainer-console-notice is-warning" role="alert">{commandProblem}</p>
      )}
      {notice.text && notice.tone === 'warning' && (
        <p className="trainer-console-notice is-warning" role="status">{notice.text}</p>
      )}

      {runActive && session.trainees.length > 0 && !lineMapOpen && (
        <p className="trainer-console-notice is-warning" role="status">Line Map closed: the trains have stopped. Ask the trainee to click <strong>Open my monitors</strong>.</p>
      )}

      <section className={`tc-run trainer-console-status is-${session.scenarioMode.toLowerCase()}`} aria-label="Scenario status">
        <div className="trainer-console-status-title">
          <span className="trainer-console-chip">{isIdle ? 'IDLE' : session.scenarioMode}</span>
          <div>
            <strong>{isIdle ? 'No scenario running' : activeDefinition.title}</strong>
            <small>{isIdle ? 'Choose a scenario below.' : subtitle}</small>
            {brief && <small className="tc-brief">{brief}</small>}
          </div>
        </div>
        {!isIdle && (
          <dl className="trainer-console-figures">
            <div>
              <dt>Time</dt>
              <dd className={overTarget ? 'is-over' : undefined} title={overTarget ? 'Past the time target' : undefined}>
                {elapsed}<em> / {session.activeScenario.duration}</em>
              </dd>
            </div>
            <div><dt>Steps</dt><dd>{completedTasks}<em> / {score.totalTasks}</em></dd></div>
            <div><dt>Score</dt><dd>{score.score}%</dd></div>
            <div><dt>Wrong</dt><dd className={score.rejectedActions > 0 ? 'is-bad' : undefined}>{score.rejectedActions}</dd></div>
          </dl>
        )}
        {!isIdle && (
          <div className="trainer-console-controls">
            <button
              type="button"
              disabled={isComplete}
              onClick={() => setScenarioRuntimeState(session.scenarioMode === 'PAUSED' ? 'RESUME' : 'PAUSE')}
            >
              {session.scenarioMode === 'PAUSED' ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="is-primary" disabled={isComplete} onClick={() => setScenarioRuntimeState('COMPLETE')}>
              Complete
            </button>
            <button
              type="button"
              onClick={() => (runActive
                ? setConfirmRequest({
                    confirmLabel: 'Stop run',
                    onConfirm: () => void dispatch({ type: 'RESET_SCENARIO' }),
                    text: `The run ends now.${keptAsNotCompleted}`,
                    title: 'Stop the run?',
                  })
                : void dispatch({ type: 'RESET_SCENARIO' }))}
            >
              Stop
            </button>
            <button type="button" aria-expanded={setupOpen} onClick={() => setSetupOpen((open) => !open)}>New run</button>
            <button
              aria-pressed={aidsOn}
              className="trainer-console-aids"
              disabled={session.trainingMode !== 'PRACTICE'}
              onClick={() => void dispatch({ enabled: !session.trainingAids, type: 'SET_TRAINING_AIDS' })}
              title={session.trainingMode === 'PRACTICE'
                ? 'Next-step hints on the trainee monitors'
                : 'Training aids are always off outside Practice'}
              type="button"
            >
              Aids {aidsOn ? 'on' : 'off'}
            </button>
          </div>
        )}
        {!isIdle && (
          <div className="trainer-console-progress" aria-hidden="true">
            <span style={{ width: `${score.totalTasks ? (completedTasks / score.totalTasks) * 100 : 0}%` }} />
          </div>
        )}
      </section>

      {(isIdle || setupOpen) && (
        <section className="trainer-console-panel tc-setup trainer-console-scenarios" aria-labelledby={`${headingId}-scenario`}>
          <div className="trainer-console-panel-head">
            <h2 id={`${headingId}-scenario`}>{isIdle ? 'Choose a scenario' : 'New run'}</h2>
            {!isIdle && <button type="button" className="trainer-console-picker-toggle" onClick={() => setSetupOpen(false)}>Cancel</button>}
          </div>
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
                <ScenarioIcon id={item.id} />
                <span className="tc-scenario-text">
                  <strong>{item.title}</strong>
                  <small>
                    {scenarioBlurbs[item.id] ?? item.target}
                    {item.incidents.length > 1 && ` · ${item.incidents.length} incidents`}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="tc-setup-fields">
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
            <div className="trainer-console-field">
              <span>Mode</span>
              <div className="segmented is-inline" role="radiogroup" aria-label="Training mode">
                {trainingModeOptions.map((option) => (
                  <button
                    aria-checked={trainingMode === option.value}
                    className={trainingMode === option.value ? 'is-active' : undefined}
                    key={option.value}
                    onClick={() => setTrainingMode(option.value)}
                    role="radio"
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
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
          <p className="trainer-console-objective">{resolveFaultText(selectedDefinition.objective)}</p>
          <div className="tc-setup-actions">
            <button
              type="button"
              className="trainer-console-load"
              disabled={!timeTargetIsValid || needsTrainee}
              onClick={() => (runActive
                ? setConfirmRequest({
                    confirmLabel: 'Start new run',
                    onConfirm: loadScenario,
                    text: `The current run ends.${keptAsNotCompleted}`,
                    title: 'Start a new run?',
                  })
                : loadScenario())}
            >
              {isIdle ? 'Load scenario' : 'Restart with this scenario'}
            </button>
            {needsTrainee ? (
              <small className="trainer-console-hint is-blocking">{NO_TRAINEE_REASON}</small>
            ) : trainingMode !== 'PLAYER' && onlineMonitors.length < occMonitors.length && (
              <small className="trainer-console-hint">
                {onlineMonitors.length} of {occMonitors.length} monitors open{lineMapOpen ? '.' : ': the Line Map must be open for trains to run.'}
              </small>
            )}
            {timetableName !== session.timetableName && (
              <small className="trainer-console-hint">Changing timetable resets all trains.</small>
            )}
            <button
              type="button"
              className="trainer-console-reset"
              onClick={() => setConfirmRequest({
                confirmLabel: 'Reset session',
                onConfirm: () => void dispatch({ timetableName: session.timetableName, trainingMode: session.trainingMode, type: 'RESET_SESSION' }),
                text: `${runActive ? `The current run ends.${keptAsNotCompleted} ` : ''}The exercise gets a new code, and the trainee has to join again.`,
                title: 'Reset the whole session?',
              })}
            >
              Reset whole session
            </button>
          </div>
        </section>
      )}

      {!isIdle && (
        <div className="tc-run-grid">
          <section className="trainer-console-panel trainer-console-checklist" aria-labelledby={`${headingId}-checklist`}>
            <div className="trainer-console-panel-head">
              <h2 id={`${headingId}-checklist`}>Steps</h2>
              <span>{completedTasks} of {score.totalTasks}</span>
            </div>
            {needsLaunchTrain && (
              <div className="trainer-console-launch">
                <SelectField ariaLabel="Launch train" value={launchTrainId} options={launchTrainOptions} onChange={setLaunchTrainChoice} />
                <button type="button" disabled={!launchTrainId} onClick={assignLaunchTrain}>Assign train</button>
              </div>
            )}
            {doneSteps.length > 0 && !isComplete && (
              <button type="button" className="tc-fold" aria-expanded={showDone} onClick={() => setShowDone((show) => !show)}>
                ✓ {doneSteps.length} {doneSteps.length === 1 ? 'step' : 'steps'} done
              </button>
            )}
            <ol className="trainer-console-tasks">
              {(showDone || isComplete) && doneSteps.map((task) => renderStep(task))}
              {currentStep && renderStep(currentStep, true)}
              {upcomingShown.map((task) => renderStep(task))}
            </ol>
            {hiddenUpcoming > 0 && (
              <button type="button" className="tc-fold" onClick={() => setShowAllUpcoming(true)}>+{hiddenUpcoming} more</button>
            )}
          </section>

          <section className="trainer-console-panel trainer-console-activity" aria-labelledby={`${headingId}-activity`}>
            <div className="trainer-console-panel-head">
              <h2 id={`${headingId}-activity`}>Live</h2>
            </div>
            {activity.length > 0 ? (
              <ul className="trainer-console-feed">
                {activity.map((item) => (
                  <li className={`is-${item.result}`} key={item.id} title={item.detail || undefined}>
                    <time>{item.time.replace(/:\d{2}(\s*[ap]m)?$/i, '$1')}</time>
                    <div>
                      {item.result === 'rejected'
                        ? <strong><em className="trainer-console-feed-tag">Refused</em>{item.detail || item.action}</strong>
                        : <strong>{item.action}</strong>}
                      {item.actor && !traineeNames.has(item.actor) && <small>{item.actor}</small>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tc-muted">The trainee's actions appear here.</p>
            )}
          </section>
        </div>
      )}

      {confirmRequest && <ConfirmDialog onCancel={closeConfirm} request={confirmRequest} />}
    </section>
  )
}

export default ExercisePanel
