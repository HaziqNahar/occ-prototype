import type { TimetableRow, TimetableViewDirection, TimetableViewState } from './types'
import { getTimetableRowSelectedStation } from './screens/line-map/timetablePlayback'

export const DEFAULT_TIMETABLE_VIEW_STATE: TimetableViewState = {
  direction: 'NB',
  station: 'SKG',
}

export function getTimetableStationOptions(rows: readonly TimetableRow[]) {
  return Array.from(new Set(rows.map(getTimetableRowSelectedStation).filter(Boolean))).sort()
}

export function normalizeTimetableViewState(
  view: Partial<TimetableViewState> | undefined,
): TimetableViewState {
  const direction: TimetableViewDirection = view?.direction === 'SB' ? 'SB' : 'NB'
  const station = view?.station?.trim().toUpperCase() || DEFAULT_TIMETABLE_VIEW_STATE.station

  return {
    direction,
    station,
  }
}

export function getActiveTimetableView(
  rows: readonly TimetableRow[],
  view: Partial<TimetableViewState> | undefined,
): TimetableViewState {
  const normalizedView = normalizeTimetableViewState(view)
  const stationOptions = getTimetableStationOptions(rows)

  return {
    direction: normalizedView.direction,
    station: stationOptions.includes(normalizedView.station)
      ? normalizedView.station
      : stationOptions[0] ?? normalizedView.station,
  }
}

export function getTimetableRowsForStation(
  rows: readonly TimetableRow[],
  station: string,
) {
  return rows.filter((row) => getTimetableRowSelectedStation(row) === station)
}

export function getTimetableViewRows(
  rows: readonly TimetableRow[],
  view: Partial<TimetableViewState> | undefined,
) {
  const activeView = getActiveTimetableView(rows, view)

  return getTimetableRowsForStation(rows, activeView.station)
    .filter((row) => row.run === activeView.direction)
}

export function getTimetableViewKey(view: Partial<TimetableViewState> | undefined) {
  const normalizedView = normalizeTimetableViewState(view)

  return `${normalizedView.station}:${normalizedView.direction}`
}
