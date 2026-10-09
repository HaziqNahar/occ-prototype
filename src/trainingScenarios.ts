import { appendScenarioEvidence, createScenarioEvidence } from './scenario'
import {
  createMonitorEvent,
  createSummaryEvent,
} from './scenarioWorkflow'
import { initialScenarioTasks, updateSessionLifecycle } from './sessionState'
import { normalizeLineMapRuntimeState } from './screens/line-map/lineMapRuntimeState'
import type {
  OccSessionState,
  ScenarioTaskId,
  TrainState,
} from './types'
import {
  getTrainingScenarioDefinition,
  idleTrainingScenarioDefinition,
  trainingScenarioDefinitions,
} from './training-scenarios/definitions'
import type {
  TrainingScenarioDefinition,
  TrainingScenarioKind,
  TrainingScenarioRuntimeEvent,
  TrainingScenarioRuntimeEventResult,
} from './training-scenarios/types'
import {
  hasTrainingScenarioDefinitionTaskEvidence,
} from './training-scenarios/assessment'
import {
  revealTrainingScenarioTargetTrain,
} from './training-scenarios/runtimeState'
import {
  DEFAULT_FAULT_LOCATION,
  placeFaultTrain,
  resolveFaultText,
} from './training-scenarios/faultLocation'
import type { FaultLocation } from './training-scenarios/faultLocation'
export {
  DEFAULT_FAULT_LOCATION,
  pickRandomFaultLocation,
  resolveFaultText,
} from './training-scenarios/faultLocation'
export type { FaultLocation } from './training-scenarios/faultLocation'
import {
  bindScenarioTargetForRuntimeEvent,
  getActiveTrainingScenarioTargetTrainId,
  isActiveTrainingScenarioTargetTrain,
} from './training-scenarios/targetSelection'
import {
  completeTrainingScenarioDefinitionTask,
  completeTrainingScenarioTask,
} from './training-scenarios/tasks'
export {
  applyTrainingScenarioWorkflowAction,
  isTrainingScenarioWorkflowActionComplete,
} from './training-scenarios/workflowActions'
export {
  applyTrainingScenarioTimetableCompletion,
  applyTrainingScenarioTimetableStep,
} from './training-scenarios/timetableRuntime'
export {
  getActiveTrainingScenarioTargetTrainId,
  getEligibleLaunchScenarioTargetOptions,
  getTrainingScenarioTrainActionDetail,
  isActiveTrainingScenarioTargetTrain,
} from './training-scenarios/targetSelection'
export {
  completeTrainingScenarioDefinitionTask,
  completeTrainingScenarioTask,
} from './training-scenarios/tasks'

export {
  getTrainingScenarioDefinition,
  idleTrainingScenarioDefinition,
  trainingScenarioDefinitions,
} from './training-scenarios/definitions'
export {
  getTrainingScenarioCompletionBlockers,
  scoreTrainingScenario,
} from './training-scenarios/assessment'
export type {
  TrainingScenarioDefinition,
  TrainingScenarioKind,
  TrainingScenarioLaunchTargetOption,
  TrainingScenarioRuntimeEvent,
  TrainingScenarioRuntimeEventResult,
  TrainingScenarioScore,
  TrainingScenarioTaskDefinition,
  TrainingScenarioWorkflowAction,
} from './training-scenarios/types'

// Fault scenarios have one definition per incident (e.g. EHS activation, PSD obstructed).
export function findTrainingScenarioDefinition(kind: TrainingScenarioKind, incident?: string) {
  const normalizedIncident = incident?.trim().toLowerCase()

  return (normalizedIncident
    ? trainingScenarioDefinitions.find((item) => item.kind === kind && item.incident.toLowerCase() === normalizedIncident)
    : undefined)
    ?? trainingScenarioDefinitions.find((item) => item.kind === kind)
    ?? trainingScenarioDefinitions[1]
}

