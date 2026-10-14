import { getCommsMessage, getCommsRecipient, hasCommsEvidence } from '../comms/commsCatalog'
import type { CommsChannel } from '../comms/commsCatalog'
import { platformData } from '../screens/line-map/model'
import type { OccSessionState } from '../types'
import { scoreTrainingScenario } from './assessment'
import { getTrainingScenarioDefinition } from './definitions'
import { resolveFaultText } from './faultLocation'
import { getActiveTrainingScenarioTargetTrainId, getEligibleLaunchScenarioTargetOptions } from './targetSelection'
import type { TrainingScenarioTaskDefinition } from './types'

// Next-step hints for the Practice coach (docs/training-layer-plan.md, piece 2).
// They come from what each checklist step already records, not from text
// written per step, so a new scenario gets hints without extra work.

export type CoachMonitor = 'ALARMS' | 'LINE_MAP' | 'TIMETABLE'

export const coachMonitorLabels: Record<CoachMonitor, string> = {
  ALARMS: 'Monitor 01 Alarms',
  LINE_MAP: 'Monitor 02 Line Map',
  TIMETABLE: 'Monitor 03 Timetable',
}

// What Show me outlines: the first thing to click for the step.
export type CoachTarget =
  | { kind: 'alarmRow'; trainId: string }
  | { channel: CommsChannel; kind: 'calls' }
  | { command: 'DISPATCH' | 'ROUTE'; kind: 'stationButton'; station: string }
  | { kind: 'timetableRow'; trainId: string }
  | { kind: 'train'; trainId: string }

export type StepHint = {
  // How to do it, one click path per line.
  how: string[]
  label: string
  // Monitors the step is done on. Empty: the trainer does it on the console.
  monitors: CoachMonitor[]
  target?: CoachTarget
  taskId: string
}

export type CoachState =
  | { kind: 'idle' }
  | { kind: 'complete' }
  // Every step done; the trainer still has to complete the run.
  | { kind: 'done' }
  | { kind: 'paused' }
  | { kind: 'step'; hint: StepHint; stepNumber: number; totalSteps: number }

const INSPECTOR = 'Open inspector... → Control page'

function monitorsFor(monitor: string): CoachMonitor[] {
  if (monitor.includes('Timetable')) return ['TIMETABLE']
  if (monitor.includes('Line Map')) return ['LINE_MAP']
  if (monitor.includes('Alarm')) return ['ALARMS']
  // The Calls tab is on the Alarms and Line Map monitors.
  if (monitor === 'Calls') return ['ALARMS', 'LINE_MAP']
  return []
}

// A step that names the Arrival or Departure Time dialog is done there, not
// with the station panel buttons.
function timeDialogIn(label: string) {
  if (/arrival time/i.test(label)) return 'Arrival Time'
  if (/departure time/i.test(label)) return 'Departure Time'
  return ''
}

// The station panel nearest the scenario train (or the fault station).
function stationFor(session: OccSessionState, trainId: string) {
  const train = session.trains.find((item) => item.id === trainId)

  if (!train) {
    return session.activeScenario.faultLocation?.station ?? ''
  }

  return platformData.reduce((nearest, platform) => (
    Math.abs(platform.x - train.x) < Math.abs(nearest.x - train.x) ? platform : nearest
  )).code
}

function callPath(messageId: string, trainLabel: string, station?: string) {
  const message = getCommsMessage(messageId)

  if (!message) {
    return ''
  }

  const recipient = getCommsRecipient(message.recipient)
  const target = recipient.needsTrain ? ` (${trainLabel})` : recipient.needsStation && station ? ` (${station})` : ''

  return `Calls → ${recipient.channel === 'RADIO' ? 'Radio' : 'Teleph.'} → ${recipient.label}${target} → ${message.label}`
}

// Launch and withdrawal trains are chosen in the timetable. Until one is, the
// launch hint points at the first train that can leave the depot (the same
// list the trainer assigns from); a withdrawal is any running train.
function timetableSelectStep(session: OccSessionState, base: Omit<StepHint, 'how'>, trainId: string): StepHint {
  if (trainId) {
    return { ...base, how: [`Click Train ${trainId}'s row in the timetable`], target: { kind: 'timetableRow', trainId } }
  }

  if (getTrainingScenarioDefinition(session.activeScenario.id).kind === 'TRAIN_LAUNCH') {
    const option = getEligibleLaunchScenarioTargetOptions(session)[0]

    return option
      ? {
          ...base,
          how: [`Click the row of a train leaving the depot, e.g. Train ${option.trainId} (SKG → ${option.destinationPoint})`, 'or wait for the trainer to assign one'],
          target: { kind: 'timetableRow', trainId: option.trainId },
        }
      : { ...base, how: ['Wait for the trainer to assign the launch train'] }
  }

  return { ...base, how: ['Click the row of a running train to withdraw it'] }
}

