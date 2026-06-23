import type { TimetableRow, TrainState } from '../../types'
import type { TrainRouteAnimationStep } from './trainMovementRoutes'
import type { TimetableRouteLocation } from './lineMapRoutePaths'
import {
  createTimetableServiceDecisions,
  getForwardTimetableDurationSeconds,
  getSecondsIntoTimetableDay,
  getTimetableServiceTrainIds,
} from './timetableServiceState'
import type { TimetableServiceDecision } from './timetableServiceState'

export {
  createTimetableServiceDecisions,
  getForwardTimetableDurationSeconds,
  getSecondsIntoTimetableDay,
  getTimetableRowEndSeconds,
  getTimetableRowPlaybackEndSeconds,
  getTimetableRowSelectedStation,
  getTimetableRowStartSeconds,
  normalizeTimetablePointCode,
  parseTimetableSeconds,
  shouldUseTimetableOriginTime,
} from './timetableServiceState'

export const TIMETABLE_PLAYBACK_PROFILE = {
  label: 'LIVE CLOCK',
} as const

export const TIMETABLE_PLAYBACK_REFRESH_MS = 30 * 1000

export type TimetablePlaybackPlan = {
  endSeconds: number
  firstStepIndex: number
  from: TimetableRouteLocation
  panelCode: string
  routeLabel: string
  routeLabels: readonly string[]
  routeSteps: readonly TrainRouteAnimationStep[]
  steps: readonly TrainRouteAnimationStep[]
  stepOffsetsMs: readonly number[]
  scheduleNumber: string
  service: string
  startSeconds: number
  stationRouteId: string
  to: TimetableRouteLocation
  trainId: string
  via?: readonly TimetableRouteLocation[]
}

function createTimetablePlaybackPlan(
  decision: TimetableServiceDecision,
): Omit<TimetablePlaybackPlan, 'endSeconds' | 'firstStepIndex' | 'startSeconds' | 'stepOffsetsMs'> {
  const railPath = decision.route

  return {
    from: railPath.from,
    panelCode: railPath.panelCode,
    routeLabel: railPath.routeLabel,
    routeLabels: railPath.routeLabels,
    routeSteps: railPath.steps,
    scheduleNumber: decision.row.sched,
    service: decision.row.run,
    stationRouteId: railPath.id,
    steps: railPath.steps,
    to: railPath.to,
    trainId: decision.trainId,
    via: railPath.via,
  }
}

export function getTimetablePlaybackTrainIds(rows: readonly TimetableRow[]) {
  return getTimetableServiceTrainIds(rows)
}

export function createTimetablePlaybackPlans(
  rows: readonly TimetableRow[],
  now: Date,
): TimetablePlaybackPlan[] {
  const nowSeconds = getSecondsIntoTimetableDay(now)
  const selectedPlans = createTimetableServiceDecisions(rows, now)
    .map((decision) => ({
      ...createTimetablePlaybackPlan(decision),
      endSeconds: decision.endSeconds,
      startSeconds: decision.startSeconds,
    }))

  return selectedPlans.map((plan) => ({
    endSeconds: plan.endSeconds,
    firstStepIndex: getTimetablePlaybackFirstStepIndex(plan.startSeconds, plan.endSeconds, nowSeconds, plan.steps.length),
    from: plan.from,
    panelCode: plan.panelCode,
    routeLabel: plan.routeLabel,
    routeLabels: plan.routeLabels,
    routeSteps: plan.routeSteps,
    scheduleNumber: plan.scheduleNumber,
    service: plan.service,
    startSeconds: plan.startSeconds,
    stationRouteId: plan.stationRouteId,
    steps: plan.steps,
    stepOffsetsMs: createTimetablePlaybackStepOffsets(plan.startSeconds, plan.endSeconds, nowSeconds, plan.steps.length),
    to: plan.to,
    trainId: plan.trainId,
    via: plan.via,
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
  const routePlaybackComplete = stepIndex >= lastStepIndex

  return {
    direction: plan.service === 'SB' ? 'left' : 'right',
    id: plan.trainId,
    isMoving: !routePlaybackComplete && stepIndex < lastStepIndex,
    lineMapVisible: routePlaybackComplete ? false : true,
    occupancySegmentId: !routePlaybackComplete ? step.segmentId : undefined,
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
