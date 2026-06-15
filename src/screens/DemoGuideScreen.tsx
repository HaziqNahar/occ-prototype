import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SessionRunway from '../components/SessionRunway'
import type { AppRoute, OccSessionState, TrainingMode } from '../types'

type DemoGuideScreenProps = {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
  session: OccSessionState
}

const monitorPlan: Array<{ label: string; route: AppRoute; purpose: string }> = [
  {
    label: 'Monitor 01 - Alarms',
    route: '/screen/alarms',
    purpose: 'Shows injected alarms and acknowledgement actions.',
  },
  {
    label: 'Monitor 02 - Line Map',
    route: '/screen/line-map',
    purpose: 'Main SCADA train line view for selecting, routing, and dispatching Train 317.',
  },
  {
    label: 'Monitor 03 - Timetable',
    route: '/screen/timetable',
    purpose: 'Shows schedule impact and timetable actions for the selected train.',
  },
  {
    label: 'IOS - Trainer Control',
    route: '/ios',
    purpose: 'Trainer starts the drill, injects fault, advances steps, and closes the review.',
  },
]

const demoSteps = [
  {
    action: 'Prepare session',
    route: '/ios/modules' as AppRoute,
    script: 'Show trainer modules: user/session/scenario/runtime/report coverage from the proposal.',
    step: 'Create or reset the training session.',
  },
  {
    action: 'Load scenario',
    route: '/ios/scenarios' as AppRoute,
    script: 'Explain that Train Launch / Withdrawal is the polished prototype scenario.',
    step: 'Load Train Launch / Withdrawal from Scenario Builder.',
  },
  {
    action: 'Open IOS',
    route: '/ios' as AppRoute,
    script: 'Use IOS as the trainer console to start, inject, pause, and complete the drill.',
    step: 'Start the scenario and confirm Train 317 is the target.',
  },
  {
    action: 'Open alarms',
    route: '/screen/alarms' as AppRoute,
    script: 'Show the alarm feed and acknowledge the injected fault from Monitor 01.',
    step: 'Acknowledge the red alarm after Train 317 is selected.',
  },
  {
    action: 'Open line map',
    route: '/screen/line-map' as AppRoute,
    script: 'Show the SCADA-style line map, horizontal pan, route command, and dispatch.',
    step: 'Route and dispatch Train 317 from Monitor 02.',
  },
  {
    action: 'Open timetable',
    route: '/screen/timetable' as AppRoute,
    script: 'Show timetable impact and service regulation action.',
    step: 'Apply or review the timetable action for Train 317.',
  },
  {
    action: 'Open report',
    route: '/report' as AppRoute,
    script: 'Close with evidence captured, completed actions, rejected actions, and trainer notes.',
    step: 'Complete scenario review and generate the report.',
  },
]

const prototypeModules = [
  {
    name: 'Training Module',
    detail: 'Briefing, scenario objective, screen launch, and trainer-led preparation.',
  },
  {
    name: 'Simulation Module',
    detail: 'Shared OCC state across alarms, line map, timetable, IOS, and report.',
  },
  {
    name: 'Incident Management',
    detail: 'Trainer injects events such as door fault, train hold, route issue, or timetable delay.',
  },
  {
    name: 'Practice / Assessment / Player',
    detail: 'Guided learning, scored assessment, and auto-run replay using the same scenario flow.',
  },
]

const iosTrainerModules = [
  {
    module: 'User Management',
    component: 'User registration',
    prototype: 'Trainer can present enrolled trainee emails as a prepared roster.',
    phase: 'Static for prototype; real registration later.',
  },
  {
    module: 'Session Management',
    component: 'Create assessment session',
    prototype: 'Session mode, date/time, and enrolled users are shown as demo metadata.',
    phase: 'No calendar/backend needed for prototype.',
  },
  {
    module: 'Scenario Management',
    component: 'Scenario library',
    prototype: 'Launch / withdrawal scenario with configurable practice or assessment mode.',
    phase: 'Add incident list placeholders: high occupancy, train system malfunction.',
  },
  {
    module: 'Scenario Runtime',
    component: 'Dynamic mode',
    prototype: 'IOS can observe live state and inject extra incidents into the three monitors.',
    phase: 'Current prototype covers door fault; more incidents can be added.',
  },
  {
    module: 'Report Management',
    component: 'Performance report',
    prototype: 'Post-session report tracks steps completed, rejected actions, and response review.',
    phase: 'Accuracy percentage and response timing can be expanded later.',
  },
]

