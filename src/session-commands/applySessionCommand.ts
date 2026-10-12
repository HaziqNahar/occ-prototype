import type { TrainDoorCommand } from '../components/train-control/trainCommandState'
import { nelTimetableOptions } from '../data/nelTimetable'
import { finalizeSessionUpdate } from '../sessionState'
import {
  applyTrainingScenarioTimetableCompletion,
  applyTrainingScenarioTimetableStep,
} from '../trainingScenarios'
import type { OccSessionState } from '../types'
import { updateAssessmentMetrics } from './assessment'
import {
  acknowledgeItama,
  applyScadaTrainCommand,
  applySignalRoute,
  applyTrainHold,
  completeManualRoute,
  confirmDeparture,
  confirmDoorCommand,
  confirmItama,
  confirmReadiness,
  isItamaStep,
  isTrainAuxiliaryView,
  openTrainView,
  selectTrain,
  setArrivalDestination,
} from './lineMapCommands'
import {
  acknowledgeAlarms,
  applyTimetableTripAction,
  isTimetableTripAction,
  joinTrainee,
  leaveTrainee,
  logCall,
  setTimetableView,
  showNotice,
} from './monitorCommands'
import { applySimPatch } from './simPatch'
import {
  assignLaunchTrain,
  confirmTask,
  isScenarioDuration,
  isTrainingMode,
  isTrainingScenarioKind,
  loadScenario,
  resetScenario,
  resetSession,
  setScenarioState,
} from './trainerCommands'
import type {
  SessionCommand,
  SessionCommandContext,
  SessionCommandResult,
  SessionCommandType,
  SimScenarioEvent,
} from './types'

// The one place a session changes. The server runs it for every request; a
// browser runs the same code to show its own action before the server's answer.

const TRAINER_COMMANDS = new Set<SessionCommandType>([
  'ASSIGN_LAUNCH_TRAIN',
  'CONFIRM_TASK',
  'LOAD_SCENARIO',
  'RESET_SCENARIO',
  'RESET_SESSION',
  'SET_SCENARIO_STATE',
])

const TRAIN_COMMANDS = new Set<SessionCommandType>([
  'ARRIVAL_DESTINATION',
  'ITAMA_ACK',
  'ITAMA_CONFIRM',
  'MANUAL_ROUTE_COMPLETED',
  'OPEN_TRAIN_VIEW',
  'SCADA_TRAIN_COMMAND',
  'SELECT_TRAIN',
  'TIMETABLE_TRIP_ACTION',
  'TRAIN_DEPARTURE',
  'TRAIN_DOOR_COMMAND',
  'TRAIN_HOLD',
  'TRAIN_READINESS',
])

const DOOR_COMMANDS = new Set<TrainDoorCommand>([
  'authorize-door-isolation',
  'authorize-move',
  'confirm-closed-locked',
  'cycle-door',
  'withdraw-service',
])

const TIMETABLE_NAMES = new Set<string>(nelTimetableOptions.map((option) => option.value))

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isDirection = (value: unknown) => value === 'left' || value === 'right'

export function isTrainerCommand(type: SessionCommandType) {
  return TRAINER_COMMANDS.has(type)
}

