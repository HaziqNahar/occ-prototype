import { useCallback, useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { fetchOccTransportStatus } from '../backendClient'
import type { AppRoute, ScreenRole, TrainingMode } from '../types'

const screenRoles: ScreenRole[] = [
  {
    number: '01',
    title: 'Alarms',
    description: 'Fault monitoring',
    path: '/screen/alarms',
  },
  {
    number: '02',
    title: 'Line Map',
    description: 'Main control view',
    path: '/screen/line-map',
    featured: true,
  },
  {
    number: '03',
    title: 'Timetable',
    description: 'Coordination view',
    path: '/screen/timetable',
  },
]

const trainingModes: Array<{ mode: TrainingMode; label: string; description: string }> = [
  {
    mode: 'PRACTICE',
    label: 'Practice',
    description: 'Guided hints and step-by-step learning.',
  },
  {
    mode: 'ASSESSMENT',
    label: 'Assessment',
    description: 'Scored, with reduced guidance.',
  },
  {
    mode: 'PLAYER',
    label: 'Player',
    description: 'Auto-run playback for review.',
  },
]

type LoginPageProps = {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
}

function LoginPage({ onNavigate, resetSession }: LoginPageProps) {
  const [sessionHint, setSessionHint] = useState('')
  const [selectedTrainingMode, setSelectedTrainingMode] = useState<TrainingMode>('PRACTICE')

  const checkBackendConnection = useCallback(async () => {
    try {
      await fetchOccTransportStatus()
      return true
    } catch {
      return false
    }
  }, [])

  const openAuxiliaryMonitors = () => {
    const screens: Array<{ name: string; path: AppRoute; left: number; top: number }> = [
      { left: 0, name: 'occ-monitor-1-alarms', path: '/screen/alarms', top: 0 },
      { left: 180, name: 'occ-monitor-3-timetable', path: '/screen/timetable', top: 90 },
    ]
    const blockedScreens: string[] = []

    screens.forEach((screen) => {
      const openedWindow = window.open(
        screen.path,
        screen.name,
      )

      if (!openedWindow) {
        blockedScreens.push(screen.path)
        return
      }

      openedWindow.focus()
    })

    return blockedScreens
  }

  const openThreeMonitorSession = async () => {
    const backendReady = await checkBackendConnection()

    if (!backendReady) {
      setSessionHint('Shared backend is not reachable. Run npm.cmd run backend:lan on the host PC, then open the three-monitor session again.')
      return
    }

    resetSession(selectedTrainingMode)

    const screens: AppRoute[] = ['/screen/alarms', '/screen/line-map', '/screen/timetable']

    screens.forEach((screen) => {
      window.open(screen, '_blank')
    })

    setSessionHint('Opened Alarms, Line Map, and Timetable in browser tabs.')
  }

  return (
    <main
      className="login-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <section className="login-card" aria-labelledby="page-title">
        <div className="brand-panel">
          <div className="brand-panel-top">
            <div className="mode-badge">OCC simulator</div>
            <div className="line-badge">North East Line</div>
          </div>


          <div className="system-chip">
            <span className="status-dot" />
            Training Console
          </div>
          <h1 id="page-title">OCC Training Simulator</h1>
          <p className="brand-copy">
            Three synchronised monitors: alarms, line map and timetable.
          </p>
        </div>

        <form className="access-panel">
          <img src={sbsTransitLogo} alt="SBS Transit" className="access-logo" />

          <div className="panel-heading">
            <p className="eyebrow">Secure access</p>
            <h2>Start training session</h2>
          </div>

          <label className="field">
            <span>Staff ID or email</span>
            <input
              type="text"
              placeholder="controller@sbs.local"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          <div className="session-row">
            <label className="remember">
              <input type="checkbox" defaultChecked />
              <span>Remember workstation</span>
            </label>
          </div>
          <div className="mode-picker is-compact" role="radiogroup" aria-label="Training mode">
            {trainingModes.map((item) => (
              <button
                type="button"
                role="radio"
                aria-checked={item.mode === selectedTrainingMode}
                className={item.mode === selectedTrainingMode ? 'is-selected' : ''}
                onClick={() => setSelectedTrainingMode(item.mode)}
                key={item.mode}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mode-picker-hint">{trainingModes.find((item) => item.mode === selectedTrainingMode)?.description}</p>
          {sessionHint && <p className="session-hint">{sessionHint}</p>}

          <button
            type="button"
            className="primary-action"
            onClick={() => {
              resetSession(selectedTrainingMode)
              const blockedScreens = openAuxiliaryMonitors()

              if (blockedScreens.length) {
                setSessionHint('Tabs/Pop-ups blocked. Use Open 01 + 03 from the Line Map monitor.')
              }

              onNavigate('/screen/line-map')
            }}
          >
            Sign in to OCC
          </button>

          <button
            type="button"
            className="secondary-action"
            onClick={openThreeMonitorSession}
          >
            Open three-monitor session
          </button>


          <div className="monitor-launcher" aria-label="Screen roles">
            {screenRoles.map((role) => (
              <button
                type="button"
                className={`screen-tile ${role.featured ? 'is-featured' : ''}`}
                key={role.number}
                onClick={() => {
                  resetSession(selectedTrainingMode)
                  onNavigate(role.path)
                }}
              >
                <span className="screen-number">{role.number}</span>
                <strong>{role.title}</strong>
                <small>{role.description}</small>
              </button>
            ))}
          </div>
          <nav className="trainer-links" aria-label="Trainer tools">
            <button type="button" onClick={() => onNavigate('/ios/modules')}>Trainer modules</button>
            <button type="button" onClick={() => onNavigate('/ios/scenarios')}>Scenario setup</button>
            <button type="button" onClick={() => onNavigate('/session/join')}>Trainee lobby</button>
          </nav>
        </form>
      </section>

    </main>
  )
}

export default LoginPage
