import type {
  LineMapRouteSegmentStatus,
  LineMapRuntimeState,
  RouteControlMode,
  TrainState,
  TrainStatus,
} from '../../types'
import {
  MAP_SECTION_OFFSETS,
  commandData,
  getRouteSegmentIdForTrain,
  lowerTrackPieces,
  platformData,
  schematicAnnotations,
  upperTrackPieces,
} from './model'
import type { LineMapSignalData } from './model'
import {
  S610_LEGACY_ROUTE_SEGMENT_MIGRATIONS,
  S610_RETIRED_ROUTE_SEGMENT_IDS,
  S610_SIGNAL_TRACK_SEGMENT_IDS,
} from './routeDefinitions'
import {
  createSignalRouteSetPatch,
  createSignalRouteUnsetPatch,
} from './scadaRouteState'
import {
  getSignalRouteDefinition,
  getSignalRouteLabels as getSignalRouteLabelsForSignalLabel,
  getSignalTrackSegmentId,
} from './signalRouteState'
import {
  normalizeLineMapRuntimeState,
  resetLineMapRouteSegmentState,
} from './lineMapRuntimeState'
import {
  TRAIN_FLAT_RAIL_OCCUPANCY_TOLERANCE,
  TRAIN_MARKER_LOWER_ROUTE_Y,
  TRAIN_MARKER_UPPER_ROUTE_Y,
  TRAIN_ROUTE_RENDER_STEPS,
} from './trainMovementRoutes'
import { TIMETABLE_PLAYBACK_PROFILE } from './timetablePlayback'
import {
  enforceLineMapRailStateOwnership,
} from './lineMapRailStateAuthority'
import {
  getTrainRouteStepFromLineMap,
} from './trainRoutePlaybackState'
import {
  clearLineMapRouteSegmentState,
  clearLineMapRouteSegmentStates,
  createLineMapRouteSegmentState,
  setLineMapRouteSegmentState,
} from './lineMapRouteSegmentState'

export function createRouteAutomationSummary(routeControlModes: Record<string, RouteControlMode>) {
  const automaticPanels = commandData.filter((command) => (routeControlModes[command.code] ?? 'OCCA') === 'OCCA')
  const manualPanels = commandData.length - automaticPanels.length

  return {
    automaticPanels: automaticPanels.length,
    manualPanels,
    text: `TIMETABLE AUTO ${automaticPanels.length}/${commandData.length} ROUTE PANELS | ${TIMETABLE_PLAYBACK_PROFILE.label}`,
  }
}

export function isPanelTimetableAutomatic(panelCode: string, routeControlModes: Record<string, RouteControlMode>) {
  return (routeControlModes[panelCode] ?? 'OCCA') === 'OCCA'
}

export function getLineMapRouteStatus(status: TrainStatus): LineMapRouteSegmentStatus {
  if (status === 'RUN') {
    return 'DISPATCHED'
  }

  if (status === 'HOLD') {
    return 'HELD'
  }

  return 'SET'
}

export function updateLineMapRouteState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  train: Pick<TrainState, 'id'>,
  status: LineMapRouteSegmentStatus,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const segmentId = getRouteSegmentIdForTrain(train)

  if (!segmentId) {
    return current
  }

  const routeSegments = {
    ...current.routeSegments,
  }

  setLineMapRouteSegmentState(routeSegments, segmentId, status, { trainId: train.id })
  enforceLineMapRailStateOwnership(routeSegments, { prioritySegmentIds: [segmentId] })

  return {
    ...current,
    routeSegments,
  }
}

export function createTrainOccupancyRouteSegmentStates(
  trains: readonly TrainState[],
  lineMap: Partial<LineMapRuntimeState> | undefined,
): LineMapRuntimeState['routeSegments'] {
  const current = normalizeLineMapRuntimeState(lineMap)

  return Object.fromEntries(trains.filter((train) => train.lineMapVisible !== false).flatMap((train) => {
    const routeStep = getTrainRouteStepFromLineMap(current, train.id, TRAIN_ROUTE_RENDER_STEPS)
    const segmentId = routeStep?.segmentId ?? train.occupancySegmentId ?? getFlatRailSegmentIdForTrain(train)

    if (!segmentId) {
      return []
    }

    return [[
      segmentId,
      createLineMapRouteSegmentState(segmentId, 'DISPATCHED', { updatedAt: 0 }),
    ]]
  }))
}

