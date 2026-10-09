import type { OccSessionState, RouteControlMode, TimetableRow } from '../../types'
import { upsertTimetableRow } from '../../scenarioWorkflow'
import { clearInactiveTimetablePlaybackTrains } from '../../sessionState'
import {
  applyTrainingScenarioTimetableCompletion,
  applyTrainingScenarioTimetableStep,
} from '../../trainingScenarios'
import {
  applyTimetablePlaybackStepState,
  completeTimetablePlaybackStepState,
} from './trainMovementState'
import type { TimetablePlaybackPlan } from './timetablePlayback'
import {
  createAllowedTimetablePlaybackPlans,
  createTimetableMovementAuthorities,
} from './timetableMovementAuthority'
import type { TimetableMovementAuthority } from './timetableMovementAuthority'
import {
  getTrainReadinessMode,
  isTrainItamaGranted,
} from './model'
import {
  createTimetablePlaybackSchedule,
  scheduleTimetablePlaybackEntries,
} from './timetablePlaybackScheduler'
import type {
  TimetablePlaybackScheduleEntry,
  TimetablePlaybackScheduler,
} from './timetablePlaybackScheduler'
import {
  setLineMapPlatformDoorState,
} from './platformDoorState'
import type { TimetablePlatformDoorPhase } from './platformDoorState'
import { getTimetablePlatformStopForStep } from './timetablePlatformStops'

export type TimetablePlaybackSessionUpdater = (
  updater: (current: OccSessionState) => OccSessionState
) => void

export function createTimetablePlaybackRouteModeKey(routeControlModes: Record<string, RouteControlMode>) {
  return Object.entries(routeControlModes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([panelCode, mode]) => `${panelCode}:${mode}`)
    .join('|')
}

export function createTimetablePlaybackRunKey(
  sessionCreatedAt: string,
  routeControlModes: Record<string, RouteControlMode>,
  playbackTick: number,
  timetableViewKey = '',
) {
  const baseKey = `${createTimetablePlaybackScopeKey(sessionCreatedAt, routeControlModes)}:${playbackTick}`

  return timetableViewKey ? `${baseKey}:${timetableViewKey}` : baseKey
}

export function createTimetablePlaybackScopeKey(
  sessionCreatedAt: string,
  routeControlModes: Record<string, RouteControlMode>,
) {
  return `${sessionCreatedAt}:${createTimetablePlaybackRouteModeKey(routeControlModes)}`
}

export function createTimetablePlaybackPlanKey(plan: Pick<
  TimetablePlaybackPlan,
  'endSeconds' | 'scheduleNumber' | 'startSeconds' | 'stationRouteId' | 'trainId'
>) {
  return [
    plan.trainId,
    plan.scheduleNumber,
    plan.stationRouteId,
    plan.startSeconds,
    plan.endSeconds,
  ].join('|')
}

export function createAutomaticTimetablePlaybackPlans(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
  rows: readonly TimetableRow[] = session.timetableRows,
) {
  return createAllowedTimetablePlaybackPlans(session, routeControlModes, now, rows)
}

export function createAutomaticTimetableMovementAuthorities(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
  rows: readonly TimetableRow[] = session.timetableRows,
) {
  return createTimetableMovementAuthorities(session, routeControlModes, now, rows)
}

export function getActiveTimetablePlaybackTrainIds(plans: readonly TimetablePlaybackPlan[]) {
  return new Set(plans.map((plan) => plan.trainId))
}

export function filterTimetableRowsForAutomaticMovement(
  rows: readonly TimetableRow[],
  blockedTrainIds: ReadonlySet<string>,
) {
  if (blockedTrainIds.size === 0) {
    return rows
  }

  return rows.filter((row) => !blockedTrainIds.has(row.train))
}

export function getActiveTimetableMovementAuthorityTrainIds(authorities: readonly TimetableMovementAuthority[]) {
  return new Set(authorities.map((authority) => authority.trainId))
}

export function pruneInactiveTimetablePlaybackPlanSchedules({
  activePlanKeys,
  clearTimeout,
  planTimeouts,
  scheduledPlanKeys,
}: {
  activePlanKeys: ReadonlySet<string>
  clearTimeout: (timeoutId: number) => void
  planTimeouts: Map<string, number[]>
  scheduledPlanKeys: Set<string>
}) {
  scheduledPlanKeys.forEach((planKey) => {
    if (activePlanKeys.has(planKey)) {
      return
    }

    const timeoutIds = planTimeouts.get(planKey) ?? []

    timeoutIds.forEach(clearTimeout)
    planTimeouts.delete(planKey)
    scheduledPlanKeys.delete(planKey)
  })
}

export function applyTimetablePlaybackRunStart(
  current: OccSessionState,
  plans: readonly TimetablePlaybackPlan[],
  activeTrainIds: ReadonlySet<string> = getActiveTimetablePlaybackTrainIds(plans),
  heldTrainIds: ReadonlySet<string> = new Set(),
): OccSessionState {
  const cleaned = clearInactiveTimetablePlaybackTrains(current, activeTrainIds)

  if (heldTrainIds.size === 0) {
    return cleaned
  }

  const lineMap = clearHeldTimetableTrainRouteState(cleaned.lineMap, heldTrainIds)

  return {
    ...cleaned,
    lineMap,
    trains: cleaned.trains.map((train) => (
      heldTrainIds.has(train.id) && train.timetablePlayback
        ? {
            ...train,
            isMoving: false,
            status: 'WAIT' as const,
          }
        : train
    )),
  }
}

