import {
  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS,
  lowerSignals,
  lowerTrackPieces,
  routeSegmentData,
  staticTrackPaths,
  staticTrackPieces,
  translucentTrackGuides,
  upperSignals,
  upperTrackPieces,
} from './model'
import {
  getRouteSegmentRailId,
  getRouteSegmentRailPartIds,
  getStaticTrackPathRailId,
  getStaticTrackPieceRailId,
  getTrackGuideRailId,
  getTrackGuideRouteRailId,
  getTrackPieceRailId,
} from './railIds'
import {
  LINE_SUFFIX_ROUTE_SEGMENT_MIGRATIONS,
  REMOVED_ROUTE_SEGMENT_IDS,
  SIGNAL_LABELS_WITHOUT_ROUTES,
  SIGNAL_ROUTE_DEFINITIONS,
  type SignalRouteDefinition,
} from './routeDefinitions'
import {
  LINE_MAP_ROUTE_PATH_DEFINITIONS,
  getSignalRouteSegmentIds,
  type LineMapRoutePathDefinition,
  type ManualLineMapRoutePathDefinition,
  type TimetableLineMapRoutePathDefinition,
  type TimetableRoutePathMatcher,
} from './lineMapRoutePaths'
import { isTimetableIneligibleGuideRailId } from './timetableRouteStateCleanup'

let didWarnLineMapRouteValidation = false

const LEGACY_OR_REMOVED_ROUTE_SEGMENT_IDS = new Set<string>([
  ...REMOVED_ROUTE_SEGMENT_IDS,
  ...LINE_SUFFIX_ROUTE_SEGMENT_MIGRATIONS.map(([legacySegmentId]) => legacySegmentId),
])

export function warnLineMapRouteValidationIssues() {
  if (didWarnLineMapRouteValidation) {
    return
  }

  didWarnLineMapRouteValidation = true

  const issues = validateLineMapRouteDefinitions()

  if (issues.length === 0) {
    return
  }

  console.warn([
    '[OCC line-map route validation]',
    ...issues.map((issue) => `- ${issue}`),
  ].join('\n'))
}

type LineMapRouteValidationOptions = {
  routePathDefinitions?: readonly LineMapRoutePathDefinition[]
  routeDefinitions?: readonly SignalRouteDefinition[]
}

export type LineMapSignalAccount = {
  accountId: string
  anchorRailId?: string
  label: string
  placementStatus: 'pixel-positioned' | 'rail-anchored'
  routeStatus: 'pending-route-definition' | 'route-defined' | 'route-less'
}

export function validateLineMapRouteDefinitions(options: LineMapRouteValidationOptions = {}) {
  const issues: string[] = []
  const knownRailIds = getKnownLineMapRailIds()
  const signalLabels: ReadonlySet<string> = new Set([...upperSignals, ...lowerSignals].map((signal) => signal.label))
  const routePathDefinitions = options.routePathDefinitions ?? LINE_MAP_ROUTE_PATH_DEFINITIONS
  const routeDefinitions = options.routeDefinitions ?? SIGNAL_ROUTE_DEFINITIONS
  const routeOwners = new Map<string, string[]>()
  const signalRouteKeys = new Map<string, number>()
  const commandMarkerOwners = new Map<string, string[]>()

  routeDefinitions.forEach((routeDefinition) => {
    const signalRouteKey = `${routeDefinition.signalLabel}:${routeDefinition.routeLabel}`
    const routeKey = routeDefinition.routeLabel

    signalRouteKeys.set(signalRouteKey, (signalRouteKeys.get(signalRouteKey) ?? 0) + 1)
    routeOwners.set(routeKey, [...(routeOwners.get(routeKey) ?? []), routeDefinition.signalLabel])
    getCommandMarkerSegmentIds(routeDefinition).forEach((segmentId) => {
      commandMarkerOwners.set(segmentId, [
        ...(commandMarkerOwners.get(segmentId) ?? []),
        `${routeDefinition.signalLabel} ${routeDefinition.routeLabel}`,
      ])
    })

    validateSignalRouteDefinition(routeDefinition, signalLabels, knownRailIds, issues)
  })

  signalRouteKeys.forEach((count, routeKey) => {
    if (count > 1) {
      issues.push(`${routeKey.replace(':', ' ')} is defined ${count} times`)
    }
  })

  routeOwners.forEach((owners, routeLabel) => {
    const uniqueOwners = [...new Set(owners)]

    if (uniqueOwners.length > 1) {
      issues.push(`${routeLabel} is defined on multiple signals: ${uniqueOwners.join(', ')}`)
    }
  })

  commandMarkerOwners.forEach((owners, segmentId) => {
    const uniqueOwners = [...new Set(owners)]

    if (uniqueOwners.length > 1) {
      issues.push(`${segmentId} command marker is reused by ${uniqueOwners.join(', ')}`)
    }
  })

  SIGNAL_LABELS_WITHOUT_ROUTES.forEach((signalLabel) => {
    if (!signalLabels.has(signalLabel)) {
      issues.push(`${signalLabel} is marked route-less but is not on the line map`)
    }

    const hasDefinition = routeDefinitions.some((routeDefinition) => routeDefinition.signalLabel === signalLabel)

    if (hasDefinition) {
      issues.push(`${signalLabel} is marked route-less but still has route definitions`)
    }
  })

  validateRenderedRailInventory(knownRailIds, issues)
  validateSignalInventory(getLineMapSignalAccounts(routeDefinitions), knownRailIds, issues)
  validateLineMapRoutePathDefinitions(routePathDefinitions, knownRailIds, issues)

  return issues
}

