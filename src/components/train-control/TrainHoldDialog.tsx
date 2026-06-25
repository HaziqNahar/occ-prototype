import { useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { TrainState } from '../../types'
import {
  ARRIVAL_TIME_STATION_MENU_OPTIONS,
  ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT,
  ARRIVAL_TIME_STATION_VISIBLE_ROWS,
  PLATFORM_SIDING_SCROLL_TRACK_HEIGHT,
  PLATFORM_SIDING_VISIBLE_ROWS,
  getPlatformSidingMenuOptions,
} from './trainTimeOptions'
import usePopupDrag from './usePopupDrag'
import Win98HtmlButton from './Win98HtmlButton'

function TrainHoldDialog({
  currentDirection,
  onApply,
  onClose,
  train,
}: {
  currentDirection: 'NB' | 'SB'
  onApply: (message: string) => void
  onClose: () => void
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const trainRef = `EMU/${train.id.padStart(3, '0')}/TRN/XXXXXXXX`
  const [station, setStation] = useState('')
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [stationScrollIndex, setStationScrollIndex] = useState(0)
  const [stationScrollDrag, setStationScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [platformSiding, setPlatformSiding] = useState('')
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
  const [platformScrollIndex, setPlatformScrollIndex] = useState(0)
  const [platformScrollDrag, setPlatformScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [holdStatus, setHoldStatus] = useState<'Request' | 'Release'>('Request')
  const [status, setStatus] = useState('')
  const stationOptions = ARRIVAL_TIME_STATION_MENU_OPTIONS
  const platformOptions = getPlatformSidingMenuOptions(station, currentDirection)
  const stationScrollMax = Math.max(0, stationOptions.length - ARRIVAL_TIME_STATION_VISIBLE_ROWS)
  const platformScrollMax = Math.max(0, platformOptions.length - PLATFORM_SIDING_VISIBLE_ROWS)
  const visibleStationOptions = stationOptions.slice(stationScrollIndex, stationScrollIndex + ARRIVAL_TIME_STATION_VISIBLE_ROWS)
  const visiblePlatformOptions = platformOptions.slice(platformScrollIndex, platformScrollIndex + PLATFORM_SIDING_VISIBLE_ROWS)
  const stationThumbHeight = Math.max(
    28,
    Math.round((ARRIVAL_TIME_STATION_VISIBLE_ROWS / stationOptions.length) * ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT),
  )
  const platformThumbHeight = Math.max(
    28,
    platformOptions.length > 0
      ? Math.round((Math.min(PLATFORM_SIDING_VISIBLE_ROWS, platformOptions.length) / platformOptions.length) * PLATFORM_SIDING_SCROLL_TRACK_HEIGHT)
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
    const nextPlatformOptions = getPlatformSidingMenuOptions(nextStation, currentDirection)

    setStation(nextStation)
    setStationDropdownOpen(false)
    setPlatformDropdownOpen(false)
    setPlatformScrollIndex(0)
    setPlatformSiding(nextPlatformOptions[0] ?? '')
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
    event.preventDefault()
    event.stopPropagation()
    setStationScrollDrag({
      startIndex: stationScrollIndex,
      startY: event.clientY,
    })
  }

  const startPlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setPlatformScrollDrag({
      startIndex: platformScrollIndex,
      startY: event.clientY,
    })
  }

  const handleStationThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!stationScrollDrag || stationScrollMax <= 0) {
      return
    }

    const dragRange = ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT - stationThumbHeight
    if (dragRange <= 0) {
      return
    }

    const dragRatio = (event.clientY - stationScrollDrag.startY) / dragRange
    setStationScroll(stationScrollDrag.startIndex + Math.round(dragRatio * stationScrollMax))
  }

  const handlePlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!platformScrollDrag || platformScrollMax <= 0) {
      return
    }

    const dragRange = PLATFORM_SIDING_SCROLL_TRACK_HEIGHT - platformThumbHeight
    if (dragRange <= 0) {
      return
    }

    const dragRatio = (event.clientY - platformScrollDrag.startY) / dragRange
    setPlatformScroll(platformScrollDrag.startIndex + Math.round(dragRatio * platformScrollMax))
  }

  const applyTrainHold = () => {
    const target = [station, platformSiding].filter(Boolean).join(' ')
    const nextStatus = `Train hold ${holdStatus.toLowerCase()}${target ? ` ${target}` : ''}\nCommand successful`

    onApply(nextStatus)
    onClose()
  }

  return (
    <div
      className="arrival-time-dialog train-hold-dialog"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="arrival-time-dialog__title" {...popupDrag.titleBarProps}>SIG Train Hold for Train : {trainRef}</div>
      <div className="arrival-time-dialog__body train-hold-dialog__body">
        <div className="train-hold-dialog__top-row">
          <fieldset className="arrival-time-dialog__fieldset train-hold-dialog__fieldset">
            <legend>Area Selection</legend>
            <div className="arrival-time-dialog__area-grid train-hold-dialog__area-grid">
              <label htmlFor="train-hold-station">Station</label>
              <label htmlFor="train-hold-platform">Platform / Siding</label>
              <div className="arrival-time-dialog__station-combo train-hold-dialog__station-combo">
                <button
                  aria-expanded={stationDropdownOpen}
                  aria-haspopup="listbox"
                  className="arrival-time-dialog__control arrival-time-dialog__station-trigger train-hold-dialog__station-trigger"
                  id="train-hold-station"
                  onClick={() => setStationDropdownOpen((open) => !open)}
                  type="button"
                >
                  <span>{station}</span>
                  <i aria-hidden="true" />
                </button>
                {stationDropdownOpen ? (
                  <div
                    className="arrival-time-dialog__station-list train-hold-dialog__station-list"
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
                  id="train-hold-platform"
                  onClick={() => setPlatformDropdownOpen((open) => !open)}
                  type="button"
                >
                  <span>{platformSiding}</span>
                  <i aria-hidden="true" />
                </button>
                {platformDropdownOpen ? (
                  <div
                    className="arrival-time-dialog__station-list arrival-time-dialog__platform-list train-hold-dialog__platform-list"
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

          <fieldset className="arrival-time-dialog__fieldset train-hold-dialog__status-choice">
            <legend>Hold Status</legend>
            <label className="arrival-time-dialog__radio train-hold-dialog__radio">
              <input
                checked={holdStatus === 'Request'}
                name="train-hold-status"
                onChange={() => setHoldStatus('Request')}
                type="radio"
              />
              <span>Request</span>
            </label>
            <label className="arrival-time-dialog__radio train-hold-dialog__radio">
              <input
                checked={holdStatus === 'Release'}
                name="train-hold-status"
                onChange={() => setHoldStatus('Release')}
                type="radio"
              />
              <span>Release</span>
            </label>
          </fieldset>
        </div>

        <fieldset className="arrival-time-dialog__fieldset arrival-time-dialog__fieldset--status train-hold-dialog__status-fieldset">
          <legend>Status</legend>
          <output>{status}</output>
        </fieldset>

        <div className="arrival-time-dialog__actions train-hold-dialog__actions">
          <Win98HtmlButton onClick={() => setStatus('Help selected')}>Help</Win98HtmlButton>
          <span />
          <Win98HtmlButton onClick={applyTrainHold}>Apply</Win98HtmlButton>
          <Win98HtmlButton onClick={onClose}>Close</Win98HtmlButton>
        </div>
      </div>
    </div>
  )
}

export default TrainHoldDialog
