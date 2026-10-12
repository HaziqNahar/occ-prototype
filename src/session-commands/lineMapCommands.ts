import type { InspectorPage, TrainAuxiliaryView } from '../components/train-control/trainControlTypes'
import {
  getTrainDoorCommandLabel,
  getTrainDoorStateAfterCommand,
  getTrainDoorSummaryStatus,
  getTrainReadinessModeFromCommand,
} from '../components/train-control/trainCommandState'
import type { TrainDoorCommand } from '../components/train-control/trainCommandState'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import { createMonitorEvent, createSummaryEvent, upsertTimetableRow } from '../scenarioWorkflow'
import { updateLineMapRouteState } from '../screens/line-map/lineMapRouteState'
import { lowerSignals, upperSignals } from '../screens/line-map/model'
import type { LineMapSignalData } from '../screens/line-map/model'
import {
  applySignalRouteSetSession,
  applySignalRouteUnsetSession,
  getSignalRouteTargetTrainForSession,
  hasSignalRouteCommand,
} from '../screens/line-map/signalRouteCommands'
import {
  applyTrainingScenarioRuntimeEvent,
  applyTrainingScenarioTrainSelection,
  getActiveTrainingScenarioTargetTrainId,
  getTrainingScenarioDefinition,
  isActiveTrainingScenarioTargetTrain,
  scoreTrainingScenario,
} from '../trainingScenarios'
import type {
  AlarmSummaryRow,
  MonitorAlarmRow,
  OccSessionState,
  ScenarioNoticeTone,
  TrainCommand,
  TrainDirection,
  TrainStatus,
} from '../types'
import type { ItamaStep, SessionCommandResult, TrainSelectionView } from './types'

// Monitor 02 Line Map commands: train selection, inspector, ITAMA, door, hold,
// SCADA commands, signal routes and manual departures.

const LINE_MAP = 'Monitor 02 Line Map'
const TRAIN_CONTROL = 'Line Map Train Control'

const accepted = (session: OccSessionState): SessionCommandResult => ({ accepted: true, session })
const refused = (session: OccSessionState): SessionCommandResult => ({
  accepted: false,
  reason: session.scenarioNotice.text,
  session,
})

function prependEvent(current: OccSessionState, event: MonitorAlarmRow, summaryTone?: AlarmSummaryRow['tone'] | null) {
  return {
    alarmSummaryRows: summaryTone === null
      ? current.alarmSummaryRows
      : [createSummaryEvent(event, summaryTone), ...current.alarmSummaryRows].slice(0, 12),
    eventRows: [event, ...current.eventRows].slice(0, 4),
  }
}

function targetNotice(session: OccSessionState, trainId: string, onTarget: string, offTarget: string) {
  return isActiveTrainingScenarioTargetTrain(session, trainId)
    ? { text: onTarget, tone: 'info' as const }
    : { text: `${offTarget} ${getActiveTrainingScenarioTargetTrainId(session)}.`, tone: 'warning' as const }
}

export function selectTrain(
  current: OccSessionState,
  trainId: string,
  view: TrainSelectionView,
  page: InspectorPage = 'information',
): SessionCommandResult {
  const source = view === 'timetable' ? 'Monitor 03 Timetable' : LINE_MAP
  const selection = applyTrainingScenarioTrainSelection(current, source, trainId)

  if (!selection.allowed) {
    return refused(selection.next)
  }

  const selected = selection.next
  const title = selected.activeScenario.title

  switch (view) {
    case 'timetable':
      return accepted({ ...selected, selectedTrainId: trainId })
    case 'itama':
      return accepted({
        ...selected,
        evidenceLog: appendScenarioEvidence(
          selected.evidenceLog,
          createScenarioEvidence(LINE_MAP, 'ITAMA opened', 'info', `ITAMA status opened for Train ${trainId}.`),
        ),
        scenarioNotice: targetNotice(
          selected,
          trainId,
          `Train ${trainId} ITAMA status opened for ${title}.`,
          `ITAMA status opened for Train ${trainId}. Scenario target remains Train`,
        ),
        selectedTrainId: trainId,
      })
    case 'inspector':
      return accepted({
        ...selected,
        evidenceLog: appendScenarioEvidence(
          selected.evidenceLog,
          createScenarioEvidence(LINE_MAP, `Inspector ${page} opened`, 'info', `Inspecting page opened for Train ${trainId}.`),
        ),
        scenarioNotice: targetNotice(
          selected,
          trainId,
          `Train ${trainId} inspector ${page} page opened for ${title}.`,
          `Train ${trainId} inspector opened. Active scenario target remains Train`,
        ),
        selectedTrainId: trainId,
      })
    case 'menu':
    default:
      return accepted({
        ...selected,
        scenarioNotice: targetNotice(
          selected,
          trainId,
          `Train ${trainId} command menu opened for ${title}.`,
          `Train ${trainId} command menu opened. Active scenario target remains Train`,
        ),
        selectedTrainId: trainId,
      })
  }
}

