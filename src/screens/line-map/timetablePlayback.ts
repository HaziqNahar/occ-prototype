import type { TimetableRow, TrainState } from '../../types'
import { platformData } from './model'
import { resolveTimetableRailPath } from './timetablePathResolver'
import type { TrainRouteAnimationStep } from './trainMovementRoutes'
import {
  TRAIN_MARKER_LOWER_ROUTE_Y,
  TRAIN_MARKER_UPPER_ROUTE_Y,
} from './trainMovementRoutes'

export const TIMETABLE_PLAYBACK_PROFILE = {
  label: 'LIVE CLOCK',
} as const

export const TIMETABLE_PLAYBACK_REFRESH_MS = 30 * 1000

const MAX_TIMETABLE_PLAYBACK_SEGMENT_SECONDS = 2 * 60 * 60
const FALLBACK_TIMETABLE_PLAYBACK_SEGMENT_SECONDS = 5 * 60

export type TimetablePlaybackPlan = {
  firstStepIndex: number
  panelCode: string
  routeLabel: string
  routeSteps?: readonly TrainRouteAnimationStep[]
  steps: readonly TrainRouteAnimationStep[]
  stepOffsetsMs: readonly number[]
  scheduleNumber: string
  service: string
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
  return shouldUseTimetableOriginTime(row)
    ? parseTimetableSeconds(row.originTime)
    : parseTimetableSeconds(row.stationTime)
    ?? parseTimetableSeconds(row.originTime)
    ?? parseTimetableSeconds(row.destinationTime)
}

export function getTimetableRowEndSeconds(row: TimetableRow) {
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

  return platformData.some((platform) => platform.code === code) ? code : ''
}

export function getTimetableRowSelectedStation(row: TimetableRow) {
  return row.selectedStation
    || normalizeTimetablePointCode(row.stationPoint)
    || normalizeTimetablePointCode(row.originPoint)
    || 'SKG'
}

function createTimetableStationPlaybackStep(
  trainId: string,
  row: TimetableRow,
  point: string,
  index: number,
): TrainRouteAnimationStep | undefined {
  const stationCode = normalizeTimetablePointCode(point)
  const platform = platformData.find((item) => item.code === stationCode)

  if (!platform) {
    return undefined
  }

  return {
    point: {
      x: platform.x,
      y: row.run === 'NB' ? TRAIN_MARKER_UPPER_ROUTE_Y : TRAIN_MARKER_LOWER_ROUTE_Y,
    },
    segmentId: `timetable-${row.sched}-${trainId}-${stationCode}-${index}`,
  }
}

export function createTimetableStationPlaybackSteps(
  trainId: string,
  row: TimetableRow,
): TrainRouteAnimationStep[] {
  const points = shouldUseTimetableOriginTime(row)
    ? [row.originPoint, row.stationPoint, row.destinationPoint]
    : [row.stationPoint, row.destinationPoint]
  const normalizedPoints = points
    .map((point) => normalizeTimetablePointCode(point))
    .filter(Boolean)
    .filter((point, index, allPoints) => index === 0 || point !== allPoints[index - 1])

  return normalizedPoints.flatMap((point, index) => {
    const step = createTimetableStationPlaybackStep(trainId, row, point, index)

    return step ? [step] : []
  })
}

function getTimetablePlaybackPanelCode(row: TimetableRow) {
  return normalizeTimetablePointCode(row.stationPoint)
    || normalizeTimetablePointCode(row.originPoint)
    || normalizeTimetablePointCode(row.destinationPoint)
    || 'SKG'
}

function createTimetablePlaybackPlan(
  trainId: string,
  timetableRow: {
    row: TimetableRow
    startSeconds: number
  },
): Omit<TimetablePlaybackPlan, 'firstStepIndex' | 'stepOffsetsMs'> | undefined {
  const railPath = resolveTimetableRailPath(timetableRow.row)

  if (railPath) {
    return {
      panelCode: railPath.panelCode,
      routeLabel: railPath.routeLabel,
      routeSteps: railPath.steps,
      scheduleNumber: timetableRow.row.sched,
      service: timetableRow.row.run,
      steps: railPath.steps,
      trainId,
    }
  }

  const steps = createTimetableStationPlaybackSteps(trainId, timetableRow.row)

  if (steps.length === 0) {
    return undefined
  }

  return {
    panelCode: getTimetablePlaybackPanelCode(timetableRow.row),
    routeLabel: `Timetable ${timetableRow.row.run} ${timetableRow.row.originPoint || 'START'}-${timetableRow.row.destinationPoint || 'END'}`,
    scheduleNumber: timetableRow.row.sched,
    service: timetableRow.row.run,
    steps,
    trainId,
  }
}

function pickTimetablePlaybackRow(rows: readonly TimetableRow[], trainId: string, nowSeconds: number) {
  const trainRows = rows
    .filter((row) => row.train === trainId && (row.run === 'NB' || row.run === 'SB'))
    .flatMap((row) => {
      const startSeconds = getTimetableRowStartSeconds(row)

      if (startSeconds === undefined) {
        return []
      }

      const endSeconds = getTimetableRowPlaybackEndSeconds(row, startSeconds)

      if (endSeconds === undefined) {
        return []
      }

      return [{
        endSeconds,
        row,
        startSeconds,
      }]
    })
    .sort((left, right) => left.startSeconds - right.startSeconds)

  return trainRows.find((entry) => (
    entry.startSeconds <= nowSeconds && nowSeconds <= Math.max(entry.startSeconds, entry.endSeconds)
  ))
}

export function getTimetablePlaybackTrainIds(rows: readonly TimetableRow[]) {
  return Array.from(new Set(
    rows
      .filter((row) => row.train && (row.run === 'NB' || row.run === 'SB'))
      .map((row) => row.train),
  ))
}

