import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ScadaDomButton } from '../components/LegacyScadaFooter'
import ScadaDomSurface from '../components/ScadaDomSurface'
import ScadaFooter from '../components/ScadaFooter'
import TimetableRegulationGraph from '../components/TimetableRegulationGraph'
import { isTimetableTripAction } from '../session-commands/monitorCommands'
import { formatTimetableClockTime, getTimetableClockNow } from '../timetableClockState'
import { getActiveTimetableView, getTimetableStationOptions, getTimetableViewRows } from '../timetableViewState'
import type { MonitorScreenProps } from './monitorScreenTypes'

// The SCADA timetable shows two-digit fields: 5:32:45 as 05:32:45, 0:35 as 00:35.
function padClock(value: string) {
  return value ? value.split(':').map((part) => part.padStart(2, '0')).join(':') : ''
}

export default function TimetableMonitorContent({
  onNavigate,
  session,
  dispatch,
}: MonitorScreenProps) {
  const tableRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const stationOptions = useMemo(() => getTimetableStationOptions(session.timetableRows), [session.timetableRows])
  const timetableView = useMemo(
    () => getActiveTimetableView(session.timetableRows, session.timetableView),
    [session.timetableRows, session.timetableView],
  )
  const activeStation = timetableView.station
  const direction = timetableView.direction
  const rows = useMemo(
    () => getTimetableViewRows(session.timetableRows, timetableView),
    [session.timetableRows, timetableView],
  )
  const [scrollState, setScrollState] = useState({ clientHeight: 0, max: 0, scrollHeight: 0, top: 0 })
  const loadedTimeTableName = session.timetableName
  const [actionNote, setActionNote] = useState('')
  const selectedRowIndex = rows.length > 0 ? Math.min(selectedIndex, rows.length - 1) : -1
  const selectedRow = selectedRowIndex >= 0 ? rows[selectedRowIndex] : undefined
  const tripActions = ['Service cancellation', 'Service restoration', 'Shift trips', 'Trip interruption', 'Trip modification', 'Creation of additional trips']
  const timetableClockTime = formatTimetableClockTime(session.timetableClock)
  const timetableClockModeLabel = session.timetableClock.mode === 'PLAYBACK'
    ? `PLAYBACK ${session.timetableClock.playbackSpeed}x`
    : 'LIVE'
  const scrollbarHeight = 286
  const scrollbarButtonSize = 16
  const scrollbarTrackHeight = scrollbarHeight - scrollbarButtonSize * 2
  const scrollbarThumbHeight = scrollState.max > 0
    ? Math.max(38, Math.round(scrollbarTrackHeight * (scrollState.clientHeight / Math.max(scrollState.scrollHeight, 1))))
    : 106
  const scrollbarThumbTravel = Math.max(0, scrollbarTrackHeight - scrollbarThumbHeight)
  const scrollbarThumbTop = scrollbarButtonSize + (
    scrollState.max > 0 ? Math.round(scrollbarThumbTravel * (scrollState.top / scrollState.max)) : 0
  )

  const updateTimetableScroll = useCallback(() => {
    const table = tableRef.current

    if (!table) {
      return
    }

    setScrollState({
      clientHeight: table.clientHeight,
      max: Math.max(0, table.scrollHeight - table.clientHeight),
      scrollHeight: table.scrollHeight,
      top: table.scrollTop,
    })
  }, [])

  useEffect(() => {
    updateTimetableScroll()
  }, [rows.length, updateTimetableScroll])

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0
    }

    updateTimetableScroll()
  }, [activeStation, direction, updateTimetableScroll])

  const scrollTimetableBy = (delta: number) => {
    const table = tableRef.current

    if (!table) {
      return
    }

    table.scrollTop = Math.max(0, Math.min(scrollState.max, table.scrollTop + delta))
    updateTimetableScroll()
  }

  const startTimetableThumbDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (scrollState.max <= 0 || scrollbarThumbTravel <= 0) {
      return
    }

    const table = tableRef.current

    if (!table) {
      return
    }

    const startY = event.clientY
    const startTop = table.scrollTop

    const moveThumb = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      table.scrollTop = Math.max(0, Math.min(scrollState.max, startTop + (deltaY / scrollbarThumbTravel) * scrollState.max))
      updateTimetableScroll()
    }

    const stopDrag = () => {
      window.removeEventListener('pointermove', moveThumb)
      window.removeEventListener('pointerup', stopDrag)
    }

    window.addEventListener('pointermove', moveThumb)
    window.addEventListener('pointerup', stopDrag)
  }

  const selectTimetableRow = (index: number) => {
    setSelectedIndex(index)
    const row = rows[index]

    if (row) {
      void dispatch({ trainId: row.train, type: 'SELECT_TRAIN', view: 'timetable' })
    }
  }

  const setDirectionFilter = (nextDirection: 'NB' | 'SB') => {
    setSelectedIndex(0)
    setActionNote(`Direction filter changed to ${nextDirection}`)
    void dispatch({ direction: nextDirection, type: 'SET_TIMETABLE_VIEW' })
  }

  const setStationSelection = (nextStation: string) => {
    setSelectedIndex(0)
    setActionNote(`Station ${nextStation} selected`)
    void dispatch({ station: nextStation, type: 'SET_TIMETABLE_VIEW' })
  }

  const applyTripAction = (label: string) => {
    if (!selectedRow) {
      setActionNote('No timetable row selected')
      return
    }

    const action = isTimetableTripAction(label) ? label : 'Trip modification'

    void dispatch({ action, sched: selectedRow.sched, trainId: selectedRow.train, type: 'TIMETABLE_TRIP_ACTION' })
      .then(({ accepted, reason }) => {
        setActionNote(accepted ? `${action}: Train ${selectedRow.train} schedule ${selectedRow.sched}` : reason ?? 'Timetable action rejected')
      })
  }

  const printTimetable = () => {
    setActionNote('Print requested for traffic current timetable')
    window.print()
  }

  const renderTripButton = (label: string) => (
    <ScadaDomButton
      className="timetable-dom-trip-button"
      key={label}
      label={label}
      onClick={() => applyTripAction(label)}
    />
  )

  return (
    <ScadaDomSurface
      className="scada-dom-root--timetable"
      title={`${actionNote || `Loaded time table ${loadedTimeTableName}`} | ${selectedRow ? `TRN ${selectedRow.train} ${direction}` : 'TRN --'}`}
    >
      <TimetableRegulationGraph now={getTimetableClockNow(session.timetableClock)} rows={session.timetableRows} />
      <div className="timetable-dom-title-strip">Traffic current time table</div>
      <section className="timetable-dom-panel">
        <div className="timetable-dom-filters">
          <label>
            <span>Loaded time table</span>
            <output>{loadedTimeTableName}</output>
          </label>
          <label>
            <span>Station</span>
            <select
              disabled={stationOptions.length <= 1}
              value={activeStation}
              onChange={(event) => setStationSelection(event.target.value)}
            >
              {stationOptions.map((station) => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Direction</legend>
            <label><input checked={direction === 'NB'} onChange={() => setDirectionFilter('NB')} type="radio" /> NB</label>
            <label><input checked={direction === 'SB'} onChange={() => setDirectionFilter('SB')} type="radio" /> SB</label>
          </fieldset>
          <output className="timetable-dom-clock-summary">
            {timetableClockModeLabel} {timetableClockTime}
          </output>
        </div>
        <div className="timetable-dom-headings">
          <span className="origin">ORIGIN</span>
          <span className="selected">SELECTED STATION</span>
          <span className="destination">DESTINATION</span>
        </div>
        <div className="timetable-dom-table" onScroll={updateTimetableScroll} ref={tableRef} role="table">
          <div className="timetable-dom-row timetable-dom-row--head" role="row">
            <span>Stat.</span>
            <span>Train<br />#</span>
            <span>Sched.<br />#</span>
            <span>Point</span>
            <span>Time</span>
            <span>Manoeuvre before</span>
            <span>Point</span>
            <span>Time</span>
            <span>Dwell</span>
            <span>Run</span>
            <span>Point</span>
            <span>Time</span>
            <span>Manoeuvre after</span>
            <span>Rev.</span>
            <span>Speed<br />inc.</span>
            <span>Min.<br />dwell</span>
            <span>Crew<br />#</span>
          </div>
          {rows.map((row, index) => (
            <button
              aria-pressed={selectedRowIndex === index}
              className={`timetable-dom-row timetable-dom-row--data ${selectedRowIndex === index ? 'is-selected' : ''}`}
              data-testid={`timetable-row-${row.train}-${row.sched}`}
              key={`${row.train}-${row.sched}-${index}`}
              onClick={() => selectTimetableRow(index)}
              role="row"
              type="button"
            >
              <span>{row.state}</span>
              <span>{row.train}</span>
              <span>{row.sched}</span>
              <span>{row.originPoint}</span>
              <span>{padClock(row.originTime)}</span>
              <span>-</span>
              <span>{row.stationPoint}</span>
              <span>{padClock(row.stationTime)}</span>
              <span>{padClock(row.dwell)}</span>
              <span>{padClock(row.runTime ?? '')}</span>
              <span>{row.destinationPoint}</span>
              <span>{padClock(row.destinationTime)}</span>
              <span>-</span>
              <span>{row.revision}</span>
              <span>{row.speed}</span>
              <span>{row.minDwell}</span>
              <span />
            </button>
          ))}
        </div>
        <div className="timetable-dom-custom-scrollbar" aria-label="Timetable vertical scroll">
          <button
            aria-label="Scroll timetable up"
            className="timetable-dom-scroll-button timetable-dom-scroll-button--up"
            onClick={() => scrollTimetableBy(-28)}
            type="button"
          />
          <button
            aria-label="Drag timetable scroll position"
            className="timetable-dom-scroll-thumb"
            onPointerDown={startTimetableThumbDrag}
            style={{ height: scrollbarThumbHeight, top: scrollbarThumbTop }}
            type="button"
          />
          <button
            aria-label="Scroll timetable down"
            className="timetable-dom-scroll-button timetable-dom-scroll-button--down"
            onClick={() => scrollTimetableBy(28)}
            type="button"
          />
        </div>
        <div className="timetable-dom-actions">
          {tripActions.map(renderTripButton)}
        </div>
        <ScadaDomButton className="timetable-dom-help" label="Help" onClick={() => setActionNote('Help: select a train row, then apply a timetable action')} />
        <ScadaDomButton className="timetable-dom-print" label="Print" onClick={printTimetable} />
        <ScadaDomButton className="timetable-dom-close" label="Close" onClick={() => onNavigate('/')} />
      </section>
      <ScadaFooter active="TRAFFIC" leftMode="FB No." status="MNADZRULS" compact />
    </ScadaDomSurface>
  )
}
