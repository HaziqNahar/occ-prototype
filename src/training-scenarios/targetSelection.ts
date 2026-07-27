import { RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS } from '../screens/line-map/trainMovementRoutes'
import type { OccSessionState, TimetableRow, TrainState } from '../types'
import { getTrainingScenarioDefinition } from './definitions'
import {
  revealTrainingScenarioTargetTrain,
  stageTrainLaunchScenarioAtSignal,
  upsertScenarioWorkflowTrain,
} from './runtimeState'
import type {
  TrainingScenarioLaunchTargetOption,
  TrainingScenarioRuntimeEvent,
} from './types'

export function getActiveTrainingScenarioTargetTrainId(session: OccSessionState) {
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)

  if (
    (definition.kind === 'TRAIN_WITHDRAWAL' || definition.kind === 'TRAIN_LAUNCH')
    && !session.activeScenario.targetTrainId
  ) {
    return ''
  }

  return session.activeScenario.targetTrainId ?? definition.defaultTargetTrainId
}

export function isActiveTrainingScenarioTargetTrain(session: OccSessionState, trainId: string) {
  return trainId === getActiveTrainingScenarioTargetTrainId(session)
}

export function getTrainingScenarioTrainActionDetail(
  session: OccSessionState,
  trainId: string,
  actionLabel: string,
  activeFollowUp = '',
) {
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)

  if (definition.id === 'idle') {
    return `${actionLabel}.`
  }

  const targetTrainId = session.activeScenario.targetTrainId
  const selectionWillBindTarget = (
    !targetTrainId
    && (definition.kind === 'TRAIN_LAUNCH' || definition.kind === 'TRAIN_WITHDRAWAL')
  )

  if (selectionWillBindTarget || isActiveTrainingScenarioTargetTrain(session, trainId)) {
    return `${actionLabel} for ${session.activeScenario.title}.${activeFollowUp ? ` ${activeFollowUp}` : ''}`
  }

  return `${actionLabel}. Active scenario target remains Train ${getActiveTrainingScenarioTargetTrainId(session)}.`
}

export function getEligibleLaunchScenarioTargetOptions(session: OccSessionState): TrainingScenarioLaunchTargetOption[] {
  const optionsByTrainId = new Map<string, TrainingScenarioLaunchTargetOption>()

  session.timetableRows.forEach((row) => {
    if (!isEligibleLaunchScenarioTargetRow(row)) {
      return
    }

    if (optionsByTrainId.has(row.train)) {
      return
    }

    optionsByTrainId.set(row.train, {
      destinationPoint: normalizeScenarioPointCode(row.destinationPoint),
      scheduleNumber: row.sched,
      trainId: row.train,
    })
  })

  return Array.from(optionsByTrainId.values()).sort((left, right) => (
    Number(left.scheduleNumber) - Number(right.scheduleNumber)
    || Number(left.trainId) - Number(right.trainId)
  ))
}

export function bindScenarioTargetForRuntimeEvent(
  current: OccSessionState,
  event: TrainingScenarioRuntimeEvent,
): { allowed: boolean; next: OccSessionState } {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)

  if (definition.kind === 'TRAIN_LAUNCH') {
    return bindTrainLaunchScenarioTargetForRuntimeEvent(current, event)
  }

  if (definition.kind === 'TRAIN_WITHDRAWAL') {
    return bindTrainWithdrawalScenarioTargetForRuntimeEvent(current, event)
  }

  return { allowed: true, next: current }
}

function isEligibleWithdrawalScenarioTarget(train: TrainState | undefined) {
  return Boolean(
    train
      && train.lineMapVisible !== false
      && train.timetablePlayback === true
      && train.status !== 'HOLD',
  )
}

function normalizeScenarioPointCode(value: string | undefined) {
  return (value ?? '').trim().toUpperCase()
}

type LaunchTargetTimetableRow = Pick<
  TimetableRow,
  'destinationPoint' | 'run' | 'selectedStation' | 'stationPoint'
>

