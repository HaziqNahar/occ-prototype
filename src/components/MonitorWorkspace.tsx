import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { MONITOR_HEIGHT, MONITOR_WIDTH } from '../screens/line-map/model'
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

// Full screen (F11) on a monitor PC: the real SCADA screens have no window
// title, menu or status rows.
function isBrowserFullScreen() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(display-mode: fullscreen)').matches
    || Boolean(document.fullscreenElement)
    || (window.innerWidth >= window.screen.width && window.innerHeight >= window.screen.height)
}

function getScadaWindowScale(fullScreen: boolean) {
  if (typeof window === 'undefined') {
    return 1
  }

  // Full screen fills the monitor; in a window, the SCADA window never grows past its native size.
  return fullScreen
    ? Math.min(window.innerWidth / MONITOR_WIDTH, window.innerHeight / MONITOR_HEIGHT)
    : Math.min(
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
  const [fullScreen, setFullScreen] = useState(() => fitsScadaViewport && isBrowserFullScreen())
  const [scadaWindowScale, setScadaWindowScale] = useState(() => (
    fitsScadaViewport ? getScadaWindowScale(isBrowserFullScreen()) : 1
  ))
  const menuItems = ['File', 'View', 'Command', 'Power', 'ECS', 'Traffic', 'Comms', 'Admin', 'Help']

  useEffect(() => {
    if (!fitsScadaViewport) {
      return undefined
    }

    const fullScreenQuery = window.matchMedia('(display-mode: fullscreen)')
    const fitWindowToViewport = () => {
      const nextFullScreen = isBrowserFullScreen()

      setFullScreen(nextFullScreen)
      setScadaWindowScale(getScadaWindowScale(nextFullScreen))
    }
    fitWindowToViewport()
    window.addEventListener('resize', fitWindowToViewport)
    fullScreenQuery.addEventListener('change', fitWindowToViewport)

    return () => {
      window.removeEventListener('resize', fitWindowToViewport)
      fullScreenQuery.removeEventListener('change', fitWindowToViewport)
    }
  }, [fitsScadaViewport])

  const scadaFrameWidth = fullScreen ? MONITOR_WIDTH : SCADA_WINDOW_WIDTH
  const scadaFrameHeight = fullScreen ? MONITOR_HEIGHT : SCADA_WINDOW_HEIGHT
  const scadaFrameStyle = fitsScadaViewport
    ? {
        '--scada-frame-height': `${scadaFrameHeight * scadaWindowScale}px`,
        '--scada-frame-width': `${scadaFrameWidth * scadaWindowScale}px`,
      } as CSSProperties
    : undefined

  const scadaWindowStyle = fitsScadaViewport
    ? {
        transform: `scale(${scadaWindowScale})`,
        transformOrigin: 'top left',
      } satisfies CSSProperties
    : undefined

  return (
    <main className={`occ-workspace ${scadaFirst ? 'occ-workspace--scada-first occ-workspace--scada-fit' : ''} ${fullScreen ? 'occ-workspace--full-screen' : ''}`}>
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
          <button type="button" onClick={() => onNavigate('/')}>Exit</button>
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
