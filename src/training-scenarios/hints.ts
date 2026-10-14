import { getCommsMessage, getCommsRecipient, hasCommsEvidence } from '../comms/commsCatalog'
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

export type StepHint = {
  // How to do it, one click path per line.
  how: string[]
  label: string
  // Monitors the step is done on. Empty: the trainer does it on the console.
  monitors: CoachMonitor[]
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

  if (task.commsMessageIds?.length) {
    const open = task.commsMessageIds.filter((id) => !hasCommsEvidence(session.evidenceLog, id))

    return { ...base, how: open.map((id) => callPath(id, trainLabel, station)).filter(Boolean) }
  }

  if (task.completesOnHold) {
    return { ...base, how: [`Click ${trainLabel} → ${INSPECTOR} → Train Hold`, `or HII on the station panel`] }
  }

  if (task.doorCommandLabels?.length) {
    return {
      ...base,
      how: [`Click ${trainLabel} → ${INSPECTOR} → Door Open/Close Request → ${task.doorCommandLabels.join(' or ')}`],
    }
  }

  switch (task.mappedTaskId) {
    case 'selectTrain':
      return {
        ...base,
        how: [base.monitors.includes('TIMETABLE') ? `Click ${trainLabel}'s row in the timetable` : `Click ${trainLabel} on the Line Map`],
      }
    case 'ackAlarm':
      return { ...base, how: [`Select the red incident row for ${trainLabel}`, 'then Ack. selection'] }
    case 'setRoute':
      return { ...base, how: [timeDialog ? `Click ${trainLabel} → ${INSPECTOR} → ${timeDialog}` : `ROUTE on the station panel for ${trainLabel}`] }
    case 'dispatchTrain':
      return { ...base, how: [timeDialog ? `Click ${trainLabel} → ${INSPECTOR} → ${timeDialog}` : `DISPATCH on the station panel for ${trainLabel}`] }
    case 'completeScenario':
      return { ...base, how: ['The trainer completes the run on the console'], monitors: [] }
  }

  if (base.monitors.length === 0) {
    return { ...base, how: ['Wait for the trainer to confirm'] }
  }

  if (timeDialog && base.monitors.includes('LINE_MAP')) {
    return { ...base, how: [`Click ${trainLabel} → ${INSPECTOR} → ${timeDialog}`] }
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
