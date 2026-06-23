import {
  MAP_SECTION_OFFSETS,
  schematicAnnotations,
} from './model'

type TrackPieceRailSource = {
  railId?: string
  railIds?: readonly string[]
  x: number
  width: number
}

type RailOwnershipSource = {
  id: string
  railId?: string
  railIds?: readonly string[]
  routeRailIds?: readonly string[]
}

export const TRACK_GUIDE_RAIL_IDS: Record<string, readonly string[]> = {
  'hbf-102-to-103-guide': ['rail-P103'],
  'hbf-110-to-109-guide': ['rail-P105', 'rail-P102'],
  'hbf-204-to-205-guide': ['rail-P201', 'rail-P200'],
  'frp-p301-p300-guide': ['rail-P301', 'rail-P300'],
  'frp-p304-p302-guide': ['rail-P304', 'rail-P302'],
  'frp-p305-p303-guide': ['rail-P305', 'rail-P303'],
  'frp-p307-p306-guide': ['rail-P307', 'rail-P306'],
  'bgk-p611-p609-guide': ['rail-P611', 'rail-P609'],
  'wlh-p401-p400-guide': ['rail-P401', 'rail-P400'],
  'wlh-p403-p402-guide': ['rail-P403', 'rail-P402'],
  'pgl-p701-p700-guide': ['rail-P701', 'rail-P700'],
  'pgl-p703-p702-guide': ['rail-P703', 'rail-P702'],
  'pgc-1105-to-1106-guide': ['rail-1105-1106-guide'],
  'pgc-1107-to-1104-guide': ['rail-1107-to-1115-background', 'rail-1115', 'rail-1115-to-1104-background'],
  'pgc-p1100-to-1115-guide': ['rail-P1100'],
  'pgc-p1101-to-1115-guide': ['rail-P1101'],
  'pgc-p1102-to-1115-guide': ['rail-P1102'],
  'pgc-p1103-to-1115-guide': ['rail-P1103'],
  'skg-605-to-604-lower-guide': ['rail-P600'],
  'skg-605-to-604-upper-guide': ['rail-P601', 'rail-P601-2'],
  'skg-613-to-614-guide': ['rail-P613'],
  'skg-p606-guide': ['rail-P606'],
  'skg-p608-guide': ['rail-P608'],
  'skg-p610-guide': ['rail-P610'],
  'skg-p615-guide': ['rail-P615'],
}

const TRACK_GUIDE_ROUTE_RAIL_IDS: Record<string, string> = {
  'rail-P601-2': 'rail-P601',
}

const ROUTE_SEGMENT_RAIL_IDS: Record<string, string> = {
  'bgk-651': 'rail-651',
  'bgk-p602': 'rail-P602',
  'bgk-p603': 'rail-P603',
  'bgk-rt1': 'rail-RT1',
  'bgk-rt2': 'rail-650',
  'bgk-rt2-652': 'rail-652',
  'bgk-rt3': 'rail-RT3',
  'bgk-rt3-661': 'rail-661',
  'section02-middle-turnback': 'rail-middle-turnback',
}

const ROUTE_SEGMENT_RAIL_PART_IDS: Record<string, readonly string[]> = {
  'section02-middle-turnback': ['rail-314', 'rail-318', 'rail-320'],
  'bgk-rt1': ['rail-655', 'rail-653'],
  'bgk-rt3': ['rail-663', 'rail-665'],
  'wlh-turnback': ['rail-416', 'rail-418', 'rail-420'],
}

const SHAPED_TRACK_RAIL_IDS: Record<string, string> = {
  'bgk-rt2-right-edge': 'rail-RT2-edge',
  'bgk-rt1-left-edge': 'rail-RT1',
  'bgk-rt1-right-edge': 'rail-611',
}

const STATIC_TRACK_PIECE_RAIL_IDS: Record<string, string> = {
  'hbf-p101-approach-100': 'rail-100',
  'hbf-p101-approach-102': 'rail-102',
}

const STATIC_TRACK_PATH_RAIL_IDS: Record<string, string> = {
  'hbf-p101-track-102': 'rail-102',
  'hbf-p101-track-106': 'rail-106',
}

const TRACK_PIECE_RAIL_IDS_BY_POSITION: Record<string, string> = {
  'lower:section03:17:30': 'rail-500',
  'upper:section03:785:16': 'rail-609',
}

export function getTrackGuideRouteRailId(railId: string, guide?: RailOwnershipSource) {
  if (guide?.railIds && guide.routeRailIds) {
    const railIndex = guide.railIds.indexOf(railId)
    const routeRailId = railIndex >= 0 ? guide.routeRailIds[railIndex] : undefined

    if (routeRailId) {
      return routeRailId
    }
  }

  return TRACK_GUIDE_ROUTE_RAIL_IDS[railId] ?? railId
}

