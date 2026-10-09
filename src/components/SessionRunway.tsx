import { scoreTrainingScenario } from '../trainingScenarios'
import type { OccSessionState } from '../types'

type SessionRunwayProps = {
  session: OccSessionState
  variant?: 'trainer' | 'trainee'
}

function SessionRunway({ session, variant = 'trainer' }: SessionRunwayProps) {
  const scenarioScore = scoreTrainingScenario(session)
  const joinedMonitorCount = Math.min(Object.keys(session.sessionMeta?.screens ?? {}).length, 3)
  const nextTask = scenarioScore.taskResults.find((task) => !task.complete)
  const completedTasks = scenarioScore.taskResults.filter((task) => task.complete).length
  const isIdle = session.scenarioMode === 'IDLE' && scenarioScore.taskResults.length === 0

  if (variant === 'trainee') {
    return (
      <section className="trainee-session-status" aria-label="Session readiness">
        <div>
          <span>Session</span>
          <strong>{session.sessionMeta?.code ?? 'OCC-TRAINING-001'}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{session.sessionMeta?.lifecycle ?? 'Ready'}</strong>
        </div>
        <div>
          <span>Scenario</span>
          <strong>{session.activeScenario.title}</strong>
        </div>
        <div>
          <span>Assigned monitor</span>
          <strong>Monitor 02 - Line Map</strong>
        </div>
      </section>
    )
  }

  return (
    <section className="session-runway is-compact" aria-label="Session status">
      <div className="session-runway-title">
        <span className={`session-runway-chip is-${session.scenarioMode.toLowerCase()}`}>{session.scenarioMode}</span>
        <strong>{isIdle ? 'No scenario loaded' : session.activeScenario.title}</strong>
      </div>
      <dl className="session-runway-facts">
        <div>
          <dt>Monitors</dt>
          <dd className={joinedMonitorCount === 3 ? 'is-ok' : 'is-warn'}>{joinedMonitorCount}/3</dd>
        </div>
        <div>
          <dt>Tasks</dt>
          <dd>{completedTasks}/{scenarioScore.taskResults.length}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{scenarioScore.score}%</dd>
        </div>
        <div className="session-runway-next">
          <dt>Next</dt>
          <dd>{isIdle ? 'Load a scenario' : nextTask?.label ?? 'All tasks complete'}</dd>
        </div>
      </dl>
      <div className="session-runway-progress" aria-label={`Scenario progress ${scenarioScore.score}%`}>
        <span style={{ width: `${scenarioScore.score}%` }} />
      </div>
    </section>
  )
}

export default SessionRunway