export function getLineMapSignalAccounts(
  routeDefinitions: readonly SignalRouteDefinition[] = SIGNAL_ROUTE_DEFINITIONS,
): LineMapSignalAccount[] {
  const routeSignalLabels = new Set(routeDefinitions.map((routeDefinition) => routeDefinition.signalLabel))

  return [...upperSignals, ...lowerSignals].map((signal) => {
    const routeStatus = routeSignalLabels.has(signal.label)
      ? 'route-defined'
      : SIGNAL_LABELS_WITHOUT_ROUTES.has(signal.label)
        ? 'route-less'
        : 'pending-route-definition'

    return {
      accountId: getSignalAccountId(signal),
      anchorRailId: 'anchorRailId' in signal && typeof signal.anchorRailId === 'string' ? signal.anchorRailId : undefined,
      label: signal.label,
      placementStatus: 'anchorRailId' in signal ? 'rail-anchored' : 'pixel-positioned',
      routeStatus,
    }
  })
}

function validateLineMapRoutePathDefinitions(
  routePathDefinitions: readonly LineMapRoutePathDefinition[],
  knownRailIds: ReadonlySet<string>,
  issues: string[],
) {
  const routePathIds = new Map<string, number>()

  routePathDefinitions.forEach((routePath) => {
    routePathIds.set(routePath.id, (routePathIds.get(routePath.id) ?? 0) + 1)

    if (!routePath.routeLabel.trim()) {
      issues.push(`${routePath.id} has no route label`)
    }

    if (routePath.owner === 'manual') {
      validateManualRoutePathDefinition(routePath, knownRailIds, issues)
      return
    }

    validateTimetableRoutePathDefinition(routePath, knownRailIds, issues)
  })

  routePathIds.forEach((count, routePathId) => {
    if (count > 1) {
      issues.push(`${routePathId} route path is defined ${count} times`)
    }
  })
}

function validateManualRoutePathDefinition(
  routePath: ManualLineMapRoutePathDefinition,
  knownRailIds: ReadonlySet<string>,
  issues: string[],
) {
  if (routePath.routeLabels.length === 0) {
    issues.push(`${routePath.id} has no backing signal route labels`)
  }

  validateRoutePathRouteLabels(routePath.id, routePath.routeLabels, issues)

  if (routePath.movementRouteSteps.length === 0) {
    issues.push(`${routePath.id} has no movement steps`)
  }

  if (routePath.stateRouteSteps.length === 0) {
    issues.push(`${routePath.id} has no state steps`)
  }

  validateRoutePathSteps(`${routePath.id} movement`, routePath.movementRouteSteps, knownRailIds, issues)
  validateRoutePathSteps(`${routePath.id} state`, routePath.stateRouteSteps, knownRailIds, issues)
  validateManualRoutePathBackedBySignalRoutes(routePath, issues)

  const highestStateIndex = routePath.movementRouteSteps.length - 1 + (routePath.stateRouteStepIndexOffset ?? 0)

  if (routePath.stateRouteSteps.length > 0 && highestStateIndex >= routePath.stateRouteSteps.length) {
    issues.push(`${routePath.id} movement-to-state step offset exceeds the state route length`)
  }
}