function clearHeldTimetableTrainRouteState(
  lineMap: OccSessionState['lineMap'],
  trainIds: ReadonlySet<string>,
): OccSessionState['lineMap'] {
  const routeSegments = { ...lineMap.routeSegments }
  let changed = false

  Object.entries(routeSegments).forEach(([segmentId, state]) => {
    if (!trainIds.has(state.trainId)) {
      return
    }

    delete routeSegments[segmentId]
    changed = true
  })

  return changed
    ? {
        ...lineMap,
        routeSegments,
      }
    : lineMap
}

export function applyTimetablePlaybackStepSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
): OccSessionState {
  const blocked = holdTimetablePlaybackTrainIfMovementBlocked(current, plan.trainId)

  if (blocked) {
    return blocked
  }

  const step = plan.steps[stepIndex]

  if (!step) {
    return current
  }

  const platformStop = getTimetablePlatformStopForStep(plan, stepIndex)
  const lastStepIndex = plan.steps.length - 1
  const next = applyTimetablePlaybackStepState(current, plan, step, stepIndex, lastStepIndex, Boolean(platformStop))
  const scenarioNext = applyTrainingScenarioTimetableStep(next, plan, stepIndex)

  // Routine timetable running is not an alarm on the OCC GWS, so it stays out of
  // the alarm list, the event strip and the IOS notice.
  return {
    ...scenarioNext,
    timetableRows: upsertTimetableRow(scenarioNext.timetableRows, plan.trainId, '>'),
  }
}

export function applyTimetablePlatformDoorPhaseSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
  phase: TimetablePlatformDoorPhase,
): OccSessionState {
  const blocked = holdTimetablePlaybackTrainIfMovementBlocked(current, plan.trainId)

  if (blocked) {
    return blocked
  }

  const platformStop = getTimetablePlatformStopForStep(plan, stepIndex)

  if (!platformStop) {
    return current
  }

  return {
    ...current,
    lineMap: setLineMapPlatformDoorState(current.lineMap, platformStop, phase, plan.trainId),
  }
}

export function applyTimetablePlaybackCompletionSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
): OccSessionState {
  const blocked = holdTimetablePlaybackTrainIfMovementBlocked(current, plan.trainId)

  if (blocked) {
    return blocked
  }

  const completed = completeTimetablePlaybackStepState(current, plan)
  const scenarioNext = applyTrainingScenarioTimetableCompletion(completed, plan)

  return {
    ...scenarioNext,
    timetableRows: upsertTimetableRow(scenarioNext.timetableRows, plan.trainId, '>'),
  }
}

export function applyTimetablePlaybackScheduleEntrySession(
  current: OccSessionState,
  entry: TimetablePlaybackScheduleEntry,
): OccSessionState {
  if (entry.completeRoute) {
    return applyTimetablePlaybackCompletionSession(current, entry.plan)
  }

  if (entry.platformDoorPhase) {
    return applyTimetablePlatformDoorPhaseSession(current, entry.plan, entry.stepIndex, entry.platformDoorPhase)
  }

  return applyTimetablePlaybackStepSession(current, entry.plan, entry.stepIndex)
}

function holdTimetablePlaybackTrainIfMovementBlocked(
  current: OccSessionState,
  trainId: string,
): OccSessionState | null {
  const train = current.trains.find((candidate) => candidate.id === trainId)

  if (!train || !isTimetableTrainMovementBlocked(train)) {
    return null
  }

  return {
    ...current,
    trains: current.trains.map((candidate) => (
      candidate.id === trainId
        ? {
            ...candidate,
            isMoving: false,
            status: 'WAIT' as const,
          }
        : candidate
    )),
  }
}

function isTimetableTrainMovementBlocked(train: OccSessionState['trains'][number]) {
  return getTrainReadinessMode(train) !== 'MAINLINE_SERVICE'
    || !isTrainItamaGranted(train)
}

export function scheduleTimetablePlaybackRun({
  now,
  routeControlModes,
  rows,
  scheduleTimeout,
  session,
  updateSession,
}: {
  now: Date
  routeControlModes: Record<string, RouteControlMode>
  rows?: readonly TimetableRow[]
  scheduleTimeout: TimetablePlaybackScheduler
  session: OccSessionState
  updateSession: TimetablePlaybackSessionUpdater
}) {
  const playbackPlans = createAutomaticTimetablePlaybackPlans(session, routeControlModes, now, rows)

  updateSession((current) => applyTimetablePlaybackRunStart(current, playbackPlans))

  return scheduleTimetablePlaybackPlans({
    plans: playbackPlans,
    scheduleTimeout,
    updateSession,
  })
}

export function scheduleTimetablePlaybackPlans({
  plans,
  scheduleTimeout,
  updateSession,
}: {
  plans: readonly TimetablePlaybackPlan[]
  scheduleTimeout: TimetablePlaybackScheduler
  updateSession: TimetablePlaybackSessionUpdater
}) {
  const playbackSchedule = createTimetablePlaybackSchedule(plans)

  return scheduleTimetablePlaybackEntries({
    runEntry: (entry) => {
      updateSession((current) => applyTimetablePlaybackScheduleEntrySession(current, entry))
    },
    schedule: playbackSchedule,
    scheduleTimeout,
  })
}
