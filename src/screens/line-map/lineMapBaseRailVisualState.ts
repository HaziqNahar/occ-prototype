import type { LineMapRouteSegmentStatus, LineMapRuntimeState } from '../../types'
import {
  MAP_SECTION_OFFSETS,
  lowerTrackPieces,
  schematicAnnotations,
  upperTrackPieces,
} from './model'

const BASE_LINE_MAP_RAIL_VISUAL_STATUSES = {
  'rail-314': 'UNSET',
  'rail-318': 'UNSET',
  'rail-320': 'UNSET',
  'rail-416': 'UNSET',
  'rail-418': 'UNSET',
  'rail-420': 'UNSET',
  'rail-651': 'SET',
  'bgk-651': 'SET',
  'rail-653': 'UNSET',
  'rail-655': 'UNSET',
  'rail-661': 'UNSET',
  'rail-RT3': 'UNSET',
} as const satisfies Record<string, LineMapRouteSegmentStatus>

const BASE_ACTIVE_STRAIGHT_RAIL_IDS: ReadonlySet<string> = new Set([
  ...getBaseActiveStraightRailIds(upperTrackPieces, 'upper'),
  ...getBaseActiveStraightRailIds(lowerTrackPieces, 'lower'),
])

export function createLineMapBaseRailVisualStates(): LineMapRuntimeState['routeSegments'] {
  return Object.fromEntries([
    ...Array.from(BASE_ACTIVE_STRAIGHT_RAIL_IDS).map((segmentId) => [
      segmentId,
      createBaseRailVisualState(segmentId, 'SET'),
    ]),
    ...Object.entries(BASE_LINE_MAP_RAIL_VISUAL_STATUSES).map(([segmentId, status]) => [
      segmentId,
      createBaseRailVisualState(segmentId, status),
    ]),
  ])
}

export function getLineMapBaseRailVisualState(segmentId: string) {
  if (BASE_ACTIVE_STRAIGHT_RAIL_IDS.has(segmentId)) {
    return createBaseRailVisualState(segmentId, 'SET')
  }

  const status = BASE_LINE_MAP_RAIL_VISUAL_STATUSES[segmentId as keyof typeof BASE_LINE_MAP_RAIL_VISUAL_STATUSES]

  return status ? createBaseRailVisualState(segmentId, status) : undefined
}

export function isLineMapBaseRailVisualState(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  const baseState = state ? getLineMapBaseRailVisualState(state.segmentId) : undefined

  return Boolean(
    state
    && baseState
    && state.status === baseState.status
    && state.trainId === baseState.trainId
    && state.updatedAt === baseState.updatedAt,
  )
}

function createBaseRailVisualState(segmentId: string, status: LineMapRouteSegmentStatus) {
  return {
    segmentId,
    status,
    trainId: '',
    updatedAt: 0,
  } satisfies LineMapRuntimeState['routeSegments'][string]
}

function getBaseActiveStraightRailIds(
  pieces: readonly { x: number; width: number }[],
  track: 'lower' | 'upper',
) {
  const labelY = track === 'upper' ? 211 : 478

  return pieces
    .map((piece) => {
      const section = getLineMapBaseRailSection(piece.x)
      const centerX = piece.x + piece.width / 2
      const candidates = schematicAnnotations.filter((annotation) => (
        annotation.y === labelY
        && getLineMapBaseRailSection(annotation.x).name === section.name
        && /^[0-9A-Z]+$/.test(annotation.label)
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

      return closest && Math.abs(closest.x - centerX) <= 96
        ? `rail-${normalizeLineMapBaseRailLabel(closest.label)}`
        : undefined
    })
    .filter((segmentId): segmentId is string => Boolean(segmentId))
}

function getLineMapBaseRailSection(x: number) {
  const sections = [
    { name: 'section01', start: MAP_SECTION_OFFSETS.section01 },
    { name: 'section02', start: MAP_SECTION_OFFSETS.section02 },
    { name: 'section03', start: MAP_SECTION_OFFSETS.section03 },
    { name: 'section04', start: MAP_SECTION_OFFSETS.section04 },
  ] as const

  return sections.reduce((current, section) => (x >= section.start ? section : current), sections[0])
}

function normalizeLineMapBaseRailLabel(label: string) {
  return label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