function validateManualRoutePathBackedBySignalRoutes(
  routePath: ManualLineMapRoutePathDefinition,
  issues: string[],
) {
  const routeSegmentIds = getSignalRouteSegmentIds(routePath.routeLabels)

  if (routeSegmentIds.length === 0) {
    return
  }

  const routeSegmentIdSet = new Set(routeSegmentIds)
  const stateStepSegmentIds = routePath.stateRouteSteps.map((step) => step.segmentId)
  const stateStepSegmentIdSet = new Set(stateStepSegmentIds)
  const unexpectedStateStepIds = stateStepSegmentIds.filter((segmentId) => !routeSegmentIdSet.has(segmentId))
  const missingStateStepIds = routeSegmentIds.filter((segmentId) => !stateStepSegmentIdSet.has(segmentId))

  if (unexpectedStateStepIds.length > 0) {
    issues.push(`${routePath.id} has state steps outside its signal route definitions: ${unexpectedStateStepIds.join(', ')}`)
  }

  if (missingStateStepIds.length > 0) {
    issues.push(`${routePath.id} is missing signal route rails in state steps: ${missingStateStepIds.join(', ')}`)
  }
}

function validateTimetableRoutePathDefinition(
  routePath: TimetableLineMapRoutePathDefinition,
  knownRailIds: ReadonlySet<string>,
  issues: string[],
) {
  validateTimetableStationRouteDefinition(routePath, issues)

  if (!routePath.panelCode.trim()) {
    issues.push(`${routePath.id} has no route panel code`)
  }

  if (routePath.steps.length === 0) {
    issues.push(`${routePath.id} has no timetable steps`)
  }

  if (routePath.routeLabels.length === 0) {
    issues.push(`${routePath.id} has no backing signal route labels`)
  }

  validateRoutePathRouteLabels(routePath.id, routePath.routeLabels, issues)

  if (routePath.disallowGuideRails !== true) {
    issues.push(`${routePath.id} must explicitly opt into or out of guide rails`)
  }

  validateRoutePathSteps(`${routePath.id} timetable`, routePath.steps, knownRailIds, issues)
  validateTimetableRoutePathBackedBySignalRoutes(routePath, issues)

  if (routePath.disallowGuideRails) {
    routePath.steps.forEach((step) => {
      if (isTimetableIneligibleGuideRailId(step.segmentId)) {
        issues.push(`${routePath.id} timetable path must not include guide rail ${step.segmentId}`)
      }
    })
  }
}

function validateTimetableStationRouteDefinition(
  routePath: TimetableLineMapRoutePathDefinition,
  issues: string[],
) {
  if (routePath.from === routePath.to) {
    issues.push(`${routePath.id} has the same station route origin and destination ${routePath.from}`)
  }

  const allowedOrigins = collectRouteMatcherLocations(routePath.match, 'originAny')
  const allowedStations = collectRouteMatcherLocations(routePath.match, 'stationAny')
  const allowedDestinations = collectRouteMatcherLocations(routePath.match, 'destinationAny')

  if (allowedOrigins.size > 0 && !allowedOrigins.has(routePath.from) && !routePath.via?.some((station) => allowedOrigins.has(station))) {
    issues.push(`${routePath.id} station route origin ${routePath.from} is not represented by its matcher originAny`)
  }

  if (allowedDestinations.size > 0 && !allowedDestinations.has(routePath.to)) {
    issues.push(`${routePath.id} station route destination ${routePath.to} is not represented by its matcher destinationAny`)
  }

  routePath.via?.forEach((station) => {
    if (allowedStations.size > 0 && !allowedStations.has(station)) {
      issues.push(`${routePath.id} station route via ${station} is not represented by its matcher stationAny`)
    }
  })
}

