import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
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

const sessionStats = [
  {
    label: 'Alarm',
    value: 'Door fault pending',
    tone: 'alert',
  },
  {
    label: 'Line',
    value: '5 trains active',
    tone: 'map',
  },
  {
    label: 'Timer',
    value: '05:00 target',
    tone: 'time',
  },
]

const launchSteps = [
  'Trainer creates session',
  'Open three monitor views',
  'Start synchronized scenario',
]

const trainingModes: Array<{ mode: TrainingMode; label: string; description: string }> = [
  {
    mode: 'PRACTICE',
    label: 'Practice',
    description: 'Guided hints, trainer override, and step-by-step learning.',
  },
  {
    mode: 'ASSESSMENT',
    label: 'Assessment',
    description: 'Reduced guidance with scoring and rejected-action review.',
  },
  {
    mode: 'PLAYER',
    label: 'Player',
    description: 'Auto-run playback for client walkthroughs and demos.',
  },
]

type LoginPageProps = {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
}

function LoginPage({ onNavigate, resetSession }: LoginPageProps) {
  const [sessionHint, setSessionHint] = useState('')
  const [selectedTrainingMode, setSelectedTrainingMode] = useState<TrainingMode>('PRACTICE')

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
        `popup=yes,width=1280,height=1040,left=${screen.left},top=${screen.top}`,
      )

      if (!openedWindow) {
        blockedScreens.push(screen.path)
        return
      }

      openedWindow.focus()
    })

    return blockedScreens
  }

  const openThreeMonitorSession = () => {
    resetSession(selectedTrainingMode)

    const screens: AppRoute[] = ['/screen/alarms', '/screen/line-map', '/screen/timetable']
    const width = 1280
    const height = 1040

    screens.forEach((screen, index) => {
      window.open(
        screen,
        `occ-monitor-${index + 1}`,
        `popup=yes,width=${width},height=${height},left=${index * 80},top=${index * 40}`,
      )
    })
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
            <div className="line-badge">NEL / DTL ready</div>
          </div>

          <div className="scenario-card" aria-label="Scenario brief">
            <p>Scenario Brief</p>
            <strong>Train Launch and Withdrawal</strong>
            <div className="scenario-meta">
              <span>Practice Mode</span>
              <span>Target: 5 min</span>
            </div>
          </div>

          <div className="system-chip">
            <span className="status-dot" />
            Prototype Console
          </div>
          <h1 id="page-title">OCC Training Simulator</h1>
          <p className="brand-copy">
            Launch a synchronized three-monitor training session for alarms,
            line map controls, and timetable coordination.
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
            <button
              type="button"
              className="text-link"
              onClick={() => setSessionHint('Use Open three-monitor session for the client demo, or Sign in to OCC for single-screen line map testing.')}
            >
              Session help
            </button>
          </div>
          {sessionHint && <p className="session-hint">{sessionHint}</p>}

          <button
            type="button"
            className="primary-action"
            onClick={() => {
              resetSession(selectedTrainingMode)
              const blockedScreens = openAuxiliaryMonitors()

              if (blockedScreens.length) {
                setSessionHint('Pop-ups blocked. Use Open 01 + 03 from the Line Map monitor.')
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

          <button
            type="button"
            className="tertiary-action"
            onClick={() => onNavigate('/ios/modules')}
          >
            Open IOS trainer modules
          </button>

          <button
            type="button"
            className="tertiary-action secondary-link"
            onClick={() => onNavigate('/session/join')}
          >
            Open trainee lobby
          </button>

          <button
            type="button"
            className="tertiary-action secondary-link"
            onClick={() => onNavigate('/ios/scenarios')}
          >
            Open scenario builder
          </button>

          <button
            type="button"
            className="tertiary-action secondary-link"
            onClick={() => onNavigate('/guide')}
          >
            View prototype demo guide
          </button>

          <div className="mode-picker" aria-label="Training mode selection">
            {trainingModes.map((item) => (
              <button
                type="button"
                className={item.mode === selectedTrainingMode ? 'is-selected' : ''}
                onClick={() => setSelectedTrainingMode(item.mode)}
                key={item.mode}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

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
        </form>
      </section>

      <aside className="session-preview" aria-label="Session preview">
        <div className="preview-header">
          <div>
            <p className="eyebrow">Ready scenario</p>
            <h2>Train launch and withdrawal</h2>
          </div>
          <span className="live-badge">IOS linked</span>
        </div>

        <div className="preview-grid">
          {sessionStats.map((stat) => (
            <div className={`preview-card ${stat.tone}`} key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="timeline">
          {launchSteps.map((step, index) => (
            <div
              className={`timeline-step ${index === 0 ? 'is-active' : ''}`}
              key={step}
            >
              <span />
              <p>{step}</p>
            </div>
          ))}
        </div>
      </aside>
    </main>
  )
}

export default LoginPage
