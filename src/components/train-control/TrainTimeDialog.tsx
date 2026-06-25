import { useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { TrainState } from '../../types'
import ScadaNumberSpinner from './ScadaNumberSpinner'
import {
  ARRIVAL_TIME_STATION_MENU_OPTIONS,
  ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT,
  ARRIVAL_TIME_STATION_VISIBLE_ROWS,
  PLATFORM_SIDING_SCROLL_TRACK_HEIGHT,
  PLATFORM_SIDING_VISIBLE_ROWS,
  getPlatformSidingMenuOptions,
  getTrainServiceDirectionLabel,
} from './trainTimeOptions'
import type { TrainTimeSelection } from './trainTimeOptions'
import usePopupDrag from './usePopupDrag'
import Win98HtmlButton from './Win98HtmlButton'

function TrainTimeDialog({
  initialSelection,
  kind,
  onApply,
  onConfirmDeparture,
  onClose,
  train,
}: {
  initialSelection?: TrainTimeSelection
  kind: 'arrival' | 'departure'
  onApply: (message: string, selection: TrainTimeSelection) => void
  onConfirmDeparture?: () => void
  onClose: () => void
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const confirmationDrag = usePopupDrag()
  const trainNumber = train.id.padStart(3, '0')
  const trainRef = `EMU/${trainNumber}/TRN/XXXXXXXX`
  const timeLabel = kind === 'arrival' ? 'Arrival Time' : 'Departure Time'
  const commandLabel = kind === 'arrival' ? 'arrival' : 'departure'
  const [arrivalTime, setArrivalTime] = useState({
    hh: '00',
    mm: '00',
    ss: '00',
  })
  const [station, setStation] = useState(initialSelection?.station ?? '')
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [stationScrollIndex, setStationScrollIndex] = useState(0)
  const [stationScrollDrag, setStationScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [platformSiding, setPlatformSiding] = useState(initialSelection?.platformSiding ?? '')
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
  const [platformScrollIndex, setPlatformScrollIndex] = useState(0)
  const [platformScrollDrag, setPlatformScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [peakMode, setPeakMode] = useState<'peak' | 'not-peak'>('peak')
  const [threshold, setThreshold] = useState('0')
  const [status, setStatus] = useState('')
  const [timeConfirmationCommand, setTimeConfirmationCommand] = useState<string | null>(null)
  const serviceDirection = getTrainServiceDirectionLabel(train)
  const platformSidingMenuOptions = getPlatformSidingMenuOptions(station, serviceDirection)
  const stationScrollMax = Math.max(0, ARRIVAL_TIME_STATION_MENU_OPTIONS.length - ARRIVAL_TIME_STATION_VISIBLE_ROWS)
  const platformScrollMax = Math.max(0, platformSidingMenuOptions.length - PLATFORM_SIDING_VISIBLE_ROWS)
  const visibleStationOptions = ARRIVAL_TIME_STATION_MENU_OPTIONS.slice(
    stationScrollIndex,
    stationScrollIndex + ARRIVAL_TIME_STATION_VISIBLE_ROWS,
  )
  const visiblePlatformOptions = platformSidingMenuOptions.slice(
    platformScrollIndex,
    platformScrollIndex + PLATFORM_SIDING_VISIBLE_ROWS,
  )
  const stationThumbHeight = Math.max(
    28,
    Math.round((ARRIVAL_TIME_STATION_VISIBLE_ROWS / ARRIVAL_TIME_STATION_MENU_OPTIONS.length) * ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT),
  )
  const platformThumbHeight = Math.max(
    28,
    platformSidingMenuOptions.length > 0
      ? Math.round((Math.min(PLATFORM_SIDING_VISIBLE_ROWS, platformSidingMenuOptions.length) / platformSidingMenuOptions.length) * PLATFORM_SIDING_SCROLL_TRACK_HEIGHT)
      : PLATFORM_SIDING_SCROLL_TRACK_HEIGHT,
  )
  const stationThumbTop = stationScrollMax > 0
    ? Math.round((stationScrollIndex / stationScrollMax) * (ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT - stationThumbHeight))
    : 0
  const platformThumbTop = platformScrollMax > 0
    ? Math.round((platformScrollIndex / platformScrollMax) * (PLATFORM_SIDING_SCROLL_TRACK_HEIGHT - platformThumbHeight))
    : 0

  const setStationScroll = (nextIndex: number) => {
    setStationScrollIndex(Math.max(0, Math.min(stationScrollMax, nextIndex)))
  }

  const setPlatformScroll = (nextIndex: number) => {
    setPlatformScrollIndex(Math.max(0, Math.min(platformScrollMax, nextIndex)))
  }

  const selectStation = (nextStation: string) => {
    setStation(nextStation)
    setStationDropdownOpen(false)
    setPlatformDropdownOpen(false)
    setPlatformScrollIndex(0)

    setPlatformSiding(getPlatformSidingMenuOptions(nextStation, serviceDirection)[0] ?? '')
  }

  const selectPlatformSiding = (nextPlatformSiding: string) => {
    setPlatformSiding(nextPlatformSiding)
    setPlatformDropdownOpen(false)
  }

  const handleStationScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = ARRIVAL_TIME_STATION_VISIBLE_ROWS - 1

    setStationScroll(clickY < stationThumbTop ? stationScrollIndex - pageSize : stationScrollIndex + pageSize)
  }

  const handlePlatformScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = PLATFORM_SIDING_VISIBLE_ROWS - 1

    setPlatformScroll(clickY < platformThumbTop ? platformScrollIndex - pageSize : platformScrollIndex + pageSize)
  }

  const startStationThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setStationScrollDrag({
      startIndex: stationScrollIndex,
      startY: event.clientY,
    })
  }

  const startPlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setPlatformScrollDrag({
      startIndex: platformScrollIndex,
      startY: event.clientY,
    })
  }

  const handleStationThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!stationScrollDrag || stationScrollMax === 0) {
      return
    }

    const thumbTravel = ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT - stationThumbHeight
    const dragRatio = (event.clientY - stationScrollDrag.startY) / thumbTravel

    setStationScroll(stationScrollDrag.startIndex + Math.round(dragRatio * stationScrollMax))
  }

  const handlePlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!platformScrollDrag || platformScrollMax === 0) {
      return
    }

    const thumbTravel = PLATFORM_SIDING_SCROLL_TRACK_HEIGHT - platformThumbHeight
    const dragRatio = (event.clientY - platformScrollDrag.startY) / thumbTravel

    setPlatformScroll(platformScrollDrag.startIndex + Math.round(dragRatio * platformScrollMax))
  }

  const setTimeFieldValue = (field: 'hh' | 'mm' | 'ss', value: number, maxValue: number) => {
    const safeValue = Math.min(maxValue, Math.max(0, value))

    setArrivalTime((current) => ({
      ...current,
      [field]: safeValue.toString().padStart(2, '0'),
    }))
  }

  const updateArrivalTime = (field: 'hh' | 'mm' | 'ss', maxValue: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const parsedValue = Number.parseInt(event.currentTarget.value, 10)

    setTimeFieldValue(field, Number.isFinite(parsedValue) ? parsedValue : 0, maxValue)
  }

  const stepArrivalTime = (field: 'hh' | 'mm' | 'ss', maxValue: number, delta: -1 | 1) => {
    setTimeFieldValue(field, (Number.parseInt(arrivalTime[field], 10) || 0) + delta, maxValue)
  }

  const updateThreshold = (event: ChangeEvent<HTMLInputElement>) => {
    const parsedValue = Number.parseInt(event.currentTarget.value, 10)

    setThreshold(String(Math.max(0, Number.isFinite(parsedValue) ? parsedValue : 0)))
  }

  const stepThreshold = (delta: -1 | 1) => {
    setThreshold((current) => String(Math.max(0, (Number.parseInt(current, 10) || 0) + delta)))
  }

  const getArrivalTimeCommand = () => {
    const formattedTime = [arrivalTime.hh, arrivalTime.mm, arrivalTime.ss]
      .map((value) => Number.parseInt(value, 10) || 0)
      .join(':')
    const peakFlag = peakMode === 'peak' ? '1' : '0'
    const regulationHold = Math.max(0, Number.parseInt(threshold, 10) || 0)

    return `${platformSiding} - ${formattedTime} - ${peakFlag} - ${regulationHold}`
  }

  const applyArrivalTime = () => {
    setTimeConfirmationCommand(getArrivalTimeCommand())
  }

  const confirmArrivalTime = () => {
    const nextStatus = `Train ${commandLabel} time setting\nCommand successful`
    const selection: TrainTimeSelection = {
      command: timeConfirmationCommand ?? getArrivalTimeCommand(),
      kind,
      platformSiding,
      station,
    }

    onApply(nextStatus, selection)
    setTimeConfirmationCommand(null)

    if (kind === 'departure') {
      onConfirmDeparture?.()
    }

    onClose()
  }

  return (
    <div
      className="arrival-time-dialog"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="arrival-time-dialog__title" {...popupDrag.titleBarProps}>SIG {timeLabel} for Train : {trainRef}</div>
      <div className="arrival-time-dialog__body">
        <fieldset className="arrival-time-dialog__fieldset arrival-time-dialog__fieldset--area">
          <legend>Area Selection</legend>
          <div className="arrival-time-dialog__area-grid">
            <label htmlFor="arrival-time-station">Station</label>
            <label htmlFor="arrival-time-platform">Platform / Siding</label>
            <div className="arrival-time-dialog__station-combo">
              <button
                aria-expanded={stationDropdownOpen}
                aria-haspopup="listbox"
                className="arrival-time-dialog__control arrival-time-dialog__station-trigger"
                id="arrival-time-station"
                onClick={() => setStationDropdownOpen((open) => !open)}
                type="button"
              >
                <span>{station}</span>
                <i aria-hidden="true" />
              </button>
              {stationDropdownOpen ? (
                <div
                  className="arrival-time-dialog__station-list"
                  onWheel={(event) => {
                    event.preventDefault()
                    setStationScroll(stationScrollIndex + (event.deltaY > 0 ? 1 : -1))
                  }}
                  role="listbox"
                >
                  <div className="arrival-time-dialog__station-options">
                    {visibleStationOptions.map((stationOption) => (
                      <button
                        aria-selected={station === stationOption}
                        className={station === stationOption ? 'is-selected' : undefined}
                        key={stationOption || 'blank'}
                        onClick={() => selectStation(stationOption)}
                        role="option"
                        type="button"
                      >
                        {stationOption || '\u00a0'}
                      </button>
                    ))}
                  </div>
                  <div className="arrival-time-dialog__station-scrollbar">
                    <button
                      disabled={stationScrollIndex === 0}
                      onClick={() => setStationScroll(stationScrollIndex - 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
                    </button>
                    <div
                      className="arrival-time-dialog__station-scroll-track"
                      onPointerDown={handleStationScrollTrackPointerDown}
                    >
                      <span
                        className="arrival-time-dialog__station-scroll-thumb"
                        onPointerCancel={() => setStationScrollDrag(null)}
                        onPointerDown={startStationThumbDrag}
                        onPointerMove={handleStationThumbDrag}
                        onPointerUp={() => setStationScrollDrag(null)}
                        style={{ height: stationThumbHeight, top: stationThumbTop }}
                      />
                    </div>
                    <button
                      disabled={stationScrollIndex === stationScrollMax}
                      onClick={() => setStationScroll(stationScrollIndex + 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="arrival-time-dialog__platform-combo">
              <button
                aria-expanded={platformDropdownOpen}
                aria-haspopup="listbox"
                className="arrival-time-dialog__control arrival-time-dialog__station-trigger arrival-time-dialog__platform-trigger"
                id="arrival-time-platform"
                onClick={() => setPlatformDropdownOpen((open) => !open)}
                type="button"
              >
                <span>{platformSiding}</span>
                <i aria-hidden="true" />
              </button>
              {platformDropdownOpen ? (
                <div
                  className="arrival-time-dialog__station-list arrival-time-dialog__platform-list"
                  onWheel={(event) => {
                    event.preventDefault()
                    setPlatformScroll(platformScrollIndex + (event.deltaY > 0 ? 1 : -1))
                  }}
                  role="listbox"
                >
                  <div className="arrival-time-dialog__station-options arrival-time-dialog__platform-options">
                    {visiblePlatformOptions.map((platformOption) => (
                      <button
                        aria-selected={platformSiding === platformOption}
                        className={platformSiding === platformOption ? 'is-selected' : undefined}
                        key={platformOption || 'blank-platform'}
                        onClick={() => selectPlatformSiding(platformOption)}
                        role="option"
                        type="button"
                      >
                        {platformOption || '\u00a0'}
                      </button>
                    ))}
                  </div>
                  <div className="arrival-time-dialog__station-scrollbar">
                    <button
                      disabled={platformScrollIndex === 0}
                      onClick={() => setPlatformScroll(platformScrollIndex - 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
                    </button>
                    <div
                      className="arrival-time-dialog__station-scroll-track"
                      onPointerDown={handlePlatformScrollTrackPointerDown}
                    >
                      <span
                        className="arrival-time-dialog__station-scroll-thumb"
                        onPointerCancel={() => setPlatformScrollDrag(null)}
                        onPointerDown={startPlatformThumbDrag}
                        onPointerMove={handlePlatformThumbDrag}
                        onPointerUp={() => setPlatformScrollDrag(null)}
                        style={{ height: platformThumbHeight, top: platformThumbTop }}
                      />
                    </div>
                    <button
                      disabled={platformScrollIndex === platformScrollMax}
                      onClick={() => setPlatformScroll(platformScrollIndex + 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </fieldset>

        <div className="arrival-time-dialog__settings">
          <fieldset className="arrival-time-dialog__fieldset">
            <legend>{timeLabel}</legend>
            <div className="arrival-time-dialog__time-labels" aria-hidden="true">
              <span>hh</span>
              <span>:</span>
              <span>mm</span>
              <span>:</span>
              <span>ss</span>
            </div>
            <div className="arrival-time-dialog__time-grid">
              <ScadaNumberSpinner
                ariaLabel="Hours"
                className="arrival-time-dialog__time-spinner"
                max={23}
                min={0}
                onChange={updateArrivalTime('hh', 23)}
                onStep={(delta) => stepArrivalTime('hh', 23, delta)}
                padLength={2}
                value={arrivalTime.hh}
              />
              <ScadaNumberSpinner
                ariaLabel="Minutes"
                className="arrival-time-dialog__time-spinner"
                max={59}
                min={0}
                onChange={updateArrivalTime('mm', 59)}
                onStep={(delta) => stepArrivalTime('mm', 59, delta)}
                padLength={2}
                value={arrivalTime.mm}
              />
              <ScadaNumberSpinner
                ariaLabel="Seconds"
                className="arrival-time-dialog__time-spinner"
                max={59}
                min={0}
                onChange={updateArrivalTime('ss', 59)}
                onStep={(delta) => stepArrivalTime('ss', 59, delta)}
                padLength={2}
                value={arrivalTime.ss}
              />
            </div>
          </fieldset>

          <fieldset className="arrival-time-dialog__fieldset">
            <legend>Peak / Off Peak</legend>
            <label className="arrival-time-dialog__radio">
              <input
                checked={peakMode === 'peak'}
                name="arrival-time-peak-mode"
                onChange={() => setPeakMode('peak')}
                type="radio"
              />
              <span>Peak</span>
            </label>
            <label className="arrival-time-dialog__radio">
              <input
                checked={peakMode === 'not-peak'}
                name="arrival-time-peak-mode"
                onChange={() => setPeakMode('not-peak')}
                type="radio"
              />
              <span>Not Peak</span>
            </label>
          </fieldset>

          <fieldset className="arrival-time-dialog__fieldset">
            <legend>Regulation Threshold</legend>
            <ScadaNumberSpinner
              ariaLabel="Regulation Threshold"
              className="arrival-time-dialog__threshold"
              min={0}
              onChange={updateThreshold}
              onStep={stepThreshold}
              value={threshold}
            />
          </fieldset>
        </div>

        <fieldset className="arrival-time-dialog__fieldset arrival-time-dialog__fieldset--status">
          <legend>Status</legend>
          <output>{status}</output>
        </fieldset>

        <div className="arrival-time-dialog__actions">
          <Win98HtmlButton onClick={() => setStatus('Help selected')}>Help</Win98HtmlButton>
          <span />
          <Win98HtmlButton onClick={applyArrivalTime}>Apply</Win98HtmlButton>
          <Win98HtmlButton onClick={onClose}>Close</Win98HtmlButton>
        </div>
      </div>

      {timeConfirmationCommand ? (
        <div
          className="train-command-confirmation arrival-time-command-confirmation"
          onPointerDown={(event) => event.stopPropagation()}
          style={confirmationDrag.style}
        >
          <div className="train-command-confirmation__title" {...confirmationDrag.titleBarProps}>Command confirmation</div>
          <fieldset>
            <legend>Please confirm command...</legend>
            <div className="train-command-confirmation__grid">
              <label>Equipment</label>
              <div>{trainRef} {'{'}Train {trainNumber}{'}'}</div>
              <label>Attribute</label>
              <div>Set {commandLabel} time</div>
              <label>Command</label>
              <div>{timeConfirmationCommand}</div>
              <label>No wait</label>
              <input type="checkbox" />
            </div>
          </fieldset>
          <div className="train-command-confirmation__actions">
            <Win98HtmlButton onClick={() => setStatus('Help selected')}>Help</Win98HtmlButton>
            <span />
            <Win98HtmlButton onClick={confirmArrivalTime}>Confirm</Win98HtmlButton>
            <Win98HtmlButton onClick={() => setTimeConfirmationCommand(null)}>Cancel</Win98HtmlButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TrainTimeDialog