export function getSignalNumber(signal: LineMapSignalData) {
  return signal.label.replace(/\D/g, '') || '000'
}

export function getSignalStationCode(signal: LineMapSignalData) {
  return platformData.reduce((closest, platform) => (
    Math.abs(platform.x - signal.x) < Math.abs(closest.x - signal.x) ? platform : closest
  )).code
}

export function getSignalEquipmentLabel(signal: LineMapSignalData) {
  const equipmentOverrides: Record<string, string> = {
    S608: 'SIG/SKG/S03/SIGN0608',
    S700: 'SIG/PGL/S02/SIGN0700',
    S1104: 'SIG/PGC/N01/SIGN1104',
  }

  if (equipmentOverrides[signal.label]) {
    return equipmentOverrides[signal.label]
  }

  return `SIG/${getSignalStationCode(signal)}/S01/SIGN${getSignalNumber(signal).padStart(4, '0')}`
}

export function getSignalRouteLabels(signal: LineMapSignalData) {
  return getSignalRouteLabelsForSignalLabel(signal.label)
}

export function updateLineMapSignalTrackState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  signal: LineMapSignalData,
  train: Pick<TrainState, 'id'>,
  status: LineMapRouteSegmentStatus,
  routeLabel: string,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeSegments = { ...current.routeSegments }
  const routeDefinition = getSignalRouteDefinition(signal.label, routeLabel)

  if (!routeDefinition) {
    return current
  }

  if (signal.label === 'S610') {
    clearLineMapRouteSegmentStates(routeSegments, S610_SIGNAL_TRACK_SEGMENT_IDS)
    clearLineMapRouteSegmentStates(routeSegments, S610_RETIRED_ROUTE_SEGMENT_IDS)
    S610_LEGACY_ROUTE_SEGMENT_MIGRATIONS.forEach(([legacySegmentId, migratedSegmentId]) => {
      clearLineMapRouteSegmentState(routeSegments, legacySegmentId)
      clearLineMapRouteSegmentState(routeSegments, migratedSegmentId)
    })
  }

  const routePatch = createSignalRouteSetPatch(routeDefinition, train, status)

  Object.assign(routeSegments, routePatch.routeSegments)
  enforceLineMapRailStateOwnership(routeSegments, { prioritySegmentIds: routePatch.prioritySegmentIds })

  return {
    ...current,
    routeSegments,
  }
}

export function clearLineMapSignalTrackState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  signal: LineMapSignalData,
  routeLabel: string,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeSegments = { ...current.routeSegments }
  const routeDefinition = getSignalRouteDefinition(signal.label, routeLabel)

  resetLineMapRouteSegmentState(routeSegments, getSignalTrackSegmentId(signal))

  if (routeDefinition) {
    routeDefinition.commandStateSegmentIds.forEach((segmentId) => {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    })

    const routePatch = createSignalRouteUnsetPatch(routeDefinition)

    clearLineMapRouteSegmentStates(routeSegments, routePatch.removeSegmentIds)
    routePatch.resetSegmentIds.forEach((segmentId) => {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    })
    Object.assign(routeSegments, routePatch.routeSegments)
    enforceLineMapRailStateOwnership(routeSegments, { prioritySegmentIds: routePatch.prioritySegmentIds })

    if (signal.label === 'S610') {
      clearLineMapRouteSegmentStates(routeSegments, S610_RETIRED_ROUTE_SEGMENT_IDS)
      S610_LEGACY_ROUTE_SEGMENT_MIGRATIONS.forEach(([legacySegmentId]) => {
        clearLineMapRouteSegmentState(routeSegments, legacySegmentId)
      })
    }

    return {
      ...current,
      routeSegments,
    }
  }

  return current
}