function collectRouteMatcherLocations(
  matcher: TimetableRoutePathMatcher,
  key: 'destinationAny' | 'originAny' | 'stationAny',
): Set<string> {
  const locations = new Set<string>()

  matcher[key]?.forEach((location) => locations.add(location))
  matcher.anyOf?.forEach((candidate) => {
    collectRouteMatcherLocations(candidate, key).forEach((location) => locations.add(location))
  })

  return locations
}

function validateRoutePathRouteLabels(
  routePathId: string,
  routeLabels: readonly string[],
  issues: string[],
) {
  const knownRouteLabels = new Set<string>(SIGNAL_ROUTE_DEFINITIONS.map((routeDefinition) => routeDefinition.routeLabel))

  routeLabels.forEach((routeLabel) => {
    if (!knownRouteLabels.has(routeLabel)) {
      issues.push(`${routePathId} references unknown signal route ${routeLabel}`)
    }
  })
}

function validateTimetableRoutePathBackedBySignalRoutes(
  routePath: TimetableLineMapRoutePathDefinition,
  issues: string[],
) {
  const routeSegmentIds = getSignalRouteSegmentIds(routePath.routeLabels)

  if (routeSegmentIds.length === 0) {
    return
  }

  const routeSegmentIdSet = new Set(routeSegmentIds)
  const timetableStepSegmentIds = routePath.steps.map((step) => step.segmentId)
  const unexpectedStepIds = timetableStepSegmentIds.filter((segmentId) => !routeSegmentIdSet.has(segmentId))

  if (unexpectedStepIds.length > 0) {
    issues.push(`${routePath.id} has timetable steps outside its signal route definitions: ${unexpectedStepIds.join(', ')}`)
  }
}

function validateRoutePathSteps(
  label: string,
  steps: readonly { segmentId: string }[],
  knownRailIds: ReadonlySet<string>,
  issues: string[],
) {
  pushDuplicateIdIssues(`${label} steps`, steps.map((step) => step.segmentId), issues)

  steps.forEach((step) => {
    if (!knownRailIds.has(step.segmentId)) {
      issues.push(`${label} step references unknown rail ${step.segmentId}`)
    }
  })
}

function validateRenderedRailInventory(
  knownRailIds: ReadonlySet<string>,
  issues: string[],
) {
  knownRailIds.forEach((railId) => {
    if (railId.startsWith('rail-unlabelled-')) {
      issues.push(`${railId} is rendered without an explicit rail ID`)
    }
  })
}

function validateSignalInventory(
  signalAccounts: readonly LineMapSignalAccount[],
  knownRailIds: ReadonlySet<string>,
  issues: string[],
) {
  const accountIds = new Set<string>()

  signalAccounts.forEach((account) => {
    if (!account.label.trim()) {
      issues.push(`${account.accountId} has no signal label`)
    }

    if (accountIds.has(account.accountId)) {
      issues.push(`${account.accountId} signal account is duplicated`)
    }

    if (account.placementStatus === 'pixel-positioned') {
      issues.push(`${account.accountId} is not anchored to a rail`)
    }

    if (account.anchorRailId && !knownRailIds.has(account.anchorRailId)) {
      issues.push(`${account.accountId} is anchored to unknown rail ${account.anchorRailId}`)
    }

    accountIds.add(account.accountId)
  })
}