// Checks a command's shape. Requests come from the network, so nothing is trusted.
export function validateSessionCommand(command: unknown): string | null {
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    return 'Expected a command object.'
  }

  const value = command as Record<string, unknown> & { type?: unknown }

  switch (value.type) {
    case 'LOAD_SCENARIO':
      if (!isTrainingScenarioKind(value.kind)) return 'Unknown scenario.'
      if (!isText(value.incident)) return 'Expected an incident.'
      if (!isTrainingMode(value.trainingMode)) return 'Unknown training mode.'
      if (!TIMETABLE_NAMES.has(String(value.timetableName))) return 'Unknown timetable.'
      if (!isScenarioDuration(value.duration)) return 'Time target must be mm:ss.'
      return null
    case 'ASSIGN_LAUNCH_TRAIN':
      return isText(value.trainId) ? null : 'Expected a train.'
    case 'SET_SCENARIO_STATE':
      return ['PAUSE', 'RESUME', 'COMPLETE'].includes(String(value.state)) ? null : 'Unknown scenario state.'
    case 'CONFIRM_TASK':
      return isText(value.taskId) && typeof value.label === 'string' ? null : 'Expected a task.'
    case 'RESET_SCENARIO':
      return null
    case 'RESET_SESSION':
      return isTrainingMode(value.trainingMode) && TIMETABLE_NAMES.has(String(value.timetableName)) ? null : 'Unknown mode or timetable.'
    case 'TRAINEE_JOIN':
      return typeof value.code === 'string' && typeof value.name === 'string' ? null : 'Expected a name and code.'
    case 'TRAINEE_LEAVE':
      return isText(value.traineeId) ? null : 'Expected a trainee.'
    case 'ACK_ALARMS':
      return Array.isArray(value.rowKeys) && value.rowKeys.every((key) => typeof key === 'string') ? null : 'Expected alarm rows.'
    case 'SELECT_TRAIN':
      return isText(value.trainId) && ['menu', 'inspector', 'itama', 'timetable'].includes(String(value.view)) ? null : 'Expected a train and view.'
    case 'OPEN_TRAIN_VIEW':
      return isText(value.trainId) && isTrainAuxiliaryView(value.view) ? null : 'Expected a train and view.'
    case 'ITAMA_CONFIRM':
      return isText(value.trainId) && isItamaStep(value.step) ? null : 'Expected a train and ITAMA step.'
    case 'ITAMA_ACK':
      return isText(value.trainId) ? null : 'Expected a train.'
    case 'TRAIN_READINESS':
      return isText(value.trainId) && isText(value.command) ? null : 'Expected a train and readiness command.'
    case 'TRAIN_DOOR_COMMAND':
      return isText(value.trainId) && DOOR_COMMANDS.has(value.command as TrainDoorCommand) ? null : 'Expected a train and door command.'
    case 'TRAIN_HOLD':
      return isText(value.trainId) && typeof value.detail === 'string' ? null : 'Expected a train.'
    case 'SCADA_TRAIN_COMMAND':
      return isText(value.trainId) && ['ROUTE', 'DISPATCH', 'HOLD'].includes(String(value.command)) ? null : 'Expected a train and command.'
    case 'SIGNAL_ROUTE':
      return isText(value.signalLabel) && isText(value.routeLabel) && typeof value.set === 'boolean' ? null : 'Expected a signal and route.'
    case 'ARRIVAL_DESTINATION':
      return isText(value.trainId) && typeof value.station === 'string' && typeof value.platformSiding === 'string' && isDirection(value.direction)
        ? null
        : 'Expected a train and destination.'
    case 'TRAIN_DEPARTURE':
      return isText(value.trainId) && isText(value.routeLabel) ? null : 'Expected a train and route.'
    case 'MANUAL_ROUTE_COMPLETED':
      return isText(value.trainId) && isText(value.routeLabel) && typeof value.depotLeg === 'boolean' && typeof value.launchHandoff === 'boolean'
        ? null
        : 'Expected a train and route.'
    case 'SHOW_NOTICE':
      return typeof value.text === 'string' && ['info', 'success', 'warning'].includes(String(value.tone)) ? null : 'Expected a notice.'
    case 'SET_TIMETABLE_VIEW':
      return (value.direction === undefined || value.direction === 'NB' || value.direction === 'SB')
        && (value.station === undefined || typeof value.station === 'string')
        ? null
        : 'Expected a timetable view.'
    case 'TIMETABLE_TRIP_ACTION':
      return isText(value.trainId) && typeof value.sched === 'string' && isTimetableTripAction(value.action) ? null : 'Expected a trip action.'
    case 'LOG_CALL':
      return value.request && typeof value.request === 'object' && isText((value.request as { messageId?: unknown }).messageId)
        ? null
        : 'Expected a call.'
    case 'SIM_UPDATE':
      return value.patch && typeof value.patch === 'object' && (value.events === undefined || Array.isArray(value.events))
        ? null
        : 'Expected a simulation patch.'
    default:
      return `Unknown command: ${String(value.type)}`
  }
}

function isTimetablePlanEvent(event: SimScenarioEvent) {
  return Boolean(event?.plan && typeof event.plan.trainId === 'string' && Array.isArray(event.plan.steps))
}

// Launch progress while the timetable runs the scenario train. Each event only
// counts if the patched train really is on that step.
function applySimScenarioEvents(session: OccSessionState, events: readonly SimScenarioEvent[] = []) {
  const targetTrainId = session.activeScenario.targetTrainId

  return events.reduce((current, event) => {
    if (!isTimetablePlanEvent(event) || event.plan.trainId !== targetTrainId) {
      return current
    }

    if (event.type === 'TIMETABLE_COMPLETE') {
      return applyTrainingScenarioTimetableCompletion(current, event.plan)
    }

    const train = current.trains.find((item) => item.id === event.plan.trainId)
    const step = event.plan.steps[event.stepIndex]

    return step && train?.occupancySegmentId === step.segmentId
      ? applyTrainingScenarioTimetableStep(current, event.plan, event.stepIndex)
      : current
  }, session)
}

