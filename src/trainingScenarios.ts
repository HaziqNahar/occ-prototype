import { appendScenarioEvidence, createScenarioEvidence } from './scenario'
import {
  completeScenarioTask,
  createMonitorEvent,
  createSummaryEvent,
  updateScenarioTask,
} from './scenarioWorkflow'
import { initialScenarioTasks, updateSessionLifecycle } from './sessionState'
import {
  enforceLineMapRailStateOwnership,
} from './screens/line-map/lineMapRailStateAuthority'
import { normalizeLineMapRuntimeState } from './screens/line-map/lineMapRuntimeState'
import { getDefinedSignalRouteByLabel } from './screens/line-map/routeDefinitions'
import {
  createSignalRouteSetPatch,
  createTrainMovementRouteSegmentStates,
} from './screens/line-map/scadaRouteState'
import type { TimetablePlaybackPlan } from './screens/line-map/timetablePlayback'
import {
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from './screens/line-map/trainMovementRoutes'
import type { TrainRouteAnimationStep } from './screens/line-map/trainMovementRoutes'
import type {
  AlarmSummaryRow,
  LineMapRouteSegmentState,
  LineMapRuntimeState,
  MonitorAlarmRow,
  OccSessionState,
  ScenarioEvidence,
  ScenarioTaskId,
  TrainDirection,
  TrainState,
} from './types'

export type TrainingScenarioKind = 'TRAIN_LAUNCH' | 'TRAIN_WITHDRAWAL' | 'DOOR_FAULT'

export type TrainingScenarioTaskDefinition = {
  critical?: boolean
  evidenceKeywords?: readonly string[]
  id: string
  label: string
  mappedTaskId?: ScenarioTaskId
  monitor: string
  weight: number
}

export type TrainingScenarioDefinition = {
  defaultTargetTrainId: string
  duration: string
  id: string
  incident: string
  kind: TrainingScenarioKind
  objective: string
  target: string
  tasks: readonly TrainingScenarioTaskDefinition[]
  title: string
}

export type TrainingScenarioScore = {
  completedCriticalTasks: number
  completedTasks: number
  criticalTasks: number
  result: 'IN PROGRESS' | 'NEEDS REVIEW' | 'PASS'
  score: number
  taskResults: Array<TrainingScenarioTaskDefinition & { complete: boolean }>
  totalTasks: number
}

export type TrainingScenarioWorkflowAction =
  | 'PREPARE_LAUNCH_ROUTE'
  | 'DISPATCH_LAUNCH'
  | 'VERIFY_LAUNCH_MAINLINE'
  | 'DECLARE_WITHDRAWAL_DESTINATION'
  | 'TRIGGER_WITHDRAWAL_MOVEMENT'
  | 'VERIFY_WITHDRAWAL_ENDPOINT'

type TrainingScenarioWorkflowDefinition = {
  kind: TrainingScenarioKind
  lineMapAction?: TrainingScenarioWorkflowAction
  message: string
  taskIds: readonly string[]
  value: string
}

export const idleTrainingScenarioDefinition: TrainingScenarioDefinition = {
  defaultTargetTrainId: '317',
  duration: '00:00',
  id: 'idle',
  incident: 'None',
  kind: 'DOOR_FAULT',
  objective: 'Select Launch, Withdraw, or Door Fault to arm a training scenario.',
  target: 'No active scenario',
  title: 'Idle',
  tasks: [],
}

export const trainingScenarioDefinitions: readonly TrainingScenarioDefinition[] = [
  {
    defaultTargetTrainId: '306',
    duration: '06:00',
    id: 'train-launch',
    incident: 'Train launch',
    kind: 'TRAIN_LAUNCH',
    objective: 'Launch a train from the RT depot into live mainline service while timetable traffic continues.',
    target: 'RT1 / RT2 launch to SKG timetable service',
    title: 'Train Launch',
    tasks: [
      {
        id: 'select-launch-train',
        label: 'Select train to launch',
        mappedTaskId: 'selectTrain',
        monitor: 'IOS / Line Map',
        weight: 15,
      },
      {
        critical: true,
        evidenceKeywords: ['route', 'launch'],
        id: 'set-launch-route',
        label: 'Set launch route from depot to SKG',
        mappedTaskId: 'setRoute',
        monitor: 'Line Map',
        weight: 25,
      },
      {
        critical: true,
        evidenceKeywords: ['mainline service', 'timetable service'],
        id: 'confirm-service-mode',
        label: 'Confirm train enters mainline service',
        monitor: 'Line Map / Timetable',
        weight: 20,
      },
      {
        evidenceKeywords: ['dispatch', 'departure'],
        id: 'dispatch-launch-train',
        label: 'Dispatch launch train',
        mappedTaskId: 'dispatchTrain',
        monitor: 'Line Map',
        weight: 25,
      },
      {
        id: 'review-launch-outcome',
        label: 'Review final launch state',
        mappedTaskId: 'completeScenario',
        monitor: 'IOS',
        weight: 15,
      },
    ],
  },
  {
    defaultTargetTrainId: '312',
    duration: '07:00',
    id: 'train-withdrawal',
    incident: 'Train withdrawal',
    kind: 'TRAIN_WITHDRAWAL',
    objective: 'Withdraw a live timetable train from mainline service to RT depot without stopping other services.',
    target: 'Mainline train to RT depot endpoint',
    title: 'Train Withdrawal',
    tasks: [
      {
        id: 'select-withdrawal-train',
        label: 'Select train to withdraw',
        mappedTaskId: 'selectTrain',
        monitor: 'IOS / Line Map',
        weight: 10,
      },
      {
        critical: true,
        evidenceKeywords: ['route'],
        id: 'set-withdrawal-route',
        label: 'Set route to last station / depot path',
        mappedTaskId: 'setRoute',
        monitor: 'Line Map',
        weight: 20,
      },
      {
        critical: true,
        evidenceKeywords: ['arrival time', 'ned', 'rt2d', 'destination'],
        id: 'declare-depot-destination',
        label: 'Declare depot destination in Arrival Time',
        monitor: 'Line Map Train Control',
        weight: 25,
      },
      {
        critical: true,
        evidenceKeywords: ['departure time', 'depart'],
        id: 'trigger-withdrawal-movement',
        label: 'Apply Departure Time to start movement',
        mappedTaskId: 'dispatchTrain',
        monitor: 'Line Map Train Control',
        weight: 25,
      },
      {
        evidenceKeywords: ['depot endpoint', 'reached depot', 'endpoint'],
        id: 'verify-depot-endpoint',
        label: 'Verify train reaches depot endpoint',
        monitor: 'Line Map',
        weight: 10,
      },
      {
        id: 'review-withdrawal-outcome',
        label: 'Review final withdrawal state',
        mappedTaskId: 'completeScenario',
        monitor: 'IOS',
        weight: 10,
      },
    ],
  },
  {
    defaultTargetTrainId: '317',
    duration: '05:00',
    id: 'door-fault',
    incident: 'Door fault',
    kind: 'DOOR_FAULT',
    objective: 'Handle train door failure using alarm acknowledgement and controlled train commands.',
    target: 'Faulted train on mainline',
    title: 'Train Door Fault',
    tasks: [
      {
        id: 'select-door-fault-train',
        label: 'Select affected train',
        mappedTaskId: 'selectTrain',
        monitor: 'IOS / Line Map',
        weight: 15,
      },
      {
        critical: true,
        id: 'acknowledge-door-fault',
        label: 'Acknowledge door fault alarm',
        mappedTaskId: 'ackAlarm',
        monitor: 'Alarms',
        weight: 25,
      },
      {
        critical: true,
        evidenceKeywords: ['door', 'closed/locked', 'isolate'],
        id: 'apply-door-procedure',
        label: 'Apply door fault procedure',
        monitor: 'Line Map Train Control',
        weight: 30,
      },
      {
        id: 'route-after-door-fault',
        label: 'Apply movement route after recovery',
        mappedTaskId: 'setRoute',
        monitor: 'Line Map',
        weight: 15,
      },
      {
        id: 'review-door-fault-outcome',
        label: 'Review final door fault state',
        mappedTaskId: 'completeScenario',
        monitor: 'IOS',
        weight: 15,
      },
    ],
  },
] as const

const scenarioDefinitionById = new Map(trainingScenarioDefinitions.map((definition) => [definition.id, definition]))
const launchRoutePathIds = new Set([
  'timetable-skg-to-pgl-upper-mainline',
  'timetable-skg-to-pgc-upper-mainline',
])
const trainingScenarioWorkflowDefinitions: Record<TrainingScenarioWorkflowAction, TrainingScenarioWorkflowDefinition> = {
  PREPARE_LAUNCH_ROUTE: {
    kind: 'TRAIN_LAUNCH',
    lineMapAction: 'PREPARE_LAUNCH_ROUTE',
    message: 'Launch route R655_617 prepared from RT1/S655 into SKG mainline.',
    taskIds: ['select-launch-train', 'set-launch-route'],
    value: 'LAUNCH ROUTE',
  },
  DISPATCH_LAUNCH: {
    kind: 'TRAIN_LAUNCH',
    lineMapAction: 'DISPATCH_LAUNCH',
    message: 'Launch train dispatched into timetable mainline service.',
    taskIds: ['dispatch-launch-train', 'confirm-service-mode'],
    value: 'LAUNCH DISPATCH',
  },
  VERIFY_LAUNCH_MAINLINE: {
    kind: 'TRAIN_LAUNCH',
    lineMapAction: 'VERIFY_LAUNCH_MAINLINE',
    message: 'Launch train verified on SKG mainline service. Scenario complete.',
    taskIds: ['review-launch-outcome'],
    value: 'LAUNCH COMPLETE',
  },
  DECLARE_WITHDRAWAL_DESTINATION: {
    kind: 'TRAIN_WITHDRAWAL',
    lineMapAction: 'DECLARE_WITHDRAWAL_DESTINATION',
    message: 'Withdrawal destination declared as NED / RT2D.',
    taskIds: ['select-withdrawal-train', 'set-withdrawal-route', 'declare-depot-destination'],
    value: 'NED RT2D',
  },
  TRIGGER_WITHDRAWAL_MOVEMENT: {
    kind: 'TRAIN_WITHDRAWAL',
    lineMapAction: 'TRIGGER_WITHDRAWAL_MOVEMENT',
    message: 'Withdrawal departure time applied and movement triggered.',
    taskIds: ['trigger-withdrawal-movement'],
    value: 'WITHDRAW DEPART',
  },
  VERIFY_WITHDRAWAL_ENDPOINT: {
    kind: 'TRAIN_WITHDRAWAL',
    lineMapAction: 'VERIFY_WITHDRAWAL_ENDPOINT',
    message: 'Withdrawal train verified at depot endpoint. Scenario complete.',
    taskIds: ['verify-depot-endpoint', 'review-withdrawal-outcome'],
    value: 'DEPOT ENDPOINT',
  },
}

export function getTrainingScenarioDefinition(id: string | undefined) {
  return scenarioDefinitionById.get(id ?? '') ?? idleTrainingScenarioDefinition
}

export function getActiveTrainingScenarioTargetTrainId(session: OccSessionState) {
  return getTrainingScenarioDefinition(session.activeScenario.id).defaultTargetTrainId
}

export function isActiveTrainingScenarioTargetTrain(session: OccSessionState, trainId: string) {
  return trainId === getActiveTrainingScenarioTargetTrainId(session)
}

export function createTrainingScenarioStartSession(
  current: OccSessionState,
  kind: TrainingScenarioKind,
) {
  const definition = trainingScenarioDefinitions.find((item) => item.kind === kind) ?? trainingScenarioDefinitions[1]
  const event = createMonitorEvent(
    definition.defaultTargetTrainId,
    `IOS scenario armed: ${definition.title}`,
    'ARMED',
    'yellow',
  )

  return {
    ...current,
    activeScenario: {
      duration: definition.duration,
      id: definition.id,
      incident: definition.incident,
      target: definition.target,
      title: definition.title,
    },
    alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
    eventRows: [event, ...current.eventRows].slice(0, 4),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(
        'IOS Scenario Control',
        `${definition.title} armed`,
        'info',
        definition.objective,
      ),
    ),
    scenarioMode: 'RUNNING' as const,
    scenarioNotice: {
      text: definition.objective,
      tone: 'info' as const,
    },
    scenarioStep: 0,
    scenarioTasks: initialScenarioTasks,
    selectedTrainId: definition.defaultTargetTrainId,
    sessionMeta: updateSessionLifecycle(current.sessionMeta, 'RUNNING'),
  }
}

