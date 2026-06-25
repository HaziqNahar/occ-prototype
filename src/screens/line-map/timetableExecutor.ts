import type { TimetableRow } from '../../types'

const SECONDS_PER_DAY = 24 * 60 * 60

export type TimetableExecutableRow = {
  endSeconds: number
  row: TimetableRow
  startSeconds: number
}

export type TimetableTrainDuty = {
  rows: readonly TimetableExecutableRow[]
  trainId: string
}

export type TimetableExecutorSnapshot = {
  activeRows: readonly (TimetableExecutableRow & { trainId: string })[]
  duties: readonly TimetableTrainDuty[]
  nowSeconds: number
}

type TimetableExecutorOptions = {
  getEndSeconds: (row: TimetableRow, startSeconds: number) => number | undefined
  getStartSeconds: (row: TimetableRow) => number | undefined
  isServiceRow?: (row: TimetableRow) => boolean
}

function compareTrainIds(left: string, right: string) {
  const leftNumber = Number(left)
  const rightNumber = Number(right)

  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber - rightNumber
  }

  return left.localeCompare(right)
}

function getEffectiveTimetableWindow(row: TimetableExecutableRow, nowSeconds: number) {
  const endSeconds = row.endSeconds >= row.startSeconds
    ? row.endSeconds
    : row.endSeconds + SECONDS_PER_DAY
  const effectiveNowSeconds = nowSeconds < row.startSeconds && endSeconds >= SECONDS_PER_DAY
    ? nowSeconds + SECONDS_PER_DAY
    : nowSeconds

  return {
    endSeconds,
    nowSeconds: effectiveNowSeconds,
    startSeconds: row.startSeconds,
  }
}

export function isTimetableExecutableRowActive(row: TimetableExecutableRow, nowSeconds: number) {
  const window = getEffectiveTimetableWindow(row, nowSeconds)

  return window.startSeconds <= window.nowSeconds && window.nowSeconds <= window.endSeconds
}

export function createTimetableTrainDuties(
  rows: readonly TimetableRow[],
  options: TimetableExecutorOptions,
): TimetableTrainDuty[] {
  const rowsByTrainId = new Map<string, TimetableExecutableRow[]>()

  rows.forEach((row) => {
    if (options.isServiceRow && !options.isServiceRow(row)) {
      return
    }

    if (!row.train) {
      return
    }

    const startSeconds = options.getStartSeconds(row)

    if (startSeconds === undefined) {
      return
    }

    const endSeconds = options.getEndSeconds(row, startSeconds)

    if (endSeconds === undefined) {
      return
    }

    const trainRows = rowsByTrainId.get(row.train) ?? []

    trainRows.push({
      endSeconds,
      row,
      startSeconds,
    })
    rowsByTrainId.set(row.train, trainRows)
  })

  return Array.from(rowsByTrainId.entries())
    .sort(([leftTrainId], [rightTrainId]) => compareTrainIds(leftTrainId, rightTrainId))
    .map(([trainId, trainRows]) => ({
      rows: trainRows.sort((left, right) => left.startSeconds - right.startSeconds),
      trainId,
    }))
}

export function getActiveTimetableDutyRow(
  duty: TimetableTrainDuty,
  nowSeconds: number,
): (TimetableExecutableRow & { trainId: string }) | undefined {
  const activeRow = duty.rows.find((row) => isTimetableExecutableRowActive(row, nowSeconds))

  return activeRow
    ? {
        ...activeRow,
        trainId: duty.trainId,
      }
    : undefined
}

export function createTimetableExecutorSnapshot(
  rows: readonly TimetableRow[],
  nowSeconds: number,
  options: TimetableExecutorOptions,
): TimetableExecutorSnapshot {
  const duties = createTimetableTrainDuties(rows, options)

  return {
    activeRows: duties.flatMap((duty) => getActiveTimetableDutyRow(duty, nowSeconds) ?? []),
    duties,
    nowSeconds,
  }
}
