import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { archiveOccReport } from '../backendClient'
import { buildScenarioReport } from '../scenarioReport'
import { getActiveTrainingScenarioTargetTrainId } from '../trainingScenarios'
import type { AppRoute, OccSessionState } from '../types'

type ReportScreenProps = {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
}

const trainingModeSummary = {
  PRACTICE: 'Guided practice',
  ASSESSMENT: 'Scored assessment',
  PLAYER: 'Playback review',
}

function compactReportText(value: string, limit = 110) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).trimEnd()}...` : normalized
}

function ReportScreen({ onNavigate, session }: ReportScreenProps) {
  const [archiveNote, setArchiveNote] = useState('Not saved yet')
  const [trainerNotes, setTrainerNotes] = useState('')
  const scenarioReport = buildScenarioReport(session)
  const scenarioScore = scenarioReport.scenarioScore
  const evidenceLog = session.evidenceLog ?? []
  const evidenceGroups = scenarioReport.evidenceGroups
  const traineeActivity = evidenceGroups.trainee
  const assessmentRows = scenarioReport.assessmentRows
  const assessmentMetrics = session.assessmentMetrics
  const rejectedActionCount = scenarioReport.rejectedActionCount
  const hasScenario = scenarioScore.totalTasks > 0
  const targetTrainId = getActiveTrainingScenarioTargetTrainId(session)
  const resultLabel = hasScenario ? scenarioScore.result : 'NO SCENARIO'
  const resultTone = !hasScenario
    ? 'idle'
    : resultLabel === 'PASS'
      ? 'pass'
      : resultLabel === 'NEEDS REVIEW'
        ? 'review'
        : session.scenarioMode === 'COMPLETE' ? 'incomplete' : 'running'
  const generatedAt = new Date(session.updatedAt).toLocaleString()
  const scenarioReportSummary = scenarioReport.archiveSummary
  const archiveReport = () => {
    setArchiveNote('Saving...')
    // The backend stores the scored assessment summary, not just a printable UI.
    void archiveOccReport(session, trainerNotes, scenarioReportSummary)
      .then((payload) => {
        setArchiveNote(`Saved as ${payload.report.id}`)
      })
      .catch((error: Error) => {
        setArchiveNote(error.message)
      })
  }

  return (
    <main
      className="report-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="report-header">
        <div className="report-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>OCC Training Simulator</p>
            <h1>Post-Session Report</h1>
            <span>{session.activeScenario.title}</span>
          </div>
        </div>
        <div className="report-actions">
          <button type="button" onClick={() => onNavigate('/ios')}>Back to IOS</button>
          <button type="button" disabled={!hasScenario} onClick={archiveReport}>Save Report</button>
          <button type="button" onClick={() => window.print()}>Print</button>
        </div>
      </header>

      <section className="report-card report-hero" aria-labelledby="report-title">
        <div>
          <p className="report-eyebrow">Scenario outcome</p>
          <h2 id="report-title">{hasScenario ? session.activeScenario.title : 'No scenario run yet'}</h2>
          <p className="report-copy">
            {hasScenario
              ? `${trainingModeSummary[session.trainingMode]} · Incident: ${session.activeScenario.incident} · Target ${session.activeScenario.duration}`
              : 'Load and run a scenario from Scenario setup. The score and evidence appear here.'}
          </p>
          {!hasScenario && (
            <button type="button" className="report-hero-action" onClick={() => onNavigate('/ios/scenarios')}>Open Scenario Setup</button>
          )}
        </div>
        <div className={`report-result ${resultTone}`}>
          <span>{resultLabel}</span>
          <strong>{hasScenario ? `${scenarioScore.score}%` : '—'}</strong>
          {hasScenario && <small>{scenarioScore.completedTasks} of {scenarioScore.totalTasks} tasks complete</small>}
        </div>
      </section>

      {hasScenario && (
        <section className="report-kpis" aria-label="Session summary">
          <div className="report-kpi">
            <span>Target train</span>
            <strong>{targetTrainId ? `TRN ${targetTrainId}` : 'Not selected'}</strong>
          </div>
          <div className="report-kpi">
            <span>Rejected actions</span>
            <strong>{rejectedActionCount}</strong>
          </div>
          <div className="report-kpi">
            <span>{session.scenarioMode === 'COMPLETE' ? 'Missed tasks' : 'Open tasks'}</span>
            <strong>{scenarioReport.missedTasks.length}</strong>
          </div>
          <div className="report-kpi">
            <span>Trainee actions</span>
            <strong>{evidenceGroups.trainee.length}</strong>
          </div>
        </section>
      )}

      <section className="report-grid">
        <article className="report-section">
          <div className="report-section-title">
            <p>Operator checklist</p>
            <span>{generatedAt}</span>
          </div>
          {assessmentRows.map((task, index) => {
            const complete = task.complete
            const taskMetric = task.mappedTaskId ? assessmentMetrics?.tasks?.[task.mappedTaskId] : undefined

            return (
              <div className={`report-task ${complete ? 'is-complete' : ''}`} key={task.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{task.label}</strong>
                  <small>
                    {task.monitor} | Owner: {task.owner} | {task.completionSource}
                    {taskMetric?.completedAt ? ` | ${taskMetric.responseSeconds}s / ${taskMetric.thresholdSeconds}s` : ''}
                    {task.evidenceCount > 0 ? ` | ${task.evidenceCount} evidence` : ''}
                  </small>
                </div>
                <em>{task.statusLabel}</em>
              </div>
            )
          })}
        </article>

        <article className="report-section">
          <div className="report-section-title">
            <p>Latest action timeline</p>
            <span>{session.scenarioMode}</span>
          </div>
          {scenarioReport.timeline.map((event) => (
            <div className={`report-event ${event.result === 'rejected' ? 'is-rejected' : ''}`} key={event.id}>
              <span>{event.time}</span>
              <strong>{event.source}</strong>
              <p>{event.title}: {compactReportText(event.detail)}</p>
              <small>{event.categoryLabel}</small>
            </div>
          ))}
        </article>

        <details className="report-section report-evidence-details">
          <summary>Full evidence log ({evidenceLog.length} records)</summary>
        <article className="report-section report-trainee-activity">
          <div className="report-section-title">
            <p>Trainee activity</p>
            <span>{traineeActivity.length} records</span>
          </div>
          <div className="report-trainee-roster">
            {session.trainees.length > 0 ? (
              session.trainees.map((trainee) => (
                <div key={`${trainee.email}-${trainee.role}`}>
                  <strong>{trainee.name}</strong>
                  <span>{trainee.role}</span>
                  <em>{trainee.monitor}</em>
                </div>
              ))
            ) : (
              <div>
                <strong>No trainee joined</strong>
                <span>Open the trainee lobby to join the session, then use the live OCC screens.</span>
                <em>Waiting</em>
              </div>
            )}
          </div>
          {traineeActivity.length ? (
            traineeActivity.map((evidence) => (
              <div className={`report-evidence-row is-${evidence.result} is-${evidence.category}`} key={evidence.id}>
                <span>{evidence.time}</span>
                <strong>{evidence.source}</strong>
                <p>{evidence.action}: {evidence.detail}</p>
                <em>{evidence.categoryLabel}</em>
              </div>
            ))
          ) : (
            <div className="report-evidence-empty">
              No trainee actions yet.
            </div>
          )}
        </article>

        <article className="report-section report-evidence">
          <div className="report-section-title">
            <p>Assessment trail</p>
            <span>{evidenceLog.length} records</span>
          </div>
          <div className="report-evidence-category-grid">
            <div>
              <strong>{evidenceGroups.trainee.length}</strong>
              <span>Trainee actions</span>
            </div>
            <div>
              <strong>{evidenceGroups.trainer.length}</strong>
              <span>Trainer actions</span>
            </div>
            <div>
              <strong>{evidenceGroups.system.length}</strong>
              <span>System validations</span>
            </div>
            <div>
              <strong>{evidenceGroups.milestone.length}</strong>
              <span>Milestones</span>
            </div>
          </div>
          {evidenceLog.length ? (
            scenarioReport.categorisedEvidenceLog.map((evidence) => (
              <div className={`report-evidence-row is-${evidence.result} is-${evidence.category}`} key={evidence.id}>
                <span>{evidence.time}</span>
                <strong>{evidence.source}</strong>
                <p>{evidence.action}: {evidence.detail}</p>
                <em>{evidence.categoryLabel}</em>
              </div>
            ))
          ) : (
            <div className="report-evidence-empty">
              No evidence captured yet.
            </div>
          )}
        </article>
        </details>

        <article className="report-section report-notes">
          <div className="report-section-title">
            <p>Trainer notes</p>
            <span>{archiveNote}</span>
          </div>
          <textarea
            aria-label="Trainer notes"
            placeholder="Notes for the trainee: alarm handling, route authority, timetable impact, final service state."
            value={trainerNotes}
            onChange={(event) => setTrainerNotes(event.target.value)}
          />
          <div className="report-signoff">
            <span>Trainer sign-off</span>
            <strong>MNADZRULS [TSR1] @ OCC</strong>
          </div>
        </article>
      </section>
    </main>
  )
}

export default ReportScreen