export function scoreTrainingScenario(session: OccSessionState): TrainingScenarioScore {
  const definition = getTrainingScenarioDefinition(session.activeScenario.id)
  const rejectedActions = getRejectedActionCount(session.eventRows, session.evidenceLog)
  const taskResults = definition.tasks.map((task) => ({
    ...task,
    complete: isTrainingScenarioTaskComplete(session, task),
  }))
  const totalWeight = definition.tasks.reduce((total, task) => total + task.weight, 0)
  const earnedWeight = taskResults.reduce((total, task) => total + (task.complete ? task.weight : 0), 0)
  const penalty = rejectedActions * 5
  const score = totalWeight === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100) - penalty))
  const criticalTasks = taskResults.filter((task) => task.critical).length
  const completedCriticalTasks = taskResults.filter((task) => task.critical && task.complete).length
  const result = session.scenarioMode === 'COMPLETE' && completedCriticalTasks === criticalTasks && score >= 80
    ? 'PASS'
    : score >= 70
      ? 'NEEDS REVIEW'
      : 'IN PROGRESS'

  return {
    completedCriticalTasks,
    completedTasks: taskResults.filter((task) => task.complete).length,
    criticalTasks,
    result,
    score,
    taskResults,
    totalTasks: taskResults.length,
  }
}

