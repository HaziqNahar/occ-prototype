import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { archiveOccReport } from '../backendClient'
import SessionRunway from '../components/SessionRunway'
import { scenarioTaskList } from '../scenario'
import type { AppRoute, OccSessionState } from '../types'

type ReportScreenProps = {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
}

const trainingModeSummary = {
  PRACTICE: 'Guided practice with hints and trainer override.',
  ASSESSMENT: 'Reduced guidance with action scoring.',
  PLAYER: 'Auto-run playback for presentation review.',
}

function ReportScreen({ onNavigate, session }: ReportScreenProps) {
  const [archiveNote, setArchiveNote] = useState('Backend report not archived yet.')
  const [trainerNotes, setTrainerNotes] = useState(
    'Trainee to explain alarm acknowledgement, route authority, timetable impact, and final service state before session closure.',
  )
  const completedTasks = scenarioTaskList.filter((task) => session.scenarioTasks[task.id]).length
  const evidenceLog = session.evidenceLog ?? []
  const assessmentMetrics = session.assessmentMetrics
  const scenarioScore = assessmentMetrics?.score ?? Math.round((completedTasks / scenarioTaskList.length) * 100)
  const rejectedEvents = session.eventRows.filter((row) => row.message.toLowerCase().includes('rejected'))
  const rejectedActionCount = Math.max(rejectedEvents.length, assessmentMetrics?.rejectedActions ?? 0)
  const selectedTrain = session.trains.find((train) => train.id === session.selectedTrainId) ?? session.trains[0]
  const targetTrain = session.trains.find((train) => train.id === '317') ?? selectedTrain
  const targetTimetable = session.timetableRows.find((row) => row.train === '317')
  const resultLabel = (assessmentMetrics?.result ?? (
    session.scenarioTasks.completeScenario && rejectedActionCount === 0
      ? 'PASS'
      : scenarioScore >= 80
        ? 'NEEDS_REVIEW'
        : 'INCOMPLETE'
  )).replace('_', ' ')
  const resultTone = resultLabel === 'PASS' ? 'pass' : resultLabel === 'NEEDS REVIEW' ? 'review' : 'incomplete'
  const generatedAt = new Date(session.updatedAt).toLocaleString()
  const completedTaskMetrics = Object.values(assessmentMetrics?.tasks ?? {}).filter((task) => task.completedAt)
  const averageResponseSeconds = completedTaskMetrics.length
    ? Math.round(completedTaskMetrics.reduce((total, task) => total + (task.responseSeconds ?? 0), 0) / completedTaskMetrics.length)
    : 0
  const archiveReport = () => {
    setArchiveNote('Archiving report to backend...')
    // The backend stores the scored assessment summary, not just a printable UI.
    void archiveOccReport(session, trainerNotes)
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
            Review generated from the shared OCC session state across Alarms,
            Line Map, Timetable, and IOS trainer controls. Current incident:
            {' '}{session.activeScenario.incident}.
          </p>
        </div>
        <div className={`report-result ${resultTone}`}>
          <span>{resultLabel}</span>
          <strong>{scenarioScore}%</strong>
          <small>{completedTasks} of {scenarioTaskList.length} tasks complete</small>
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
          <small>Status: {targetTrain.status}</small>
        </div>
        <div className="report-kpi">
          <span>Current train</span>
          <strong>TRN {selectedTrain.id}</strong>
          <small>Service {selectedTrain.service}</small>
        </div>
        <div className="report-kpi">
          <span>Timetable state</span>
          <strong>{targetTimetable?.state ?? 'N/A'}</strong>
          <small>{targetTimetable?.stationPoint ?? 'SKGN'} target station</small>
        </div>
        <div className="report-kpi">
          <span>Rejected actions</span>
          <strong>{rejectedActionCount}</strong>
          <small>Backend sequence validation</small>
        </div>
        <div className="report-kpi">
          <span>Response time</span>
          <strong>{averageResponseSeconds}s</strong>
          <small>{assessmentMetrics?.onTimeTasks ?? 0} on time / {assessmentMetrics?.lateTasks ?? 0} late</small>
        </div>
      </section>

      <section className="report-grid">
        <article className="report-section">
          <div className="report-section-title">
            <p>Operator checklist</p>
            <span>{generatedAt}</span>
          </div>
          {scenarioTaskList.map((task, index) => {
            const complete = session.scenarioTasks[task.id]
            const taskMetric = assessmentMetrics?.tasks?.[task.id]

            return (
              <div className={`report-task ${complete ? 'is-complete' : ''}`} key={task.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{task.label}</strong>
                  <small>
                    {task.monitor}
                    {taskMetric?.completedAt ? ` | ${taskMetric.responseSeconds}s / ${taskMetric.thresholdSeconds}s` : ''}
                  </small>
                </div>
                <em>{taskMetric?.status === 'PENDING' ? complete ? 'Complete' : 'Pending' : taskMetric?.status ?? (complete ? 'Complete' : 'Pending')}</em>
              </div>
            )
          })}
        </article>

        <article className="report-section">
          <div className="report-section-title">
            <p>Latest action timeline</p>
            <span>{session.scenarioMode}</span>
          </div>
          {session.eventRows.map((event) => (
            <div className={`report-event ${event.message.toLowerCase().includes('rejected') ? 'is-rejected' : ''}`} key={`${event.time}-${event.asset}-${event.message}`}>
              <span>{event.time}</span>
              <strong>{event.asset}</strong>
              <p>{event.message}</p>
              <small>{event.value}</small>
            </div>
          ))}
        </article>

        <article className="report-section report-evidence">
          <div className="report-section-title">
            <p>Evidence captured</p>
            <span>{evidenceLog.length} records</span>
          </div>
          {evidenceLog.length ? (
            evidenceLog.map((evidence) => (
              <div className={`report-evidence-row is-${evidence.result}`} key={evidence.id}>
                <span>{evidence.time}</span>
                <strong>{evidence.source}</strong>
                <p>{evidence.action}: {evidence.detail}</p>
                <em>{evidence.result}</em>
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
