import { appendScenarioEvidence, createScenarioEvidence } from './scenario'
import {
  completeScenarioTask,
  createMonitorEvent,
  createSummaryEvent,
  updateScenarioTask,
} from './scenarioWorkflow'
import { initialScenarioTasks, updateSessionLifecycle } from './sessionState'
import type { TimetablePlaybackPlan } from './screens/line-map/timetablePlayback'
import type {
  AlarmSummaryRow,
  MonitorAlarmRow,
  OccSessionState,
  ScenarioEvidence,
  ScenarioTaskId,
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
