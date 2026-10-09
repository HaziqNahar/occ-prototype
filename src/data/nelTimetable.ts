import type { TimetableRow } from '../types'
import { nelOtesWeekday03CorrectedPage7Services } from './nelOtesWeekday03Page7Patch'
import { nelOtesWeekday03Services as extractedNelOtesWeekday03Services } from './nelOtesWeekday03Services'
import type { NelTimetableService } from './nelOtesWeekday03Services'
import { nelOtesWeekday04Services } from './nelOtesWeekday04Services'

export const NEL_TIMETABLE_NAMES = ['NEL_OTES_Weekday_03', 'NEL_OTES_Weekday_04'] as const

export type NelTimetableName = typeof NEL_TIMETABLE_NAMES[number]

export const DEFAULT_NEL_TIMETABLE_NAME: NelTimetableName = 'NEL_OTES_Weekday_03'

// Kept for callers that only need the default timetable label.
export const NEL_TIMETABLE_NAME = DEFAULT_NEL_TIMETABLE_NAME

export const nelTimetableOptions: ReadonlyArray<{ effectiveFrom: string; label: string; value: NelTimetableName }> = [
  { effectiveFrom: '14 Jul 2025', label: 'Weekday 03', value: 'NEL_OTES_Weekday_03' },
  { effectiveFrom: '05 Jan 2026', label: 'Weekday 04', value: 'NEL_OTES_Weekday_04' },
]

export function isNelTimetableName(value: unknown): value is NelTimetableName {
  return NEL_TIMETABLE_NAMES.includes(value as NelTimetableName)
}

export function normalizeNelTimetableName(value: unknown): NelTimetableName {
  return isNelTimetableName(value) ? value : DEFAULT_NEL_TIMETABLE_NAME
}

export type NelTimetableFocus = 'all' | 'first-service-pair'

export type NelTrainRosterItem = {
  firstScheduleNumber: string
  service: string
  trainNumber: string
}

type NelTimetableRowsOptions = {
  focus?: NelTimetableFocus
  timetable?: NelTimetableName
}

const FIRST_SERVICE_PAIR_SCHEDULES = {
  NB: { first: 1000, last: 1013 },
  SB: { first: 2000, last: 2013 },
} as const

function getServiceState(notes: readonly string[]) {
  if (notes.some((note) => note.includes("W'draw"))) {
    return 'W>'
  }

  if (notes.some((note) => note.includes('Ins'))) {
    return 'I>'
  }

  return ''
}

function getTimetableServiceKey(service: NelTimetableService) {
  return [
    service.scheduleNo,
    service.serviceNo,
    service.run,
    service.originPoint,
    service.originTime,
    service.stationPoint,
    service.stationTime,
    service.destinationPoint,
    service.destinationTime,
  ].join('|')
}

function replaceCroppedTimetablePageServices(
  correctedRows: readonly NelTimetableService[],
  extractedRows: readonly NelTimetableService[],
) {
  const rowsByKey = new Map<string, NelTimetableService>()
  const correctedScheduleKeys = new Set(correctedRows.map((service) => (
    `${service.direction}|${service.scheduleNo}|${service.serviceNo}`
  )))
  const filteredExtractedRows = extractedRows.filter((service) => (
    !correctedScheduleKeys.has(`${service.direction}|${service.scheduleNo}|${service.serviceNo}`)
  ))

  ;[...correctedRows, ...filteredExtractedRows].forEach((service) => {
    const key = getTimetableServiceKey(service)

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, service)
    }
  })

  return Array.from(rowsByKey.values())
}

const nelOtesWeekday03Services = replaceCroppedTimetablePageServices(
  nelOtesWeekday03CorrectedPage7Services,
  extractedNelOtesWeekday03Services,
)

const nelTimetableServices: Record<NelTimetableName, readonly NelTimetableService[]> = {
  NEL_OTES_Weekday_03: nelOtesWeekday03Services,
  NEL_OTES_Weekday_04: nelOtesWeekday04Services,
}

function getFocusedNelTimetableServices(options: NelTimetableRowsOptions = {}) {
  const services = nelTimetableServices[options.timetable ?? DEFAULT_NEL_TIMETABLE_NAME]

  if (options.focus !== 'first-service-pair') {
    return services
  }

  return services.filter((service) => (
    Number(service.scheduleNo) >= FIRST_SERVICE_PAIR_SCHEDULES[service.direction].first
    && Number(service.scheduleNo) <= FIRST_SERVICE_PAIR_SCHEDULES[service.direction].last
  ))
}

export function createNelTimetableRows(options: NelTimetableRowsOptions = {}): TimetableRow[] {
  return getFocusedNelTimetableServices(options).map((service) => ({
    destinationPoint: service.destinationPoint,
    destinationTime: service.destinationTime,
    dwell: service.dwell,
    originPoint: service.originPoint,
    originTime: service.originTime,
    revision: '',
    run: service.run,
    sched: service.scheduleNo,
    selectedStation: service.selectedStation,
    speed: '',
    state: getServiceState(service.notes),
    stationPoint: service.stationPoint,
    stationTime: service.stationTime,
    train: service.serviceNo,
  }))
}

export function createNelTrainRosterItems(options: NelTimetableRowsOptions = {}): NelTrainRosterItem[] {
  const rosterByTrainNumber = new Map<string, {
    directions: Set<string>
    firstScheduleNumber: string
    trainNumber: string
  }>()

  getFocusedNelTimetableServices(options).forEach((service) => {
    const existing = rosterByTrainNumber.get(service.serviceNo)

    if (existing) {
      existing.directions.add(service.direction)
      return
    }

    rosterByTrainNumber.set(service.serviceNo, {
      directions: new Set([service.direction]),
      firstScheduleNumber: service.scheduleNo,
      trainNumber: service.serviceNo,
    })
  })

  return Array.from(rosterByTrainNumber.values())
    .sort((left, right) => Number(left.trainNumber) - Number(right.trainNumber))
    .map((item) => ({
      firstScheduleNumber: item.firstScheduleNumber,
      service: item.directions.size > 1 ? 'NB/SB' : Array.from(item.directions)[0] ?? '',
      trainNumber: item.trainNumber,
    }))
}
