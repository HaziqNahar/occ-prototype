import { useState } from 'react'
import { getTrainReadinessDisplayValue, platformData } from '../../screens/line-map/model'
import type { TrainState } from '../../types'
import type { InspectorPage, TrainAuxiliaryView } from './trainControlTypes'
import usePopupDrag from './usePopupDrag'

type SignalContextMenuProps = {
  onClose: () => void
  onDefineRoute: () => void
  onOpenDetails: () => void
  onOpenInspector: () => void
  title: string
  x: number
  y: number
}

export function SignalContextMenu({
  onClose,
  onDefineRoute,
  onOpenDetails,
  onOpenInspector,
  title,
  x,
  y,
}: SignalContextMenuProps) {
  return (
    <div
      className="line-map-signal-menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: x, top: y }}
    >
      <div className="line-map-signal-menu-title">{title}</div>
      <button type="button" onClick={onOpenInspector}>
        <span>Open inspector...</span>
        <span>&gt;</span>
      </button>
      <button type="button" onClick={onOpenDetails}>
        <span>Open details...</span>
        <span>&gt;</span>
      </button>
      <button className="has-divider" type="button" onClick={onDefineRoute}>Define Route</button>
      <button type="button" onClick={onClose}>Define Beginning of Route</button>
      <button className="has-divider" type="button" onClick={onClose}>Work request</button>
    </div>
  )
}

type TrainAuxiliaryPanelProps = {
  onClose: () => void
  train: TrainState
  view: TrainAuxiliaryView
}