const TRAIN_VIEWS: Record<TrainAuxiliaryView, {
  action: string
  message: (trainId: string) => string
  notice: (trainId: string) => string
  noticeTone: ScenarioNoticeTone
  summaryTone?: AlarmSummaryRow['tone']
  tone: MonitorAlarmRow['tone']
  value: string
}> = {
  alarms: {
    action: 'Train alarm list opened',
    message: (trainId) => `Train ${trainId}: Active alarms opened`,
    notice: (trainId) => `Train ${trainId} active alarm list opened from line map.`,
    noticeTone: 'warning',
    summaryTone: 'red',
    tone: 'red',
    value: 'ALARM LIST',
  },
  cctv: {
    action: 'Restricted CCTV selected',
    message: (trainId) => `Train ${trainId}: Restricted CCTV request`,
    notice: (trainId) => `Restricted CCTV request opened for Train ${trainId}.`,
    noticeTone: 'info',
    tone: 'yellow',
    value: 'CCTV',
  },
  details: {
    action: 'Train details opened',
    message: (trainId) => `Train ${trainId}: Details page opened`,
    notice: (trainId) => `Train ${trainId} details page opened.`,
    noticeTone: 'info',
    tone: 'yellow',
    value: 'DETAILS',
  },
  'pec-reset': {
    action: 'PEC reset requested',
    message: (trainId) => `Train ${trainId}: PEC Reset All request`,
    notice: (trainId) => `PEC Reset All request prepared for Train ${trainId}. No reset applied.`,
    noticeTone: 'warning',
    summaryTone: 'yellow',
    tone: 'orange',
    value: 'PEC RESET',
  },
  pis: {
    action: 'Restricted PIS selected',
    message: (trainId) => `Train ${trainId}: Restricted PIS request`,
    notice: (trainId) => `Restricted PIS request opened for Train ${trainId}.`,
    noticeTone: 'info',
    tone: 'yellow',
    value: 'PIS',
  },
  regulation: {
    action: 'Regulation parameters opened',
    message: (trainId) => `Train ${trainId}: Regulation parameters opened`,
    notice: (trainId) => `Train ${trainId} regulation parameters opened.`,
    noticeTone: 'info',
    tone: 'yellow',
    value: 'REG PARAM',
  },
}

export function isTrainAuxiliaryView(value: unknown): value is TrainAuxiliaryView {
  return typeof value === 'string' && value in TRAIN_VIEWS
}

export function openTrainView(current: OccSessionState, trainId: string, view: TrainAuxiliaryView): SessionCommandResult {
  const item = TRAIN_VIEWS[view]
  const event = createMonitorEvent(trainId, item.message(trainId), item.value, item.tone)
  const selection = applyTrainingScenarioTrainSelection(current, LINE_MAP, trainId)

  if (!selection.allowed) {
    return refused(selection.next)
  }

  const selected = selection.next

  return accepted({
    ...selected,
    ...prependEvent(selected, event, item.summaryTone ?? null),
    evidenceLog: appendScenarioEvidence(
      selected.evidenceLog,
      createScenarioEvidence(LINE_MAP, item.action, 'info', item.notice(trainId)),
    ),
    scenarioNotice: { text: item.notice(trainId), tone: item.noticeTone },
    selectedTrainId: trainId,
  })
}

