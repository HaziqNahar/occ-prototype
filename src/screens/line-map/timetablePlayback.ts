import type { TimetableRow, TrainState } from '../../types'
import type { TrainRouteAnimationStep } from './trainMovementRoutes'
import type { TimetablePlatformStopDefinition, TimetableRouteLocation } from './lineMapRoutePaths'
import {
  createTimetableServiceDecisions,
  getForwardTimetableDurationSeconds,
  getSecondsIntoTimetableDay,
  getTimetableServiceTrainIds,
  normalizeTimetablePointCode,
  parseTimetableSeconds,
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
  shouldUseTimetableStationEndTime,
  shouldUseTimetableStationStartTime,
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
  routeSteps: readonly TrainRouteAnimationStep[]
  platformStops: readonly TimetablePlatformStopDefinition[]
  steps: readonly TrainRouteAnimationStep[]
  stepOffsetsMs: readonly number[]
  scheduleNumber: string
  service: string
  signalRouteRefs: readonly string[]
  startSeconds: number
  stepSignedOffsetsMs: readonly number[]
  stationRouteId: string
  to: TimetableRouteLocation
  trainId: string
  via?: readonly TimetableRouteLocation[]
}

type TimetablePlaybackPlanDraft = Omit<
  TimetablePlaybackPlan,
  'firstStepIndex' | 'stepOffsetsMs' | 'stepSignedOffsetsMs'
> & {
  row: TimetableRow
}

function createTimetablePlaybackPlan(
  decision: TimetableServiceDecision,
): Omit<
  TimetablePlaybackPlan,
  'endSeconds' | 'firstStepIndex' | 'startSeconds' | 'stepOffsetsMs' | 'stepSignedOffsetsMs'
> {
  const railPath = decision.route

  return {
    from: railPath.from,
    panelCode: railPath.panelCode,
    platformStops: railPath.platformStops,
    routeLabel: railPath.routeLabel,
    routeSteps: railPath.steps,
    scheduleNumber: decision.row.sched,
    service: decision.row.run,
    signalRouteRefs: railPath.signalRouteRefs,
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
      row: decision.row,
      startSeconds: decision.startSeconds,
    }))

  return selectedPlans.map((plan) => {
    const stepSignedOffsetsMs = createTimetablePlaybackPlanStepOffsets(
      plan,
      nowSeconds,
      { clamp: false },
    )
    const stepOffsetsMs = createTimetablePlaybackPlanStepOffsets(plan, nowSeconds)

    return {
      endSeconds: plan.endSeconds,
      firstStepIndex: getTimetablePlaybackFirstStepIndexFromSignedOffsets(stepSignedOffsetsMs),
      from: plan.from,
      panelCode: plan.panelCode,
      platformStops: plan.platformStops,
      routeLabel: plan.routeLabel,
      routeSteps: plan.routeSteps,
      scheduleNumber: plan.scheduleNumber,
      service: plan.service,
      signalRouteRefs: plan.signalRouteRefs,
      startSeconds: plan.startSeconds,
      stepSignedOffsetsMs,
      stationRouteId: plan.stationRouteId,
      steps: plan.steps,
      stepOffsetsMs,
      to: plan.to,
      trainId: plan.trainId,
      via: plan.via,
    }
  })
}

function createTimetablePlaybackPlanStepOffsets(
  plan: TimetablePlaybackPlanDraft,
  nowSeconds: number,
  options: { clamp?: boolean } = {},
) {
  const timingAnchor = getTimetablePlaybackPlanTimingAnchor(plan)

  if (!timingAnchor) {
    return createTimetablePlaybackStepOffsets(
      plan.startSeconds,
      plan.endSeconds,
      nowSeconds,
      plan.steps.length,
      options,
    )
  }

  return createAnchoredTimetablePlaybackStepOffsets({
    anchorSeconds: timingAnchor.seconds,
    anchorStepIndex: timingAnchor.stepIndex,
    endSeconds: plan.endSeconds,
    nowSeconds,
    options,
    startSeconds: plan.startSeconds,
    stepCount: plan.steps.length,
  })
}

function getTimetablePlaybackPlanTimingAnchor(plan: TimetablePlaybackPlanDraft) {
  if (
    plan.service !== 'NB'
    || normalizeTimetablePointCode(plan.row.originPoint) !== 'SKG'
    || normalizeTimetablePointCode(plan.row.stationPoint) !== 'SKG'
  ) {
    return undefined
  }

  const stationSeconds = parseTimetableSeconds(plan.row.stationTime)
  const platformStop = plan.platformStops.find((stop) => stop.platformCode === 'SKG' && stop.track === 'NB')

  if (stationSeconds === undefined || !platformStop || platformStop.stepIndex <= 0) {
    return undefined
  }

  const startToStationSeconds = getForwardTimetableDurationSeconds(plan.startSeconds, stationSeconds)
  const startToEndSeconds = getForwardTimetableDurationSeconds(plan.startSeconds, plan.endSeconds)

  if (startToStationSeconds > startToEndSeconds) {
    return undefined
  }

  return {
    seconds: stationSeconds,
    stepIndex: platformStop.stepIndex,
  }
}

