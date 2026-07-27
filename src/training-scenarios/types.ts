import type {
  AlarmSummaryRow,
  MonitorAlarmRow,
  OccSessionState,
  ScenarioTaskId,
} from '../types'

export type TrainingScenarioKind = 'TRAIN_LAUNCH' | 'TRAIN_WITHDRAWAL' | 'DOOR_FAULT'

export type TrainingScenarioTaskDefinition = {
  critical?: boolean
  evidenceKeywords?: readonly string[]
  id: string
  label: string
  mappedTaskId?: ScenarioTaskId
  monitor: string
  runtimeOnly?: boolean
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
  rejectedActions: number
  result: 'IN PROGRESS' | 'NEEDS REVIEW' | 'PASS'
  score: number
  taskResults: Array<TrainingScenarioTaskDefinition & { complete: boolean }>
  totalTasks: number
}

export type TrainingScenarioLaunchTargetOption = {
  destinationPoint: string
  scheduleNumber: string
  trainId: string
}

export type TrainingScenarioWorkflowAction =
  | 'PREPARE_LAUNCH_ROUTE'
  | 'DISPATCH_LAUNCH'
  | 'VERIFY_LAUNCH_MAINLINE'
  | 'DECLARE_WITHDRAWAL_DESTINATION'
  | 'TRIGGER_WITHDRAWAL_MOVEMENT'
  | 'VERIFY_WITHDRAWAL_ENDPOINT'
  | 'INJECT_DOOR_FAULT'
  | 'ACKNOWLEDGE_DOOR_FAULT'
  | 'APPLY_DOOR_FAULT_PROCEDURE'
  | 'AUTHORISE_DOOR_FAULT_RECOVERY'
  | 'COMPLETE_DOOR_FAULT_REVIEW'

export type TrainingScenarioRuntimeEvent =
  | { source: string; trainId: string; type: 'TRAIN_SELECTED' }
  | { routeLabel: string; source: string; trainId: string; type: 'ROUTE_SET' }
  | { platformSiding: string; source: string; station: string; trainId: string; type: 'ARRIVAL_DESTINATION_SET' }
  | { routeLabel?: string; source: string; trainId: string; type: 'DEPARTURE_TIME_CONFIRMED' }
  | { routeLabel: string; source: string; trainId: string; type: 'DEPOT_ENDPOINT_REACHED' }
  | { source: string; trainId: string; type: 'ALARM_ACKNOWLEDGED' }
  | { commandLabel: string; source: string; summaryStatus: string; trainId: string; type: 'DOOR_COMMAND_CONFIRMED' }
  | { source: string; type: 'SCENARIO_REVIEWED' }

export type TrainingScenarioRuntimeEventResult = {
  allowed: boolean
  completedTaskIds: string[]
  next: OccSessionState
}

export type TrainingScenarioWorkflowDefinition = {
  kind: TrainingScenarioKind
  lineMapAction?: TrainingScenarioWorkflowAction
  message: string
  scenarioTaskIds?: readonly ScenarioTaskId[]
  summaryTone?: AlarmSummaryRow['tone']
  taskIds: readonly string[]
  tone?: MonitorAlarmRow['tone']
  value: string
}