const ITAMA_STEPS: Record<ItamaStep, {
  action: string
  detail: (trainId: string) => string
  message: string
  notice: string
  update: (train: OccSessionState['trains'][number]) => OccSessionState['trains'][number]
  value: string
}> = {
  'authorised-preparation': {
    action: 'ITAMA authorised preparation',
    detail: (trainId) => `Train ${trainId} ITAMA authorised preparation confirmed.`,
    message: 'ITAMA AM/CM Authorised Preparation',
    notice: 'ITAMA authorised preparation successful.',
    update: (train) => ({ ...train, itamaAuthorisedPreparationConfirmed: true, itamaNotAuthorisedPreparationConfirmed: false }),
    value: 'OK',
  },
  authorised: {
    action: 'ITAMA authorised confirmation',
    detail: (trainId) => `Train ${trainId} ITAMA status set to GRANTED.`,
    message: 'ITAMA AM/CM Authorised Confirmation',
    notice: 'ITAMA authorised confirmation successful.',
    update: (train) => ({
      ...train,
      itamaAuthorisedPreparationConfirmed: false,
      itamaGranted: true,
      itamaNotAuthorisedPreparationConfirmed: false,
      itamaStatus: 'GRANTED',
    }),
    value: 'GRANTED',
  },
  'not-authorised-preparation': {
    action: 'ITAMA not authorised preparation',
    detail: (trainId) => `Train ${trainId} ITAMA not authorised preparation confirmed.`,
    message: 'ITAMA AM/CM Not Authorised Preparation',
    notice: 'ITAMA not authorised preparation successful.',
    update: (train) => ({ ...train, itamaAuthorisedPreparationConfirmed: false, itamaNotAuthorisedPreparationConfirmed: true }),
    value: 'OK',
  },
  'not-authorised': {
    action: 'ITAMA not authorised confirmation',
    detail: (trainId) => `Train ${trainId} ITAMA status set to NOT GRANTED.`,
    message: 'ITAMA AM/CM Not Authorised Confirmation',
    notice: 'ITAMA not authorised confirmation successful.',
    update: (train) => ({
      ...train,
      itamaAuthorisedPreparationConfirmed: false,
      itamaGranted: false,
      itamaNotAuthorisedPreparationConfirmed: false,
      itamaStatus: 'NOT_GRANTED',
      isMoving: false,
      status: 'WAIT',
    }),
    value: 'NOT GRANTED',
  },
}

export function isItamaStep(value: unknown): value is ItamaStep {
  return typeof value === 'string' && value in ITAMA_STEPS
}

export function confirmItama(current: OccSessionState, trainId: string, step: ItamaStep): SessionCommandResult {
  const item = ITAMA_STEPS[step]
  const event = createMonitorEvent(trainId, `Train ${trainId}: ${item.message}`, item.value, 'yellow')

  return accepted({
    ...current,
    ...prependEvent(current, event),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(LINE_MAP, item.action, 'accepted', item.detail(trainId)),
    ),
    scenarioNotice: { text: `Train ${trainId} ${item.notice}`, tone: 'success' },
    selectedTrainId: trainId,
    trains: current.trains.map((train) => (train.id === trainId ? item.update(train) : train)),
  })
}

export function acknowledgeItama(current: OccSessionState, trainId: string): SessionCommandResult {
  const event = createMonitorEvent(trainId, `Train ${trainId}: Train ITAMA Status`, 'ACK', 'yellow')

  return accepted({
    ...current,
    ...prependEvent(current, event),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(LINE_MAP, 'ITAMA acknowledged', 'accepted', `ITAMA status acknowledged for Train ${trainId}.`),
    ),
    scenarioNotice: { text: `ITAMA status acknowledged for Train ${trainId}.`, tone: 'info' },
  })
}

export function confirmReadiness(current: OccSessionState, trainId: string, command: string): SessionCommandResult {
  const readinessMode = getTrainReadinessModeFromCommand(command)
  const event = createMonitorEvent(trainId, `Train ${trainId}: Train Readiness Request`, command, 'yellow')

  return accepted({
    ...current,
    ...prependEvent(current, event),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(LINE_MAP, 'Train readiness request confirmed', 'accepted', `Train ${trainId} readiness request set to ${command}.`),
    ),
    scenarioNotice: { text: `Train ${trainId} readiness command successful: ${command}.`, tone: 'success' },
    selectedTrainId: trainId,
    trains: current.trains.map((train) => (
      train.id === trainId
        ? {
            ...train,
            readinessMode,
            ...(readinessMode === 'MAINLINE_SERVICE' ? {} : { isMoving: false, status: 'WAIT' as const }),
          }
        : train
    )),
  })
}