export function getStepHint(session: OccSessionState, task: TrainingScenarioTaskDefinition): StepHint {
  const trainId = getActiveTrainingScenarioTargetTrainId(session)
  const trainLabel = trainId ? `Train ${trainId}` : 'the scenario train'
  const station = session.activeScenario.faultLocation?.station
  const label = resolveFaultText(task.label, { ...session.activeScenario.faultLocation, trainId: trainId || undefined })
  const base = { label, monitors: monitorsFor(task.monitor), taskId: task.id }
  const timeDialog = timeDialogIn(label)
  const train = trainId ? { kind: 'train' as const, trainId } : undefined
  const panelStation = trainId ? stationFor(session, trainId) : station ?? ''

  if (task.commsMessageIds?.length) {
    const open = task.commsMessageIds.filter((id) => !hasCommsEvidence(session.evidenceLog, id))
    const first = open.map((id) => getCommsMessage(id)).find(Boolean)

    return {
      ...base,
      how: open.map((id) => callPath(id, trainLabel, station)).filter(Boolean),
      target: first ? { channel: getCommsRecipient(first.recipient).channel, kind: 'calls' } : undefined,
    }
  }

  if (task.completesOnHold) {
    return {
      ...base,
      how: [`Right-click ${trainLabel} → ${INSPECTOR} → Train Hold`, panelStation ? `or HII on the ${panelStation} station panel` : `or HII on the station panel where ${trainLabel} is`],
      target: train,
    }
  }

  if (task.doorCommandLabels?.length) {
    return {
      ...base,
      how: [`Right-click ${trainLabel} → ${INSPECTOR} → Door Open/Close Request → ${task.doorCommandLabels.join(' or ')}`],
      target: train,
    }
  }

  // DISPATCH (and HII) act on the train at the panel's station, so only the
  // panel at the train's station will do.
  const dispatchStep = (): StepHint => {
    if (timeDialog) {
      return { ...base, how: [`Right-click ${trainLabel} → ${INSPECTOR} → ${timeDialog}`], target: train }
    }

    return panelStation
      ? {
          ...base,
          how: [`DISPATCH on the ${panelStation} station panel (${trainLabel} is there)`],
          target: { command: 'DISPATCH', kind: 'stationButton', station: panelStation },
        }
      : { ...base, how: [`DISPATCH on the station panel where ${trainLabel} is`] }
  }

  // A route is set from a signal (the station panel's ROUTE only switches the
  // panel between Central AUTO and MANUAL).
  const routeStep = (): StepHint => (
    timeDialog
      ? { ...base, how: [`Right-click ${trainLabel} → ${INSPECTOR} → ${timeDialog}`], target: train }
      : { ...base, how: [`Right-click the signal ahead of ${trainLabel} → Define Route → choose the route`], target: train }
  )

  switch (task.mappedTaskId) {
    case 'selectTrain':
      return base.monitors.includes('TIMETABLE')
        ? timetableSelectStep(session, base, trainId)
        : { ...base, how: [`Right-click ${trainLabel} on the Line Map`], target: train }
    case 'ackAlarm':
      return {
        ...base,
        how: [`Select the red incident row for ${trainLabel}`, 'then Ack. selection'],
        target: trainId ? { kind: 'alarmRow', trainId } : undefined,
      }
    case 'setRoute':
      return routeStep()
    case 'dispatchTrain':
      return dispatchStep()
    case 'completeScenario':
      return { ...base, how: ['The trainer completes the run on the console'], monitors: [] }
  }

  if (base.monitors.length === 0) {
    return { ...base, how: ['Wait for the trainer to confirm'] }
  }

  // Steps the simulation completes (the train reaching its endpoint): watch it.
  if (task.runtimeOnly && base.monitors.includes('LINE_MAP') && !timeDialog) {
    return { ...base, how: [`Watch ${trainLabel} on the Line Map`, 'This step completes by itself'], target: train }
  }

  if (timeDialog && base.monitors.includes('LINE_MAP')) {
    return { ...base, how: [`Right-click ${trainLabel} → ${INSPECTOR} → ${timeDialog}`], target: train }
  }

  return { ...base, how: [`On ${base.monitors.map((monitor) => coachMonitorLabels[monitor]).join(' or ')}`] }
}

export function getCoachState(session: OccSessionState): CoachState {
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)

  if (definition.id === 'idle') {
    return { kind: 'idle' }
  }

  if (session.scenarioMode === 'COMPLETE') {
    return { kind: 'complete' }
  }

  if (session.scenarioMode === 'PAUSED') {
    return { kind: 'paused' }
  }

  const { taskResults } = scoreTrainingScenario(session)
  const index = taskResults.findIndex((task) => !task.complete)

  if (index < 0) {
    return { kind: 'done' }
  }

  return { hint: getStepHint(session, taskResults[index]), kind: 'step', stepNumber: index + 1, totalSteps: taskResults.length }
}
