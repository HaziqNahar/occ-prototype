import type { OccSessionState, RouteControlMode, TimetableRow } from '../../types'
import {
  createMonitorEvent,
  createSummaryEvent,
  upsertTimetableRow,
} from '../../scenarioWorkflow'
import { clearInactiveTimetablePlaybackTrains } from '../../sessionState'
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

export function getActiveTimetableMovementAuthorityTrainIds(authorities: readonly TimetableMovementAuthority[]) {
  return new Set(authorities.map((authority) => authority.trainId))
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

  return {
    ...cleaned,
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

export function applyTimetablePlaybackStepSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
): OccSessionState {
  const step = plan.steps[stepIndex]

  if (!step) {
    return current
  }

  const platformStop = getTimetablePlatformStopForStep(plan, stepIndex)
  const lastStepIndex = plan.steps.length - 1
  const eventRow = stepIndex === plan.firstStepIndex
    ? createMonitorEvent(
        plan.trainId,
        `Train ${plan.trainId}: Timetable ${plan.scheduleNumber} auto route ${plan.routeLabel}`,
        'RUN',
        'yellow',
      )
    : null

  const next = applyTimetablePlaybackStepState(current, plan, step, stepIndex, lastStepIndex, Boolean(platformStop))

  return {
    ...next,
    ...(eventRow
      ? {
          alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
          eventRows: [eventRow, ...current.eventRows].slice(0, 4),
          scenarioNotice: {
            text: `Timetable playback started for Train ${plan.trainId}, schedule ${plan.scheduleNumber}.`,
            tone: 'info',
          },
        }
      : {}),
    timetableRows: upsertTimetableRow(current.timetableRows, plan.trainId, '>'),
  }
}

export function applyTimetablePlatformDoorPhaseSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
  phase: TimetablePlatformDoorPhase,
): OccSessionState {
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
  return {
    ...completeTimetablePlaybackStepState(current, plan),
    timetableRows: upsertTimetableRow(current.timetableRows, plan.trainId, '>'),
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
