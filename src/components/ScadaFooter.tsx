import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import footerAdminIcon from '../assets/toolbar-icons/admin.png'
import footerCardIcon from '../assets/toolbar-icons/card.png'
import footerCommandIcon from '../assets/toolbar-icons/command.png'
import footerComsIcon from '../assets/toolbar-icons/coms.png'
import footerDeviceArrowIcon from '../assets/toolbar-icons/device_arrow.png'
import footerDocumentSearchIcon from '../assets/toolbar-icons/document_search.png'
import footerEcsIcon from '../assets/toolbar-icons/ecs.png'
import footerHelpIcon from '../assets/toolbar-icons/help.png'
import footerLayoutIcon from '../assets/toolbar-icons/layout.png'
import footerMoveArrowsIcon from '../assets/toolbar-icons/move_arrows.png'
import footerNavLayoutLeftIcon from '../assets/toolbar-icons/nav_layout_left.png'
import footerNavLayoutRightIcon from '../assets/toolbar-icons/nav_layout_right.png'
import footerNavWindowLeftIcon from '../assets/toolbar-icons/nav_window_left.png'
import footerNavWindowRightIcon from '../assets/toolbar-icons/nav_window_right.png'
import footerNetworkGearsIcon from '../assets/toolbar-icons/network_gears.png'
import footerPowerIcon from '../assets/toolbar-icons/power.png'
import footerPrinterIcon from '../assets/toolbar-icons/printer.png'
import footerTrafficIcon from '../assets/toolbar-icons/traffic.png'
import footerUtilityIcon from '../assets/toolbar-icons/utility.png'
import footerWindowPairIcon from '../assets/toolbar-icons/window_pair.png'
import footerWindowPanelIcon from '../assets/toolbar-icons/window_panel.png'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ScadaFooterProps = {
  active: string
  compact?: boolean
  leftMode: string
  onModeSelect?: (mode: string) => void
  onToolSelect?: (tool: string) => void
  status: string
}

