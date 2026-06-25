import type { TrainRouteAnimationStep } from './trainMovementRoutes'
import {
  TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS,
} from './lineMapRoutePaths'
import type {
  TimetableLineMapRoutePathDefinition,
  TimetablePlatformStopDefinition,
  TimetableRouteLocation,
  TimetableRoutePathMatcher,
} from './lineMapRoutePaths'

export type TimetableRailPathRow = {
  destinationPoint: string
  originPoint: string
  run: string
  selectedStation?: string
  stationPoint: string
}

export type TimetableRailPathResolution = {
  from: TimetableRouteLocation
  id: string
  panelCode: string
  platformStops: readonly TimetablePlatformStopDefinition[]
  routeLabel: string
  signalRouteRefs: readonly string[]
  steps: readonly TrainRouteAnimationStep[]
  to: TimetableRouteLocation
  via?: readonly TimetableRouteLocation[]
}

type NormalizedTimetableLocation = TimetableRouteLocation

const MAINLINE_STATION_CODES: readonly TimetableRouteLocation[] = [
  'HBF',
  'OTP',
  'CNT',
  'CQY',
  'DBG',
  'LTI',
  'FRP',
  'BNK',
  'PTP',
  'WLH',
  'SER',
  'KVN',
  'HGN',
  'BGK',
  'SKG',
  'PGL',
  'PGC',
] as const

const normalizedMainlineStationCodes = new Set<TimetableRouteLocation>(MAINLINE_STATION_CODES)

function normalizeTimetableLocation(point: string): NormalizedTimetableLocation | undefined {
  const compactPoint = point.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase()

  if (!compactPoint) {
    return undefined
  }

  if (compactPoint.startsWith('RT1D')) {
    return 'RT1_DEPOT'
  }

  if (compactPoint.startsWith('RT2D')) {
    return 'RT2_DEPOT'
  }

  if (compactPoint.startsWith('RT3D')) {
    return 'RT3_DEPOT'
  }

  const stationCode = compactPoint.slice(0, 3) as NormalizedTimetableLocation

  return normalizedMainlineStationCodes.has(stationCode) ? stationCode : undefined
}

export function resolveTimetableRailPath(row: TimetableRailPathRow): TimetableRailPathResolution | undefined {
  const origin = normalizeTimetableLocation(row.originPoint)
  const selectedStation = normalizeTimetableLocation(row.selectedStation ?? row.stationPoint)
  const station = normalizeTimetableLocation(row.stationPoint) ?? selectedStation
  const destination = normalizeTimetableLocation(row.destinationPoint)
  const routePath = TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS.find((candidate) => (
    matchesTimetableRoutePath(candidate, {
      destination,
      origin,
      run: row.run,
      station,
    })
  ))

  if (routePath) {
    return {
      from: routePath.from,
      id: routePath.id,
      panelCode: routePath.panelCode,
      platformStops: routePath.platformStops ?? [],
      routeLabel: routePath.routeLabel,
      signalRouteRefs: routePath.signalRouteRefs ?? [],
      steps: routePath.steps,
      to: routePath.to,
      via: routePath.via,
    }
  }

  return undefined
}

function matchesTimetableRoutePath(
  routePath: TimetableLineMapRoutePathDefinition,
  context: {
    destination: NormalizedTimetableLocation | undefined
    origin: NormalizedTimetableLocation | undefined
    run: string
    station: NormalizedTimetableLocation | undefined
  },
) {
  return matchesTimetableRoutePathMatcher(routePath.match, context)
}

function matchesTimetableRoutePathMatcher(
  matcher: TimetableRoutePathMatcher,
  context: {
    destination: NormalizedTimetableLocation | undefined
    origin: NormalizedTimetableLocation | undefined
    run: string
    station: NormalizedTimetableLocation | undefined
  },
): boolean {
  if (matcher.run && matcher.run !== context.run) {
    return false
  }

  if (matcher.originAny && (!context.origin || !matcher.originAny.includes(context.origin))) {
    return false
  }

  if (matcher.stationAny && (!context.station || !matcher.stationAny.includes(context.station))) {
    return false
  }

  if (matcher.destinationAny && (!context.destination || !matcher.destinationAny.includes(context.destination))) {
    return false
  }

  if (matcher.anyOf && !matcher.anyOf.some((candidate) => matchesTimetableRoutePathMatcher(candidate, context))) {
    return false
  }

  return true
}
