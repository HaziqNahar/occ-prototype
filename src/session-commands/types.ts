import type { CommsRequest } from '../comms/commsCatalog'
import type { InspectorPage, TrainAuxiliaryView } from '../components/train-control/trainControlTypes'
import type { TrainDoorCommand } from '../components/train-control/trainCommandState'
import type { NelTimetableName } from '../data/nelTimetable'
import type { TimetablePlaybackPlan } from '../screens/line-map/timetablePlayback'
import type { FaultLocation } from '../training-scenarios/faultLocation'
import type { TrainingScenarioKind } from '../training-scenarios/types'
import type { TrainingAid } from '../trainingAids'
import type {
  LineMapPlatformDoorState,
  LineMapRouteSegmentState,
  OccSessionState,
  ScenarioNoticeTone,
  TimetableClockState,
  TimetableViewDirection,
  TrainCommand,
  TrainDirection,
  TrainingMode,
  TrainState,
} from '../types'

// Every change to a training session is one of these commands. Browsers send
// them to the server, which validates, applies, scores and logs them; it is the
// only writer of the session. See docs/production-plan.md, phase 2.

export type SessionActorRole = 'trainer' | 'trainee'

// Who sent a command: the signed-in account, set by the server (a page only
// uses it to show its own command before the server answers).
export type SessionActor = {
  id?: string
  name: string
  role: SessionActorRole
}

export type ItamaStep = 'authorised-preparation' | 'authorised' | 'not-authorised-preparation' | 'not-authorised'

export type TrainSelectionView = 'menu' | 'inspector' | 'itama' | 'timetable'

export type TimetableTripAction =
  | 'Service cancellation'
  | 'Service restoration'
  | 'Shift trips'
  | 'Trip interruption'
  | 'Trip modification'
  | 'Creation of additional trips'

// Train simulation output from the session's clock-owner Line Map window
// (sessionMeta.simulationOwner); the server refuses it from any other window. It may move trains and routes, never tasks, evidence or score.
export type SimTrainPatch = Pick<TrainState, 'id'> & Partial<Pick<
  TrainState,
  | 'direction'
  | 'isMoving'
  | 'lineMapVisible'
  | 'occupancySegmentId'
  | 'scheduleNumber'
  | 'service'
  | 'status'
  | 'timetablePlayback'
  | 'trainNumber'
  | 'x'
  | 'y'
>> & {
  // Fields the simulation cleared (set to undefined).
  cleared?: Array<'occupancySegmentId'>
}

export type SimKeyedPatch<T> = {
  remove?: string[]
  set?: Record<string, T>
}

export type SimPatch = {
  platformDoorStates?: SimKeyedPatch<LineMapPlatformDoorState>
  routeSegments?: SimKeyedPatch<LineMapRouteSegmentState>
  timetableClock?: TimetableClockState
  timetableRows?: Array<{ index: number; state: string; train: string }>
  trains?: SimTrainPatch[]
}

// Scenario progress that happens while the timetable runs a launched train.
// The server checks the train really is where the event says before scoring it.
export type SimScenarioEvent =
  | { plan: TimetablePlaybackPlan; stepIndex: number; type: 'TIMETABLE_STEP' }
  | { plan: TimetablePlaybackPlan; type: 'TIMETABLE_COMPLETE' }

export type SessionCommand =
  // Trainer console
  | {
      duration: string
      faultLocation?: FaultLocation
      incident: string
      kind: TrainingScenarioKind
      timetableName: NelTimetableName
      trainingMode: TrainingMode
      type: 'LOAD_SCENARIO'
    }
  | { trainId: string; type: 'ASSIGN_LAUNCH_TRAIN' }
  | { state: 'PAUSE' | 'RESUME' | 'COMPLETE'; type: 'SET_SCENARIO_STATE' }
  | { label: string; taskId: string; type: 'CONFIRM_TASK' }
  | { type: 'RESET_SCENARIO' }
  | { timetableName: NelTimetableName; trainingMode: TrainingMode; type: 'RESET_SESSION' }
  | { enabled: boolean; type: 'SET_TRAINING_AIDS' }
  // Trainee page
  | { code: string; type: 'TRAINEE_JOIN' }
  | { traineeId: string; type: 'TRAINEE_LEAVE' }
  // Trainer console: put a signed-in trainee into this exercise.
  | { name: string; traineeId: string; type: 'ASSIGN_TRAINEE' }
  // Monitor 01 Alarms
  | { keepRedTone?: boolean; rowKeys: string[]; type: 'ACK_ALARMS' }
  // Monitor 02 Line Map
  | { page?: InspectorPage; trainId: string; type: 'SELECT_TRAIN'; view: TrainSelectionView }
  | { trainId: string; type: 'OPEN_TRAIN_VIEW'; view: TrainAuxiliaryView }
  | { step: ItamaStep; trainId: string; type: 'ITAMA_CONFIRM' }
  | { trainId: string; type: 'ITAMA_ACK' }
  | { command: string; trainId: string; type: 'TRAIN_READINESS' }
  | { command: TrainDoorCommand; trainId: string; type: 'TRAIN_DOOR_COMMAND' }
  | { detail: string; trainId: string; type: 'TRAIN_HOLD' }
  | { command: TrainCommand; trainId: string; type: 'SCADA_TRAIN_COMMAND' }
  | { routeLabel: string; set: boolean; signalLabel: string; type: 'SIGNAL_ROUTE' }
  | {
      direction: TrainDirection
      // Set from the departure dialog: only scored while the destination task is open.
      fromDeparture?: boolean
      platformSiding: string
      station: string
      trainId: string
      type: 'ARRIVAL_DESTINATION'
    }
  | { routeLabel: string; trainId: string; type: 'TRAIN_DEPARTURE' }
  | { depotLeg: boolean; launchHandoff: boolean; routeLabel: string; trainId: string; type: 'MANUAL_ROUTE_COMPLETED' }
  | { text: string; tone: ScenarioNoticeTone; type: 'SHOW_NOTICE' }
  // Monitor 03 Timetable
  | { direction?: TimetableViewDirection; station?: string; type: 'SET_TIMETABLE_VIEW' }
  | { action: TimetableTripAction; sched: string; trainId: string; type: 'TIMETABLE_TRIP_ACTION' }
  // Practice coach: the trainee used Show me or Locate (counted, not scored)
  | { aid: TrainingAid; type: 'USE_TRAINING_AID' }
  // Calls panel (Monitor 01 and 02)
  | { request: CommsRequest; type: 'LOG_CALL' }
  // Line map train simulation
  | { events?: SimScenarioEvent[]; patch: SimPatch; type: 'SIM_UPDATE' }

export type SessionCommandType = SessionCommand['type']

export type SessionCommandResult = {
  accepted: boolean
  reason?: string
  session: OccSessionState
}

export type SessionCommandContext = {
  actor: SessionActor
}

// Display row identity for an alarm summary row. Rows are only ever prepended,
// so indexes shift between windows; this key does not.
export function getAlarmRowKey(row: { asset: string; description: string; timestamp: string }) {
  return `${row.timestamp}|${row.asset}|${row.description}`
}
