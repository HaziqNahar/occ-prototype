import type { ScenarioEvidence, ScenarioTaskId, ScenarioTaskState } from './types'

export function createEmptyScenarioTasks(): ScenarioTaskState {
  return {
    ackAlarm: false,
    completeScenario: false,
    dispatchTrain: false,
    selectTrain: false,
    setRoute: false,
  }
}

export function createScenarioEvidence(
  source: string,
  action: string,
  result: ScenarioEvidence['result'],
  detail: string,
): ScenarioEvidence {
  return {
    action,
    detail,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    result,
    source,
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}

export function appendScenarioEvidence(
  current: ScenarioEvidence[] | undefined,
  evidence: ScenarioEvidence,
) {
  return [evidence, ...(current ?? [])].slice(0, 24)
}

export const scenarioTaskList: Array<{ id: ScenarioTaskId; label: string; monitor: string }> = [
  { id: 'selectTrain', label: 'Select Train 317', monitor: 'IOS / Line Map' },
  { id: 'ackAlarm', label: 'Acknowledge injected door fault', monitor: 'Monitor 01' },
  { id: 'setRoute', label: 'Apply route command', monitor: 'Monitor 02 / 03' },
  { id: 'dispatchTrain', label: 'Dispatch train after route', monitor: 'Monitor 02' },
  { id: 'completeScenario', label: 'Complete scenario review', monitor: 'IOS' },
]
