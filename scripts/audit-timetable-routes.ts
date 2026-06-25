import { NEL_TIMETABLE_NAME, createNelTimetableRows } from '../src/data/nelTimetable'
import {
  TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS,
} from '../src/screens/line-map/lineMapRoutePaths'
import {
  resolveTimetableRailPath,
} from '../src/screens/line-map/timetablePathResolver'
import type { TimetableRailPathResolution } from '../src/screens/line-map/timetablePathResolver'
import type { TimetableRow } from '../src/types'

type TimetableRouteCoverage = {
  firstRow: TimetableRow
  path: TimetableRailPathResolution
  rowCount: number
}

export type TimetableRouteAudit = {
  coverages: readonly TimetableRouteCoverage[]
  resolvedRows: readonly { path: TimetableRailPathResolution; row: TimetableRow }[]
  rows: readonly TimetableRow[]
  unresolvedRows: readonly TimetableRow[]
  unusedRoutePaths: readonly (typeof TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS)[number][]
}

export function createTimetableRouteAudit(): TimetableRouteAudit {
  const rows = createNelTimetableRows()
  const resolvedRows: Array<{ path: TimetableRailPathResolution; row: TimetableRow }> = []
  const unresolvedRows: TimetableRow[] = []

  rows.forEach((row) => {
    const path = resolveTimetableRailPath(row)

    if (!path) {
      unresolvedRows.push(row)
      return
    }

    resolvedRows.push({ path, row })
  })

  const coverages = getRouteCoverages(resolvedRows)
  const usedRoutePathIds = new Set(coverages.map((coverage) => coverage.path.id))
  const unusedRoutePaths = TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS
    .filter((routePath) => !usedRoutePathIds.has(routePath.id))

  return {
    coverages,
    resolvedRows,
    rows,
    unresolvedRows,
    unusedRoutePaths,
  }
}

export function createTimetableRouteAuditReport() {
  const {
    coverages,
    resolvedRows,
    rows,
    unresolvedRows,
    unusedRoutePaths,
  } = createTimetableRouteAudit()

  return [
    'Traffic Timetable Route Audit',
    `Timetable: ${NEL_TIMETABLE_NAME}`,
    `Rows: ${rows.length}`,
    `Rows with station route: ${resolvedRows.length}`,
    `Rows without station route: ${unresolvedRows.length}`,
    '',
    'Station route coverage:',
    ...coverages.map(formatCoverage),
    '',
    `Unused station route definitions: ${unusedRoutePaths.length}`,
    ...unusedRoutePaths.map((routePath) => `  ${formatStationRoute(routePath)} | ${routePath.id}`),
    ...(unresolvedRows.length > 0
      ? [
          '',
          'Unresolved timetable rows:',
          ...unresolvedRows.slice(0, 20).map(formatUnresolvedRow),
        ]
      : []),
  ].join('\n').trimEnd()
}

function getRouteCoverages(
  resolvedRows: readonly { path: TimetableRailPathResolution; row: TimetableRow }[],
) {
  const coveragesByRouteId = new Map<string, TimetableRouteCoverage>()

  resolvedRows.forEach(({ path, row }) => {
    const existing = coveragesByRouteId.get(path.id)

    if (existing) {
      existing.rowCount += 1
      return
    }

    coveragesByRouteId.set(path.id, {
      firstRow: row,
      path,
      rowCount: 1,
    })
  })

  return Array.from(coveragesByRouteId.values())
    .sort((left, right) => formatResolvedStationRoute(left.path).localeCompare(formatResolvedStationRoute(right.path)))
}

function formatCoverage(coverage: TimetableRouteCoverage) {
  const firstRail = coverage.path.steps[0]?.segmentId ?? 'none'
  const lastRail = coverage.path.steps[coverage.path.steps.length - 1]?.segmentId ?? 'none'

  return [
    `  ${formatResolvedStationRoute(coverage.path)}`,
    `rows: ${coverage.rowCount}`,
    `route: ${coverage.path.id}`,
    `sample: Train ${coverage.firstRow.train} Schedule ${coverage.firstRow.sched}`,
    coverage.path.signalRouteRefs.length > 0 ? `optional signal refs: ${coverage.path.signalRouteRefs.join(', ')}` : undefined,
    `station rails: ${firstRail} -> ${lastRail}`,
  ].filter((part): part is string => typeof part === 'string').join(' | ')
}

function formatResolvedStationRoute(path: TimetableRailPathResolution) {
  const via = path.via?.length ? ` via ${path.via.join(', ')}` : ''

  return `${path.from}${via} -> ${path.to}`
}

function formatStationRoute(routePath: (typeof TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS)[number]) {
  const via = routePath.via?.length ? ` via ${routePath.via.join(', ')}` : ''

  return `${routePath.from}${via} -> ${routePath.to}`
}

function formatUnresolvedRow(row: TimetableRow) {
  return `  Train ${row.train} Schedule ${row.sched} ${row.run} ${row.originPoint} -> ${row.stationPoint} -> ${row.destinationPoint}`
}