function getTimetablePlaybackFirstStepIndexFromSignedOffsets(stepSignedOffsetsMs: readonly number[]) {
  return stepSignedOffsetsMs.reduce<number | undefined>((currentStepIndex, delayMs, stepIndex) => (
    delayMs <= 0 ? stepIndex : currentStepIndex
  ), undefined) ?? 0
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
  options: { clamp?: boolean } = {},
) {
  const shouldClamp = options.clamp ?? true
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

    const offsetMs = (startOffsetSeconds + stepElapsedSeconds - elapsedSeconds) * 1000

    return shouldClamp ? Math.max(0, offsetMs) : offsetMs
  })
}

function createAnchoredTimetablePlaybackStepOffsets({
  anchorSeconds,
  anchorStepIndex,
  endSeconds,
  nowSeconds,
  options,
  startSeconds,
  stepCount,
}: {
  anchorSeconds: number
  anchorStepIndex: number
  endSeconds: number
  nowSeconds: number
  options: { clamp?: boolean }
  startSeconds: number
  stepCount: number
}) {
  const shouldClamp = options.clamp ?? true
  const lastStepIndex = Math.max(0, stepCount - 1)
  const startOffsetSeconds = nowSeconds < startSeconds
    ? startSeconds - nowSeconds
    : 0
  const elapsedSeconds = getTimetablePlaybackElapsedSeconds(startSeconds, endSeconds, nowSeconds)
  const startToAnchorSeconds = getForwardTimetableDurationSeconds(startSeconds, anchorSeconds)
  const anchorToEndSeconds = getForwardTimetableDurationSeconds(anchorSeconds, endSeconds)

  return Array.from({ length: stepCount }, (_, stepIndex) => {
    const stepElapsedSeconds = getAnchoredTimetableStepElapsedSeconds({
      anchorStepIndex,
      anchorToEndSeconds,
      lastStepIndex,
      startToAnchorSeconds,
      stepIndex,
    })
    const offsetMs = (startOffsetSeconds + stepElapsedSeconds - elapsedSeconds) * 1000

    return shouldClamp ? Math.max(0, offsetMs) : offsetMs
  })
}

function getAnchoredTimetableStepElapsedSeconds({
  anchorStepIndex,
  anchorToEndSeconds,
  lastStepIndex,
  startToAnchorSeconds,
  stepIndex,
}: {
  anchorStepIndex: number
  anchorToEndSeconds: number
  lastStepIndex: number
  startToAnchorSeconds: number
  stepIndex: number
}) {
  if (stepIndex <= anchorStepIndex) {
    return anchorStepIndex === 0
      ? 0
      : (startToAnchorSeconds * stepIndex) / anchorStepIndex
  }

  const remainingStepCount = lastStepIndex - anchorStepIndex

  return remainingStepCount <= 0
    ? startToAnchorSeconds
    : startToAnchorSeconds + (anchorToEndSeconds * (stepIndex - anchorStepIndex)) / remainingStepCount
}

export function getTimetablePlaybackStepDirection(
  plan: Pick<TimetablePlaybackPlan, 'service' | 'steps'>,
  stepIndex: number,
): TrainState['direction'] {
  const currentStep = plan.steps[stepIndex]
  const nextStep = plan.steps[stepIndex + 1]
  const previousStep = plan.steps[stepIndex - 1]

  if (currentStep && nextStep) {
    const deltaX = nextStep.point.x - currentStep.point.x

    return deltaX < 0 ? 'left' : 'right'
  }

  if (currentStep && previousStep) {
    const deltaX = currentStep.point.x - previousStep.point.x

    return deltaX < 0 ? 'left' : 'right'
  }

  return plan.service === 'SB' ? 'left' : 'right'
}

function createTimetablePlaybackTrain(
  plan: TimetablePlaybackPlan,
  step: TrainRouteAnimationStep,
  stepIndex: number,
  lastStepIndex: number,
  isStationStopped = false,
): TrainState {
  const routePlaybackComplete = stepIndex >= lastStepIndex && !isStationStopped
  const waitingAtStation = isStationStopped || stepIndex >= lastStepIndex

  return {
    direction: getTimetablePlaybackStepDirection(plan, stepIndex),
    id: plan.trainId,
    isMoving: !routePlaybackComplete && stepIndex < lastStepIndex && !isStationStopped,
    lineMapVisible: routePlaybackComplete ? false : true,
    occupancySegmentId: !routePlaybackComplete ? step.segmentId : undefined,
    scheduleNumber: plan.scheduleNumber,
    service: plan.service,
    status: waitingAtStation ? 'WAIT' : 'RUN',
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
  isStationStopped = false,
): TrainState[] {
  const trainExists = trains.some((train) => train.id === plan.trainId)
  const playbackTrain = createTimetablePlaybackTrain(plan, step, stepIndex, lastStepIndex, isStationStopped)

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
