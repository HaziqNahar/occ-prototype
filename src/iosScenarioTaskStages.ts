import type { ScenarioMode } from './types'

export type ScenarioTaskStage = 'PRE_ACTION' | 'IN_PROGRESS' | 'VERIFIED' | 'SCORED'

type TaskWithCompletion = {
  complete: boolean
}

export function getScenarioTaskStageLabel(stage: ScenarioTaskStage) {
  switch (stage) {
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'VERIFIED':
      return 'Verified'
    case 'SCORED':
      return 'Scored'
    default:
      return 'Pre-Action'
  }
}

export function getScenarioTaskStageClass(stage: ScenarioTaskStage) {
  switch (stage) {
    case 'IN_PROGRESS':
      return 'is-in-progress'
    case 'VERIFIED':
      return 'is-verified'
    case 'SCORED':
      return 'is-scored'
    default:
      return 'is-pre-action'
  }
}

export function withScenarioTaskStages<T extends TaskWithCompletion>(
  tasks: T[],
  scenarioMode: ScenarioMode,
): Array<T & { stage: ScenarioTaskStage }> {
  const nextPendingIndex = tasks.findIndex((task) => !task.complete)

  return tasks.map((task, index) => {
    let stage: ScenarioTaskStage

    if (task.complete) {
      stage = scenarioMode === 'COMPLETE' ? 'SCORED' : 'VERIFIED'
    } else if (index === nextPendingIndex) {
      stage = 'IN_PROGRESS'
    } else {
      stage = 'PRE_ACTION'
    }

    return {
      ...task,
      stage,
    }
  })
}
