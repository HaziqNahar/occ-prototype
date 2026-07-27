import type { TraineeRole } from './types'

export type ScenarioTaskOwner = TraineeRole | 'Instructor'

export function getScenarioTaskOwner(monitor: string): ScenarioTaskOwner {
  if (monitor === 'IOS') {
    return 'Instructor'
  }

  return 'Traffic Controller'
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

  return '/ios' as const
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
