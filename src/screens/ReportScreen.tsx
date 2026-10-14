import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { archiveOccReport } from '../backendClient'
import { getEvidenceWhoLabel } from '../iosEvidenceTrail'
import { getScenarioTaskPlaceTag } from '../iosScenarioRoles'
import { getSessionId } from '../sessionCode'
import { buildScenarioReport } from '../scenarioReport'
import { getActiveTrainingScenarioTargetTrainId, getTrainingScenarioDefinition } from '../trainingScenarios'
import type { AppRoute, OccSessionState } from '../types'

type ReportScreenProps = {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  // The signed-in trainer, who signs the report off.
  trainerName?: string
}

type DiscussPoint = { text: string; tone: 'bad' | 'warn' | 'info' }

const modeLabels = {
  ASSESSMENT: 'Assessment',
  PLAYER: 'Player',
  PRACTICE: 'Practice',
}

function formatSeconds(seconds: number) {
  const whole = Math.max(0, Math.round(seconds))

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function targetSeconds(duration: string) {
  const [minutes, seconds] = duration.split(':').map(Number)

  return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : 0
}

// Post-session report as a scorecard: the result on one line, then what the
// trainer should debrief, worked out from the run. The steps and every action
// are one click away.
function ReportScreen({ onNavigate, session, trainerName }: ReportScreenProps) {
  const [archiveNote, setArchiveNote] = useState('')
  const [trainerNotes, setTrainerNotes] = useState('')
  const scenarioReport = buildScenarioReport(session)
  const score = scenarioReport.scenarioScore
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)
  const metrics = session.assessmentMetrics
  // Sessions from a server older than 1.0.0 have no aid counts: read them as none.
  const aidsUsed = metrics.aidsUsed ?? { locate: 0, showMe: 0 }
  const aidsTotal = aidsUsed.showMe + aidsUsed.locate
  const hasScenario = score.totalTasks > 0
  const isComplete = session.scenarioMode === 'COMPLETE'
  const trainId = getActiveTrainingScenarioTargetTrainId(session)
  const traineeNames = session.trainees.map((trainee) => trainee.name).join(', ')
  const result = !hasScenario ? 'No run' : isComplete ? (score.result === 'PASS' ? 'Pass' : 'Needs review') : 'In progress'
  const resultTone = !hasScenario ? 'idle' : !isComplete ? 'running' : score.result === 'PASS' ? 'pass' : 'review'
  const target = targetSeconds(session.activeScenario.duration)
  const stepLabels = new Set(definition.tasks.map((task) => task.label))
  const actions = scenarioReport.timeline.filter((event) => event.result === 'rejected' || !stepLabels.has(event.title))

  const summary = [
    modeLabels[session.trainingMode],
    `${formatSeconds(scenarioReport.durationSeconds)} of ${session.activeScenario.duration}`,
    `${score.rejectedActions} wrong ${score.rejectedActions === 1 ? 'action' : 'actions'}`,
    session.trainingMode === 'PRACTICE' ? `${aidsTotal} ${aidsTotal === 1 ? 'hint' : 'hints'}` : '',
    trainId ? `Train ${trainId}` : '',
  ].filter(Boolean).join(' · ')

  // What to debrief: mistakes first, then what was missed or slow.
  const discuss: DiscussPoint[] = []
  const refusals = new Set<string>()

  scenarioReport.timeline
    .filter((event) => event.result === 'rejected')
    .forEach((event) => refusals.add(event.detail || event.title))
  refusals.forEach((text) => discuss.push({ text: `Refused: ${text}`, tone: 'bad' }))
  score.taskResults
    .filter((task) => !task.complete && task.mappedTaskId !== 'completeScenario')
    .forEach((task) => discuss.push({
      text: `${isComplete ? 'Missed' : 'Still open'}: ${task.label}${task.critical ? ' (critical)' : ''}`,
      tone: isComplete ? 'bad' : 'info',
    }))
  definition.tasks.forEach((task) => {
    const metric = task.mappedTaskId ? metrics.tasks?.[task.mappedTaskId] : undefined

    if (metric?.status === 'LATE') {
      discuss.push({ text: `Slow: ${task.label} took ${formatSeconds(metric.responseSeconds ?? 0)} (target ${formatSeconds(metric.thresholdSeconds)})`, tone: 'warn' })
    }
  })

  if (target > 0 && scenarioReport.durationSeconds > target) {
    discuss.push({ text: `Over time: ${formatSeconds(scenarioReport.durationSeconds)} against a ${session.activeScenario.duration} target`, tone: 'warn' })
  }

  if (session.trainingMode === 'PRACTICE' && aidsTotal > 0) {
    discuss.push({ text: `Used hints ${aidsTotal} ${aidsTotal === 1 ? 'time' : 'times'} (Show me ${aidsUsed.showMe} · Locate ${aidsUsed.locate})`, tone: 'info' })
  }

  const archiveReport = () => {
    setArchiveNote('Saving…')
    // The server scores the report from its own session; only the notes come from here.
    void archiveOccReport(getSessionId(session), trainerNotes)
      .then((payload) => setArchiveNote(`Saved as ${payload.report.id}`))
      .catch((error: Error) => setArchiveNote(error.message))
  }

  return (
    <main className="report-shell" style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}>
      <header className="report-header">
        <div className="report-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>OCC Training Simulator</p>
            <h1>Report</h1>
          </div>
        </div>
        <div className="report-actions">
          <button type="button" onClick={() => onNavigate('/ios/modules')}>Back to console</button>
          <button type="button" onClick={() => window.print()}>Print</button>
        </div>
      </header>

      {!hasScenario ? (
        <section className="report-card report-scorecard" aria-labelledby="report-title">
          <div>
            <h2 id="report-title">No run yet</h2>
            <p className="report-copy">Load a scenario from the Trainer Console. Its result appears here.</p>
          </div>
          <button type="button" className="report-hero-action" onClick={() => onNavigate('/ios/modules')}>Open Trainer Console</button>
        </section>
      ) : (
        <>
          <section className="report-card report-scorecard" aria-labelledby="report-title">
            <div className={`report-result ${resultTone}`}>
              <span>{result}</span>
              <strong>{score.score}%</strong>
            </div>
            <div className="report-scorecard-text">
              <h2 id="report-title">{traineeNames ? `${traineeNames} · ` : ''}{session.activeScenario.title}</h2>
              <p className="report-copy">
                {summary}
              </p>
            </div>
          </section>

          <section className="report-card report-discuss" aria-labelledby="report-discuss-title">
            <h3 id="report-discuss-title">To discuss</h3>
            {discuss.length > 0 ? (
              <ul>
                {discuss.map((point) => <li className={`is-${point.tone}`} key={point.text}>{point.text}</li>)}
              </ul>
            ) : (
              <p className="report-copy">{isComplete ? 'Nothing to flag: a clean run.' : 'Nothing to flag so far.'}</p>
            )}
          </section>

          <details className="report-card report-fold">
            <summary>Steps · {score.completedTasks} of {score.totalTasks} done</summary>
            <ol className="report-steps">
              {score.taskResults.map((task) => (
                <li className={task.complete ? 'is-done' : isComplete ? 'is-missed' : ''} key={task.id}>
                  <i aria-hidden="true">{task.complete ? '✓' : isComplete ? '✗' : '○'}</i>
                  <span>{task.label}{task.critical && <b title="Critical SOP step"> ★</b>}</span>
                  <small>{getScenarioTaskPlaceTag(task.monitor)}</small>
                </li>
              ))}
            </ol>
          </details>

          <details className="report-card report-fold">
            <summary>All actions ({actions.length})</summary>
            {actions.map((event) => (
              <div className={`report-event ${event.result === 'rejected' ? 'is-rejected' : ''}`} key={event.id}>
                <span>{event.time}</span>
                <strong>{getEvidenceWhoLabel(event)}</strong>
                <p>{event.result === 'rejected' ? `Refused: ${event.detail || event.title}` : event.title}</p>
              </div>
            ))}
          </details>

          <section className="report-card report-notes" aria-labelledby="report-notes-title">
            <h3 id="report-notes-title">Your notes</h3>
            <textarea
              aria-label="Trainer notes"
              onChange={(event) => setTrainerNotes(event.target.value)}
              placeholder="Feedback for the trainee"
              value={trainerNotes}
            />
            <div className="report-notes-actions">
              <button type="button" className="is-primary" onClick={archiveReport}>Save Report</button>
              {archiveNote && <span role="status">{archiveNote}</span>}
              <span className="report-signoff">Signed off by <strong>{trainerName ?? '—'}</strong></span>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export default ReportScreen
