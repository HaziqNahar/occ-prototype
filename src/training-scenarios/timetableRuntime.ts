import { updateSessionLifecycle } from '../sessionState'
import type { TimetablePlaybackPlan } from '../screens/line-map/timetablePlayback'
import type { OccSessionState, ScenarioTaskId, TrainState } from '../types'
import { getTrainingScenarioDefinition, launchRoutePathIds } from './definitions'
import { appendTrainingScenarioEvidence } from './runtimeState'

export function applyTrainingScenarioTimetableStep(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
): OccSessionState {
  if (!isActiveTrainLaunchPlan(current, plan)) {
    return current
  }

  const scenarioSession = current
  const step = plan.steps[stepIndex]

  if (!step) {
    return scenarioSession
  }

  const routeTaskState = updateLaunchScenarioTask(
    scenarioSession,
    'setRoute',
    'Timetable launch route set from RT depot to SKG mainline service.',
  )
  const dispatchTaskState = updateLaunchScenarioTask(
    routeTaskState,
    'dispatchTrain',
    `Train ${plan.trainId} launched on ${plan.routeLabel}.`,
  )

  if (step.segmentId !== 'rail-617' && stepIndex < plan.steps.length - 1) {
    return dispatchTaskState
  }

  return appendTrainingScenarioEvidence(
    updateLaunchScenarioTask(
      dispatchTaskState,
      'setRoute',
      `Train ${plan.trainId} entered mainline service through SKG timetable service.`,
    ),
    'Timetable Playback',
    'Train launch mainline service',
    `Train ${plan.trainId} entered mainline service on ${step.segmentId}.`,
  )
}

export function applyTrainingScenarioTimetableCompletion(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
): OccSessionState {
  if (!isActiveTrainLaunchPlan(current, plan)) {
    return current
  }

  const lastStep = plan.steps[plan.steps.length - 1]
  const trains = lastStep
    ? current.trains.map((train) => (
        train.id === plan.trainId
          ? {
              ...train,
              direction: getScenarioStepDirection(plan.steps, plan.steps.length - 1),
              isMoving: false,
              lineMapVisible: true,
              occupancySegmentId: lastStep.segmentId,
              status: 'WAIT' as const,
              timetablePlayback: true,
              x: lastStep.point.x,
              y: lastStep.point.y,
            }
          : train
      ))
    : current.trains

  return appendTrainingScenarioEvidence(
    {
      ...current,
      trains,
    },
    'Timetable Playback',
    'Train launch outcome',
    `Train ${plan.trainId} completed launch timetable service toward ${plan.to}.`,
  )
}

function getScenarioStepDirection(
  steps: readonly TimetablePlaybackPlan['steps'][number][],
  stepIndex: number,
): TrainState['direction'] {
  const currentStep = steps[stepIndex]
  const previousStep = steps[stepIndex - 1]

  if (currentStep && previousStep) {
    return currentStep.point.x - previousStep.point.x < 0 ? 'left' : 'right'
  }

  return 'right'
}

function isActiveTrainLaunchPlan(current: OccSessionState, plan: TimetablePlaybackPlan) {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)
  const targetTrainId = current.activeScenario.targetTrainId

  return current.scenarioMode === 'RUNNING'
    && definition.kind === 'TRAIN_LAUNCH'
    && targetTrainId === plan.trainId
    && launchRoutePathIds.has(plan.stationRouteId)
}

function updateLaunchScenarioTask(
  current: OccSessionState,
  taskId: ScenarioTaskId,
  detail: string,
) {
  return {
    ...appendTrainingScenarioEvidence(current, 'Timetable Playback', `Scenario task ${taskId}`, detail),
    scenarioMode: taskId === 'completeScenario' ? 'COMPLETE' as const : 'RUNNING' as const,
    scenarioNotice: {
      text: detail,
      tone: taskId === 'completeScenario' ? 'success' as const : 'info' as const,
    },
    scenarioTasks: {
      ...current.scenarioTasks,
      [taskId]: true,
    },
    sessionMeta: updateSessionLifecycle(
      current.sessionMeta,
      taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING',
    ),
  }
}