export function getTrackGuideRailId(guide: RailOwnershipSource | string, index?: number) {
  const guideId = getRailOwnershipSourceId(guide)
  const mappedIds = getRailOwnershipRailIds(guide) ?? TRACK_GUIDE_RAIL_IDS[guideId]

  if (typeof index === 'number') {
    return mappedIds?.[index] ?? `rail-${normalizeRailLabel(guideId)}-${index + 1}`
  }

  return mappedIds?.[0] ?? `rail-${normalizeRailLabel(guideId)}`
}

export function getTrackPieceRailId(
  piece: TrackPieceRailSource,
  track: 'lower' | 'upper',
) {
  if (piece.railId) {
    return piece.railId
  }

  const section = getRailSection(piece.x)
  const explicitRailId = TRACK_PIECE_RAIL_IDS_BY_POSITION[
    `${track}:${section.name}:${Math.round(piece.x - section.start)}:${Math.round(piece.width)}`
  ]

  if (explicitRailId) {
    return explicitRailId
  }

  const label = getTrackPieceLabel(piece, track, section.name)

  if (label) {
    return `rail-${normalizeRailLabel(label)}`
  }

  return `rail-unlabelled-${track}-${section.name}-${Math.round(piece.x - section.start)}-${Math.round(piece.width)}`
}

export function getBranchGuideRailId(x: number) {
  const section = getRailSection(x)
  const relativeX = Math.round(x - section.start)

  return `rail-branch-${section.name}-${relativeX}`
}

export function getRouteSegmentRailId(segment: RailOwnershipSource | string) {
  const railId = getRailOwnershipRailId(segment)

  if (railId) {
    return railId
  }

  const segmentId = getRailOwnershipSourceId(segment)

  return ROUTE_SEGMENT_RAIL_IDS[segmentId] ?? `rail-${normalizeRailLabel(segmentId)}`
}

export function getRouteSegmentRailPartId(segment: RailOwnershipSource | string, index: number) {
  const segmentId = getRailOwnershipSourceId(segment)
  const mappedIds = getRailOwnershipRailIds(segment) ?? ROUTE_SEGMENT_RAIL_PART_IDS[segmentId]

  if (mappedIds?.[index]) {
    return mappedIds[index]
  }

  const railId = getRouteSegmentRailId(segment)

  return index === 0 ? railId : `${railId}-${index + 1}`
}

export function getRouteSegmentRailPartIds(segment: RailOwnershipSource | string) {
  const segmentId = getRailOwnershipSourceId(segment)

  return getRailOwnershipRailIds(segment) ?? ROUTE_SEGMENT_RAIL_PART_IDS[segmentId] ?? []
}

export function getShapedTrackRailId(piece: RailOwnershipSource | string) {
  const railId = getRailOwnershipRailId(piece)

  if (railId) {
    return railId
  }

  const pieceId = getRailOwnershipSourceId(piece)

  return SHAPED_TRACK_RAIL_IDS[pieceId] ?? `rail-${normalizeRailLabel(pieceId)}`
}

export function getStaticTrackPieceRailId(piece: RailOwnershipSource | string) {
  const railId = getRailOwnershipRailId(piece)

  if (railId) {
    return railId
  }

  const pieceId = getRailOwnershipSourceId(piece)

  return STATIC_TRACK_PIECE_RAIL_IDS[pieceId] ?? `rail-${normalizeRailLabel(pieceId)}`
}

export function getStaticTrackPathRailId(path: RailOwnershipSource | string) {
  const railId = getRailOwnershipRailId(path)

  if (railId) {
    return railId
  }

  const pathId = getRailOwnershipSourceId(path)

  return STATIC_TRACK_PATH_RAIL_IDS[pathId] ?? `rail-${normalizeRailLabel(pathId)}`
}

export function getRailSection(x: number) {
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

function getTrackPieceLabel(
  piece: TrackPieceRailSource,
  track: 'lower' | 'upper',
  sectionName: ReturnType<typeof getRailSection>['name'],
) {
  const labelY = track === 'upper' ? 211 : 478
  const centerX = piece.x + piece.width / 2

  const candidates = schematicAnnotations.filter((annotation) => (
    annotation.y === labelY
    && getRailSection(annotation.x).name === sectionName
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

  return closest && Math.abs(closest.x - centerX) <= 96 ? closest.label : undefined
}

export function normalizeRailLabel(label: string) {
  return label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getRailOwnershipSourceId(source: RailOwnershipSource | string) {
  return typeof source === 'string' ? source : source.id
}

function getRailOwnershipRailId(source: RailOwnershipSource | string) {
  return typeof source === 'string' ? undefined : source.railId
}

function getRailOwnershipRailIds(source: RailOwnershipSource | string) {
  return typeof source === 'string' ? undefined : source.railIds
}
