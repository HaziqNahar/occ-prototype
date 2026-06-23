import type { RouteControlMode, TimetableRow } from '../../types'
import type { TimetableRouteLocation } from './lineMapRoutePaths'
import { createTimetableMovementAuthoritiesForRows } from './timetableMovementAuthority'

export type TimetableRouteDiagnosticStatus = 'scheduled' | 'blocked-manual'

export type TimetableRouteDiagnosticEntry = {
  endSeconds: number
  firstRail: string
  from: TimetableRouteLocation
  lastRail: string
  panelCode: string
  routeId: string
  routeLabel: string
  routeLabels: readonly string[]
  routeMode: RouteControlMode
  routePath: string
  scheduleNumber: string
  service: string
  startSeconds: number
  status: TimetableRouteDiagnosticStatus
  to: TimetableRouteLocation
  trainId: string
  via?: readonly TimetableRouteLocation[]
}

export type TimetableRouteDiagnosticsSummary = {
  active: number
  blockedManual: number
  scheduled: number
  text: string
}

export function createTimetableRouteDiagnostics({
  now,
  routeControlModes,
  rows,
}: {
  now: Date
  routeControlModes: Record<string, RouteControlMode>
  rows: readonly TimetableRow[]
}): TimetableRouteDiagnosticEntry[] {
  return createTimetableMovementAuthoritiesForRows(rows, routeControlModes, now).map((authority) => ({
    endSeconds: authority.endSeconds,
    firstRail: authority.firstRail,
    from: authority.from,
    lastRail: authority.lastRail,
    panelCode: authority.panelCode,
    routeId: authority.stationRouteId,
    routeLabel: authority.routeLabel,
    routeLabels: authority.routeLabels,
    routeMode: authority.routeMode,
    routePath: formatTimetableRoutePath(authority.from, authority.to, authority.via),
    scheduleNumber: authority.scheduleNumber,
    service: authority.service,
    startSeconds: authority.startSeconds,
    status: authority.allowed ? 'scheduled' : 'blocked-manual',
    to: authority.to,
    trainId: authority.trainId,
    via: authority.via,
  }))
}

export function createTimetableRouteDiagnosticsSummary(
  entries: readonly TimetableRouteDiagnosticEntry[],
): TimetableRouteDiagnosticsSummary {
  const blockedManual = entries.filter((entry) => entry.status === 'blocked-manual').length
  const scheduled = entries.length - blockedManual

  return {
    active: entries.length,
    blockedManual,
    scheduled,
    text: `ROUTES ${scheduled}/${entries.length} AUTO${blockedManual ? ` / ${blockedManual} MANUAL BLOCKED` : ''}`,
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