export function TrainAuxiliaryPanel({
  onClose,
  train,
  view,
}: TrainAuxiliaryPanelProps) {
  const popupDrag = usePopupDrag()
  const trainRef = `EMU/${train.id}/TRN/XXXXXXXX`
  const nearestPlatform = platformData.reduce((closest, platform) => (
    Math.abs(platform.x - train.x) < Math.abs(closest.x - train.x) ? platform : closest
  ))
  const viewMeta: Record<TrainAuxiliaryView, {
    title: string
    heading: string
    status: string
    rows: Array<[string, string]>
  }> = {
    alarms: {
      title: `Alarms: ${trainRef}`,
      heading: `Train ${train.id} active alarms`,
      status: train.status === 'HOLD' ? 'Action needed (from operator for recovery)' : 'No active train alarm selected',
      rows: [
        ['SIG', `Train ${train.id}: Train ITAMA Status`],
        ['TRN', train.status === 'HOLD' ? 'Train readiness mode request' : 'Train status normal'],
        ['OCC', 'Alarm list opened from line map command menu'],
      ],
    },
    cctv: {
      title: `Restricted CCTV: ${trainRef}`,
      heading: 'Restricted CCTV',
      status: 'Restricted CCTV request logged for trainer review',
      rows: [
        ['Station', nearestPlatform.code],
        ['Platform', `${nearestPlatform.code}${train.service}`],
        ['Access', 'Restricted operator function'],
      ],
    },
    details: {
      title: `Details: ${trainRef}`,
      heading: `Train ${train.id} details`,
      status: 'Details page opened',
      rows: [
        ['Train number', train.id.padStart(3, '0')],
        ['Current station', nearestPlatform.code],
        ['Service', train.service],
        ['State', train.status],
      ],
    },
    'pec-reset': {
      title: `PEC Reset: ${trainRef}`,
      heading: 'PEC Reset All',
      status: 'PEC reset request prepared. No reset applied in prototype.',
      rows: [
        ['Equipment', trainRef],
        ['Command', 'PEC RESET ALL'],
        ['Result', 'Request only'],
      ],
    },
    pis: {
      title: `Restricted PIS: ${trainRef}`,
      heading: 'Restricted PIS',
      status: 'Restricted PIS request logged for trainer review',
      rows: [
        ['Station', nearestPlatform.code],
        ['Platform', `${nearestPlatform.code}${train.service}`],
        ['Access', 'Restricted passenger information function'],
      ],
    },
    regulation: {
      title: `Regulation parameters: ${trainRef}`,
      heading: 'Regulation parameters',
      status: 'Regulation parameters opened',
      rows: [
        ['Threshold', train.status === 'HOLD' ? '0' : '50'],
        ['Peak mode', train.id === '317' ? 'Peak' : 'Not Peak'],
        ['Readiness', getTrainReadinessDisplayValue(train)],
      ],
    },
  }
  const meta = viewMeta[view]

  return (
    <div
      className="line-map-popup-window line-map-popup-window--aux"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: 386, top: 548, width: 620, ...popupDrag.style }}
    >
      <div className="line-map-popup-titlebar" {...popupDrag.titleBarProps}>
        <span>{meta.title}</span>
        <button type="button" onClick={onClose}>x</button>
      </div>
      <div className="line-map-popup-body line-map-popup-body--stack">
        <h3>{meta.heading}</h3>
        <div className="line-map-popup-fieldset">
          <dl>
            {meta.rows.map(([label, value]) => (
              <div className="line-map-popup-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <label className="line-map-popup-status">
          <span>Status</span>
          <output>{meta.status}</output>
        </label>
        <div className="line-map-popup-actions">
          <button type="button">Help</button>
          <button type="button">{view === 'pec-reset' ? 'Request' : 'OK'}</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

type TrainContextMenuProps = {
  onClose: () => void
  onOpenAuxiliary: (view: TrainAuxiliaryView) => void
  onOpenInspector: (page: InspectorPage) => void
  train: TrainState
  x: number
  y: number
}

export function TrainContextMenu({
  onClose,
  onOpenAuxiliary,
  onOpenInspector,
  train,
  x,
  y,
}: TrainContextMenuProps) {
  const [stage, setStage] = useState<'root' | 'main' | 'inspector' | 'details' | 'alarms'>('main')
  const objectLabel = `C${Number(train.id) || train.id}/T0`
  const mainRows: Array<{
    disabled?: boolean
    dividerBefore?: boolean
    label: string
    action?: () => void
    submenu?: 'inspector' | 'details' | 'alarms'
  }> = [
    { label: 'Open inspector...', submenu: 'inspector' },
    { label: 'Open details...', submenu: 'details' },
    { label: 'Open alarms...', submenu: 'alarms' },
    { label: 'Restricted CCTV', action: () => onOpenAuxiliary('cctv'), dividerBefore: true },
    { label: 'Restricted PIS', action: () => onOpenAuxiliary('pis') },
    { label: 'Maintenance', disabled: true, dividerBefore: true },
    { label: 'Regulation parameters', action: () => onOpenAuxiliary('regulation') },
    { label: 'PEC Reset All', action: () => onOpenAuxiliary('pec-reset') },
  ]
  const inspectorRows: Array<{ label: string; page: InspectorPage }> = [
    { label: 'Information page', page: 'information' },
    { label: 'Control page', page: 'control' },
    { label: 'Tag page', page: 'tag' },
  ]
  const detailsRows: Array<{ label: string; view: TrainAuxiliaryView }> = [
    { label: 'Details page', view: 'details' },
    { label: 'Regulation parameters', view: 'regulation' },
    { label: 'PEC Reset All', view: 'pec-reset' },
  ]
  const alarmRows: Array<{ label: string; view: TrainAuxiliaryView }> = [
    { label: 'Active alarms', view: 'alarms' },
    { label: 'Restricted CCTV', view: 'cctv' },
    { label: 'Restricted PIS', view: 'pis' },
  ]

  return (
    <div
      className="line-map-cascade"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: x, top: y }}
    >
      <button
        className={`line-map-cascade-root ${stage !== 'root' ? 'is-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          setStage('main')
        }}
        type="button"
      >
        <span>{objectLabel}</span>
        <span>&gt;</span>
      </button>

      {stage !== 'root' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--main">
          {mainRows.map((item) => (
            <button
              className={`${item.dividerBefore ? 'has-divider' : ''} ${item.submenu === stage ? 'is-active' : ''}`}
              disabled={item.disabled}
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()

                if (item.submenu) {
                  setStage(item.submenu)
                  return
                }

                if (item.action) {
                  item.action()
                  onClose()
                }
              }}
              type="button"
            >
              <span>{item.label}</span>
              {item.submenu ? <span>&gt;</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {stage === 'inspector' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--sub line-map-cascade-menu--inspector">
          {inspectorRows.map((item) => (
            <button
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()
                onOpenInspector(item.page)
                onClose()
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {stage === 'details' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--sub line-map-cascade-menu--details">
          {detailsRows.map((item) => (
            <button
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()
                onOpenAuxiliary(item.view)
                onClose()
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {stage === 'alarms' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--sub line-map-cascade-menu--alarms">
          {alarmRows.map((item) => (
            <button
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()
                onOpenAuxiliary(item.view)
                onClose()
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