export function completeTrainingScenarioTask(
  current: OccSessionState,
  taskId: ScenarioTaskId,
  successText: string,
  source = 'IOS Scenario Runtime',
): { allowed: boolean; next: OccSessionState } {
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

  const detail = [
    task.label,
    ...(task.evidenceKeywords ?? []),
  ].join(' | ')

  if (task.mappedTaskId) {
    return completeTrainingScenarioTask(current, task.mappedTaskId, detail, source)
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

  let next = current

  for (const taskId of workflow.taskIds) {
    const result = completeTrainingScenarioDefinitionTask(next, taskId, 'IOS Scenario Workflow')

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
  const event = createMonitorEvent(definition.defaultTargetTrainId, workflow.message, workflow.value, 'yellow')

  return {
    allowed: true,
    message: workflow.message,
    next: {
      ...workflowState,
      alarmSummaryRows: [createSummaryEvent(event, 'yellow'), ...next.alarmSummaryRows].slice(0, 12),
      eventRows: [event, ...next.eventRows].slice(0, 4),
      scenarioNotice: {
        text: workflow.message,
        tone: 'info' as const,
      },
      selectedTrainId: definition.defaultTargetTrainId,
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

  const trainId = getTrainingScenarioDefinition(current.activeScenario.id).defaultTargetTrainId

  switch (workflow.lineMapAction) {
    case 'PREPARE_LAUNCH_ROUTE':
      return {
        ...current,
        lineMap: applyScenarioSignalRouteSet(current.lineMap, 'Route R655_617', trainId),
        selectedTrainId: trainId,
      }

    case 'DISPATCH_LAUNCH': {
      const lineMapWithRoute = applyScenarioSignalRouteSet(current.lineMap, 'Route R655_617', trainId)
      const lineMap = applyScenarioTrainRouteStep(
        lineMapWithRoute,
        trainId,
        RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
        0,
      )

      return {
        ...current,
        lineMap,
        selectedTrainId: trainId,
        trains: upsertScenarioWorkflowTrain(
          current.trains,
          trainId,
          RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[0],
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

    default:
      return current
  }
}

function applyScenarioSignalRouteSet(
  lineMap: LineMapRuntimeState,
  routeLabel: string,
  trainId: string,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeDefinition = getDefinedSignalRouteByLabel(routeLabel)

  if (!routeDefinition) {
    return current
  }

  const routePatch = createSignalRouteSetPatch(routeDefinition, { id: trainId }, 'SET')
  const routeSegments = {
    ...current.routeSegments,
    ...routePatch.routeSegments,
  }

  enforceLineMapRailStateOwnership(routeSegments, {
    prioritySegmentIds: routePatch.prioritySegmentIds,
  })

  return {
    ...current,
    routeSegments,
  }
}

function applyScenarioTrainRouteStep(
  lineMap: LineMapRuntimeState,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
  currentStepIndex: number,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeSegments = createTrainMovementRouteSegmentStates(
    current.routeSegments,
    trainId,
    routeSteps,
    currentStepIndex,
    {
      shouldPreserveSegmentState: (_segmentId, state) => isActiveRouteStateOwnedByAnotherTrain(state, trainId),
    },
  )

  enforceLineMapRailStateOwnership(routeSegments, {
    completedTrainId: trainId,
    prioritySegmentIds: routeSteps.map((step) => step.segmentId),
  })

  return {
    ...current,
    routeSegments,
  }
}

function upsertScenarioWorkflowTrain(
  trains: readonly TrainState[],
  trainId: string,
  step: TrainRouteAnimationStep,
  updates: {
    direction: TrainDirection
    isMoving: boolean
    service: string
    status: TrainState['status']
  },
) {
  const existingTrain = trains.find((train) => train.id === trainId)
  const nextTrain: TrainState = {
    ...(existingTrain ?? {
      id: trainId,
      direction: updates.direction,
      service: updates.service,
      status: updates.status,
      x: step.point.x,
      y: step.point.y,
    }),
    direction: updates.direction,
    isMoving: updates.isMoving,
    lineMapVisible: true,
    occupancySegmentId: step.segmentId,
    readinessMode: 'MAINLINE_SERVICE',
    service: updates.service,
    status: updates.status,
    timetablePlayback: existingTrain?.timetablePlayback ?? false,
    trainNumber: existingTrain?.trainNumber ?? trainId,
    x: step.point.x,
    y: step.point.y,
  }

  if (!existingTrain) {
    return [...trains, nextTrain]
  }

  return trains.map((train) => (train.id === trainId ? nextTrain : train))
}

function isActiveRouteStateOwnedByAnotherTrain(
  state: LineMapRouteSegmentState | undefined,
  trainId: string,
) {
  return Boolean(
    state?.trainId
    && state.trainId !== trainId
    && (state.status === 'DISPATCHED' || state.status === 'HELD'),
  )
}

export function applyTrainingScenarioTimetableStep(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
): OccSessionState {
  if (!isActiveTrainLaunchPlan(current, plan)) {
    return current
  }

  const step = plan.steps[stepIndex]

  if (!step) {
    return current
  }

  const routeTaskState = updateLaunchScenarioTask(
    current,
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

  return appendTrainingScenarioEvidence(
    current,
    'Timetable Playback',
    'Train launch outcome',
    `Train ${plan.trainId} completed launch timetable service toward ${plan.to}.`,
  )
}

function isTrainingScenarioTaskComplete(
  session: OccSessionState,
  task: TrainingScenarioTaskDefinition,
) {
  if (task.mappedTaskId && session.scenarioTasks[task.mappedTaskId]) {
    return true
  }

  return (task.evidenceKeywords ?? []).some((keyword) => hasScenarioEvidenceKeyword(
    keyword,
    session.eventRows,
    session.evidenceLog,
    session.alarmSummaryRows,
  ))
}

function isActiveTrainLaunchPlan(current: OccSessionState, plan: TimetablePlaybackPlan) {
  const definition = getTrainingScenarioDefinition(current.activeScenario.id)

  return current.scenarioMode === 'RUNNING'
    && definition.kind === 'TRAIN_LAUNCH'
    && plan.trainId === definition.defaultTargetTrainId
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

function appendTrainingScenarioEvidence(
  current: OccSessionState,
  source: string,
  action: string,
  detail: string,
) {
  const alreadyLogged = current.evidenceLog.some((evidence) => (
    evidence.source === source
    && evidence.action === action
    && evidence.detail === detail
  ))

  if (alreadyLogged) {
    return current
  }

  return {
    ...current,
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(source, action, 'accepted', detail),
    ),
  }
}

function hasScenarioEvidenceKeyword(
  keyword: string,
  eventRows: readonly MonitorAlarmRow[],
  evidenceLog: readonly ScenarioEvidence[],
  alarmSummaryRows: readonly AlarmSummaryRow[],
) {
  const normalizedKeyword = keyword.toLowerCase()
  const haystack = [
    ...eventRows.map((row) => `${row.message} ${row.value}`),
    ...evidenceLog.map((row) => `${row.action} ${row.detail}`),
    ...alarmSummaryRows.map((row) => `${row.description} ${row.value}`),
  ].join('\n').toLowerCase()

  return haystack.includes(normalizedKeyword)
}

function getRejectedActionCount(
  eventRows: readonly MonitorAlarmRow[],
  evidenceLog: readonly ScenarioEvidence[],
) {
  return eventRows.filter((event) => event.message.toLowerCase().includes('rejected')).length
    + evidenceLog.filter((event) => event.result === 'rejected').length
}