function validateSignalRouteDefinition(
  routeDefinition: SignalRouteDefinition,
  signalLabels: ReadonlySet<string>,
  knownRailIds: ReadonlySet<string>,
  issues: string[],
) {
  const routeName = `${routeDefinition.signalLabel} ${routeDefinition.routeLabel}`

  if (!signalLabels.has(routeDefinition.signalLabel)) {
    issues.push(`${routeName} references a signal that is not on the line map`)
  }

  if (!/^Route R\d+_\d+$/.test(routeDefinition.routeLabel)) {
    issues.push(`${routeName} route label must use the Route R####_#### format`)
  }

  if (SIGNAL_LABELS_WITHOUT_ROUTES.has(routeDefinition.signalLabel)) {
    issues.push(`${routeName} is defined for a signal that should not expose routes`)
  }

  if (routeDefinition.pendingImplementation) {
    validatePendingRouteDefinition(routeDefinition, routeName, issues)
    return
  }

  if (routeDefinition.realSegmentIds.length === 0) {
    issues.push(`${routeName} has no real rail IDs`)
  }

  if (routeDefinition.commandSegmentIds.length === 0) {
    issues.push(`${routeName} has no command segment IDs`)
  }

  if (routeDefinition.commandStateSegmentIds.length === 0) {
    issues.push(`${routeName} has no command-state segment IDs`)
  }

  pushDuplicateIdIssues(`${routeName} real rails`, routeDefinition.realSegmentIds, issues)
  pushDuplicateIdIssues(`${routeName} command segments`, routeDefinition.commandSegmentIds, issues)
  pushDuplicateIdIssues(`${routeName} command-state segments`, routeDefinition.commandStateSegmentIds, issues)
  validateNoLegacyOrRemovedRouteIds(`${routeName} real rails`, routeDefinition.realSegmentIds, issues)
  validateNoLegacyOrRemovedRouteIds(`${routeName} command segments`, routeDefinition.commandSegmentIds, issues)
  validateNoLegacyOrRemovedRouteIds(`${routeName} command-state segments`, routeDefinition.commandStateSegmentIds, issues)
  validateNoExclusiveRouteSegmentConflicts(routeDefinition, routeName, issues)
  validatePgcCrossoverPairing(routeDefinition, routeName, issues)

  routeDefinition.realSegmentIds.forEach((segmentId) => {
    if (!knownRailIds.has(segmentId)) {
      issues.push(`${routeName} real rail ${segmentId} is not rendered by the line map`)
    }

    if (!routeDefinition.commandSegmentIds.includes(segmentId)) {
      issues.push(`${routeName} real rail ${segmentId} is not part of its command segment list`)
    }
  })

  routeDefinition.commandStateSegmentIds.forEach((segmentId) => {
    if (!routeDefinition.commandSegmentIds.includes(segmentId)) {
      issues.push(`${routeName} command-state segment ${segmentId} is not part of its command segment list`)
    }
  })

  routeDefinition.commandSegmentIds.forEach((segmentId) => {
    const isRealRail = routeDefinition.realSegmentIds.includes(segmentId)
    const isCommandMarker = routeDefinition.commandStateSegmentIds.includes(segmentId) && segmentId.startsWith('route-')

    if (!isRealRail && !isCommandMarker && !knownRailIds.has(segmentId)) {
      issues.push(`${routeName} command segment ${segmentId} is neither a rendered rail nor a command marker`)
    }
  })

  getCommandMarkerSegmentIds(routeDefinition).forEach((segmentId) => {
    if (segmentId !== getExpectedCommandMarkerSegmentId(routeDefinition.routeLabel)) {
      issues.push(`${routeName} command marker ${segmentId} does not match ${routeDefinition.routeLabel}`)
    }
  })

  if (routeDefinition.keepRealSegmentsUnsetOnUnset && getCommandMarkerSegmentIds(routeDefinition).length === 0) {
    issues.push(`${routeName} keeps rails yellow on unset but does not define a command marker`)
  }
}

function validateNoExclusiveRouteSegmentConflicts(
  routeDefinition: SignalRouteDefinition,
  routeName: string,
  issues: string[],
) {
  const routeRailIds = new Set(routeDefinition.realSegmentIds)

  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
    const preferredRails = group.sides[0].filter((railId) => routeRailIds.has(railId))
    const conflictingRails = group.sides.slice(1).flat().filter((railId) => routeRailIds.has(railId))

    if (preferredRails.length === 0 || conflictingRails.length === 0) {
      return
    }

    issues.push(`${routeName} sets mutually exclusive rails ${preferredRails.join(', ')} and ${conflictingRails.join(', ')}`)
  })
}

