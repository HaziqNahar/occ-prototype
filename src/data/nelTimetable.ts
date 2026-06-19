import type { TimetableRow } from '../types'
import { nelOtesWeekday03Page7Patch } from './nelOtesWeekday03Page7Patch'
import { nelOtesWeekday03Services as extractedNelOtesWeekday03Services } from './nelOtesWeekday03Services'
import type { NelTimetableService } from './nelOtesWeekday03Services'

export const NEL_TIMETABLE_NAME = 'NEL_OTES_Weekday_03'

export type NelTrainRosterItem = {
  firstScheduleNumber: string
  service: string
  trainNumber: string
}

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

function mergeTimetableServices(
  patchRows: readonly NelTimetableService[],
  extractedRows: readonly NelTimetableService[],
) {
  const rowsByKey = new Map<string, NelTimetableService>()

  ;[...patchRows, ...extractedRows].forEach((service) => {
    const key = getTimetableServiceKey(service)

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, service)
    }
  })

  return Array.from(rowsByKey.values())
}

const nelOtesWeekday03Services = mergeTimetableServices(
  nelOtesWeekday03Page7Patch,
  extractedNelOtesWeekday03Services,
)

export function createNelTimetableRows(): TimetableRow[] {
  return nelOtesWeekday03Services.map((service) => ({
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

export function createNelTrainRosterItems(): NelTrainRosterItem[] {
  const rosterByTrainNumber = new Map<string, {
    directions: Set<string>
    firstScheduleNumber: string
    trainNumber: string
  }>()

  nelOtesWeekday03Services.forEach((service) => {
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
