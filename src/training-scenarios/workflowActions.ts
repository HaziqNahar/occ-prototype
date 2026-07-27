import { createMonitorEvent, createSummaryEvent } from '../scenarioWorkflow'
import {
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from '../screens/line-map/trainMovementRoutes'
import type { OccSessionState } from '../types'
import { isTrainingScenarioTaskComplete } from './assessment'
import {
  getTrainingScenarioDefinition,
  trainingScenarioWorkflowDefinitions,
} from './definitions'
import {
  applyScenarioSignalRouteSet,
  applyScenarioTrainRouteStep,
  stageTrainLaunchScenarioAtSignal,
  upsertScenarioDoorFaultTrain,
  upsertScenarioWorkflowTrain,
} from './runtimeState'
import {
  completeTrainingScenarioDefinitionTask,
  completeTrainingScenarioTask,
} from './tasks'
import { getActiveTrainingScenarioTargetTrainId } from './targetSelection'
import type {
  TrainingScenarioWorkflowAction,
  TrainingScenarioWorkflowDefinition,
} from './types'

export function applyTrainingScenarioWorkflowAction(
  current: OccSessionState,
  action: TrainingScenarioWorkflowAction,
): { allowed: boolean; message: string; next: OccSessionState } {
  const workflow = trainingScenarioWorkflowDefinitions[action]
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)

  if (definition.kind !== workflow.kind || definition.id === 'idle') {
    const message = `${workflow.message} is not available for ${definition.title}.`

    return {
      allowed: false,
      message,
      next: {
        ...current,
        scenarioNotice: {
          text: message,
          tone: 'warning' as const,
        },
      },
    }
  }

  if (definition.kind === 'TRAIN_LAUNCH' && !current.activeScenario.targetTrainId) {
    const message = 'Select an eligible SKG-origin launch train before continuing.'

    return {
      allowed: false,
      message,
      next: {
        ...current,
        scenarioNotice: {
          text: message,
          tone: 'warning' as const,
        },
      },
    }
  }

  if (definition.kind === 'TRAIN_WITHDRAWAL' && !current.activeScenario.targetTrainId) {
    const message = 'Select a live timetable train to withdraw before continuing.'

    return {
      allowed: false,
      message,
      next: {
        ...current,
        scenarioNotice: {
          text: message,
          tone: 'warning' as const,
        },
      },
    }
  }

  let next = current

  for (const taskId of workflow.taskIds) {
    const result = completeTrainingScenarioDefinitionTask(next, taskId, 'IOS Scenario Workflow', {
      allowRuntimeOnly: true,
    })

    if (!result.allowed) {
      return {
        allowed: false,
        message: result.next.scenarioNotice.text,
        next: result.next,
      }
    }

    next = result.next
  }

  for (const taskId of workflow.scenarioTaskIds ?? []) {
    const result = completeTrainingScenarioTask(next, taskId, workflow.message, 'IOS Scenario Workflow')

    if (!result.allowed) {
      return {
        allowed: false,
        message: result.next.scenarioNotice.text,
        next: result.next,
      }
    }

    next = result.next
  }

  const workflowState = applyTrainingScenarioWorkflowLineMapAction(next, workflow)
  const targetTrainId = getActiveTrainingScenarioTargetTrainId(workflowState)
  const event = createMonitorEvent(targetTrainId, workflow.message, workflow.value, workflow.tone ?? 'yellow')

  return {
    allowed: true,
    message: workflow.message,
    next: {
      ...workflowState,
      alarmSummaryRows: [createSummaryEvent(event, workflow.summaryTone ?? 'yellow'), ...workflowState.alarmSummaryRows].slice(0, 12),
      eventRows: [event, ...workflowState.eventRows].slice(0, 4),
      scenarioNotice: {
        text: workflow.message,
        tone: 'info' as const,
      },
      selectedTrainId: targetTrainId,
    },
  }
}

export function isTrainingScenarioWorkflowActionComplete(
  session: OccSessionState,
  action: TrainingScenarioWorkflowAction,
) {
  const workflow = trainingScenarioWorkflowDefinitions[action]
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)

  if (definition.kind !== workflow.kind || definition.id === 'idle') {
    return false
  }

  return workflow.taskIds.every((taskId) => {
    const task = definition.tasks.find((item) => item.id === taskId)

    if (!task) {
      return false
    }

    return isTrainingScenarioTaskComplete(session, task)
  })
}