function validatePgcCrossoverPairing(
  routeDefinition: SignalRouteDefinition,
  routeName: string,
  issues: string[],
) {
  const routeRailIds = new Set(routeDefinition.realSegmentIds)

  if (!routeRailIds.has('rail-1115')) {
    return
  }

  const pgcCrossoverRails = ['rail-P1100', 'rail-P1101', 'rail-P1102', 'rail-P1103']
    .filter((railId) => routeRailIds.has(railId))
    .sort()

  if (pgcCrossoverRails.length === 0) {
    return
  }

  const pairing = pgcCrossoverRails.join('|')

  if (pairing === 'rail-P1100|rail-P1103' || pairing === 'rail-P1101|rail-P1102') {
    return
  }

  issues.push(`${routeName} uses invalid PGC 1115 crossover pairing ${pgcCrossoverRails.join(', ')}`)
}

function validatePendingRouteDefinition(
  routeDefinition: SignalRouteDefinition,
  routeName: string,
  issues: string[],
) {
  if (routeDefinition.realSegmentIds.length > 0) {
    issues.push(`${routeName} is pending but already defines real rail IDs`)
  }

  if (routeDefinition.commandSegmentIds.length > 0 || routeDefinition.commandStateSegmentIds.length > 0) {
    issues.push(`${routeName} is pending but already defines command segment IDs`)
  }
}

function pushDuplicateIdIssues(label: string, ids: readonly string[], issues: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  ids.forEach((id) => {
    if (seen.has(id)) {
      duplicates.add(id)
      return
    }

    seen.add(id)
  })

  if (duplicates.size > 0) {
    issues.push(`${label} contains duplicate IDs: ${[...duplicates].join(', ')}`)
  }
}

function validateNoLegacyOrRemovedRouteIds(label: string, ids: readonly string[], issues: string[]) {
  ids.forEach((id) => {
    if (LEGACY_OR_REMOVED_ROUTE_SEGMENT_IDS.has(id)) {
      issues.push(`${label} uses removed or legacy rail ${id}`)
    }
  })
}

function getCommandMarkerSegmentIds(routeDefinition: SignalRouteDefinition) {
  const realSegmentIdSet = new Set(routeDefinition.realSegmentIds)

  return routeDefinition.commandStateSegmentIds.filter((segmentId) => !realSegmentIdSet.has(segmentId))
}

function getExpectedCommandMarkerSegmentId(routeLabel: string) {
  return `${routeLabel.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')}-command`
}

export function getKnownLineMapRailIds() {
  const railIds = new Set<string>()

  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
    group.sides.flat().forEach((railId) => railIds.add(railId))
  })

  routeSegmentData.forEach((segment) => {
    railIds.add(getRouteSegmentRailId(segment))
    getRouteSegmentRailPartIds(segment).forEach((railId) => railIds.add(railId))
  })

  translucentTrackGuides.forEach((guide) => {
    const segmentCount = 'segmentPolygons' in guide && Array.isArray(guide.segmentPolygons)
      ? guide.segmentPolygons.length
      : 'segments' in guide && Array.isArray(guide.segments)
        ? guide.segments.length
        : 1

    Array.from({ length: segmentCount }).forEach((_, index) => {
      const railId = getTrackGuideRailId(guide, segmentCount > 1 ? index : undefined)
      railIds.add(getTrackGuideRouteRailId(railId, guide))
    })
  })

  staticTrackPieces.forEach((piece) => {
    railIds.add(getStaticTrackPieceRailId(piece))
  })

  staticTrackPaths.forEach((path) => {
    railIds.add(getStaticTrackPathRailId(path))
  })

  upperTrackPieces.forEach((piece) => {
    railIds.add(getTrackPieceRailId(piece, 'upper'))
    const pieceRailIds = 'railIds' in piece ? piece.railIds : undefined

    pieceRailIds?.forEach((railId) => railIds.add(railId))
  })

  lowerTrackPieces.forEach((piece) => {
    railIds.add(getTrackPieceRailId(piece, 'lower'))
    const pieceRailIds = 'railIds' in piece ? piece.railIds : undefined

    pieceRailIds?.forEach((railId) => railIds.add(railId))
  })

  return railIds
}

function getSignalAccountId(signal: (typeof upperSignals)[number] | (typeof lowerSignals)[number]) {
  const track = 'track' in signal && signal.track ? signal.track : 'auto'
  const y = 'y' in signal && typeof signal.y === 'number' ? Math.round(signal.y) : 'auto'

  return `${signal.label}:${track}:${Math.round(signal.x)}:${y}`
}
