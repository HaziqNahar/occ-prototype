import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { TrainState } from '../../types'
import ScadaNumberSpinner from './ScadaNumberSpinner'
import usePopupDrag from './usePopupDrag'
import Win98HtmlButton from './Win98HtmlButton'

function splitDigits(value: string, length: number) {
  return value.replace(/\D/g, '').padStart(length, '0').slice(-length).split('')
}

function clampDigit(value: number) {
  return Math.max(0, Math.min(9, value))
}

function PtiInitialisationDialog({
  onApply,
  onClose,
  train,
}: {
  onApply: (message: string) => void
  onClose: () => void
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const trainRef = `EMU/${train.id.padStart(3, '0')}/TRN/XXXXXXXX`
  const [status, setStatus] = useState('')
  const [trainNumberDigits, setTrainNumberDigits] = useState(() => splitDigits(train.trainNumber ?? train.id.padStart(3, '0'), 3))
  const [scheduleNumberDigits, setScheduleNumberDigits] = useState(() => splitDigits(train.scheduleNumber ?? '0000', 4))
  const [destinationNumberDigits, setDestinationNumberDigits] = useState(() => splitDigits(train.id.padStart(3, '0'), 3))

  const updateDigit =
    (setter: Dispatch<SetStateAction<string[]>>, index: number) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(event.currentTarget.value.replace(/\D/g, '').slice(-1), 10)

      setter((current) => current.map((digit, digitIndex) => (
        digitIndex === index ? String(clampDigit(Number.isFinite(parsed) ? parsed : 0)) : digit
      )))
    }

  const stepDigit =
    (setter: Dispatch<SetStateAction<string[]>>, index: number) =>
    (delta: -1 | 1) => {
      setter((current) => current.map((digit, digitIndex) => {
        if (digitIndex !== index) {
          return digit
        }

        return String(clampDigit((Number.parseInt(digit, 10) || 0) + delta))
      }))
    }

  const renderDigitGroup = (
    digits: string[],
    setter: Dispatch<SetStateAction<string[]>>,
    fieldLabel: string,
  ) => (
    <div className="pti-dialog__digit-group">
      {digits.map((digit, index) => (
        <ScadaNumberSpinner
          ariaLabel={`${fieldLabel} digit ${index + 1}`}
          className="pti-dialog__digit-spinner"
          key={`${fieldLabel}-${index}`}
          max={9}
          min={0}
          onChange={updateDigit(setter, index)}
          onStep={stepDigit(setter, index)}
          value={digit}
        />
      ))}
    </div>
  )

  const applyPtiInitialisation = () => {
    const trainNumber = trainNumberDigits.join('')
    const scheduleNumber = scheduleNumberDigits.join('')
    const destinationNumber = destinationNumberDigits.join('')
    const nextStatus = `PTI initialisation ${trainNumber} - ${scheduleNumber} - ${destinationNumber}\nCommand successful`

    onApply(nextStatus)
    onClose()
  }

  return (
    <div
      className="arrival-time-dialog pti-dialog"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="arrival-time-dialog__title pti-dialog__title" {...popupDrag.titleBarProps}>
        SIG PTI Initialisation for Train : {trainRef}
      </div>
      <div className="arrival-time-dialog__body pti-dialog__body">
        <fieldset className="arrival-time-dialog__fieldset pti-dialog__fieldset">
          <div className="pti-dialog__labels">
            <span>Car number</span>
            <span>Train number</span>
            <span>Schedule number</span>
            <span>Destination number</span>
          </div>
          <div className="pti-dialog__values">
            <div className="pti-dialog__car-number">41</div>
            <span className="pti-dialog__separator">-</span>
            {renderDigitGroup(trainNumberDigits, setTrainNumberDigits, 'Train number')}
            <span className="pti-dialog__separator">-</span>
            {renderDigitGroup(scheduleNumberDigits, setScheduleNumberDigits, 'Schedule number')}
            <span className="pti-dialog__separator">-</span>
            {renderDigitGroup(destinationNumberDigits, setDestinationNumberDigits, 'Destination number')}
          </div>
        </fieldset>

        <fieldset className="arrival-time-dialog__fieldset arrival-time-dialog__fieldset--status pti-dialog__status-fieldset">
          <legend>Status</legend>
          <output>{status}</output>
        </fieldset>

        <div className="arrival-time-dialog__actions pti-dialog__actions">
          <Win98HtmlButton onClick={() => setStatus('Help selected')}>Help</Win98HtmlButton>
          <span />
          <Win98HtmlButton onClick={applyPtiInitialisation}>Apply</Win98HtmlButton>
          <Win98HtmlButton onClick={onClose}>Close</Win98HtmlButton>
        </div>
      </div>
    </div>
  )
}

export default PtiInitialisationDialog