function DemoGuideScreen({ onNavigate, resetSession, session }: DemoGuideScreenProps) {
  const completedTasks = Object.values(session.scenarioTasks).filter(Boolean).length

  const prepareDemo = (trainingMode: TrainingMode = 'PRACTICE') => {
    resetSession(trainingMode)
    onNavigate('/ios/scenarios')
  }

  const openDemoLayout = () => {
    resetSession('PRACTICE')

    monitorPlan.forEach((item, index) => {
      window.open(
        item.route,
        `occ-demo-${index + 1}`,
        `popup=yes,width=1280,height=1040,left=${index * 90},top=${index * 45}`,
      )
    })
  }

  return (
    <main
      className="guide-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="guide-header">
        <div className="guide-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Client Demo Mode</p>
            <h1>Golden Path Walkthrough</h1>
            <span>Three-monitor OCC training walkthrough</span>
          </div>
        </div>
        <div className="guide-actions">
          <button type="button" onClick={() => prepareDemo('PRACTICE')}>Prepare Demo</button>
          <button type="button" onClick={() => onNavigate('/')}>Back to Launch</button>
          <button type="button" onClick={() => onNavigate('/ios/modules')}>IOS Modules</button>
          <button type="button" onClick={() => onNavigate('/session/join')}>Trainee Lobby</button>
          <button type="button" onClick={() => onNavigate('/ios/scenarios')}>Scenario Builder</button>
          <button type="button" onClick={() => onNavigate('/ios/assessment')}>Rubric</button>
          <button type="button" onClick={openDemoLayout}>Open Demo Layout</button>
        </div>
      </header>

      <section className="guide-hero">
        <div>
          <p className="guide-eyebrow">Prototype objective</p>
          <h2>Run one polished scenario from setup to report.</h2>
          <p>
            The client should see one controlled scenario run across the real-feeling
            OCC monitors: alarm appears, train is selected, route is applied,
            dispatch is executed, timetable impact is visible, and the trainer gets
            a report.
          </p>
        </div>
        <div className="guide-demo-card">
          <span>Target demo</span>
          <strong>5-7 min</strong>
          <small>One complete guided run is enough for the prototype review.</small>
        </div>
      </section>

      <SessionRunway session={session} />

      <section className="guide-demo-console">
        <article className="guide-demo-status">
          <p className="guide-eyebrow">Live demo status</p>
          <h2>{session.activeScenario.title}</h2>
          <div>
            <span>Mode</span>
            <strong>{session.trainingMode}</strong>
          </div>
          <div>
            <span>Runtime</span>
            <strong>{session.scenarioMode}</strong>
          </div>
          <div>
            <span>Checklist</span>
            <strong>{completedTasks}/5 complete</strong>
          </div>
          <div>
            <span>Evidence</span>
            <strong>{session.evidenceLog.length} records</strong>
          </div>
        </article>

        <article className="guide-demo-actions">
          <p className="guide-eyebrow">Quick launch</p>
          <h2>Presenter controls</h2>
          <div>
            <button type="button" onClick={() => prepareDemo('PRACTICE')}>Reset + Load Scenario</button>
            <button type="button" onClick={() => onNavigate('/ios')}>Open IOS Control</button>
            <button type="button" onClick={openDemoLayout}>Open 3 Monitors + IOS</button>
            <button type="button" onClick={() => onNavigate('/report')}>Open Report</button>
          </div>
        </article>
      </section>

      <section className="guide-grid">
        <article className="guide-panel guide-wide">
          <div className="guide-panel-title">
            <p>Golden path</p>
            <span>Use this during the client walkthrough</span>
          </div>
          <div className="guide-runner-list">
            {demoSteps.map((item, index) => (
              <div className="guide-runner-step" key={item.step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{item.step}</strong>
                  <p>{item.script}</p>
                </div>
                <button type="button" onClick={() => onNavigate(item.route)}>{item.action}</button>
              </div>
            ))}
          </div>
        </article>

        <article className="guide-panel">
          <div className="guide-panel-title">
            <p>Screen setup</p>
            <span>Open on separate monitors</span>
          </div>
          {monitorPlan.map((item) => (
            <button
              type="button"
              className="guide-screen-row"
              onClick={() => window.open(item.route, item.label, 'popup=yes,width=1280,height=1040')}
              key={item.label}
            >
              <strong>{item.label}</strong>
              <span>{item.purpose}</span>
            </button>
          ))}
        </article>

        <article className="guide-panel">
          <div className="guide-panel-title">
            <p>Run order</p>
            <span>Client-facing script</span>
          </div>
          {demoSteps.map((item, index) => (
            <div className="guide-step" key={item.step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{item.step}</p>
            </div>
          ))}
        </article>

        <article className="guide-panel guide-wide">
          <div className="guide-panel-title">
            <p>Prototype modules</p>
            <span>Training product structure</span>
          </div>
          <div className="guide-module-grid">
            {prototypeModules.map((item) => (
              <div className="guide-module-card" key={item.name}>
                <strong>{item.name}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="guide-panel guide-wide">
          <div className="guide-panel-title">
            <p>IOS trainer scope</p>
            <span>From proposal table</span>
          </div>
          <div className="guide-ios-table">
            <div className="guide-ios-head">Module</div>
            <div className="guide-ios-head">Component</div>
            <div className="guide-ios-head">Prototype treatment</div>
            <div className="guide-ios-head">Implementation note</div>
            {iosTrainerModules.map((item) => (
              <div className="guide-ios-row" key={item.module}>
                <strong>{item.module}</strong>
                <span>{item.component}</span>
                <p>{item.prototype}</p>
                <em>{item.phase}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="guide-panel guide-wide">
          <div className="guide-panel-title">
            <p>Player mode</p>
            <span>Prototype vs future build</span>
          </div>
          <div className="guide-player-grid">
            <div>
              <strong>Single Crew</strong>
              <span>Supported now as the main prototype flow: one trainee/operator works the three-monitor drill.</span>
            </div>
            <div>
              <strong>Multi Crew</strong>
              <span>Represent as a future-provisioned mode for traffic controllers, station managers, and engineers joining the same instance.</span>
            </div>
            <div>
              <strong>Prototype position</strong>
              <span>Show the concept and screen roles now; real multiplayer identity, permissions, and collaboration can be built in actual development.</span>
            </div>
          </div>
        </article>

        <article className="guide-panel guide-wide">
          <div className="guide-panel-title">
            <p>What to prepare before the review</p>
            <span>Prototype scope</span>
          </div>
          <div className="guide-checklist">
            <span>Confirm browser pop-ups are allowed for the demo layout.</span>
            <span>Keep the OCC monitor reference screenshots nearby for visual comparison.</span>
            <span>Use IOS as the trainer console, not an iPad-only interface.</span>
            <span>Explain that the current build syncs the three screens through the local backend first, with SharedWorker and BroadcastChannel retained as demo fallbacks.</span>
          </div>
        </article>
      </section>
    </main>
  )
}

export default DemoGuideScreen