export function createTrainingScenarioStartSession(
  current: OccSessionState,
  kind: TrainingScenarioKind,
  incident?: string,
  options: { faultLocation?: FaultLocation } = {},
) {
  const definition = findTrainingScenarioDefinition(kind, incident)
  // Fault scenarios happen at a location: a held train at a station platform.
  const faultLocation = definition.fault ? options.faultLocation ?? DEFAULT_FAULT_LOCATION : undefined
  const targetTrainId = faultLocation?.trainId ?? getInitialTrainingScenarioTargetTrainId(current, definition)
  const displayTargetTrainId = targetTrainId
    ?? (definition.kind === 'TRAIN_WITHDRAWAL' || definition.kind === 'TRAIN_LAUNCH'
      ? 'PENDING'
      : definition.defaultTargetTrainId)
  // A fault train is not pre-selected: finding it from the alarm is part of the exercise.
  const selectedTrainId = faultLocation
    ? current.selectedTrainId
    : targetTrainId
      ?? (definition.kind === 'TRAIN_WITHDRAWAL' || definition.kind === 'TRAIN_LAUNCH'
        ? current.selectedTrainId
        : definition.defaultTargetTrainId)
  const injected = injectTrainingScenarioFault(
    revealTrainingScenarioTargetTrain(current.trains, targetTrainId),
    definition,
    targetTrainId,
  )
  const trains = faultLocation ? placeFaultTrain(injected, faultLocation) : injected
  const resolve = (text: string) => resolveFaultText(text, faultLocation)
  const armedEvent = createMonitorEvent(
    displayTargetTrainId,
    `IOS scenario armed: ${definition.title}`,
    'ARMED',
    'yellow',
  )
  const faultEvent = definition.fault
    ? {
        ...createMonitorEvent(displayTargetTrainId, resolve(definition.fault.alarm.description), definition.fault.alarm.value, 'red'),
        asset: resolve(definition.fault.alarm.asset),
      }
    : undefined
  const events = faultEvent ? [faultEvent, armedEvent] : [armedEvent]
  const summaryRows = faultEvent
    ? [{ ...createSummaryEvent(faultEvent, 'red'), scenarioAlarm: true }, createSummaryEvent(armedEvent)]
    : [createSummaryEvent(armedEvent)]

  return {
    ...current,
    activeScenario: {
      duration: definition.duration,
      ...(faultLocation ? { faultLocation: { station: faultLocation.station, track: faultLocation.track } } : {}),
      id: definition.id,
      incident: definition.incident,
      target: resolve(definition.target),
      ...(targetTrainId ? { targetTrainId } : {}),
      title: definition.title,
    },
    alarmSummaryRows: [...summaryRows, ...current.alarmSummaryRows].slice(0, 12),
    eventRows: [...events, ...current.eventRows].slice(0, 4),
    evidenceLog: appendScenarioEvidence(
      [],
      createScenarioEvidence(
        'IOS Scenario Control',
        `${definition.title} armed`,
        'info',
        resolve(definition.objective),
      ),
    ),
    scenarioMode: 'RUNNING' as const,
    scenarioNotice: {
      text: getTrainingScenarioArmNotice(definition, faultLocation),
      tone: 'info' as const,
    },
    scenarioRevision: (current.scenarioRevision ?? 0) + 1,
    scenarioStep: 0,
    scenarioTasks: initialScenarioTasks,
    selectedTrainId,
    // Each armed scenario is timed from now, not from an earlier scenario.
    sessionMeta: {
      ...updateSessionLifecycle(current.sessionMeta, 'RUNNING'),
      completedAt: undefined,
      startedAt: new Date().toISOString(),
    },
    trains,
  }
}

// The fault train stops where it is; door faults also put its saloon doors into alarm.
function injectTrainingScenarioFault(
  trains: TrainState[],
  definition: TrainingScenarioDefinition,
  targetTrainId: string | undefined,
): TrainState[] {
  if (!definition.fault || !targetTrainId) {
    return trains
  }

  return trains.map((train) => (
    train.id === targetTrainId
      ? {
          ...train,
          ...(definition.fault?.trainDoorFault ? { doorFailureState: 'FAULT_ALARM' as const } : {}),
          isMoving: false,
          status: 'HOLD' as const,
        }
      : train
  ))
}