function applyTrainingScenarioWorkflowLineMapAction(
  current: OccSessionState,
  workflow: TrainingScenarioWorkflowDefinition,
): OccSessionState {
  if (!workflow.lineMapAction) {
    return current
  }

  const trainId = getActiveTrainingScenarioTargetTrainId(current)

  switch (workflow.lineMapAction) {
    case 'PREPARE_LAUNCH_ROUTE':
      return stageTrainLaunchScenarioAtSignal(current, trainId)

    case 'DISPATCH_LAUNCH': {
      const lineMapWithRoute = applyScenarioSignalRouteSet(current.lineMap, 'Route R655_617', trainId)
      const launchSignalStepIndex = 1
      const lineMap = applyScenarioTrainRouteStep(
        lineMapWithRoute,
        trainId,
        RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
        launchSignalStepIndex,
      )

      return {
        ...current,
        lineMap,
        selectedTrainId: trainId,
        trains: upsertScenarioWorkflowTrain(
          current.trains,
          trainId,
          RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[launchSignalStepIndex],
          {
            direction: 'right',
            isMoving: true,
            service: 'NB',
            status: 'RUN',
          },
        ),
      }
    }

    case 'VERIFY_LAUNCH_MAINLINE': {
      const finalStepIndex = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS.length - 1
      const lineMapWithRoute = applyScenarioSignalRouteSet(current.lineMap, 'Route R655_617', trainId)
      const lineMap = applyScenarioTrainRouteStep(
        lineMapWithRoute,
        trainId,
        RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
        finalStepIndex,
      )

      return {
        ...current,
        lineMap,
        selectedTrainId: trainId,
        trains: upsertScenarioWorkflowTrain(
          current.trains,
          trainId,
          RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[finalStepIndex],
          {
            direction: 'right',
            isMoving: true,
            service: 'NB',
            status: 'RUN',
          },
        ),
      }
    }

    case 'DECLARE_WITHDRAWAL_DESTINATION':
      return {
        ...current,
        lineMap: applyScenarioSignalRouteSet(current.lineMap, 'Route R608_803', trainId),
        selectedTrainId: trainId,
      }

    case 'TRIGGER_WITHDRAWAL_MOVEMENT': {
      const lineMapWithRoute = applyScenarioSignalRouteSet(current.lineMap, 'Route R608_803', trainId)
      const lineMap = applyScenarioTrainRouteStep(
        lineMapWithRoute,
        trainId,
        TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
        0,
      )

      return {
        ...current,
        lineMap,
        selectedTrainId: trainId,
        trains: upsertScenarioWorkflowTrain(
          current.trains,
          trainId,
          TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[0],
          {
            direction: 'left',
            isMoving: true,
            service: 'SB',
            status: 'RUN',
          },
        ),
      }
    }

    case 'VERIFY_WITHDRAWAL_ENDPOINT': {
      const finalStepIndex = TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.length - 1
      const lineMapWithRoute = applyScenarioSignalRouteSet(current.lineMap, 'Route R608_803', trainId)
      const lineMap = applyScenarioTrainRouteStep(
        lineMapWithRoute,
        trainId,
        TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
        finalStepIndex,
      )

      return {
        ...current,
        lineMap,
        selectedTrainId: trainId,
        trains: upsertScenarioWorkflowTrain(
          current.trains,
          trainId,
          TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS[finalStepIndex],
          {
            direction: 'left',
            isMoving: false,
            service: 'SB',
            status: 'WAIT',
          },
        ),
      }
    }

    case 'INJECT_DOOR_FAULT':
      return {
        ...current,
        selectedTrainId: trainId,
        trains: upsertScenarioDoorFaultTrain(current.trains, trainId, {
          doorFailureState: 'FAULT_ALARM',
          isMoving: false,
          status: 'HOLD',
        }),
      }

    case 'ACKNOWLEDGE_DOOR_FAULT':
      return {
        ...current,
        selectedTrainId: trainId,
        trains: upsertScenarioDoorFaultTrain(current.trains, trainId, {
          doorFailureState: 'FAULT_ALARM',
          isMoving: false,
          status: 'HOLD',
        }),
      }

    case 'APPLY_DOOR_FAULT_PROCEDURE':
      return {
        ...current,
        selectedTrainId: trainId,
        trains: upsertScenarioDoorFaultTrain(current.trains, trainId, {
          doorFailureState: 'CLOSED_LOCKED_CONFIRMED',
          isMoving: false,
          status: 'HOLD',
        }),
      }

    case 'AUTHORISE_DOOR_FAULT_RECOVERY':
      return {
        ...current,
        selectedTrainId: trainId,
        trains: upsertScenarioDoorFaultTrain(current.trains, trainId, {
          doorFailureState: 'AUTHORIZED_TO_MOVE',
          isMoving: true,
          status: 'RUN',
        }),
      }

    case 'COMPLETE_DOOR_FAULT_REVIEW':
      return {
        ...current,
        selectedTrainId: trainId,
        trains: upsertScenarioDoorFaultTrain(current.trains, trainId, {
          doorFailureState: 'AUTHORIZED_TO_MOVE',
          isMoving: false,
          status: 'WAIT',
        }),
      }

    default:
      return current
  }
}