function isEligibleLaunchScenarioTargetRow(row: LaunchTargetTimetableRow) {
  const run = normalizeScenarioPointCode(row.run)
  const stationPoint = normalizeScenarioPointCode(row.stationPoint)
  const selectedStation = normalizeScenarioPointCode(row.selectedStation)
  const destinationPoint = normalizeScenarioPointCode(row.destinationPoint)
  const stationIsSkg = stationPoint.startsWith('SKG') || selectedStation.startsWith('SKG')
  const destinationIsScopedMainline = destinationPoint.startsWith('PGL') || destinationPoint.startsWith('PGC')

  return run === 'NB'
    && stationIsSkg
    && destinationIsScopedMainline
}

function bindTrainLaunchScenarioTargetForRuntimeEvent(
  current: OccSessionState,
  event: TrainingScenarioRuntimeEvent,
): { allowed: boolean; next: OccSessionState } {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)

  if (definition.kind !== 'TRAIN_LAUNCH' || !('trainId' in event)) {
    return { allowed: true, next: current }
  }

  if (
    event.type === 'ROUTE_SET'
    && event.routeLabel === 'Route R655_617'
    && current.activeScenario.targetTrainId === event.trainId
  ) {
    return {
      allowed: true,
      next: stageTrainLaunchScenarioAtSignal(current, event.trainId),
    }
  }

  if (event.type !== 'TRAIN_SELECTED') {
    return { allowed: true, next: current }
  }

  const eligibleTrainIds = new Set(getEligibleLaunchScenarioTargetOptions(current).map((option) => option.trainId))

  if (!eligibleTrainIds.has(event.trainId)) {
    return {
      allowed: false,
      next: {
        ...current,
        scenarioNotice: {
          text: 'Select an eligible SKG timetable launch train.',
          tone: 'warning' as const,
        },
      },
    }
  }

  if (
    current.activeScenario.targetTrainId
    && current.activeScenario.targetTrainId !== event.trainId
    && (
      current.scenarioTasks.setRoute
      || current.scenarioTasks.dispatchTrain
      || current.scenarioTasks.completeScenario
    )
  ) {
    return {
      allowed: false,
      next: {
        ...current,
        scenarioNotice: {
          text: 'Launch target is already active. Reset the scenario before changing trains.',
          tone: 'warning' as const,
        },
      },
    }
  }

  return {
    allowed: true,
    next: bindTrainLaunchScenarioTarget(current, event.trainId),
  }
}

function bindTrainWithdrawalScenarioTargetForRuntimeEvent(
  current: OccSessionState,
  event: TrainingScenarioRuntimeEvent,
): { allowed: boolean; next: OccSessionState } {
  if (!('trainId' in event) || current.activeScenario.targetTrainId) {
    return { allowed: true, next: current }
  }

  if (event.type !== 'TRAIN_SELECTED') {
    return { allowed: true, next: current }
  }

  const train = current.trains.find((item) => item.id === event.trainId)

  if (!isEligibleWithdrawalScenarioTarget(train)) {
    return {
      allowed: false,
      next: {
        ...current,
        scenarioNotice: {
          text: 'Select a visible live timetable train to withdraw.',
          tone: 'warning' as const,
        },
      },
    }
  }

  return {
    allowed: true,
    next: {
      ...current,
      activeScenario: {
        ...current.activeScenario,
        targetTrainId: event.trainId,
      },
      scenarioNotice: {
        text: `Train ${event.trainId} selected for withdrawal.`,
        tone: 'info' as const,
      },
      selectedTrainId: event.trainId,
      trains: revealTrainingScenarioTargetTrain(current.trains, event.trainId),
    },
  }
}

function bindTrainLaunchScenarioTarget(current: OccSessionState, trainId: string) {
  const signalStep = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[1]
  const trains = upsertScenarioWorkflowTrain(
    current.trains,
    trainId,
    signalStep,
    {
      direction: 'right',
      isMoving: false,
      service: 'NB',
      status: 'WAIT',
    },
  ).map((train) => (
    train.id === trainId
      ? { ...train, timetablePlayback: false }
      : train
  ))

  return {
    ...current,
    activeScenario: {
      ...current.activeScenario,
      targetTrainId: trainId,
    },
    scenarioNotice: {
      text: `Train ${trainId} selected for launch.`,
      tone: 'info' as const,
    },
    selectedTrainId: trainId,
    trains,
  }
}