export function getTrainingScenarioArmNotice(definition: TrainingScenarioDefinition, faultLocation?: FaultLocation) {
  if (definition.kind === 'TRAIN_LAUNCH') {
    return `${definition.title} armed. Select an eligible SKG-origin timetable train to launch.`
  }

  if (definition.kind === 'TRAIN_WITHDRAWAL') {
    return `${definition.title} armed. Select a live timetable train to withdraw.`
  }

  if (definition.fault) {
    return `${definition.title}: ${resolveFaultText(definition.fault.alarm.description, faultLocation)}. Respond as per SOP.`
  }

  return `${definition.title} armed for Train ${definition.defaultTargetTrainId}.`
}

function getInitialTrainingScenarioTargetTrainId(
  _current: OccSessionState,
  definition: TrainingScenarioDefinition,
) {
  if (definition.kind === 'TRAIN_LAUNCH') {
    return undefined
  }

  if (definition.kind === 'TRAIN_WITHDRAWAL') {
    return undefined
  }

  return definition.defaultTargetTrainId
}

export function resetTrainingScenarioRuntime(current: OccSessionState): OccSessionState {
  const lineMap = normalizeLineMapRuntimeState(current.lineMap)
  const activeDefinition = getTrainingScenarioDefinition(current.activeScenario.id)
  const stagedLaunchTrainId = activeDefinition.kind === 'TRAIN_LAUNCH'
    ? current.activeScenario.targetTrainId
    : undefined
  const preserveLaunchTrainId = shouldPreserveLaunchTrainAfterHandoff(current)
    ? stagedLaunchTrainId
    : undefined
  const selectedTrainId = preserveLaunchTrainId ?? '317'

  return {
    ...current,
    activeScenario: {
      duration: idleTrainingScenarioDefinition.duration,
      id: idleTrainingScenarioDefinition.id,
      incident: idleTrainingScenarioDefinition.incident,
      target: idleTrainingScenarioDefinition.target,
      title: idleTrainingScenarioDefinition.title,
    },
    evidenceLog: [],
    scenarioMode: 'IDLE',
    scenarioNotice: {
      text: 'Scenario runtime reset. Signal routes cleared and timetable state preserved.',
      tone: 'info',
    },
    scenarioRevision: (current.scenarioRevision ?? 0) + 1,
    selectedTrainId,
    scenarioStep: 0,
    scenarioTasks: initialScenarioTasks,
    sessionMeta: updateSessionLifecycle(current.sessionMeta, 'CREATED'),
    lineMap: {
      ...lineMap,
      routeSegments: {},
    },
    trains: resetTrainingScenarioTrainCommandState(current.trains, stagedLaunchTrainId, preserveLaunchTrainId),
  }
}

function shouldPreserveLaunchTrainAfterHandoff(current: OccSessionState) {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)
  const trainId = current.activeScenario.targetTrainId

  if (definition.kind !== 'TRAIN_LAUNCH' || !trainId) {
    return false
  }

  const train = current.trains.find((item) => item.id === trainId)

  return Boolean(
    train
    && train.lineMapVisible
    && (
      train.timetablePlayback
      || train.occupancySegmentId === 'rail-617'
      || current.scenarioTasks.completeScenario
    ),
  )
}

function resetTrainingScenarioTrainCommandState(
  trains: readonly TrainState[],
  stagedLaunchTrainId?: string,
  preserveLaunchTrainId?: string,
): TrainState[] {
  return trains.map((train) => {
    const shouldPreserveLaunchTrain = preserveLaunchTrainId === train.id
    const shouldClearStagedLaunchTrain = (
      stagedLaunchTrainId === train.id
      && !shouldPreserveLaunchTrain
      && train.timetablePlayback === false
    )

    return {
      ...train,
      ...(shouldPreserveLaunchTrain
        ? {
            isMoving: false,
            lineMapVisible: true,
            status: 'WAIT' as const,
            timetablePlayback: true,
          }
        : {}),
      ...(shouldClearStagedLaunchTrain
        ? {
            isMoving: false,
            lineMapVisible: false,
            occupancySegmentId: undefined,
            status: 'WAIT' as const,
          }
        : {}),
      doorFailureState: undefined,
      itamaAuthorisedPreparationConfirmed: false,
      itamaGranted: true,
      itamaNotAuthorisedPreparationConfirmed: false,
      itamaStatus: 'GRANTED',
      readinessMode: 'MAINLINE_SERVICE',
    }
  })
}

