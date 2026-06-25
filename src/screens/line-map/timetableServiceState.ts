import type { TimetableRow } from '../../types'
import { createTimetableExecutorSnapshot, createTimetableTrainDuties } from './timetableExecutor'
import { resolveTimetableRailPath } from './timetablePathResolver'
import type { TimetableRailPathResolution } from './timetablePathResolver'

const MAX_TIMETABLE_PLAYBACK_SEGMENT_SECONDS = 2 * 60 * 60
const FALLBACK_TIMETABLE_PLAYBACK_SEGMENT_SECONDS = 5 * 60
const NEL_TIMETABLE_STATION_CODES = new Set([
  'BGK',
  'BNK',
  'CNT',
  'CQY',
  'DBG',
  'FRP',
  'HBF',
  'HGN',
  'KVN',
  'LTI',
  'OTP',
  'PGC',
  'PGL',
  'PTP',
  'SER',
  'SKG',
  'WLH',
])

export type TimetableServiceDecision = {
  endSeconds: number
  row: TimetableRow
  route: TimetableRailPathResolution
  startSeconds: number
  status: 'RUNNING'
  trainId: string
}

export function parseTimetableSeconds(value: string): number | undefined {
  const parts = value.trim().split(':').map((part) => Number(part))

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return undefined
  }

  const [hours, minutes, seconds] = parts

  return (hours * 3600) + (minutes * 60) + seconds
}

export function getForwardTimetableDurationSeconds(startSeconds: number, endSeconds: number) {
  return endSeconds >= startSeconds
    ? endSeconds - startSeconds
    : (endSeconds + (24 * 60 * 60)) - startSeconds
}

export function shouldUseTimetableOriginTime(row: TimetableRow) {
  const originSeconds = parseTimetableSeconds(row.originTime)
  const stationSeconds = parseTimetableSeconds(row.stationTime)

  if (originSeconds === undefined || stationSeconds === undefined) {
    return false
  }

  return getForwardTimetableDurationSeconds(originSeconds, stationSeconds) <= 2 * 60 * 60
}

export function getTimetableRowStartSeconds(row: TimetableRow) {
  if (shouldUseTimetableStationStartTime(row)) {
    return parseTimetableSeconds(row.stationTime)
      ?? parseTimetableSeconds(row.originTime)
      ?? parseTimetableSeconds(row.destinationTime)
  }

  return shouldUseTimetableOriginTime(row)
    ? parseTimetableSeconds(row.originTime)
    : parseTimetableSeconds(row.stationTime)
    ?? parseTimetableSeconds(row.originTime)
    ?? parseTimetableSeconds(row.destinationTime)
}

export function getTimetableRowEndSeconds(row: TimetableRow) {
  if (shouldUseTimetableStationEndTime(row)) {
    return parseTimetableSeconds(row.stationTime)
      ?? parseTimetableSeconds(row.destinationTime)
      ?? parseTimetableSeconds(row.originTime)
  }

  return parseTimetableSeconds(row.destinationTime)
    ?? parseTimetableSeconds(row.stationTime)
    ?? parseTimetableSeconds(row.originTime)
}

export function getTimetableRowPlaybackEndSeconds(row: TimetableRow, startSeconds: number) {
  const endSeconds = getTimetableRowEndSeconds(row)

  if (endSeconds === undefined) {
    return undefined
  }

  const durationSeconds = getForwardTimetableDurationSeconds(startSeconds, endSeconds)

  return durationSeconds > MAX_TIMETABLE_PLAYBACK_SEGMENT_SECONDS
    ? startSeconds + FALLBACK_TIMETABLE_PLAYBACK_SEGMENT_SECONDS
    : endSeconds
}

export function getSecondsIntoTimetableDay(now: Date) {
  const seconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds()

  return seconds < 3 * 60 * 60 ? seconds + 24 * 60 * 60 : seconds
}

export function normalizeTimetablePointCode(point: string) {
  const code = point.trim().replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3)

  return NEL_TIMETABLE_STATION_CODES.has(code) ? code : ''
}

export function getTimetableRowSelectedStation(row: TimetableRow) {
  return row.selectedStation
    || normalizeTimetablePointCode(row.stationPoint)
    || normalizeTimetablePointCode(row.originPoint)
    || 'SKG'
}

function isCurrentLineMapNorthboundScopeRow(row: TimetableRow) {
  const station = normalizeTimetablePointCode(row.stationPoint) || normalizeTimetablePointCode(row.selectedStation ?? '')
  const destination = normalizeTimetablePointCode(row.destinationPoint)

  return row.run === 'NB'
    && station === 'SKG'
    && (destination === 'PGC' || destination === 'PGL')
}

function isCurrentLineMapSouthboundScopeRow(row: TimetableRow) {
  const destination = normalizeTimetablePointCode(row.destinationPoint)
  const origin = normalizeTimetablePointCode(row.originPoint)
  const station = normalizeTimetablePointCode(row.stationPoint) || normalizeTimetablePointCode(row.selectedStation ?? '')

  return row.run === 'SB'
    && Boolean(destination)
    && (origin === 'PGC' || origin === 'PGL')
    && station === 'SKG'
}

export function shouldUseTimetableStationStartTime(row: TimetableRow) {
  return isCurrentLineMapNorthboundScopeRow(row)
}

export function shouldUseTimetableStationEndTime(row: TimetableRow) {
  return isCurrentLineMapSouthboundScopeRow(row)
}

function isTimetableServiceRow(row: TimetableRow) {
  return Boolean(row.train && (row.run === 'NB' || row.run === 'SB'))
}

export function getTimetableServiceTrainIds(rows: readonly TimetableRow[]) {
  return createTimetableTrainDuties(rows, {
    getEndSeconds: getTimetableRowPlaybackEndSeconds,
    getStartSeconds: getTimetableRowStartSeconds,
    isServiceRow: isTimetableServiceRow,
  }).map((duty) => duty.trainId)
}

export function createTimetableServiceDecisions(
  rows: readonly TimetableRow[],
  now: Date,
): TimetableServiceDecision[] {
  const nowSeconds = getSecondsIntoTimetableDay(now)
  const snapshot = createTimetableExecutorSnapshot(rows, nowSeconds, {
    getEndSeconds: getTimetableRowPlaybackEndSeconds,
    getStartSeconds: getTimetableRowStartSeconds,
    isServiceRow: isTimetableServiceRow,
  })

  return snapshot.activeRows.flatMap((serviceRow) => {
    const route = resolveTimetableRailPath(serviceRow.row)

    if (!route) {
      return []
    }

    return [{
      endSeconds: serviceRow.endSeconds,
      row: serviceRow.row,
      route,
      startSeconds: serviceRow.startSeconds,
      status: 'RUNNING' as const,
      trainId: serviceRow.trainId,
    }]
  })
}
