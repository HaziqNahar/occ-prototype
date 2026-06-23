import type { OccSessionState, RouteControlMode } from '../../types'
import {
  createMonitorEvent,
  createSummaryEvent,
  upsertTimetableRow,
} from '../../scenarioWorkflow'
import { clearInactiveTimetablePlaybackTrains } from '../../sessionState'
import { applyTimetablePlaybackStepState } from './trainMovementState'
import type { TimetablePlaybackPlan } from './timetablePlayback'
import {
  createAllowedTimetablePlaybackPlans,
  createTimetableMovementAuthorities,
} from './timetableMovementAuthority'
import {
  createTimetablePlaybackSchedule,
  scheduleTimetablePlaybackEntries,
} from './timetablePlaybackScheduler'
import type { TimetablePlaybackScheduler } from './timetablePlaybackScheduler'

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
) {
  return `${sessionCreatedAt}:${createTimetablePlaybackRouteModeKey(routeControlModes)}:${playbackTick}`
}

export function createAutomaticTimetablePlaybackPlans(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
) {
  return createAllowedTimetablePlaybackPlans(session, routeControlModes, now)
}

export function createAutomaticTimetableMovementAuthorities(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
) {
  return createTimetableMovementAuthorities(session, routeControlModes, now)
}

export function getActiveTimetablePlaybackTrainIds(plans: readonly TimetablePlaybackPlan[]) {
  return new Set(plans.map((plan) => plan.trainId))
}

export function applyTimetablePlaybackRunStart(
  current: OccSessionState,
  plans: readonly TimetablePlaybackPlan[],
) {
  return clearInactiveTimetablePlaybackTrains(current, getActiveTimetablePlaybackTrainIds(plans))
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

  const lastStepIndex = plan.steps.length - 1
  const eventRow = stepIndex === plan.firstStepIndex
    ? createMonitorEvent(
        plan.trainId,
        `Train ${plan.trainId}: Timetable ${plan.scheduleNumber} auto route ${plan.routeLabel}`,
        'RUN',
        'yellow',
      )
    : null

  return {
    ...applyTimetablePlaybackStepState(current, plan, step, stepIndex, lastStepIndex),
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

export function scheduleTimetablePlaybackRun({
  now,
  routeControlModes,
  scheduleTimeout,
  session,
  updateSession,
}: {
  now: Date
  routeControlModes: Record<string, RouteControlMode>
  scheduleTimeout: TimetablePlaybackScheduler
  session: OccSessionState
  updateSession: TimetablePlaybackSessionUpdater
}) {
  const playbackPlans = createAutomaticTimetablePlaybackPlans(session, routeControlModes, now)
  const playbackSchedule = createTimetablePlaybackSchedule(playbackPlans)

  updateSession((current) => applyTimetablePlaybackRunStart(current, playbackPlans))

  return scheduleTimetablePlaybackEntries({
    runEntry: (entry) => {
      updateSession((current) => applyTimetablePlaybackStepSession(current, entry.plan, entry.stepIndex))
    },
    schedule: playbackSchedule,
    scheduleTimeout,
  })
}