export function confirmDoorCommand(current: OccSessionState, trainId: string, command: TrainDoorCommand): SessionCommandResult {
  const doorFailureState = getTrainDoorStateAfterCommand(command)
  const commandLabel = getTrainDoorCommandLabel(command)
  const summaryStatus = getTrainDoorSummaryStatus(doorFailureState)
  const nextTrainStatus: TrainStatus = command === 'confirm-closed-locked' || command === 'authorize-move' ? 'RUN' : 'HOLD'
  const isWithdrawal = command === 'withdraw-service'
  const event = createMonitorEvent(trainId, `Train ${trainId}: ${commandLabel}`, summaryStatus, isWithdrawal ? 'red' : 'yellow')
  const commandState: OccSessionState = {
    ...current,
    ...prependEvent(current, event, isWithdrawal ? 'red' : 'yellow'),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(LINE_MAP, commandLabel, 'accepted', `Train ${trainId} door failure state set to ${summaryStatus}.`),
    ),
    scenarioNotice: {
      text: `Train ${trainId} ${commandLabel.toLowerCase()} command successful.`,
      tone: isWithdrawal ? 'warning' : 'success',
    },
    selectedTrainId: trainId,
    timetableRows: upsertTimetableRow(current.timetableRows, trainId, nextTrainStatus === 'HOLD' ? 'H>' : '>'),
    trains: current.trains.map((train) => (
      train.id === trainId ? { ...train, doorFailureState, status: nextTrainStatus } : train
    )),
  }
  const result = applyTrainingScenarioRuntimeEvent(commandState, {
    commandLabel,
    source: LINE_MAP,
    summaryStatus,
    trainId,
    type: 'DOOR_COMMAND_CONFIRMED',
  })

  return result.allowed ? accepted(result.next) : refused(result.next)
}

export function applyTrainHold(current: OccSessionState, trainId: string, detail: string): SessionCommandResult {
  const event = createMonitorEvent(trainId, `Train ${trainId}: Train Hold`, 'APPLIED', 'yellow')
  const result = applyTrainingScenarioRuntimeEvent({
    ...current,
    ...prependEvent(current, event),
    evidenceLog: appendScenarioEvidence(current.evidenceLog, createScenarioEvidence(LINE_MAP, 'Train Hold', 'accepted', detail)),
    selectedTrainId: trainId,
    timetableRows: upsertTimetableRow(current.timetableRows, trainId, 'H>'),
    trains: current.trains.map((train) => (
      train.id === trainId ? { ...train, isMoving: false, status: 'HOLD' as const } : train
    )),
  }, {
    source: LINE_MAP,
    trainId,
    type: 'TRAIN_HOLD_APPLIED',
  })

  return result.allowed ? accepted(result.next) : refused(result.next)
}

// The SCADA command dialog (route, dispatch or hold for the selected train).
export function applyScadaTrainCommand(current: OccSessionState, trainId: string, command: TrainCommand): SessionCommandResult {
  const nextStatus: TrainStatus = command === 'DISPATCH' ? 'RUN' : command === 'HOLD' ? 'HOLD' : 'WAIT'
  const message = command === 'DISPATCH'
    ? `Train ${trainId}: Dispatch command executed`
    : command === 'HOLD'
      ? `Train ${trainId}: Train Hold`
      : `Train ${trainId}: Route command selected`
  const event = createMonitorEvent(trainId, message, nextStatus, command === 'HOLD' ? 'orange' : 'yellow')
  const guard = command === 'DISPATCH'
    ? applyTrainingScenarioRuntimeEvent(current, { source: LINE_MAP, trainId, type: 'DEPARTURE_TIME_CONFIRMED' })
    : command === 'ROUTE'
      ? applyTrainingScenarioRuntimeEvent(current, { routeLabel: 'Line Map route command', source: LINE_MAP, trainId, type: 'ROUTE_SET' })
      : applyTrainingScenarioTrainSelection(current, LINE_MAP, trainId)

  if (!guard.allowed) {
    return refused(guard.next)
  }

  const scenarioNext = command === 'HOLD'
    ? applyTrainingScenarioRuntimeEvent(guard.next, { source: LINE_MAP, trainId, type: 'TRAIN_HOLD_APPLIED' }).next
    : guard.next

  return accepted({
    ...scenarioNext,
    ...prependEvent(current, event),
    lineMap: updateLineMapRouteState(
      current.lineMap,
      { id: trainId },
      command === 'DISPATCH' ? 'DISPATCHED' : command === 'HOLD' ? 'HELD' : 'SET',
    ),
    timetableRows: upsertTimetableRow(current.timetableRows, trainId, command === 'HOLD' ? 'H>' : command === 'DISPATCH' ? '>' : 'R'),
    trains: current.trains.map((train) => (train.id === trainId ? { ...train, status: nextStatus } : train)),
  })
}

