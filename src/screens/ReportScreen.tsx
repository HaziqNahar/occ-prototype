import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { archiveOccReport } from '../backendClient'
import SessionRunway from '../components/SessionRunway'
import { buildScenarioReport } from '../scenarioReport'
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
  const [archiveNote, setArchiveNote] = useState('Backend report not archived yet.')
  const [trainerNotes, setTrainerNotes] = useState(
    'Trainee to explain alarm acknowledgement, route authority, timetable impact, and final service state before session closure.',
  )
  const scenarioReport = buildScenarioReport(session)
  const scenarioScore = scenarioReport.scenarioScore
  const evidenceLog = session.evidenceLog ?? []
  const evidenceGroups = scenarioReport.evidenceGroups
  const traineeActivity = evidenceGroups.trainee
  const assessmentRows = scenarioReport.assessmentRows
  const assessmentSummary = scenarioReport.assessmentSummary
  const assessmentMetrics = session.assessmentMetrics
  const rejectedActionCount = scenarioReport.rejectedActionCount
  const selectedTrain = scenarioReport.selectedTrain
  const targetTrain = scenarioReport.targetTrain
  const targetTimetable = scenarioReport.targetTimetable
  const resultLabel = scenarioScore.result
  const resultTone = resultLabel === 'PASS' ? 'pass' : resultLabel === 'NEEDS REVIEW' ? 'review' : 'incomplete'
  const generatedAt = new Date(session.updatedAt).toLocaleString()
  const scenarioReportSummary = scenarioReport.archiveSummary
  const archiveReport = () => {
    setArchiveNote('Archiving report to backend...')
    // The backend stores the scored assessment summary, not just a printable UI.
    void archiveOccReport(session, trainerNotes, scenarioReportSummary)
      .then((payload) => {
        setArchiveNote(`Archived ${payload.report.id} | ${payload.report.summary.result} ${payload.report.summary.score}%`)
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
          <button type="button" onClick={archiveReport}>Archive Backend Report</button>
          <button type="button" onClick={() => window.print()}>Print / Export</button>
        </div>
      </header>

      <SessionRunway session={session} />

      <section className="report-card report-hero" aria-labelledby="report-title">
        <div>
          <p className="report-eyebrow">Scenario outcome</p>
          <h2 id="report-title">{session.activeScenario.title}</h2>
          <p className="report-copy">
            Shared OCC evidence and scored actions. Incident: {session.activeScenario.incident}.
          </p>
        </div>
        <div className={`report-result ${resultTone}`}>
          <span>{resultLabel}</span>
          <strong>{scenarioScore.score}%</strong>
          <small>{scenarioScore.completedTasks} of {scenarioScore.totalTasks} tasks complete</small>
        </div>
      </section>

      <section className="report-kpis" aria-label="Session summary">
        <div className="report-kpi">
          <span>Participants</span>
          <strong>{session.trainees.filter((trainee) => trainee.status === 'Joined').length}</strong>
          <small>{session.trainees.map((trainee) => trainee.role).join(' / ')}</small>
        </div>
        <div className="report-kpi">
          <span>Training mode</span>
          <strong>{session.trainingMode}</strong>
          <small>{trainingModeSummary[session.trainingMode]}</small>
        </div>
        <div className="report-kpi">
          <span>Scenario target</span>
          <strong>{session.activeScenario.duration}</strong>
          <small>{session.activeScenario.target}</small>
        </div>
        <div className="report-kpi">
          <span>Target train</span>
          <strong>TRN {targetTrain.id}</strong>
          <small>{targetTrain.status}</small>
        </div>
        <div className="report-kpi">
          <span>Current train</span>
          <strong>TRN {selectedTrain.id}</strong>
          <small>{selectedTrain.service}</small>
        </div>
        <div className="report-kpi">
          <span>Timetable state</span>
          <strong>{targetTimetable?.state ?? 'N/A'}</strong>
          <small>{targetTimetable?.stationPoint ?? 'SKGN'} target station</small>
        </div>
        <div className="report-kpi">
          <span>Rejected actions</span>
          <strong>{rejectedActionCount}</strong>
          <small>Penalties</small>
        </div>
        <div className="report-kpi">
          <span>Missed tasks</span>
          <strong>{scenarioReport.missedTasks.length}</strong>
          <small>{scenarioReport.completedTasks.length} complete</small>
        </div>
        <div className="report-kpi">
          <span>Live checks</span>
          <strong>{assessmentSummary.liveMonitorComplete}/{assessmentSummary.liveMonitorTotal}</strong>
          <small>Trainee checks</small>
        </div>
        <div className="report-kpi">
          <span>Instructor review</span>
          <strong>{assessmentSummary.instructorReviewComplete}/{assessmentSummary.instructorReviewTotal}</strong>
          <small>Trainer checks</small>
        </div>
        <div className="report-kpi">
          <span>Trainee actions</span>
          <strong>{evidenceGroups.trainee.length}</strong>
          <small>Captured actions</small>
        </div>
        <div className="report-kpi">
          <span>System validations</span>
          <strong>{evidenceGroups.system.length}</strong>
          <small>Guardrail events</small>
        </div>
        <div className="report-kpi">
          <span>Scenario milestones</span>
          <strong>{evidenceGroups.milestone.length}</strong>
          <small>Route, destination, movement</small>
        </div>
      </section>

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
              No trainee monitor actions captured yet. Use the live OCC screens to perform assigned tasks.
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
              No captured operator evidence yet. Run the scenario from IOS, alarms, line map, or timetable to populate this log.
            </div>
          )}
        </article>

        <article className="report-section report-notes">
          <div className="report-section-title">
            <p>Trainer notes</p>
            <span>{archiveNote}</span>
          </div>
          <textarea
            aria-label="Trainer notes"
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
