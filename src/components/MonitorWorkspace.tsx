import { useState } from 'react'
import type { ReactNode } from 'react'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { scenarioTaskList } from '../scenario'
import type { AppRoute, OccSessionState } from '../types'

type MonitorWorkspaceProps = {
  children: ReactNode
  extraActions?: ReactNode
  monitorLabel: string
  onNavigate: (route: AppRoute) => void
  scadaFirst?: boolean
  session?: OccSessionState
  title: string
}

function MonitorWorkspace({
  children,
  extraActions,
  monitorLabel,
  onNavigate,
  scadaFirst = false,
  session,
  title,
}: MonitorWorkspaceProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [windowNote, setWindowNote] = useState('SCADA window ready')
  const menuItems = ['File', 'View', 'Command', 'Power', 'ECS', 'Traffic', 'Comms', 'Admin', 'Help']

  return (
    <main className={`occ-workspace ${scadaFirst ? 'occ-workspace--scada-first' : ''}`}>
      <header className="occ-workspace-header">
        <div className="occ-workspace-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>OCC Training Simulator</p>
            <h1>{title}</h1>
            <span className="occ-monitor-tag">{monitorLabel}</span>
          </div>
        </div>
        <div className="occ-workspace-actions">
          {extraActions}
          <button type="button" onClick={() => onNavigate('/ios/modules')}>IOS Modules</button>
          <button type="button" onClick={() => onNavigate('/session/join')}>Trainee Lobby</button>
          <button type="button" onClick={() => onNavigate('/ios/scenarios')}>Scenario Builder</button>
          <button type="button" onClick={() => onNavigate('/ios/assessment')}>Rubric</button>
          <button type="button" onClick={() => onNavigate('/guide')}>Demo Guide</button>
          <button type="button" onClick={() => onNavigate('/')}>Back to Launch</button>
        </div>
      </header>

      {session && !scadaFirst ? <MonitorDemoStrip onNavigate={onNavigate} session={session} /> : null}

      <section className="occ-monitor-frame" aria-label="Line map monitor frame">
        <div className={`win98-window ${isMaximized ? 'is-maximized' : ''}`} role="group" aria-label={`${title} Windows 98 SCADA window`}>
          <div className="win98-titlebar">
            <span>{monitorLabel} | NEL_SIG_Traffic_Detail - {title}</span>
            <div className="win98-window-controls">
              <button
                type="button"
                title={isMinimized ? 'Restore window' : 'Minimize window'}
                onClick={() => {
                  setIsMinimized((value) => !value)
                  setWindowNote(isMinimized ? 'Window restored' : 'Window minimized')
                }}
              >
                _
              </button>
              <button
                type="button"
                title={isMaximized ? 'Restore size' : 'Maximize window'}
                onClick={() => {
                  setIsMaximized((value) => !value)
                  setWindowNote(isMaximized ? 'Window restored to training frame' : 'Window maximized inside prototype shell')
                }}
              >
                []
              </button>
              <button type="button" title="Close window" onClick={() => onNavigate('/')}>x</button>
            </div>
          </div>
          <div className="win98-menu">
            {menuItems.map((item) => (
              <button type="button" onClick={() => setWindowNote(`${item} menu selected`)} key={item}>
                {item}
              </button>
            ))}
          </div>
          <div className="win98-status-line">{windowNote}</div>
          {isMinimized ? (
            <div className="win98-minimized">
              <span>{title} is minimized.</span>
              <button type="button" onClick={() => { setIsMinimized(false); setWindowNote('Window restored') }}>
                Restore
              </button>
            </div>
          ) : (
            <div className="win98-client">
              <div className="occ-monitor-scale">
                {children}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function MonitorDemoStrip({
  onNavigate,
  session,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
}) {
  const completedTasks = scenarioTaskList.filter((task) => session.scenarioTasks[task.id]).length
  const nextTask = scenarioTaskList.find((task) => !session.scenarioTasks[task.id])
  const progress = Math.round((completedTasks / scenarioTaskList.length) * 100)
  const latestEvidence = session.evidenceLog[0]

  return (
    <aside className={`monitor-demo-strip monitor-demo-strip--${session.scenarioNotice.tone}`} aria-label="Demo scenario status">
      <div className="monitor-demo-strip__item">
        <span>Scenario</span>
        <strong>{session.activeScenario.title}</strong>
      </div>
      <div className="monitor-demo-strip__item">
        <span>Mode</span>
        <strong>{session.trainingMode} / {session.scenarioMode}</strong>
      </div>
      <div className="monitor-demo-strip__item monitor-demo-strip__item--wide">
        <span>Next Action</span>
        <strong>{nextTask ? `${nextTask.label} · ${nextTask.monitor}` : 'Scenario evidence ready for report'}</strong>
      </div>
      <div className="monitor-demo-strip__progress" aria-label={`Scenario progress ${completedTasks} of ${scenarioTaskList.length}`}>
        <span>{completedTasks}/{scenarioTaskList.length}</span>
        <div>
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="monitor-demo-strip__notice">
        <span>{session.scenarioNotice.text}</span>
        {latestEvidence ? <small>{latestEvidence.time} · {latestEvidence.source}: {latestEvidence.action}</small> : null}
      </div>
      <div className="monitor-demo-strip__actions">
        <button type="button" onClick={() => onNavigate('/ios')}>Open IOS</button>
        <button type="button" onClick={() => onNavigate('/report')}>Report</button>
      </div>
    </aside>
  )
}

export default MonitorWorkspace
