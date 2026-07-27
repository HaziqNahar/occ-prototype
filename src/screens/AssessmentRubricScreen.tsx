import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SessionRunway from '../components/SessionRunway'
import { getScenarioAssessmentSummary } from '../iosScenarioAssessment'
import { assessmentRubric } from '../scenarioLibrary'
import { scoreTrainingScenario } from '../trainingScenarios'
import type { AppRoute, OccSessionState } from '../types'

type AssessmentRubricScreenProps = {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
}

function AssessmentRubricScreen({ onNavigate, session }: AssessmentRubricScreenProps) {
  const rejectedActions = session.eventRows.filter((event) => event.message.toLowerCase().includes('rejected')).length
  const trainingScenarioScore = scoreTrainingScenario(session)
  const assessmentSummary = getScenarioAssessmentSummary(session)
  const liveScore = trainingScenarioScore.score
  const resultLabel = trainingScenarioScore.result

  return (
    <main
      className="module-tool-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="module-tool-header">
        <div className="module-tool-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>IOS Assessment Mode</p>
            <h1>Assessment Rubric</h1>
            <span>{session.trainingMode} | {resultLabel}</span>
          </div>
        </div>
        <div className="module-tool-actions">
          <button type="button" onClick={() => onNavigate('/ios/scenarios')}>Scenario Builder</button>
          <button type="button" onClick={() => onNavigate('/report')}>Open Report</button>
          <button type="button" onClick={() => onNavigate('/ios')}>Open IOS</button>
        </div>
      </header>

      <SessionRunway session={session} />

      <section className="assessment-layout">
        <aside className="assessment-score-panel">
          <p className="module-eyebrow">Live Assessment</p>
          <div className="assessment-score-ring">
            <strong>{liveScore}%</strong>
            <span>{resultLabel}</span>
          </div>
          <div className="assessment-live-grid">
            <div>
              <span>Completed steps</span>
              <strong>{trainingScenarioScore.completedTasks}/{trainingScenarioScore.totalTasks}</strong>
            </div>
            <div>
              <span>Rejected actions</span>
              <strong>{rejectedActions}</strong>
            </div>
            <div>
              <span>Response target</span>
              <strong>05:00</strong>
            </div>
            <div>
              <span>Mode</span>
              <strong>{session.trainingMode}</strong>
            </div>
            <div>
              <span>Live monitor tasks</span>
              <strong>{assessmentSummary.liveMonitorComplete}/{assessmentSummary.liveMonitorTotal}</strong>
            </div>
            <div>
              <span>Instructor review</span>
              <strong>{assessmentSummary.instructorReviewComplete}/{assessmentSummary.instructorReviewTotal}</strong>
            </div>
          </div>
        </aside>

        <section className="assessment-main-panel">
          <div className="assessment-hero">
            <p className="module-eyebrow">Scoring Model</p>
            <h2>Quantitative results for trainee performance</h2>
            <p>
              This screen makes the assessment logic visible for the training session:
              response quality, correct sequence, alarm handling, command accuracy,
              and trainer sign-off.
            </p>
            <div className="assessment-scenario-summary">
              <span>{session.activeScenario.title}</span>
              <strong>{session.activeScenario.incident}</strong>
              <em>{session.activeScenario.target} | {session.activeScenario.duration}</em>
            </div>
          </div>

          <div className="rubric-table">
            <div className="rubric-head">Metric</div>
            <div className="rubric-head">Weight</div>
            <div className="rubric-head">Pass Target</div>
            <div className="rubric-head">Evidence</div>
            {assessmentRubric.map((criterion) => (
              <div className="rubric-row" key={criterion.metric}>
                <strong>{criterion.metric}</strong>
                <span>{criterion.weight}%</span>
                <p>{criterion.passTarget}</p>
                <em>{criterion.evidence}</em>
              </div>
            ))}
          </div>

          <div className="assessment-checklist">
            {assessmentSummary.rows.map((task, index) => {
              const complete = task.complete

              return (
                <div className={complete ? 'is-complete' : ''} key={task.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{task.label}</strong>
                  <em>{task.statusLabel}</em>
                </div>
              )
            })}
          </div>

          <div className="assessment-task-breakdown" aria-label="Scenario task scoring breakdown">
            {assessmentSummary.rows.map((task) => (
              <article className={task.complete ? 'is-complete' : 'is-open'} key={task.id}>
                <div>
                  <span>{task.critical ? 'Critical' : 'Standard'} | {task.completionSource}</span>
                  <strong>{task.label}</strong>
                  <em>{task.monitor} | Owner: {task.owner}</em>
                </div>
                <div>
                  <span>Stage</span>
                  <strong>{task.stageLabel}</strong>
                  <em>{task.statusLabel}</em>
                </div>
                <div>
                  <span>Score</span>
                  <strong>{task.scoreContribution}/{task.weight}%</strong>
                  <em>{task.evidenceCount} evidence</em>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default AssessmentRubricScreen