export function createTimetablePlaybackPlans(
  rows: readonly TimetableRow[],
  now: Date,
): TimetablePlaybackPlan[] {
  const nowSeconds = getSecondsIntoTimetableDay(now)
  const selectedPlans: Array<{
    endSeconds: number
    panelCode: string
    routeLabel: string
    scheduleNumber: string
    service: string
    startSeconds: number
    routeSteps?: readonly TrainRouteAnimationStep[]
    steps: readonly TrainRouteAnimationStep[]
    trainId: string
  }> = []

  getTimetablePlaybackTrainIds(rows).forEach((trainId) => {
    const timetableRow = pickTimetablePlaybackRow(rows, trainId, nowSeconds)

    if (!timetableRow) {
      return
    }

    const plan = createTimetablePlaybackPlan(trainId, timetableRow)

    if (!plan) {
      return
    }

    selectedPlans.push({
      ...plan,
      endSeconds: timetableRow.endSeconds,
      startSeconds: timetableRow.startSeconds,
    })
  })

  return selectedPlans.map((plan) => ({
    firstStepIndex: getTimetablePlaybackFirstStepIndex(plan.startSeconds, plan.endSeconds, nowSeconds, plan.steps.length),
    panelCode: plan.panelCode,
    routeLabel: plan.routeLabel,
    routeSteps: plan.routeSteps,
    scheduleNumber: plan.scheduleNumber,
    service: plan.service,
    steps: plan.steps,
    stepOffsetsMs: createTimetablePlaybackStepOffsets(plan.startSeconds, plan.endSeconds, nowSeconds, plan.steps.length),
    trainId: plan.trainId,
  }))
}

function getTimetablePlaybackElapsedSeconds(startSeconds: number, endSeconds: number, nowSeconds: number) {
  if (nowSeconds < startSeconds) {
    return 0
  }

  return Math.min(
    getForwardTimetableDurationSeconds(startSeconds, endSeconds),
    getForwardTimetableDurationSeconds(startSeconds, nowSeconds),
  )
}

export function getTimetablePlaybackFirstStepIndex(
  startSeconds: number,
  endSeconds: number,
  nowSeconds: number,
  stepCount: number,
) {
  if (nowSeconds < startSeconds || stepCount <= 1) {
    return 0
  }

  const durationSeconds = Math.max(1, getForwardTimetableDurationSeconds(startSeconds, endSeconds))
  const elapsedSeconds = getTimetablePlaybackElapsedSeconds(startSeconds, endSeconds, nowSeconds)
  const lastStepIndex = stepCount - 1

  return Math.min(lastStepIndex, Math.floor((elapsedSeconds / durationSeconds) * lastStepIndex))
}

export function createTimetablePlaybackStepOffsets(
  startSeconds: number,
  endSeconds: number,
  nowSeconds: number,
  stepCount: number,
) {
  const durationSeconds = Math.max(1, getForwardTimetableDurationSeconds(startSeconds, endSeconds))
  const lastStepIndex = Math.max(0, stepCount - 1)
  const startOffsetSeconds = nowSeconds < startSeconds
    ? startSeconds - nowSeconds
    : 0
  const elapsedSeconds = getTimetablePlaybackElapsedSeconds(startSeconds, endSeconds, nowSeconds)

  return Array.from({ length: stepCount }, (_, stepIndex) => {
    const stepElapsedSeconds = lastStepIndex === 0
      ? 0
      : (durationSeconds * stepIndex) / lastStepIndex

    return Math.max(0, (startOffsetSeconds + stepElapsedSeconds - elapsedSeconds) * 1000)
  })
}

function createTimetablePlaybackTrain(
  plan: TimetablePlaybackPlan,
  step: TrainRouteAnimationStep,
  stepIndex: number,
  lastStepIndex: number,
): TrainState {
  const routePlaybackComplete = Boolean(plan.routeSteps && stepIndex >= lastStepIndex)

  return {
    direction: plan.service === 'SB' ? 'left' : 'right',
    id: plan.trainId,
    isMoving: !routePlaybackComplete && stepIndex < lastStepIndex,
    lineMapVisible: routePlaybackComplete ? false : true,
    occupancySegmentId: plan.routeSteps && !routePlaybackComplete ? step.segmentId : undefined,
    scheduleNumber: plan.scheduleNumber,
    service: plan.service,
    status: stepIndex < lastStepIndex ? 'RUN' : 'WAIT',
    timetablePlayback: true,
    trainNumber: plan.trainId,
    x: step.point.x,
    y: step.point.y,
  }
}

export function upsertTimetablePlaybackTrain(
  trains: readonly TrainState[],
  plan: TimetablePlaybackPlan,
  step: TrainRouteAnimationStep,
  stepIndex: number,
  lastStepIndex: number,
): TrainState[] {
  const trainExists = trains.some((train) => train.id === plan.trainId)
  const playbackTrain = createTimetablePlaybackTrain(plan, step, stepIndex, lastStepIndex)

  if (!trainExists) {
    return [...trains, playbackTrain]
  }

  return trains.map((train) => (
    train.id === plan.trainId
      ? {
          ...train,
          ...playbackTrain,
          doorFailureState: train.doorFailureState,
          itamaAuthorisedPreparationConfirmed: train.itamaAuthorisedPreparationConfirmed,
          itamaGranted: train.itamaGranted,
          itamaNotAuthorisedPreparationConfirmed: train.itamaNotAuthorisedPreparationConfirmed,
          itamaStatus: train.itamaStatus,
          readinessMode: train.readinessMode,
        }
      : train
  ))
}
