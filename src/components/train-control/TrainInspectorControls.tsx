import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type InspectorInfoRowProps = {
  label: string
  tone?: 'green' | 'red'
  value: string
}

export function InspectorInfoRow({
  label,
  tone = 'green',
  value,
}: InspectorInfoRowProps) {
  return (
    <div className="train-inspector-info-row">
      <span className="train-inspector-info-label">{label}</span>
      <span className="train-inspector-info-field">
        <span>{value}</span>
        <i className={tone === 'red' ? 'is-red' : undefined} />
      </span>
    </div>
  )
}

type TrainInspectorScrollbarProps = {
  axis: 'vertical' | 'horizontal'
  contentSize: number
  onChange: (nextValue: number) => void
  value: number
  viewportSize: number
}

export function TrainInspectorScrollbar({
  axis,
  contentSize,
  onChange,
  value,
  viewportSize,
}: TrainInspectorScrollbarProps) {
  const isVertical = axis === 'vertical'
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackLength, setTrackLength] = useState(1)
  const [drag, setDrag] = useState<{ startPointer: number; startValue: number } | null>(null)
  const max = Math.max(0, contentSize - viewportSize)
  const thumbLength = max > 0 ? Math.min(52, trackLength) : Math.max(18, trackLength)
  const thumbTravel = Math.max(1, trackLength - thumbLength)
  const thumbOffset = max > 0 ? (value / max) * thumbTravel : 0
  const stepSize = Math.max(54, viewportSize * 0.78)
  const setScrollValue = (nextValue: number) => onChange(Math.max(0, Math.min(max, nextValue)))

  useEffect(() => {
    const track = trackRef.current

    if (!track) {
      return undefined
    }

    const updateTrackLength = () => {
      setTrackLength(Math.max(1, isVertical ? track.clientHeight : track.clientWidth))
    }

    updateTrackLength()

    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(updateTrackLength)
    observer.observe(track)

    return () => observer.disconnect()
  }, [isVertical])

  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const pointer = isVertical ? event.clientY - bounds.top : event.clientX - bounds.left

    setScrollValue(value + (pointer < thumbOffset ? -stepSize : stepSize))
  }

  const handleThumbPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!drag) {
      return
    }

    event.stopPropagation()

    const pointer = isVertical ? event.clientY : event.clientX
    const pointerDelta = pointer - drag.startPointer
    const scrollDelta = max > 0 ? (pointerDelta / thumbTravel) * max : 0

    setScrollValue(drag.startValue + scrollDelta)
  }

  const startThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      startPointer: isVertical ? event.clientY : event.clientX,
      startValue: value,
    })
  }

  return (
    <div className={`train-inspector-scrollbar train-inspector-scrollbar--${axis}`}>
      <button
        aria-label={`Scroll inspector ${isVertical ? 'up' : 'left'}`}
        className="train-inspector-scrollbar__button"
        onClick={() => setScrollValue(value - stepSize)}
        type="button"
      >
        <span className={`train-inspector-scrollbar__arrow train-inspector-scrollbar__arrow--${isVertical ? 'up' : 'left'}`} />
      </button>
      <div className="train-inspector-scrollbar__track" onPointerDown={handleTrackPointerDown} ref={trackRef}>
        <span
          className="train-inspector-scrollbar__thumb"
          onPointerCancel={() => setDrag(null)}
          onPointerDown={startThumbDrag}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={() => setDrag(null)}
          style={isVertical ? { height: thumbLength, top: thumbOffset } : { left: thumbOffset, width: thumbLength }}
        />
      </div>
      <button
        aria-label={`Scroll inspector ${isVertical ? 'down' : 'right'}`}
        className="train-inspector-scrollbar__button"
        onClick={() => setScrollValue(value + stepSize)}
        type="button"
      >
        <span className={`train-inspector-scrollbar__arrow train-inspector-scrollbar__arrow--${isVertical ? 'down' : 'right'}`} />
      </button>
    </div>
  )
}

type ScadaDropdownProps = {
  id: string
  onChange: (value: string) => void
  options: readonly string[]
  value: string
}

export function ScadaDropdown({
  id,
  onChange,
  options,
  value,
}: ScadaDropdownProps) {
  const visibleRows = 6
  const scrollTrackHeight = 126
  const [open, setOpen] = useState(false)
  const [scrollIndex, setScrollIndex] = useState(0)
  const [scrollDrag, setScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const scrollMax = Math.max(0, options.length - visibleRows)
  const clampedScrollIndex = Math.max(0, Math.min(scrollIndex, scrollMax))
  const visibleOptions = options.slice(clampedScrollIndex, clampedScrollIndex + visibleRows)
  const thumbHeight = Math.max(28, Math.round((visibleRows / options.length) * scrollTrackHeight))
  const thumbTop = scrollMax > 0 ? Math.round((clampedScrollIndex / scrollMax) * (scrollTrackHeight - thumbHeight)) : 0

  const setScroll = (nextIndex: number) => {
    setScrollIndex(Math.max(0, Math.min(scrollMax, nextIndex)))
  }

  const selectOption = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  const handleScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = visibleRows - 1

    setScroll(clickY < thumbTop ? clampedScrollIndex - pageSize : clampedScrollIndex + pageSize)
  }

  const startThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setScrollDrag({
      startIndex: clampedScrollIndex,
      startY: event.clientY,
    })
  }

  const handleThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!scrollDrag || scrollMax === 0) {
      return
    }

    const thumbTravel = scrollTrackHeight - thumbHeight
    const dragRatio = (event.clientY - scrollDrag.startY) / thumbTravel

    setScroll(scrollDrag.startIndex + Math.round(dragRatio * scrollMax))
  }

  return (
    <div className="arrival-time-dialog__station-combo train-inspector-dropdown">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="arrival-time-dialog__control arrival-time-dialog__station-trigger train-inspector-dropdown__trigger"
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{value}</span>
        <i aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="arrival-time-dialog__station-list train-inspector-dropdown__list"
          onWheel={(event) => {
            event.preventDefault()
            setScroll(clampedScrollIndex + (event.deltaY > 0 ? 1 : -1))
          }}
          role="listbox"
        >
          <div className="arrival-time-dialog__station-options train-inspector-dropdown__options">
            {visibleOptions.map((option) => (
              <button
                aria-selected={value === option}
                className={value === option ? 'is-selected' : undefined}
                key={option || 'blank'}
                onClick={() => selectOption(option)}
                role="option"
                type="button"
              >
                {option || '\u00a0'}
              </button>
            ))}
          </div>
          <div className="arrival-time-dialog__station-scrollbar">
            <button disabled={clampedScrollIndex === 0} onClick={() => setScroll(clampedScrollIndex - 1)} type="button">
              <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
            </button>
            <div className="arrival-time-dialog__station-scroll-track" onPointerDown={handleScrollTrackPointerDown}>
              <span
                className="arrival-time-dialog__station-scroll-thumb"
                onPointerCancel={() => setScrollDrag(null)}
                onPointerDown={startThumbDrag}
                onPointerMove={handleThumbDrag}
                onPointerUp={() => setScrollDrag(null)}
                style={{ height: thumbHeight, top: thumbTop }}
              />
            </div>
            <button disabled={clampedScrollIndex === scrollMax} onClick={() => setScroll(clampedScrollIndex + 1)} type="button">
              <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