export function findLineMapSignal(signalLabel: string): LineMapSignalData | undefined {
  return [...upperSignals, ...lowerSignals].find((signal) => signal.label === signalLabel)
}

export function applySignalRoute(current: OccSessionState, signalLabel: string, routeLabel: string, set: boolean): SessionCommandResult {
  const signal = findLineMapSignal(signalLabel)

  if (!signal || !hasSignalRouteCommand(signal, routeLabel)) {
    return { accepted: false, reason: `${routeLabel} cannot be commanded from ${signalLabel}.`, session: current }
  }

  if (!set) {
    return accepted(applySignalRouteUnsetSession(current, signal, routeLabel))
  }

  const routed = applySignalRouteSetSession(current, signal, routeLabel)
  const routedTrain = getSignalRouteTargetTrainForSession(routed)

  if (!routedTrain || !isActiveTrainingScenarioTargetTrain(routed, routedTrain.id)) {
    return accepted(routed)
  }

  const result = applyTrainingScenarioRuntimeEvent(routed, {
    routeLabel,
    source: LINE_MAP,
    trainId: routedTrain.id,
    type: 'ROUTE_SET',
  })

  return result.allowed ? accepted(result.next) : refused(result.next)
}

function normalizeSelectionValue(value: string | undefined) {
  return (value ?? '').trim().toUpperCase()
}

export function isRt2DepotDestinationSelection(selection: { platformSiding: string; station: string } | undefined) {
  return normalizeSelectionValue(selection?.station) === 'NED' && normalizeSelectionValue(selection?.platformSiding) === 'RT2D'
}

// Manual (non-timetable) destinations: the RT2 depot, or the SKG siding.
export function isManualDestinationSelection(selection: { platformSiding: string; station: string } | undefined) {
  const station = normalizeSelectionValue(selection?.station)
  const platformSiding = normalizeSelectionValue(selection?.platformSiding)

  return (station === 'NED' && platformSiding === 'RT2D') || (station === 'SKG' && platformSiding === 'SKGS')
}

function isScenarioTaskComplete(session: OccSessionState, taskId: string) {
  return scoreTrainingScenario(session).taskResults.some((task) => task.id === taskId && task.complete)
}

