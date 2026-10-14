import type { TraineeRole } from './types'

export type ScenarioTaskOwner = TraineeRole | 'Instructor'

export function getScenarioTaskOwner(monitor: string): ScenarioTaskOwner {
  if (monitor === 'IOS') {
    return 'Instructor'
  }

  return 'Traffic Controller'
}

// Where a checklist step is done, as trainers read it: "IOS" (the instructor
// station) is the Trainer Console, so those steps are the trainer's.
export function getScenarioTaskPlaceLabel(monitor: string) {
  return monitor === 'IOS' ? 'Trainer' : monitor
}

// A short tag for where a step is done: "Monitor 02 Line Map" and "Line Map
// Train Control" are both the Line Map.
export function getScenarioTaskPlaceTag(monitor: string) {
  if (monitor === 'IOS') return 'Trainer'
  if (monitor.includes('Line Map')) return 'Line Map'
  if (monitor.includes('Timetable')) return 'Timetable'
  if (monitor.includes('Alarm')) return 'Alarms'
  return monitor
}

export function getScenarioTaskOwnerLabel(owner: string) {
  return owner === 'Instructor' ? 'Trainer' : owner
}

export function doesScenarioTaskBelongToRole(role: TraineeRole, monitor: string) {
  return getScenarioTaskOwner(monitor) === role
}

export function getScenarioTaskActionRoute(monitor: string) {
  if (monitor.includes('Train Control') || monitor.includes('Line Map')) {
    return '/screen/line-map' as const
  }

  if (monitor.includes('Timetable')) {
    return '/screen/timetable' as const
  }

  if (monitor.includes('Alarm')) {
    return '/screen/alarms' as const
  }

  return '/ios/modules' as const
}

export function getScenarioTaskActionLabel(monitor: string) {
  if (monitor.includes('Train Control')) {
    return 'Open Train Control'
  }

  if (monitor.includes('Line Map')) {
    return 'Open Line Map'
  }

  if (monitor.includes('Timetable')) {
    return 'Open Timetable'
  }

  if (monitor.includes('Alarm')) {
    return 'Open Alarms'
  }

  return 'Open IOS'
}