export function applyTrainingScenarioRuntimeEvent(
  current: OccSessionState,
  event: TrainingScenarioRuntimeEvent,
): TrainingScenarioRuntimeEventResult {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)

  if (definition.id === 'idle') {
    return { allowed: true, completedTaskIds: [], next: current }
  }

  const targetBinding = bindScenarioTargetForRuntimeEvent(current, event)

  if (!targetBinding.allowed) {
    return { allowed: false, completedTaskIds: [], next: targetBinding.next }
  }

  const scenarioSession = targetBinding.next
  const trainId = 'trainId' in event ? event.trainId : getActiveTrainingScenarioTargetTrainId(scenarioSession)

  if ('trainId' in event && !isActiveTrainingScenarioTargetTrain(scenarioSession, event.trainId)) {
    return { allowed: true, completedTaskIds: [], next: current }
  }

  const taskIds = getRuntimeEventTrainingTaskIds(scenarioSession, definition.kind, event)
  const scenarioTaskIds = getRuntimeEventScenarioTaskIds(definition.kind, event)
  let next = scenarioSession
  const completedTaskIds: string[] = []

  for (const taskId of taskIds) {
    const result = completeTrainingScenarioDefinitionTask(next, taskId, event.source, {
      allowRuntimeOnly: true,
    })

    if (!result.allowed) {
      return { allowed: false, completedTaskIds, next: result.next }
    }

    next = result.next
    completedTaskIds.push(taskId)
  }

  for (const taskId of scenarioTaskIds) {
    const result = completeTrainingScenarioTask(
      next,
      taskId,
      getRuntimeEventScenarioTaskDetail(event, trainId),
      event.source,
    )

    if (!result.allowed) {
      return { allowed: false, completedTaskIds, next: result.next }
    }

    next = result.next
    completedTaskIds.push(taskId)
  }

  const trainSelectionNotice = event.type === 'TRAIN_SELECTED'
    && isActiveTrainingScenarioTargetTrain(next, event.trainId)
    ? getTrainingScenarioTrainSelectionNotice(definition, event.trainId)
    : undefined

  return {
    allowed: true,
    completedTaskIds,
    next: trainSelectionNotice
      ? { ...next, scenarioNotice: trainSelectionNotice }
      : next,
  }
}

function getTrainingScenarioTrainSelectionNotice(
  definition: TrainingScenarioDefinition,
  trainId: string,
) {
  if (definition.kind === 'TRAIN_LAUNCH') {
    return { text: `Train ${trainId} selected for launch.`, tone: 'info' as const }
  }

  if (definition.kind === 'TRAIN_WITHDRAWAL') {
    return { text: `Train ${trainId} selected for withdrawal.`, tone: 'info' as const }
  }

  return { text: `Train ${trainId} selected for door fault response.`, tone: 'info' as const }
}

export function applyTrainingScenarioTrainSelection(
  current: OccSessionState,
  source: string,
  trainId: string,
): TrainingScenarioRuntimeEventResult {
  return applyTrainingScenarioRuntimeEvent(current, {
    source,
    trainId,
    type: 'TRAIN_SELECTED',
  })
}

