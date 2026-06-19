import { scenarioTaskList } from '../scenario'
import type { OccSessionState, SessionTransportSnapshot } from '../types'

type SessionRunwayProps = {
  session: OccSessionState
}

function SessionRunway({ session }: SessionRunwayProps) {
  const completedTasks = scenarioTaskList.filter((task) => session.scenarioTasks[task.id]).length
  const progress = Math.round((completedTasks / scenarioTaskList.length) * 100)
  const evidenceLog = session.evidenceLog ?? []
  const joinedScreens = Object.values(session.sessionMeta?.screens ?? {})
  const transportSnapshots = joinedScreens
    .map((screen) => screen.transport)
    .filter((transport): transport is SessionTransportSnapshot => Boolean(transport))
  const assessmentMetrics = session.assessmentMetrics
  const latestEvidence = evidenceLog.slice(0, 3)
  const nextTask = scenarioTaskList.find((task) => !session.scenarioTasks[task.id])
  const connectedSseScreens = transportSnapshots.filter((transport) => transport.backendSse === 'CONNECTED').length
  const connectedWorkerScreens = transportSnapshots.filter((transport) => transport.sharedWorker === 'CONNECTED').length
  const connectedChannelScreens = transportSnapshots.filter((transport) => transport.broadcastChannel === 'CONNECTED').length
  const lastLaunch = session.sessionMeta?.lastMonitorLaunch

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
          <strong>{joinedScreens.length}/3 monitors</strong>
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
          <span>Backend score</span>
          <strong>{assessmentMetrics?.score ?? progress}% / {assessmentMetrics?.result ?? 'INCOMPLETE'}</strong>
        </div>
      </div>

      <div className="session-runway-progress" aria-label={`Scenario progress ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="session-runway-steps">
        {scenarioTaskList.map((task, index) => {
          const isComplete = session.scenarioTasks[task.id]
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
