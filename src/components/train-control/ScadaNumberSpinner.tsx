import type { ChangeEvent } from 'react'

type ScadaNumberSpinnerProps = {
  ariaLabel: string
  className?: string
  max?: number
  min?: number
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onStep: (delta: -1 | 1) => void
  padLength?: number
  value: string
}

function ScadaNumberSpinner({
  ariaLabel,
  className = '',
  max,
  min = 0,
  onChange,
  onStep,
  padLength = 0,
  value,
}: ScadaNumberSpinnerProps) {
  const numericValue = Number.parseInt(value, 10)
  const safeValue = Number.isFinite(numericValue) ? numericValue : min
  const displayValue = padLength > 0 ? safeValue.toString().padStart(padLength, '0') : String(safeValue)
  const atMin = safeValue <= min
  const atMax = max !== undefined && safeValue >= max

  return (
    <span className={`arrival-time-dialog__spinner ${className}`}>
      <input
        aria-label={ariaLabel}
        className="arrival-time-dialog__control arrival-time-dialog__spinner-input"
        max={max}
        min={min}
        onChange={onChange}
        type="text"
        value={displayValue}
      />
      <span className="arrival-time-dialog__spinner-buttons">
        <button
          aria-label={`${ariaLabel} up`}
          disabled={atMax}
          onClick={() => onStep(1)}
          type="button"
        >
          <i className="arrival-time-dialog__spinner-arrow arrival-time-dialog__spinner-arrow--up" />
        </button>
        <button
          aria-label={`${ariaLabel} down`}
          disabled={atMin}
          onClick={() => onStep(-1)}
          type="button"
        >
          <i className="arrival-time-dialog__spinner-arrow arrival-time-dialog__spinner-arrow--down" />
        </button>
      </span>
    </span>
  )
}

export default ScadaNumberSpinner
