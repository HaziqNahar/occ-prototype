import { getCommsMessage, getCommsRecipient, hasCommsEvidence } from '../comms/commsCatalog'
import type { CommsChannel } from '../comms/commsCatalog'
import { platformData } from '../screens/line-map/model'
import type { OccSessionState } from '../types'
import { scoreTrainingScenario } from './assessment'
import { getTrainingScenarioDefinition } from './definitions'
import { resolveFaultText } from './faultLocation'
import { getActiveTrainingScenarioTargetTrainId } from './targetSelection'
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

export function getStepHint(session: OccSessionState, task: TrainingScenarioTaskDefinition): StepHint {
  const trainId = getActiveTrainingScenarioTargetTrainId(session)
  const trainLabel = trainId ? `Train ${trainId}` : 'the scenario train'
  const station = session.activeScenario.faultLocation?.station
  const label = resolveFaultText(task.label, { ...session.activeScenario.faultLocation, trainId: trainId || undefined })
  const base = { label, monitors: monitorsFor(task.monitor), taskId: task.id }
  const timeDialog = timeDialogIn(label)
  const train = trainId ? { kind: 'train' as const, trainId } : undefined

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
    return { ...base, how: [`Right-click ${trainLabel} → ${INSPECTOR} → Train Hold`, `or HII on the station panel`], target: train }
  }

  if (task.doorCommandLabels?.length) {
    return {
      ...base,
      how: [`Right-click ${trainLabel} → ${INSPECTOR} → Door Open/Close Request → ${task.doorCommandLabels.join(' or ')}`],
      target: train,
    }
  }

  const panelStep = (command: 'DISPATCH' | 'ROUTE'): StepHint => {
    const panelStation = trainId ? stationFor(session, trainId) : station ?? ''

    if (timeDialog) {
      return { ...base, how: [`Right-click ${trainLabel} → ${INSPECTOR} → ${timeDialog}`], target: train }
    }

    return panelStation
      ? {
          ...base,
          how: [`Right-click ${trainLabel} to select it, then ${command} on the ${panelStation} station panel`],
          target: { command, kind: 'stationButton', station: panelStation },
        }
      : { ...base, how: [`Right-click ${trainLabel} to select it, then ${command} on the station panel`] }
  }

  switch (task.mappedTaskId) {
    case 'selectTrain':
      return base.monitors.includes('TIMETABLE')
        ? { ...base, how: [`Click ${trainLabel}'s row in the timetable`], target: trainId ? { kind: 'timetableRow', trainId } : undefined }
        : { ...base, how: [`Right-click ${trainLabel} on the Line Map`], target: train }
    case 'ackAlarm':
      return {
        ...base,
        how: [`Select the red incident row for ${trainLabel}`, 'then Ack. selection'],
        target: trainId ? { kind: 'alarmRow', trainId } : undefined,
      }
    case 'setRoute':
      return panelStep('ROUTE')
    case 'dispatchTrain':
      return panelStep('DISPATCH')
    case 'completeScenario':
      return { ...base, how: ['The trainer completes the run on the console'], monitors: [] }
  }

  if (base.monitors.length === 0) {
    return { ...base, how: ['Wait for the trainer to confirm'] }
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
