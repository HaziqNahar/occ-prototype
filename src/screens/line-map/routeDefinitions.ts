import { MAP_SECTION_OFFSETS } from './model'

export const S610_ROUTE_SEGMENT_IDS = [
  'route-r610-652-652',
  'route-r610-652-650',
  'bgk-rt2-p606',
  'route-r610-652-lower-614',
  'route-r610-652-p608-default',
  'route-r610-652-lower-p610',
  'route-r610-652-upper-p615',
  'route-r610-652-p610-default',
  'route-r610-652-p615-default',
  'route-r610-652-upper-617',
  'route-r610-652-upper-619',
  'route-r610-652-upper-621',
  'route-r610-652-upper-701',
  'route-r610-652-upper-703',
] as const

export const S610_LEGACY_ROUTE_SEGMENT_MIGRATIONS = [
  ['bgk-rt2-652', 'route-r610-652-652'],
  ['bgk-rt2', 'route-r610-652-650'],
] as const

export const REMOVED_ROUTE_SEGMENT_IDS = [
  'route-r610-652-652',
  'route-r610-652-650',
  'bgk-rt2-p606',
  'route-r610-652-lower-614',
  'route-r610-652-p608-default',
  'route-r610-652-lower-p610',
  'route-r610-652-upper-p615',
  'route-r610-652-p610-default',
  'route-r610-652-p615-default',
  'route-r610-652-upper-617',
  'route-r610-652-upper-619',
  'route-r610-652-upper-621',
  'route-r610-652-upper-701',
  'route-r610-652-upper-703',
  'route-r610-652-upper-705',
  'skg-p606-guide',
  'pgl-p701-p700-guide',
  'rail-guide-skg-p606-guide-0',
  'rail-guide-pgl-p701-p700-guide-0',
  'rail-guide-pgl-p701-p700-guide-1',
  'rail-P701-2',
  'rail-P1100-2',
  'rail-P1101-2',
  'rail-P1101-3',
  'rail-P1101-4',
  'rail-P1101-5',
  'rail-P1102-2',
  'rail-P1103-2',
  'rail-P1103-3',
  'rail-P1103-4',
  'rail-P1103-5',
] as const

