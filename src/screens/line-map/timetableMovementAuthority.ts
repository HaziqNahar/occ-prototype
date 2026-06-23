import type { OccSessionState, RouteControlMode, TimetableRow } from '../../types'
import type { TimetableRouteLocation } from './lineMapRoutePaths'
import { isPanelTimetableAutomatic } from './lineMapRouteState'
import {
  createTimetablePlaybackPlans,
} from './timetablePlayback'
import type { TimetablePlaybackPlan } from './timetablePlayback'

export type TimetableMovementAuthority = {
  allowed: boolean
  blockedReason?: string
  currentRail: string
  currentStepIndex: number
  endSeconds: number
  firstRail: string
  from: TimetableRouteLocation
  lastRail: string
  nextRail: string
  nextStepIndex?: number
  panelCode: string
  plan: TimetablePlaybackPlan
  routeLabel: string
  routeLabels: readonly string[]
  routeMode: RouteControlMode
  scheduleNumber: string
  service: string
  startSeconds: number
  stationRouteId: string
  to: TimetableRouteLocation
  trainId: string
  via?: readonly TimetableRouteLocation[]
}

export function createTimetableMovementAuthorities(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
): TimetableMovementAuthority[] {
  return createTimetableMovementAuthoritiesForRows(session.timetableRows, routeControlModes, now)
}

export function createTimetableMovementAuthoritiesForRows(
  rows: readonly TimetableRow[],
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
): TimetableMovementAuthority[] {
  return createTimetablePlaybackPlans(rows, now)
    .map((plan) => createTimetableMovementAuthority(plan, routeControlModes))
}

export function createAllowedTimetablePlaybackPlans(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
) {
  return createTimetableMovementAuthorities(session, routeControlModes, now)
    .filter((authority) => authority.allowed)
    .map((authority) => authority.plan)
}

function createTimetableMovementAuthority(
  plan: TimetablePlaybackPlan,
  routeControlModes: Record<string, RouteControlMode>,
): TimetableMovementAuthority {
  const routeMode = routeControlModes[plan.panelCode] ?? 'OCCA'
  const allowed = isPanelTimetableAutomatic(plan.panelCode, routeControlModes)
  const currentStepIndex = plan.firstStepIndex
  const nextStepIndex = plan.steps[currentStepIndex + 1] ? currentStepIndex + 1 : undefined

  return {
    allowed,
    blockedReason: allowed ? undefined : `${plan.panelCode} route mode is OCCM/manual`,
    currentRail: plan.steps[currentStepIndex]?.segmentId ?? '',
    currentStepIndex,
    endSeconds: plan.endSeconds,
    firstRail: plan.steps[0]?.segmentId ?? '',
    from: plan.from,
    lastRail: plan.steps.at(-1)?.segmentId ?? '',
    nextRail: nextStepIndex === undefined ? '' : plan.steps[nextStepIndex]?.segmentId ?? '',
    nextStepIndex,
    panelCode: plan.panelCode,
    plan,
    routeLabel: plan.routeLabel,
    routeLabels: plan.routeLabels,
    routeMode,
    scheduleNumber: plan.scheduleNumber,
    service: plan.service,
    startSeconds: plan.startSeconds,
    stationRouteId: plan.stationRouteId,
    to: plan.to,
    trainId: plan.trainId,
    via: plan.via,
  }
}
