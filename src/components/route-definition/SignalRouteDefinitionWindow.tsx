import { useEffect, useRef, useState } from 'react'
import usePopupDrag from '../train-control/usePopupDrag'
import Win98HtmlButton from '../train-control/Win98HtmlButton'

type SignalRouteDefinitionWindowProps = {
  equipmentLabel: string
  onClose: () => void
  onSetFleetStatus: (routeLabel: string, status: RouteFleetStatus) => void
  onSet: (routeLabel: string) => void
  onUnset: (routeLabel: string) => void
  routeCommandLabels: readonly string[]
  routeFleetControlDisabledLabels: readonly string[]
  routeFleetStatuses: Readonly<Record<string, RouteFleetStatus>>
  routeLabels: readonly string[]
  routeSetLabels: readonly string[]
  signalLabel: string
  statusText: string
}

type RouteFleetStatus = 'Fleet' | 'Not Fleet'

const ROUTE_SCROLL_TRACK_HEIGHT = 140
const ROUTE_SCROLL_THUMB_HEIGHT = 52

function SignalRouteDefinitionWindow({
  equipmentLabel,
  onClose,
  onSetFleetStatus,
  onSet,
  onUnset,
  routeCommandLabels,
  routeFleetControlDisabledLabels,
  routeFleetStatuses,
  routeLabels,
  routeSetLabels,
  signalLabel,
  statusText,
}: SignalRouteDefinitionWindowProps) {
  const popupDrag = usePopupDrag()
  const confirmationDrag = usePopupDrag()
  const routeTableRef = useRef<HTMLDivElement>(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [hasSelectedRouteRow, setHasSelectedRouteRow] = useState(false)
  const [routeScroll, setRouteScroll] = useState({ max: 1, top: 0 })
  const [routeScrollDrag, setRouteScrollDrag] = useState<{ startScrollTop: number; startY: number } | null>(null)
  const [pendingSetRouteLabel, setPendingSetRouteLabel] = useState<string | null>(null)
  const selectedRouteLabel = hasSelectedRouteRow ? routeLabels[selectedRouteIndex] ?? '' : ''
  const confirmationRouteLabel = pendingSetRouteLabel ?? selectedRouteLabel
  const selectedRouteSet = routeSetLabels.includes(selectedRouteLabel)
  const selectedRouteCommandAvailable = routeCommandLabels.includes(selectedRouteLabel)
  const selectedRouteFleetControlDisabled = routeFleetControlDisabledLabels.includes(selectedRouteLabel)
  const selectedRouteFleetStatus = routeFleetStatuses[selectedRouteLabel] ?? 'Not Fleet'
  const canSetRoute = hasSelectedRouteRow && selectedRouteLabel.length > 0 && selectedRouteCommandAvailable && !selectedRouteSet && pendingSetRouteLabel === null
  const canUnsetRoute = hasSelectedRouteRow && selectedRouteSet
  const canUnfleetRoute = hasSelectedRouteRow && !selectedRouteFleetControlDisabled && selectedRouteFleetStatus === 'Fleet'
  const canFleetRoute = hasSelectedRouteRow && !selectedRouteFleetControlDisabled && selectedRouteFleetStatus === 'Not Fleet'
  const showRouteSetConfirmation = pendingSetRouteLabel !== null

  const updateRouteScroll = () => {
    const table = routeTableRef.current

    if (!table) {
      return
    }

    setRouteScroll({
      max: Math.max(1, table.scrollHeight - table.clientHeight),
      top: table.scrollTop,
    })
  }

  useEffect(() => {
    updateRouteScroll()
  }, [routeLabels, routeSetLabels, signalLabel])

  const applyRouteSet = () => {
    if (!canSetRoute) {
      return
    }

    setPendingSetRouteLabel(selectedRouteLabel)
  }

  const applyRouteUnset = () => {
    if (!canUnsetRoute) {
      return
    }

    setPendingSetRouteLabel(null)
    onUnset(selectedRouteLabel)
  }

  const setRouteScrollTop = (top: number) => {
    const table = routeTableRef.current

    if (!table) {
      return
    }

    table.scrollTop = Math.max(0, Math.min(top, table.scrollHeight - table.clientHeight))
    updateRouteScroll()
  }

  const scrollRouteTable = (direction: -1 | 1) => {
    const table = routeTableRef.current

    if (!table) {
      return
    }

    setRouteScrollTop(table.scrollTop + direction * 54)
  }
  const routeThumbTop = (routeScroll.top / routeScroll.max) * (ROUTE_SCROLL_TRACK_HEIGHT - ROUTE_SCROLL_THUMB_HEIGHT)

  return (
    <div
      className="sig-route-window"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="sig-route-titlebar" {...popupDrag.titleBarProps}>SIG Define Route</div>
      <div className="sig-route-body">
        <h3>{equipmentLabel} (Signal {signalLabel})</h3>
        <fieldset className="sig-route-fieldset">
          <legend>Available Routes</legend>
          <div className="sig-route-column-headings" role="row">
            <span>Route ID</span>
            <span>Set status</span>
            <span>Fleet status</span>
          </div>
          <div className="sig-route-table-frame">
            <div className="sig-route-table" ref={routeTableRef} role="table" aria-label="Available routes" onScroll={updateRouteScroll}>
              {routeLabels.map((routeLabel, index) => {
                const isRouteSet = routeSetLabels.includes(routeLabel)
                const isRouteRowSelected = hasSelectedRouteRow && selectedRouteIndex === index
                const routeFleetControlDisabled = routeFleetControlDisabledLabels.includes(routeLabel)
                const routeFleetStatus = routeFleetControlDisabled ? '' : routeFleetStatuses[routeLabel] ?? 'Not Fleet'

                return (
                  <button
                    className={`sig-route-row ${isRouteSet || isRouteRowSelected ? 'is-selected' : ''}`}
                    key={routeLabel}
                    onClick={() => {
                      setSelectedRouteIndex(index)
                      setHasSelectedRouteRow(true)
                    }}
                    role="row"
                    type="button"
                  >
                    <span>{routeLabel}</span>
                    <span>{isRouteSet ? 'Set' : 'Not Set'}<i /></span>
                    <span>{routeFleetStatus}<i className={routeFleetControlDisabled ? 'is-disabled' : undefined} /></span>
                  </button>
                )
              })}
              {Array.from({ length: Math.max(0, 9 - routeLabels.length) }, (_, index) => (
                <div className="sig-route-row" key={`blank-${index}`} role="row">
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
            <div className="sig-route-scrollbar">
              <button aria-label="Scroll available routes up" onClick={() => scrollRouteTable(-1)} type="button">
                <span />
              </button>
              <div
                onPointerDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return
                  }

                  const bounds = event.currentTarget.getBoundingClientRect()
                  scrollRouteTable(event.clientY - bounds.top < routeThumbTop ? -1 : 1)
                }}
              >
                <span
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setRouteScrollDrag({
                      startScrollTop: routeTableRef.current?.scrollTop ?? 0,
                      startY: event.clientY,
                    })
                  }}
                  onPointerMove={(event) => {
                    if (!routeScrollDrag) {
                      return
                    }

                    event.stopPropagation()
                    const trackTravel = ROUTE_SCROLL_TRACK_HEIGHT - ROUTE_SCROLL_THUMB_HEIGHT
                    const scrollDelta = ((event.clientY - routeScrollDrag.startY) / trackTravel) * routeScroll.max
                    setRouteScrollTop(routeScrollDrag.startScrollTop + scrollDelta)
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation()
                    setRouteScrollDrag(null)
                  }}
                  style={{ top: routeThumbTop }}
                />
              </div>
              <button aria-label="Scroll available routes down" onClick={() => scrollRouteTable(1)} type="button">
                <span />
              </button>
            </div>
          </div>
        </fieldset>
        <div className="sig-route-actions">
          <button disabled={!canUnsetRoute} onClick={applyRouteUnset} type="button">Unset</button>
          <button
            disabled={!canSetRoute}
            onMouseDown={(event) => {
              event.preventDefault()
              applyRouteSet()
            }}
            onPointerDown={(event) => {
              event.preventDefault()
              applyRouteSet()
            }}
            onClick={applyRouteSet}
            type="button"
          >
            Set
          </button>
          <button
            disabled={!canUnfleetRoute}
            onClick={() => onSetFleetStatus(selectedRouteLabel, 'Not Fleet')}
            type="button"
          >
            Unfleet
          </button>
          <button
            disabled={!canFleetRoute}
            onClick={() => onSetFleetStatus(selectedRouteLabel, 'Fleet')}
            type="button"
          >
            Fleet
          </button>
        </div>
        <label className="sig-route-status">
          <span>Status</span>
          <output>
            {selectedRouteSet ? 'Route set successful' : !hasSelectedRouteRow || selectedRouteCommandAvailable ? statusText : 'Route command unavailable'}
          </output>
        </label>
        <div className="sig-route-footer">
          <button type="button">Help</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
      {showRouteSetConfirmation ? (
        <div
          className="train-command-confirmation sig-route-command-confirmation"
          onPointerDown={(event) => event.stopPropagation()}
          style={confirmationDrag.style}
        >
          <div className="train-command-confirmation__title" {...confirmationDrag.titleBarProps}>Command confirmation</div>
          <fieldset>
            <legend>Please confirm command...</legend>
            <div className="train-command-confirmation__grid">
              <label>Equipment</label>
              <div>{equipmentLabel} (Signal {signalLabel})</div>
              <label>Attribute</label>
              <div>{confirmationRouteLabel}</div>
              <label>Command</label>
              <div>SET</div>
              <label>No wait</label>
              <input type="checkbox" />
            </div>
          </fieldset>
          <div className="train-command-confirmation__actions">
            <Win98HtmlButton>Help</Win98HtmlButton>
            <span />
            <Win98HtmlButton
              onClick={() => {
                setPendingSetRouteLabel(null)
                onSet(confirmationRouteLabel)
              }}
            >
              Confirm
            </Win98HtmlButton>
            <Win98HtmlButton
              onClick={() => {
                setPendingSetRouteLabel(null)
              }}
            >
              Cancel
            </Win98HtmlButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SignalRouteDefinitionWindow