function formatClock(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')

  return {
    date: `${WEEKDAY_LABELS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  }
}

function FooterButton({
  className = '',
  icon,
  label,
  onClick,
  style,
}: {
  className?: string
  icon?: string
  label: string
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <button className={`scada-dom-button ${className}`} onClick={onClick} style={style} type="button">
      {icon ? (
        <>
          <img alt="" draggable={false} src={icon} />
          <span>{label}</span>
        </>
      ) : label}
    </button>
  )
}

function FooterClock() {
  const [now, setNow] = useState(() => new Date())
  const display = formatClock(now)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="scada-dom-clock" title={`Current workstation time: ${display.time} ${display.date}`}>
      <span>{display.time}</span>
      <span>{display.date}</span>
    </div>
  )
}

export default function ScadaFooter({
  active,
  compact = false,
  leftMode,
  onModeSelect,
  onToolSelect,
  status,
}: ScadaFooterProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [footerNote, setFooterNote] = useState('')
  const primaryButtons = [
    { icon: footerLayoutIcon, label: 'LAYOUT', tool: 'LAYOUT', width: 108, x: 1 },
    { icon: footerCommandIcon, label: 'COMMAND', tool: 'COMMAND', width: 108, x: 129 },
    { icon: footerPowerIcon, label: 'POWER', tool: 'POWER', width: 108, x: 257 },
    { icon: footerEcsIcon, label: 'E C S', tool: 'E C S', width: 108, x: 385 },
    { icon: footerTrafficIcon, label: 'TRAFFIC', tool: 'TRAFFIC', width: 108, x: 513 },
    { icon: footerComsIcon, label: 'COMS', tool: 'COMS', width: 108, x: 641 },
    { icon: footerUtilityIcon, label: 'UTILITY', tool: 'UTILITY', width: 108, x: 769 },
    { icon: footerAdminIcon, label: 'ADMIN', tool: 'ADMIN', width: 108, x: 897 },
  ]
  const navButtons = [
    { icon: footerNavLayoutLeftIcon, label: 'Previous layout page', tool: 'NAV LAYOUT LEFT', width: 44, x: 1029 },
    { icon: footerNavLayoutRightIcon, label: 'Next layout page', tool: 'NAV LAYOUT RIGHT', width: 47, x: 1073 },
    { icon: footerNavWindowLeftIcon, label: 'Previous window', tool: 'NAV WINDOW LEFT', width: 44, x: 1132 },
    { icon: footerNavWindowRightIcon, label: 'Next window', tool: 'NAV WINDOW RIGHT', width: 47, x: 1176 },
  ]
  const secondaryButtons = [
    { x: 31, w: 58, label: 'Point No.' },
    { x: 96, w: 58, label: 'Track No.' },
    { x: 165, w: 60, label: 'FB No.' },
    { x: 236, w: 62, label: 'Signal No.' },
    { x: 305, w: 60, label: 'Train' },
    { x: 367, w: 84, label: 'NorthBound' },
    { x: 451, w: 83, label: 'SouthBound' },
  ]
  const iconButtons = [
    { icon: footerMoveArrowsIcon, label: 'Move view', tool: 'MOVE', x: 550 },
    { icon: footerDocumentSearchIcon, label: 'Search document', tool: 'DOCUMENT SEARCH', x: 596 },
    { icon: footerWindowPairIcon, label: 'Open sheet', tool: 'SHEET', x: 642 },
    { icon: footerWindowPanelIcon, label: 'Open panel', tool: 'PANEL', x: 688 },
    { icon: footerNetworkGearsIcon, label: 'Comms tools', tool: 'COMMS TOOLS', x: 746 },
    { icon: footerCardIcon, label: 'Card', tool: 'CARD', x: 792 },
    { icon: footerDeviceArrowIcon, label: 'Device control', tool: 'DEVICE', x: 838 },
  ]
  const statusTool = activeTool ?? active
  const statusMode = activeMode ?? leftMode

  const selectTool = (tool: string, note: string) => {
    setActiveTool(tool)
    setFooterNote(note)
    onToolSelect?.(tool)
  }

  const selectMode = (mode: string) => {
    setActiveMode(mode)
    setFooterNote(`${mode} mode selected`)
    onModeSelect?.(mode)
  }

  return (
    <div className={`scada-dom-footer${compact ? ' scada-dom-footer--compact' : ''}`}>
      {!compact && primaryButtons.map((button) => (
        <FooterButton
          className={`line-map-footer-primary-button${button.tool === activeTool ? ' is-selected' : ''}`}
          icon={button.icon}
          key={button.tool}
          label={button.label}
          onClick={() => selectTool(button.tool, `${button.label} toolbar selected`)}
          style={{ left: button.x, top: 8, width: button.width }}
        />
      ))}
      {!compact && (
        <>
          <div className="line-map-footer-nav-row">
            {navButtons.map((button) => (
              <button
                aria-label={button.label}
                aria-pressed={activeTool === button.tool}
                className={activeTool === button.tool ? 'is-selected' : undefined}
                key={button.tool}
                onClick={() => selectTool(button.tool, button.label)}
                style={{ left: button.x, width: button.width }}
                title={button.label}
                type="button"
              >
                <img alt="" draggable={false} src={button.icon} />
              </button>
            ))}
          </div>
          <button
            aria-label="Help"
            aria-pressed={activeTool === 'HELP'}
            className={`line-map-footer-help-button${activeTool === 'HELP' ? ' is-selected' : ''}`}
            onClick={() => selectTool('HELP', 'Help')}
            type="button"
          >
            <img alt="" draggable={false} src={footerHelpIcon} />
          </button>
        </>
      )}
      {secondaryButtons.map((button) => (
        <FooterButton
          className={[
            'scada-dom-footer-mode-button',
            (button.label === 'NorthBound' || button.label === 'SouthBound' ? 'scada-dom-footer-speed-button' : ''),
            (button.label === activeMode ? 'is-selected' : ''),
          ].filter(Boolean).join(' ')}
          key={button.label}
          label={button.label}
          onClick={() => selectMode(button.label)}
          style={{ left: button.x, top: 54, width: button.w }}
        />
      ))}
      <div className="scada-dom-footer-speed-label">Temporary Speed Restriction</div>
      <div className="line-map-footer-icon-row" style={compact ? { top: 6 } : undefined}>
        {iconButtons.map((item) => (
          <button
            aria-pressed={activeTool === item.tool}
            className={activeTool === item.tool ? 'is-selected' : undefined}
            key={item.tool}
            onClick={() => selectTool(item.tool, item.label)}
            style={{ left: item.x }}
            title={item.label}
            type="button"
          >
            <img alt="" draggable={false} src={item.icon} />
          </button>
        ))}
      </div>
      <button
        aria-label="Print"
        aria-pressed={activeTool === 'PRINTER'}
        className={`line-map-footer-print${activeTool === 'PRINTER' ? ' is-selected' : ''}`}
        onClick={() => selectTool('PRINTER', 'Printer')}
        style={compact ? { top: 7 } : undefined}
        title="Print"
        type="button"
      >
        <img alt="" draggable={false} src={footerPrinterIcon} />
      </button>
      <div className="scada-dom-footer-status">
        <span>{footerNote || status}</span>
        <span>{footerNote ? `${statusTool} / ${statusMode}` : '[ TSR1 ] @ OCC'}</span>
      </div>
      <FooterClock />
    </div>
  )
}