function getRuntimeEventTrainingTaskIds(
  session: OccSessionState,
  kind: TrainingScenarioKind,
  event: TrainingScenarioRuntimeEvent,
): readonly string[] {
  const normalizeRuntimeValue = (value: string) => value.trim().toUpperCase()
  const isSkgSkgsSelection = (station: string, platformSiding: string) => (
    normalizeRuntimeValue(station) === 'SKG' && normalizeRuntimeValue(platformSiding) === 'SKGS'
  )
  const isNedRt2dSelection = (station: string, platformSiding: string) => (
    normalizeRuntimeValue(station) === 'NED' && normalizeRuntimeValue(platformSiding) === 'RT2D'
  )

  if (kind === 'TRAIN_LAUNCH') {
    switch (event.type) {
      case 'TRAIN_SELECTED':
        return ['select-launch-train']
      case 'ROUTE_SET':
        return event.routeLabel === 'Route R655_617' ? ['set-launch-route'] : []
      case 'DEPARTURE_TIME_CONFIRMED':
        return ['dispatch-launch-train']
      case 'SCENARIO_REVIEWED':
        return ['review-launch-outcome']
      default:
        return []
    }
  }

  if (kind === 'TRAIN_WITHDRAWAL') {
    switch (event.type) {
      case 'TRAIN_SELECTED':
        return ['select-withdrawal-train']
      case 'ROUTE_SET':
        return ['set-withdrawal-route']
      case 'ARRIVAL_DESTINATION_SET':
        if (isSkgSkgsSelection(event.station, event.platformSiding)) {
          return ['declare-last-station-destination']
        }

        if (isNedRt2dSelection(event.station, event.platformSiding)) {
          return ['declare-depot-destination']
        }

        return []
      case 'DEPARTURE_TIME_CONFIRMED':
        return hasTrainingScenarioDefinitionTaskEvidence(session, 'declare-depot-destination')
          ? ['trigger-withdrawal-movement']
          : hasTrainingScenarioDefinitionTaskEvidence(session, 'declare-last-station-destination')
            ? ['move-to-s608-hold']
            : []
      case 'DEPOT_ENDPOINT_REACHED':
        return ['verify-depot-endpoint']
      case 'SCENARIO_REVIEWED':
        return ['review-withdrawal-outcome']
      default:
        return []
    }
  }

  // Fault scenarios: each task declares which live event completes it.
  return getTrainingScenarioDefinition(session.activeScenario.id).tasks
    .filter((task) => {
      switch (event.type) {
        case 'TRAIN_SELECTED':
          return task.mappedTaskId === 'selectTrain'
        case 'ALARM_ACKNOWLEDGED':
          return task.mappedTaskId === 'ackAlarm'
        case 'ROUTE_SET':
          return task.mappedTaskId === 'setRoute'
        case 'SCENARIO_REVIEWED':
          return task.mappedTaskId === 'completeScenario'
        case 'TRAIN_HOLD_APPLIED':
          return task.completesOnHold === true
        case 'DOOR_COMMAND_CONFIRMED':
          return Boolean(
            task.doorCommandLabels?.includes(event.commandLabel)
            || task.doorSummaryStatuses?.includes(event.summaryStatus),
          )
        default:
          return false
      }
    })
    .map((task) => task.id)
}

function getRuntimeEventScenarioTaskIds(
  kind: TrainingScenarioKind,
  event: TrainingScenarioRuntimeEvent,
): readonly ScenarioTaskId[] {
  if ((kind === 'DOOR_FAULT' || kind === 'PSD_FAULT') && event.type === 'DOOR_COMMAND_CONFIRMED' && event.commandLabel === 'Authorize Movement') {
    return ['dispatchTrain']
  }

  if (event.type === 'DEPARTURE_TIME_CONFIRMED' && kind !== 'TRAIN_LAUNCH') {
    return ['dispatchTrain']
  }

  return []
}

function getRuntimeEventScenarioTaskDetail(event: TrainingScenarioRuntimeEvent, trainId: string) {
  switch (event.type) {
    case 'DEPARTURE_TIME_CONFIRMED':
      return `Departure time confirmed for Train ${trainId}${event.routeLabel ? ` on ${event.routeLabel}` : ''}.`
    case 'DOOR_COMMAND_CONFIRMED':
      return `Door command confirmed for Train ${trainId}: ${event.commandLabel}.`
    default:
      return `Scenario event accepted for Train ${trainId}: ${event.type}.`
  }
}
