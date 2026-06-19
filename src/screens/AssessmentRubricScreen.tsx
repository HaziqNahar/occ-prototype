import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SessionRunway from '../components/SessionRunway'
import { assessmentRubric } from '../scenarioLibrary'
import { scenarioTaskList } from '../scenario'
import type { AppRoute, OccSessionState } from '../types'

type AssessmentRubricScreenProps = {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
}

function AssessmentRubricScreen({ onNavigate, session }: AssessmentRubricScreenProps) {
  const completedTasks = scenarioTaskList.filter((task) => session.scenarioTasks[task.id]).length
  const rejectedActions = session.eventRows.filter((event) => event.message.toLowerCase().includes('rejected')).length
  const stepScore = Math.round((completedTasks / scenarioTaskList.length) * 100)
  const accuracyScore = rejectedActions === 0 ? 100 : Math.max(0, 100 - rejectedActions * 20)
  const liveScore = Math.round(stepScore * 0.7 + accuracyScore * 0.3)
  const resultLabel = session.scenarioTasks.completeScenario && rejectedActions === 0
    ? 'PASS'
    : liveScore >= 75
      ? 'NEEDS REVIEW'
      : 'IN PROGRESS'

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
              <strong>{completedTasks}/{scenarioTaskList.length}</strong>
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
            {scenarioTaskList.map((task, index) => {
              const complete = session.scenarioTasks[task.id]

              return (
                <div className={complete ? 'is-complete' : ''} key={task.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{task.label}</strong>
                  <em>{complete ? 'Complete' : 'Pending'}</em>
                </div>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}

export default AssessmentRubricScreen
