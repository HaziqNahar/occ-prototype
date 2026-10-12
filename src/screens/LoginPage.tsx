import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import type { AppRoute } from '../types'

type LoginPageProps = {
  onNavigate: (route: AppRoute) => void
}

const monitorWindows: Array<{ name: string; path: AppRoute }> = [
  { name: 'occ-monitor-1-alarms', path: '/screen/alarms' },
  { name: 'occ-monitor-2-line-map', path: '/screen/line-map' },
  { name: 'occ-monitor-3-timetable', path: '/screen/timetable' },
]

// Start page: one training session, two roles. The trainer runs it from the
// Trainer Console; the trainee joins and works on the three OCC monitors.
function LoginPage({ onNavigate }: LoginPageProps) {
  const openMonitors = () => {
    monitorWindows.forEach((monitor) => window.open(monitor.path, monitor.name))
  }

  return (
    <main
      className="start-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <section className="start-card" aria-labelledby="start-title">
        <header className="start-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>North East Line</p>
            <h1 id="start-title">OCC Training Simulator</h1>
          </div>
        </header>

        <h2 className="start-question">Who are you in this session?</h2>

        <div className="start-roles">
          <button type="button" className="start-role is-trainer" onClick={() => onNavigate('/ios/modules')}>
            <span className="start-role-tag">Trainer</span>
            <strong>Run the session</strong>
            <span>Choose and start a scenario, watch the trainee's actions and score the run.</span>
          </button>
          <button type="button" className="start-role is-trainee" onClick={() => onNavigate('/session/join')}>
            <span className="start-role-tag">Trainee</span>
            <strong>Join as Traffic Controller</strong>
            <span>Enter the session code from your trainer, then work on the OCC monitors.</span>
          </button>
        </div>

        <footer className="start-footer">
          <span>Setting up a monitor PC?</span>
          <button type="button" onClick={openMonitors}>Open the three OCC monitors</button>
        </footer>
      </section>
    </main>
  )
}

export default LoginPage