function getFlatRailSegmentIdForTrain(train: TrainState) {
  const track = getFlatRailTrackForTrain(train)

  if (!track) {
    return ''
  }

  const pieces = track === 'upper' ? upperTrackPieces : lowerTrackPieces
  const section = getOccupancyRailSection(train.x)
  const nearestPiece = pieces
    .filter((piece) => getOccupancyRailSection(piece.x).name === section.name)
    .reduce<(typeof pieces)[number] | undefined>((closest, piece) => {
      if (!closest) {
        return piece
      }

      const pieceDistance = getTrainDistanceFromTrackPiece(train.x, piece)
      const closestDistance = getTrainDistanceFromTrackPiece(train.x, closest)
      const pieceCenterDistance = Math.abs(train.x - (piece.x + piece.width / 2))
      const closestCenterDistance = Math.abs(train.x - (closest.x + closest.width / 2))

      return pieceDistance < closestDistance || (pieceDistance === closestDistance && pieceCenterDistance < closestCenterDistance)
        ? piece
        : closest
    }, undefined)

  if (!nearestPiece || getTrainDistanceFromTrackPiece(train.x, nearestPiece) > TRAIN_FLAT_RAIL_OCCUPANCY_TOLERANCE) {
    return ''
  }

  const label = getOccupancyTrackPieceLabel(nearestPiece, track)

  return label
    ? `rail-${normalizeOccupancyRailLabel(label)}`
    : `rail-unlabelled-${track}-${section.name}-${Math.round(nearestPiece.x - section.start)}-${Math.round(nearestPiece.width)}`
}

function getFlatRailTrackForTrain(train: TrainState): 'lower' | 'upper' | '' {
  const upperDistance = Math.abs(train.y - TRAIN_MARKER_UPPER_ROUTE_Y)
  const lowerDistance = Math.abs(train.y - TRAIN_MARKER_LOWER_ROUTE_Y)
  const closestDistance = Math.min(upperDistance, lowerDistance)

  if (closestDistance > TRAIN_FLAT_RAIL_OCCUPANCY_TOLERANCE) {
    return ''
  }

  return upperDistance <= lowerDistance ? 'upper' : 'lower'
}

function getTrainDistanceFromTrackPiece(
  trainX: number,
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number],
) {
  if (trainX >= piece.x && trainX <= piece.x + piece.width) {
    return 0
  }

  return Math.min(Math.abs(trainX - piece.x), Math.abs(trainX - (piece.x + piece.width)))
}

function getOccupancyTrackPieceLabel(
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number],
  track: 'lower' | 'upper',
) {
  const section = getOccupancyRailSection(piece.x)
  const labelY = track === 'upper' ? 211 : 478
  const centerX = piece.x + piece.width / 2
  const candidates = schematicAnnotations.filter((annotation) => (
    annotation.y === labelY
    && getOccupancyRailSection(annotation.x).name === section.name
  ))
  const labelsOnPiece = candidates.filter((annotation) => (
    annotation.x >= piece.x - 4 && annotation.x <= piece.x + piece.width + 4
  ))
  const labelsToCompare = labelsOnPiece.length ? labelsOnPiece : candidates
  const closest = labelsToCompare.reduce<(typeof labelsToCompare)[number] | undefined>((current, annotation) => {
    if (!current) {
      return annotation
    }

    return Math.abs(annotation.x - centerX) < Math.abs(current.x - centerX) ? annotation : current
  }, undefined)

  return closest && Math.abs(closest.x - centerX) <= 96 ? closest.label : ''
}

function getOccupancyRailSection(x: number) {
  const sections = [
    { name: 'section01', start: MAP_SECTION_OFFSETS.section01 },
    { name: 'section02', start: MAP_SECTION_OFFSETS.section02 },
    { name: 'section03', start: MAP_SECTION_OFFSETS.section03 },
    { name: 'section04', start: MAP_SECTION_OFFSETS.section04 },
  ] as const

  return sections.reduce((current, section) => (
    x >= section.start ? section : current
  ), sections[0])
}

function normalizeOccupancyRailLabel(label: string) {
  return label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
