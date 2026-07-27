import { scoreTrainingScenario } from '../trainingScenarios'
import type { OccSessionState, SessionTransportSnapshot } from '../types'

type SessionRunwayProps = {
  session: OccSessionState
  variant?: 'trainer' | 'trainee'
}

function SessionRunway({ session, variant = 'trainer' }: SessionRunwayProps) {
  const scenarioScore = scoreTrainingScenario(session)
  const progress = scenarioScore.score
  const evidenceLog = session.evidenceLog ?? []
  const joinedScreens = Object.values(session.sessionMeta?.screens ?? {})
  const joinedMonitorCount = Math.min(joinedScreens.length, 3)
  const transportSnapshots = joinedScreens
    .map((screen) => screen.transport)
    .filter((transport): transport is SessionTransportSnapshot => Boolean(transport))
  const latestEvidence = evidenceLog.slice(0, 3)
  const nextTask = scenarioScore.taskResults.find((task) => !task.complete)
  const connectedSseScreens = transportSnapshots.filter((transport) => transport.backendSse === 'CONNECTED').length
  const connectedWorkerScreens = transportSnapshots.filter((transport) => transport.sharedWorker === 'CONNECTED').length
  const connectedChannelScreens = transportSnapshots.filter((transport) => transport.broadcastChannel === 'CONNECTED').length
  const lastLaunch = session.sessionMeta?.lastMonitorLaunch

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
    <section className="session-runway" aria-label="Connected session flow">
      <div className="session-runway-heading">
        <div>
          <p className="module-eyebrow">Connected Session Flow</p>
          <h2>{session.activeScenario.title}</h2>
        </div>
        <span>{session.sessionMeta?.code ?? 'OCC-TRAINING-001'} | {session.scenarioMode} | {session.trainingMode}</span>
      </div>

      <div className="session-runway-summary">
        <div>
          <span>Current incident</span>
          <strong>{session.activeScenario.incident}</strong>
        </div>
        <div>
          <span>Backend session</span>
          <strong>{session.sessionMeta?.lifecycle ?? 'CREATED'}</strong>
        </div>
        <div>
          <span>Joined screens</span>
          <strong>{joinedMonitorCount}/3 connected</strong>
        </div>
        <div>
          <span>Transport bus</span>
          <strong>{connectedSseScreens} SSE / {connectedWorkerScreens} SW / {connectedChannelScreens} BC</strong>
        </div>
        <div>
          <span>Last launch</span>
          <strong>{lastLaunch ? `${lastLaunch.targets.length} monitors` : 'None'}</strong>
        </div>
        <div>
          <span>Scenario score</span>
          <strong>{scenarioScore.score}% / {scenarioScore.result}</strong>
        </div>
      </div>

      <div className="session-runway-progress" aria-label={`Scenario progress ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="session-runway-steps">
        {scenarioScore.taskResults.map((task, index) => {
          const isComplete = task.complete
          const isNext = task.id === nextTask?.id

          return (
            <div className={`${isComplete ? 'is-complete' : ''} ${isNext ? 'is-next' : ''}`} key={task.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{task.label}</strong>
              <em>{isComplete ? 'Done' : isNext ? 'Next' : 'Pending'}</em>
            </div>
          )
        })}
      </div>

      <div className="session-runway-evidence" aria-label="Latest evidence captured">
        <div className="session-runway-evidence-title">
          <span>Evidence captured</span>
          <strong>{evidenceLog.length} records</strong>
        </div>
        {latestEvidence.length ? (
          latestEvidence.map((evidence) => (
            <div className={`session-runway-evidence-item is-${evidence.result}`} key={evidence.id}>
              <span>{evidence.time}</span>
              <strong>{evidence.source}</strong>
              <p>{evidence.action}</p>
              <em>{evidence.result}</em>
            </div>
          ))
        ) : (
          <p className="session-runway-empty">No evidence captured yet.</p>
        )}
      </div>
    </section>
  )
}

export default SessionRunway