// New evidence rows record who sent the command.
function tagNewEvidence(before: OccSessionState['evidenceLog'], after: OccSessionState['evidenceLog'], actorName: string) {
  if (before === after) {
    return after
  }

  const existingIds = new Set(before.map((evidence) => evidence.id))

  return after.map((evidence) => (
    existingIds.has(evidence.id) || evidence.actor ? evidence : { ...evidence, actor: actorName }
  ))
}

function runCommand(session: OccSessionState, command: SessionCommand): SessionCommandResult {
  switch (command.type) {
    case 'LOAD_SCENARIO':
      return loadScenario(session, command)
    case 'ASSIGN_LAUNCH_TRAIN':
      return assignLaunchTrain(session, command.trainId)
    case 'SET_SCENARIO_STATE':
      return setScenarioState(session, command.state)
    case 'CONFIRM_TASK':
      return confirmTask(session, command.taskId, command.label)
    case 'RESET_SCENARIO':
      return resetScenario(session)
    case 'RESET_SESSION':
      return resetSession(session, command.trainingMode, command.timetableName)
    case 'TRAINEE_JOIN':
      return joinTrainee(session, command.code, command.name)
    case 'TRAINEE_LEAVE':
      return leaveTrainee(session, command.traineeId)
    case 'ACK_ALARMS':
      return acknowledgeAlarms(session, command.rowKeys, command.keepRedTone)
    case 'SELECT_TRAIN':
      return selectTrain(session, command.trainId, command.view, command.page)
    case 'OPEN_TRAIN_VIEW':
      return openTrainView(session, command.trainId, command.view)
    case 'ITAMA_CONFIRM':
      return confirmItama(session, command.trainId, command.step)
    case 'ITAMA_ACK':
      return acknowledgeItama(session, command.trainId)
    case 'TRAIN_READINESS':
      return confirmReadiness(session, command.trainId, command.command)
    case 'TRAIN_DOOR_COMMAND':
      return confirmDoorCommand(session, command.trainId, command.command)
    case 'TRAIN_HOLD':
      return applyTrainHold(session, command.trainId, command.detail)
    case 'SCADA_TRAIN_COMMAND':
      return applyScadaTrainCommand(session, command.trainId, command.command)
    case 'SIGNAL_ROUTE':
      return applySignalRoute(session, command.signalLabel, command.routeLabel, command.set)
    case 'ARRIVAL_DESTINATION':
      return setArrivalDestination(session, command)
    case 'TRAIN_DEPARTURE':
      return confirmDeparture(session, command.trainId, command.routeLabel)
    case 'MANUAL_ROUTE_COMPLETED':
      return completeManualRoute(session, command)
    case 'SHOW_NOTICE':
      return showNotice(session, { text: command.text, tone: command.tone })
    case 'SET_TIMETABLE_VIEW':
      return setTimetableView(session, command)
    case 'TIMETABLE_TRIP_ACTION':
      return applyTimetableTripAction(session, command.trainId, command.sched, command.action)
    case 'LOG_CALL':
      return logCall(session, command.request)
    case 'SIM_UPDATE':
      return { accepted: true, session: applySimScenarioEvents(applySimPatch(session, command.patch), command.events) }
    default:
      return { accepted: false, reason: 'Unknown command.', session }
  }
}

export function applySessionCommand(
  session: OccSessionState,
  command: SessionCommand,
  context: SessionCommandContext,
): SessionCommandResult {
  const invalid = validateSessionCommand(command)

  if (invalid) {
    return { accepted: false, reason: invalid, session }
  }

  if (isTrainerCommand(command.type) && context.actor.role !== 'trainer') {
    return { accepted: false, reason: 'Only a trainer can do that.', session }
  }

  if (TRAIN_COMMANDS.has(command.type) && !session.trains.some((train) => train.id === (command as { trainId: string }).trainId)) {
    return { accepted: false, reason: `Unknown train ${(command as { trainId: string }).trainId}.`, session }
  }

  const result = runCommand(session, command)

  if (result.session === session) {
    return result
  }

  const finalized = finalizeSessionUpdate(result.session)

  return {
    ...result,
    session: {
      ...finalized,
      evidenceLog: tagNewEvidence(session.evidenceLog, finalized.evidenceLog, context.actor.name),
      assessmentMetrics: updateAssessmentMetrics(session, finalized),
      updatedAt: Date.now(),
    },
  }
}
