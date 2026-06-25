import type { RouteControlMode, TimetableRow, TrainState } from '../../types'
import type { TimetableRouteLocation } from './lineMapRoutePaths'
import { createTimetableMovementAuthoritiesForRows } from './timetableMovementAuthority'

export type TimetableRouteDiagnosticStatus = 'scheduled' | 'blocked-conflict' | 'blocked-manual'

export type TimetableRouteDiagnosticEntry = {
  endSeconds: number
  firstRail: string
  from: TimetableRouteLocation
  lastRail: string
  panelCode: string
  routeId: string
  routeLabel: string
  routeMode: RouteControlMode
  routePath: string
  scheduleNumber: string
  service: string
  signalRouteRefs: readonly string[]
  startSeconds: number
  status: TimetableRouteDiagnosticStatus
  to: TimetableRouteLocation
  trainId: string
  via?: readonly TimetableRouteLocation[]
}

export type TimetableRouteDiagnosticsSummary = {
  active: number
  blockedConflict: number
  blockedManual: number
  scheduled: number
  text: string
}

export function createTimetableRouteDiagnostics({
  now,
  routeControlModes,
  rows,
  trains,
}: {
  now: Date
  routeControlModes: Record<string, RouteControlMode>
  rows: readonly TimetableRow[]
  trains?: readonly TrainState[]
}): TimetableRouteDiagnosticEntry[] {
  void trains

  return createTimetableMovementAuthoritiesForRows(rows, routeControlModes, now).map((authority) => ({
    endSeconds: authority.endSeconds,
    firstRail: authority.firstRail,
    from: authority.from,
    lastRail: authority.lastRail,
    panelCode: authority.panelCode,
    routeId: authority.stationRouteId,
    routeLabel: authority.routeLabel,
    routeMode: authority.routeMode,
    routePath: formatTimetableRoutePath(authority.from, authority.to, authority.via),
    scheduleNumber: authority.scheduleNumber,
    service: authority.service,
    signalRouteRefs: authority.signalRouteRefs,
    startSeconds: authority.startSeconds,
    status: authority.allowed
      ? 'scheduled'
      : authority.blockedReason?.includes('occupied by Train') ? 'blocked-conflict' : 'blocked-manual',
    to: authority.to,
    trainId: authority.trainId,
    via: authority.via,
  }))
}

export function createTimetableRouteDiagnosticsSummary(
  entries: readonly TimetableRouteDiagnosticEntry[],
): TimetableRouteDiagnosticsSummary {
  const blockedManual = entries.filter((entry) => entry.status === 'blocked-manual').length
  const blockedConflict = entries.filter((entry) => entry.status === 'blocked-conflict').length
  const scheduled = entries.length - blockedManual - blockedConflict

  return {
    active: entries.length,
    blockedConflict,
    blockedManual,
    scheduled,
    text: `ROUTES ${scheduled}/${entries.length} AUTO${blockedManual ? ` / ${blockedManual} MANUAL BLOCKED` : ''}${blockedConflict ? ` / ${blockedConflict} OCCUPIED BLOCKED` : ''}`,
  }
}

export function createTimetableRouteDiagnosticsReport(
  entries: readonly TimetableRouteDiagnosticEntry[],
) {
  if (entries.length === 0) {
    return 'No active timetable route decisions.'
  }

  return entries.map((entry) => (
    [
      `Train ${entry.trainId}`,
      `Sched ${entry.scheduleNumber}`,
      entry.service,
      entry.routePath,
      entry.routeId,
      entry.routeMode,
      entry.status,
      `${entry.firstRail} -> ${entry.lastRail}`,
    ].join(' | ')
  )).join('\n')
}

function formatTimetableRoutePath(
  from: TimetableRouteLocation,
  to: TimetableRouteLocation,
  via: readonly TimetableRouteLocation[] | undefined,
) {
  return via?.length
    ? `${from} via ${via.join(' via ')} -> ${to}`
    : `${from} -> ${to}`
}
