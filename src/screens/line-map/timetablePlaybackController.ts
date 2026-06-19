import type { OccSessionState, RouteControlMode } from '../../types'
import {
  createMonitorEvent,
  createSummaryEvent,
  upsertTimetableRow,
} from '../../scenarioWorkflow'
import { clearInactiveTimetablePlaybackTrains } from '../../sessionState'
import { isPanelTimetableAutomatic } from './lineMapRouteState'
import { applyTimetablePlaybackStepState } from './trainMovementState'
import {
  createTimetablePlaybackPlans,
} from './timetablePlayback'
import type { TimetablePlaybackPlan } from './timetablePlayback'

export type TimetablePlaybackScheduler = (callback: () => void, delayMs: number) => number
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
  return createTimetablePlaybackPlans(session.timetableRows, now)
    .filter((plan) => isPanelTimetableAutomatic(plan.panelCode, routeControlModes))
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
  const timeoutIds: number[] = []

  updateSession((current) => applyTimetablePlaybackRunStart(current, playbackPlans))

  playbackPlans.forEach((plan) => {
    plan.steps.forEach((_, stepIndex) => {
      if (stepIndex < plan.firstStepIndex) {
        return
      }

      timeoutIds.push(scheduleTimeout(() => {
        updateSession((current) => applyTimetablePlaybackStepSession(current, plan, stepIndex))
      }, plan.stepOffsetsMs[stepIndex] ?? 0))
    })
  })

  return timeoutIds
}
