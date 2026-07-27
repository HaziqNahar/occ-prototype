import { completeScenarioTask, updateScenarioTask } from '../scenarioWorkflow'
import { updateSessionLifecycle } from '../sessionState'
import type { OccSessionState, ScenarioTaskId } from '../types'
import { getTrainingScenarioCompletionBlockers } from './assessment'
import { getTrainingScenarioDefinition } from './definitions'
import { appendTrainingScenarioEvidence } from './runtimeState'

export function completeTrainingScenarioTask(
  current: OccSessionState,
  taskId: ScenarioTaskId,
  successText: string,
  source = 'IOS Scenario Runtime',
): { allowed: boolean; next: OccSessionState } {
  if (taskId === 'completeScenario') {
    const blockers = getTrainingScenarioCompletionBlockers(current)

    if (blockers.length > 0) {
      return {
        allowed: false,
        next: {
          ...current,
          scenarioNotice: {
            text: `Cannot complete scenario. Open required tasks: ${blockers.map((task) => task.label).join(', ')}.`,
            tone: 'warning' as const,
          },
        },
      }
    }
  }

  if (current.activeScenario.id === 'door-fault') {
    return completeScenarioTask(current, taskId, successText, source)
  }

  return {
    allowed: true,
    next: {
      ...appendTrainingScenarioEvidence(current, source, `Scenario task ${taskId}`, successText),
      scenarioMode: taskId === 'completeScenario' ? 'COMPLETE' as const : current.scenarioMode === 'COMPLETE' ? 'COMPLETE' as const : 'RUNNING' as const,
      scenarioNotice: {
        text: successText,
        tone: taskId === 'completeScenario' ? 'success' as const : 'info' as const,
      },
      scenarioTasks: updateScenarioTask(current.scenarioTasks, taskId),
      sessionMeta: updateSessionLifecycle(
        current.sessionMeta,
        taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING',
      ),
    },
  }
}

export function completeTrainingScenarioDefinitionTask(
  current: OccSessionState,
  trainingTaskId: string,
  source = 'IOS Scenario Runtime',
  options: { allowRuntimeOnly?: boolean } = {},
): { allowed: boolean; next: OccSessionState } {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)
  const task = definition.tasks.find((item) => item.id === trainingTaskId)

  if (!task) {
    return {
      allowed: false,
      next: {
        ...current,
        scenarioNotice: {
          text: 'Selected task is not part of the active scenario.',
          tone: 'warning' as const,
        },
      },
    }
  }

  if (definition.kind === 'TRAIN_WITHDRAWAL' && !current.activeScenario.targetTrainId) {
    return {
      allowed: false,
      next: {
        ...current,
        scenarioNotice: {
          text: 'Select a live timetable train to withdraw before confirming withdrawal tasks.',
          tone: 'warning' as const,
        },
      },
    }
  }

  const detail = [
    task.label,
    ...(task.evidenceKeywords ?? []),
  ].join(' | ')

  if (task.runtimeOnly && !options.allowRuntimeOnly) {
    return {
      allowed: false,
      next: {
        ...current,
        scenarioNotice: {
          text: `${task.label} must be completed from ${task.monitor}.`,
          tone: 'warning' as const,
        },
      },
    }
  }

  if (task.mappedTaskId) {
    const result = completeTrainingScenarioTask(current, task.mappedTaskId, detail, source)

    if (result.allowed && task.runtimeOnly && options.allowRuntimeOnly) {
      return {
        allowed: true,
        next: appendTrainingScenarioEvidence(result.next, source, task.label, detail),
      }
    }

    return result
  }

  return {
    allowed: true,
    next: {
      ...appendTrainingScenarioEvidence(current, source, task.label, detail),
      scenarioMode: current.scenarioMode === 'COMPLETE' ? 'COMPLETE' as const : 'RUNNING' as const,
      scenarioNotice: {
        text: detail,
        tone: 'info' as const,
      },
      sessionMeta: updateSessionLifecycle(current.sessionMeta, 'RUNNING'),
    },
  }
}