// Arrival time (or the destination carried by a departure) for a train. Only the
// scenario's target train is scored; any train's marker turns to face the destination.
export function setArrivalDestination(
  current: OccSessionState,
  options: { direction: TrainDirection; fromDeparture?: boolean; platformSiding: string; station: string; trainId: string },
): SessionCommandResult {
  const { direction, fromDeparture, platformSiding, station, trainId } = options
  const directionState: OccSessionState = {
    ...current,
    trains: current.trains.map((train) => (train.id === trainId ? { ...train, direction } : train)),
  }

  if (!isActiveTrainingScenarioTargetTrain(current, trainId)) {
    return accepted(directionState)
  }

  if (fromDeparture) {
    const destination = { platformSiding, station }
    const taskId = isRt2DepotDestinationSelection(destination) ? 'declare-depot-destination' : 'declare-last-station-destination'

    if (!isManualDestinationSelection(destination) || isScenarioTaskComplete(current, taskId)) {
      return accepted(directionState)
    }
  }

  const event = createMonitorEvent(trainId, `Set arrival time destination ${station} ${platformSiding}`, 'ARRIVAL TIME', 'yellow')
  const arrivalState: OccSessionState = {
    ...directionState,
    eventRows: [event, ...directionState.eventRows].slice(0, 4),
    evidenceLog: appendScenarioEvidence(
      directionState.evidenceLog,
      createScenarioEvidence(
        TRAIN_CONTROL,
        'Arrival time destination set',
        'accepted',
        `Arrival time destination set for Train ${trainId}: ${station} / ${platformSiding}.`,
      ),
    ),
    ...(fromDeparture
      ? {}
      : { scenarioNotice: { text: `Arrival Time set for Train ${trainId}: ${station} / ${platformSiding}.`, tone: 'info' as const } }),
    selectedTrainId: trainId,
  }
  const result = applyTrainingScenarioRuntimeEvent(arrivalState, {
    platformSiding,
    source: TRAIN_CONTROL,
    station,
    trainId,
    type: 'ARRIVAL_DESTINATION_SET',
  })

  return result.allowed ? accepted(result.next) : refused(result.next)
}

// A confirmed departure time; the Line Map then steps the train along the route.
export function confirmDeparture(current: OccSessionState, trainId: string, routeLabel: string): SessionCommandResult {
  const event = createMonitorEvent(trainId, `Train ${trainId}: Departure time set, stepping on ${routeLabel}`, 'RUN', 'yellow')
  const moving: OccSessionState = {
    ...current,
    ...prependEvent(current, event),
    scenarioNotice: { text: `Train ${trainId} departure confirmed. Stepping rail-by-rail on ${routeLabel}.`, tone: 'info' },
    timetableRows: upsertTimetableRow(current.timetableRows, trainId, '>'),
  }

  if (!isActiveTrainingScenarioTargetTrain(current, trainId)) {
    return accepted(moving)
  }

  const result = applyTrainingScenarioRuntimeEvent(moving, {
    routeLabel,
    source: TRAIN_CONTROL,
    trainId,
    type: 'DEPARTURE_TIME_CONFIRMED',
  })

  return result.allowed ? accepted(result.next) : refused(result.next)
}

// The target train reached the end of a manually stepped route.
export function completeManualRoute(
  current: OccSessionState,
  options: { depotLeg: boolean; launchHandoff: boolean; routeLabel: string; trainId: string },
): SessionCommandResult {
  const { depotLeg, launchHandoff, routeLabel, trainId } = options

  if (!isActiveTrainingScenarioTargetTrain(current, trainId)) {
    return { accepted: false, reason: `Train ${trainId} is not the scenario train.`, session: current }
  }

  const kind = getTrainingScenarioDefinition(current.activeScenario.id).kind

  if (kind === 'TRAIN_LAUNCH' && launchHandoff) {
    return accepted({
      ...current,
      scenarioNotice: { text: `Train ${trainId} reached SKGN and returned to automatic timetable control.`, tone: 'success' },
      trains: current.trains.map((train) => (
        train.id === trainId
          ? { ...train, isMoving: false, readinessMode: 'MAINLINE_SERVICE' as const, status: 'WAIT' as const, timetablePlayback: true }
          : train
      )),
    })
  }

  if (kind === 'TRAIN_WITHDRAWAL' && !depotLeg) {
    return accepted(current)
  }

  const event = createMonitorEvent(trainId, `Train ${trainId}: reached depot endpoint on ${routeLabel}`, 'ENDPOINT', 'yellow')
  const result = applyTrainingScenarioRuntimeEvent({
    ...current,
    eventRows: [event, ...current.eventRows].slice(0, 4),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(LINE_MAP, 'Depot endpoint reached', 'accepted', `Train ${trainId} reached depot endpoint on ${routeLabel}.`),
    ),
    scenarioNotice: { text: `Train ${trainId} reached depot endpoint on ${routeLabel}.`, tone: 'success' },
  }, {
    routeLabel,
    source: LINE_MAP,
    trainId,
    type: 'DEPOT_ENDPOINT_REACHED',
  })

  return result.allowed ? accepted(result.next) : refused(result.next)
}
