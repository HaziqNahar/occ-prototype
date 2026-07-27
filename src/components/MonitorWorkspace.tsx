import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
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

const SCADA_WINDOW_WIDTH = 1293
const SCADA_WINDOW_HEIGHT = 1111

function getScadaWindowScale() {
  if (typeof window === 'undefined') {
    return 1
  }

  return Math.min(
    1,
    window.innerWidth / SCADA_WINDOW_WIDTH,
    window.innerHeight / SCADA_WINDOW_HEIGHT,
  )
}

function MonitorWorkspace({
  children,
  extraActions,
  monitorLabel,
  onNavigate,
  scadaFirst = false,
  title,
}: MonitorWorkspaceProps) {
  const fitsScadaViewport = scadaFirst
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [windowNote, setWindowNote] = useState('SCADA window ready')
  const [scadaWindowScale, setScadaWindowScale] = useState(() => (
    fitsScadaViewport ? getScadaWindowScale() : 1
  ))
  const menuItems = ['File', 'View', 'Command', 'Power', 'ECS', 'Traffic', 'Comms', 'Admin', 'Help']

  useEffect(() => {
    if (!fitsScadaViewport) {
      return undefined
    }

    const fitWindowToViewport = () => setScadaWindowScale(getScadaWindowScale())
    fitWindowToViewport()
    window.addEventListener('resize', fitWindowToViewport)

    return () => window.removeEventListener('resize', fitWindowToViewport)
  }, [fitsScadaViewport])

  const scadaFrameStyle = fitsScadaViewport
    ? {
        '--scada-frame-height': `${SCADA_WINDOW_HEIGHT * scadaWindowScale}px`,
        '--scada-frame-width': `${SCADA_WINDOW_WIDTH * scadaWindowScale}px`,
      } as CSSProperties
    : undefined

  const scadaWindowStyle = fitsScadaViewport
    ? {
        transform: `scale(${scadaWindowScale})`,
        transformOrigin: 'top left',
      } satisfies CSSProperties
    : undefined

  return (
    <main className={`occ-workspace ${scadaFirst ? 'occ-workspace--scada-first occ-workspace--scada-fit' : ''}`}>
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
          <button type="button" onClick={() => onNavigate('/')}>Back to Launch</button>
        </div>
      </header>

      <section className="occ-monitor-frame" aria-label="Line map monitor frame" style={scadaFrameStyle}>
        <div
          className={`win98-window ${isMaximized ? 'is-maximized' : ''}`}
          role="group"
          aria-label={`${title} Windows 98 SCADA window`}
          style={scadaWindowStyle}
        >
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
                  setWindowNote(isMaximized ? 'Window restored to training frame' : 'Window maximized inside OCC shell')
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

export default MonitorWorkspace
