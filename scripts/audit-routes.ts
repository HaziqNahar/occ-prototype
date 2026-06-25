import {
  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS,
} from '../src/screens/line-map/model'
import {
  MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS,
  TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS,
} from '../src/screens/line-map/lineMapRoutePaths'
import {
  SIGNAL_LABELS_WITHOUT_ROUTES,
  SIGNAL_ROUTE_DEFINITIONS,
  type SignalRouteDefinition,
} from '../src/screens/line-map/routeDefinitions'
import {
  getKnownLineMapRailIds,
  validateLineMapRouteDefinitions,
} from '../src/screens/line-map/routeValidation'

export function createRouteAuditReport() {
  const knownRailIds = getKnownLineMapRailIds()
  const validationIssues = validateLineMapRouteDefinitions()
  const routeCountBySignal = new Map<string, number>()

  SIGNAL_ROUTE_DEFINITIONS.forEach((routeDefinition) => {
    routeCountBySignal.set(
      routeDefinition.signalLabel,
      (routeCountBySignal.get(routeDefinition.signalLabel) ?? 0) + 1,
    )
  })

  return [
    'Line Map Signal Route Audit',
    `Routes: ${SIGNAL_ROUTE_DEFINITIONS.length}`,
    `Signals with routes: ${routeCountBySignal.size}`,
    `Route-less signals: ${[...SIGNAL_LABELS_WITHOUT_ROUTES].sort().join(', ') || 'none'}`,
    `Validation: ${validationIssues.length === 0 ? 'OK' : `${validationIssues.length} issue(s)`}`,
    ...validationIssues.map((issue) => `  - ${issue}`),
    '',
    'Timetable station routes:',
    ...TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS.map((routePath) => (
      `  ${formatStationRoute(routePath)} | ${routePath.id} | optional signal refs: ${formatSignalRouteRefs(routePath.signalRouteRefs)} | station rails: ${routePath.steps[0]?.segmentId ?? 'none'} -> ${routePath.steps[routePath.steps.length - 1]?.segmentId ?? 'none'}`
    )),
    '',
    ...SIGNAL_ROUTE_DEFINITIONS.flatMap((routeDefinition) => [
      `${routeDefinition.signalLabel} ${routeDefinition.routeLabel}`,
      `  command marker: ${getCommandMarkerIds(routeDefinition).join(', ') || 'none'}`,
      `  rails: ${routeDefinition.realSegmentIds.join(' -> ')}`,
      `  used by: ${getRouteUsageLabels(routeDefinition).join(', ')}`,
      `  status: ${getRouteAuditStatus(routeDefinition, knownRailIds)}`,
      '',
    ]),
  ].join('\n').trimEnd()
}

function formatStationRoute(routePath: (typeof TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS)[number]) {
  const via = routePath.via?.length ? ` via ${routePath.via.join(', ')}` : ''

  return `${routePath.from}${via} -> ${routePath.to}`
}

function formatSignalRouteRefs(routeLabels: readonly string[] | undefined) {
  return routeLabels?.length ? routeLabels.join(', ') : 'none'
}

function getCommandMarkerIds(routeDefinition: SignalRouteDefinition) {
  const realSegmentIds = new Set(routeDefinition.realSegmentIds)

  return routeDefinition.commandStateSegmentIds.filter((segmentId) => !realSegmentIds.has(segmentId))
}

function getRouteUsageLabels(routeDefinition: SignalRouteDefinition) {
  const usageLabels = ['route window']
  const manualPathLabels = MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS
    .filter((routePath) => routePath.routeLabels.includes(routeDefinition.routeLabel))
    .map((routePath) => `manual:${routePath.id}`)
  const timetablePathLabels = TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS
    .filter((routePath) => routePath.signalRouteRefs?.includes(routeDefinition.routeLabel))
    .map((routePath) => `timetable:${routePath.id}`)

  usageLabels.push(...manualPathLabels, ...timetablePathLabels)

  return usageLabels
}

function getRouteAuditStatus(
  routeDefinition: SignalRouteDefinition,
  knownRailIds: ReadonlySet<string>,
) {
  const issues = [
    ...getUnknownRailIssues(routeDefinition, knownRailIds),
    ...getExclusiveRailConflictIssues(routeDefinition),
    ...getPgcCrossoverPairingIssues(routeDefinition),
  ]

  return issues.length === 0 ? 'OK' : issues.join('; ')
}

function getUnknownRailIssues(
  routeDefinition: SignalRouteDefinition,
  knownRailIds: ReadonlySet<string>,
) {
  return routeDefinition.realSegmentIds
    .filter((segmentId) => !knownRailIds.has(segmentId))
    .map((segmentId) => `unknown rail ${segmentId}`)
}

function getExclusiveRailConflictIssues(routeDefinition: SignalRouteDefinition) {
  const routeRailIds = new Set(routeDefinition.realSegmentIds)
  const allowedExclusiveRailPairKeys = new Set(
    (routeDefinition.allowedLogicalExclusiveRailPairs ?? []).map(([left, right]) => getExclusiveRailPairKey(left, right)),
  )
  const conflicts: string[] = []

  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
    const activeSides = group.sides
      .map((side) => side.filter((segmentId) => routeRailIds.has(segmentId)))
      .filter((side) => side.length > 0)

    if (activeSides.length <= 1) {
      return
    }

    const hasUnallowedConflict = activeSides.some((side, sideIndex) => (
      activeSides.some((otherSide, otherSideIndex) => {
        if (sideIndex === otherSideIndex) {
          return false
        }

        return side.some((segmentId) => (
          otherSide.some((otherSegmentId) => (
            !allowedExclusiveRailPairKeys.has(getExclusiveRailPairKey(segmentId, otherSegmentId))
          ))
        ))
      })
    ))

    if (!hasUnallowedConflict) {
      return
    }

    conflicts.push(`conflicting rails ${activeSides.map((side) => side.join(', ')).join(' / ')}`)
  })

  return conflicts
}

function getExclusiveRailPairKey(left: string, right: string) {
  return [left, right].sort().join('|')
}

function getPgcCrossoverPairingIssues(routeDefinition: SignalRouteDefinition) {
  const routeRailIds = new Set(routeDefinition.realSegmentIds)

  if (!routeRailIds.has('rail-1115')) {
    return []
  }

  const pgcCrossoverRails = ['rail-P1100', 'rail-P1101', 'rail-P1102', 'rail-P1103']
    .filter((railId) => routeRailIds.has(railId))
    .sort()
  const pairing = pgcCrossoverRails.join('|')

  if (
    pgcCrossoverRails.length === 0
    || pairing === 'rail-P1100|rail-P1103'
    || pairing === 'rail-P1101|rail-P1102'
  ) {
    return []
  }

  return [`invalid PGC 1115 pairing ${pgcCrossoverRails.join(', ')}`]
}
