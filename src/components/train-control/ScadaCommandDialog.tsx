import type { TrainCommand, TrainState } from '../../types'
import usePopupDrag from './usePopupDrag'

type ScadaCommandDialogProps = {
  command: TrainCommand
  onApply: () => void
  onClose: () => void
  train?: TrainState
}

function ScadaCommandDialog({
  command,
  onApply,
  onClose,
  train,
}: ScadaCommandDialogProps) {
  const popupDrag = usePopupDrag()
  const trainRef = train ? `EMU/${train.id}/TRN/XXXXXXXX` : 'EMU/---/TRN/XXXXXXXX'
  const meta = {
    DISPATCH: {
      commandCode: 'DISPATCH',
      label: 'Dispatch Train',
      message: 'Dispatch command will be sent to selected train.',
      next: 'Train movement authority requested',
    },
    HOLD: {
      commandCode: 'HII',
      label: 'Train Hold',
      message: 'Hold train command will be issued to controller workstation.',
      next: 'Train readiness mode request',
    },
    ROUTE: {
      commandCode: 'ROUTE',
      label: 'Route Command',
      message: 'Route command must be confirmed before dispatch.',
      next: 'Command not confirmed',
    },
  }[command]

  return (
    <div
      className="line-map-popup-window line-map-popup-window--command"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: 458, top: 620, width: 430, ...popupDrag.style }}
    >
      <div className="line-map-popup-titlebar" {...popupDrag.titleBarProps}>
        <span>SIG Command Request : {trainRef}</span>
      </div>
      <div className="line-map-command-body">
        <div className="line-map-popup-fieldset">
          <dl>
            <dt>Command</dt>
            <dd>{meta.commandCode}</dd>
            <dt>Request</dt>
            <dd>{meta.label}</dd>
          </dl>
          <small>{meta.message}</small>
        </div>
        <label className="line-map-popup-status">
          <span>Status</span>
          <output>{meta.next}</output>
        </label>
        <div className="line-map-popup-actions line-map-popup-actions--right">
          <button type="button" onClick={onApply}>Apply</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default ScadaCommandDialog