export const S610_REAL_ROUTE_SEGMENT_IDS = [
  'rail-652',
  'rail-650',
  'rail-P606',
  'rail-614',
  'rail-P610',
  'rail-P615',
  'rail-617',
  'rail-619',
  'rail-621',
  'rail-705',
  'rail-701',
  'rail-703',
] as const
export const S610_ROUTE_STATE_SEGMENT_ID = 'route-r610-652-command'
export const S610_ROUTE_COMMAND_SEGMENT_IDS = [
  S610_ROUTE_STATE_SEGMENT_ID,
  ...S610_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S608_R608_803_REAL_ROUTE_SEGMENT_IDS = [
  'rail-618',
  'rail-616',
  'rail-614',
  'rail-P606',
  'rail-650',
  'rail-652',
] as const
export const S608_R608_803_ROUTE_STATE_SEGMENT_ID = 'route-r608-803-command'
export const S608_R608_803_ROUTE_COMMAND_SEGMENT_IDS = [
  S608_R608_803_ROUTE_STATE_SEGMENT_ID,
  ...S608_R608_803_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S700_REAL_ROUTE_SEGMENT_IDS = [
  'rail-708',
  'rail-706',
  'rail-704',
  'rail-702',
  'rail-700',
  'rail-622',
  'rail-620',
  'rail-618',
] as const
export const S700_ROUTE_STATE_SEGMENT_ID = 'route-r709-705-command'
export const S700_ROUTE_COMMAND_SEGMENT_IDS = [
  S700_ROUTE_STATE_SEGMENT_ID,
  ...S700_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S704_REAL_ROUTE_SEGMENT_IDS = [
  'rail-712',
  'rail-710',
] as const
export const S704_ROUTE_STATE_SEGMENT_ID = 'route-r704-700-command'
export const S704_ROUTE_COMMAND_SEGMENT_IDS = [
  S704_ROUTE_STATE_SEGMENT_ID,
  ...S704_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1104_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1109',
  'rail-P1103',
  'rail-1115',
  'rail-P1100',
  'rail-1102',
  'rail-716',
  'rail-714',
] as const

export const STARTUP_SIGNAL_ROUTE_SEGMENT_IDS = [
  S610_ROUTE_STATE_SEGMENT_ID,
  ...S610_REAL_ROUTE_SEGMENT_IDS,
  ...S608_R608_803_ROUTE_COMMAND_SEGMENT_IDS,
  ...S700_ROUTE_COMMAND_SEGMENT_IDS,
  ...S704_ROUTE_COMMAND_SEGMENT_IDS,
  ...S1104_REAL_ROUTE_SEGMENT_IDS,
] as const

export const LINE_SUFFIX_ROUTE_SEGMENT_MIGRATIONS = [
  ['rail-614-section03', 'rail-614'],
  ['rail-617-section03', 'rail-617'],
  ['rail-619-section03', 'rail-619'],
  ['rail-621-section03', 'rail-621'],
  ['rail-705-section04', 'rail-705'],
  ['rail-701-section04', 'rail-701'],
  ['rail-703-section04', 'rail-703'],
  ['rail-1109-section04', 'rail-1109'],
  ['rail-1102-section04', 'rail-1102'],
  ['rail-716-section04', 'rail-716'],
  ['rail-712-section04', 'rail-712'],
  ['rail-710-section04', 'rail-710'],
  ['rail-714-section04', 'rail-714'],
] as const

export const S610_RETIRED_ROUTE_SEGMENT_IDS = [
  'rail-P701',
] as const

export const S610_SIGNAL_TRACK_SEGMENT_IDS = [
  `track:${Math.round(MAP_SECTION_OFFSETS.section03 + 1198)}`,
  `track:${Math.round(MAP_SECTION_OFFSETS.section04 + 187)}`,
] as const

export const S608_SIGNAL_ROUTE_RAIL_IDS = [
  S608_R608_803_ROUTE_STATE_SEGMENT_ID,
] as const

export const S700_SIGNAL_ROUTE_RAIL_IDS = [
  S700_ROUTE_STATE_SEGMENT_ID,
] as const

export const S704_SIGNAL_ROUTE_RAIL_IDS = [
  S704_ROUTE_STATE_SEGMENT_ID,
] as const

export type SignalRouteDefinition = {
  commandSegmentIds: readonly string[]
  commandStateSegmentIds: readonly string[]
  keepRealSegmentsUnsetOnUnset?: boolean
  pendingImplementation?: boolean
  realSegmentIds: readonly string[]
  routeLabel: string
  signalLabel: string
}

export const SIGNAL_ROUTE_DEFINITIONS = [
  {
    commandSegmentIds: S610_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S610_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S610_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R610_652',
    signalLabel: 'S610',
  },
  {
    commandSegmentIds: [],
    commandStateSegmentIds: [],
    pendingImplementation: true,
    realSegmentIds: [],
    routeLabel: 'Route R608_600',
    signalLabel: 'S608',
  },
  {
    commandSegmentIds: [],
    commandStateSegmentIds: [],
    pendingImplementation: true,
    realSegmentIds: [],
    routeLabel: 'Route R608_602',
    signalLabel: 'S608',
  },
  {
    commandSegmentIds: S608_R608_803_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S608_R608_803_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S608_R608_803_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R608_803',
    signalLabel: 'S608',
  },
  {
    commandSegmentIds: S700_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S700_ROUTE_STATE_SEGMENT_ID],
    keepRealSegmentsUnsetOnUnset: true,
    realSegmentIds: S700_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R709_705',
    signalLabel: 'S700',
  },
  {
    commandSegmentIds: S704_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S704_ROUTE_STATE_SEGMENT_ID],
    keepRealSegmentsUnsetOnUnset: true,
    realSegmentIds: S704_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R704_700',
    signalLabel: 'S704',
  },
  {
    commandSegmentIds: S1104_REAL_ROUTE_SEGMENT_IDS,
    commandStateSegmentIds: S1104_REAL_ROUTE_SEGMENT_IDS,
    realSegmentIds: S1104_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1104_704',
    signalLabel: 'S1104',
  },
] as const satisfies readonly SignalRouteDefinition[]

export const SIGNAL_LABELS_WITHOUT_ROUTES = new Set<string>(['S709'])

export function getDefinedSignalRoutes(signalLabel: string): SignalRouteDefinition[] {
  return SIGNAL_ROUTE_DEFINITIONS.filter((route) => route.signalLabel === signalLabel)
}

export function getDefinedSignalRoute(signalLabel: string, routeLabel: string): SignalRouteDefinition | undefined {
  return SIGNAL_ROUTE_DEFINITIONS.find((route) => (
    route.signalLabel === signalLabel && route.routeLabel === routeLabel
  ))
}
