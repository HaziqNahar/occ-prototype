import type { CSSProperties } from 'react'
import type { PublicUser } from '../accounts'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { openOccMonitors } from '../occMonitors'
import type { AppRoute } from '../types'

type LoginPageProps = {
  onNavigate: (route: AppRoute) => void
  onSignOut: () => void
  user: PublicUser | null
}

// Start page after sign-in: what this person can open. Without accounts
// (no backend), both roles are offered.
function LoginPage({ onNavigate, onSignOut, user }: LoginPageProps) {
  const isTrainer = !user || user.role === 'trainer'
  const isTrainee = !user || user.role === 'trainee'

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

        <h2 className="start-question">{user ? `Signed in as ${user.name}` : 'Who are you in this session?'}</h2>

        <div className="start-roles">
          {isTrainer && (
            <button type="button" className="start-role is-trainer" onClick={() => onNavigate('/ios/modules')}>
              <span className="start-role-tag">Trainer</span>
              <strong>Run the session</strong>
              <span>Choose and start a scenario, watch the trainee's actions and score the run.</span>
            </button>
          )}
          {isTrainee && (
            <button type="button" className="start-role is-trainee" onClick={() => onNavigate('/session/join')}>
              <span className="start-role-tag">Trainee</span>
              <strong>Join as Traffic Controller</strong>
              <span>Enter the session code from your trainer, then work on the OCC monitors.</span>
            </button>
          )}
          {user?.admin && (
            <button type="button" className="start-role is-trainer" onClick={() => onNavigate('/admin')}>
              <span className="start-role-tag">Admin</span>
              <strong>People</strong>
              <span>Add trainers and trainees, reset passwords and switch accounts off.</span>
            </button>
          )}
        </div>

        <footer className="start-footer">
          <span>Setting up a monitor PC?</span>
          <button type="button" onClick={() => openOccMonitors()}>Open the three OCC monitors</button>
          {user && <button type="button" onClick={onSignOut}>Sign out</button>}
        </footer>
      </section>
    </main>
  )
}

// Shown when a signed-in person opens a page that is not for their role.
export function AccessNotice({ onNavigate, onSignOut, text, user }: { onNavigate: (route: AppRoute) => void; onSignOut: () => void; text: string; user: PublicUser }) {
  return (
    <main className="trainee-shell" style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}>
      <section className="trainee-card" aria-labelledby="access-title">
        <header className="start-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Signed in as {user.name} ({user.role})</p>
            <h1 id="access-title">Not available</h1>
          </div>
        </header>
        <div className="trainee-join">
          <p className="sign-in-note" role="alert">{text}</p>
          <button type="button" onClick={() => onNavigate('/')}>Go to the start page</button>
          <button type="button" className="trainee-leave" onClick={onSignOut}>Sign out</button>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
