import { MAP_SECTION_OFFSETS } from './model'

export type SignalRouteDefinition = {
  allowedLogicalExclusiveRailPairs?: readonly (readonly [string, string])[]
  commandSegmentIds: readonly string[]
  commandStateSegmentIds: readonly string[]
  fleetControlDisabled?: boolean
  keepRealSegmentsUnsetOnUnset?: boolean
  pendingImplementation?: boolean
  realSegmentIds: readonly string[]
  routeLabel: string
  signalLabel: string
}

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

export const S608_R608_600_REAL_ROUTE_SEGMENT_IDS = [
  'rail-618',
  'rail-616',
  'rail-614',
  'rail-612',
  'rail-610',
  'rail-608',
] as const
export const S608_R608_600_ROUTE_STATE_SEGMENT_ID = 'route-r608-600-command'
export const S608_R608_600_ROUTE_COMMAND_SEGMENT_IDS = [
  S608_R608_600_ROUTE_STATE_SEGMENT_ID,
  ...S608_R608_600_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S608_R608_602_REAL_ROUTE_SEGMENT_IDS = [
  'rail-618',
  'rail-616',
  'rail-614',
  'rail-P606',
  'rail-607',
] as const
export const S608_R608_602_ROUTE_STATE_SEGMENT_ID = 'route-r608-602-command'
export const S608_R608_602_ROUTE_COMMAND_SEGMENT_IDS = [
  S608_R608_602_ROUTE_STATE_SEGMENT_ID,
  ...S608_R608_602_REAL_ROUTE_SEGMENT_IDS,
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

export const S613_R613_617_REAL_ROUTE_SEGMENT_IDS = [
  'rail-611',
  'rail-613',
] as const
export const S613_R613_617_ROUTE_STATE_SEGMENT_ID = 'route-r613-617-command'
export const S613_R613_617_ROUTE_COMMAND_SEGMENT_IDS = [
  S613_R613_617_ROUTE_STATE_SEGMENT_ID,
  ...S613_R613_617_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S613_R613_621_REAL_ROUTE_SEGMENT_IDS = [
  'rail-611',
  'rail-P613',
  'rail-P608',
  'rail-616',
  'rail-618',
  'rail-620',
] as const
export const S613_R613_621_ROUTE_STATE_SEGMENT_ID = 'route-r613-621-command'
export const S613_R613_621_ROUTE_COMMAND_SEGMENT_IDS = [
  S613_R613_621_ROUTE_STATE_SEGMENT_ID,
  ...S613_R613_621_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S617_R617_619_REAL_ROUTE_SEGMENT_IDS = [
  'rail-613',
  'rail-615',
  'rail-617',
] as const
export const S617_R617_619_ROUTE_STATE_SEGMENT_ID = 'route-r617-619-command'
export const S617_R617_619_ROUTE_COMMAND_SEGMENT_IDS = [
  S617_R617_619_ROUTE_STATE_SEGMENT_ID,
  ...S617_R617_619_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S619_R619_701_REAL_ROUTE_SEGMENT_IDS = [
  'rail-617',
  'rail-619',
  'rail-621',
  'rail-701',
  'rail-703',
] as const
export const S619_R619_701_ROUTE_STATE_SEGMENT_ID = 'route-r619-701-command'
export const S619_R619_701_ROUTE_COMMAND_SEGMENT_IDS = [
  S619_R619_701_ROUTE_STATE_SEGMENT_ID,
  ...S619_R619_701_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S655_R655_617_REAL_ROUTE_SEGMENT_IDS = [
  'rail-653',
  'rail-P609',
  'rail-P611',
  'rail-613',
] as const
export const S655_R655_617_ROUTE_STATE_SEGMENT_ID = 'route-r655-617-command'
export const S655_R655_617_ROUTE_COMMAND_SEGMENT_IDS = [
  S655_R655_617_ROUTE_STATE_SEGMENT_ID,
  ...S655_R655_617_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S700_R700_608_REAL_ROUTE_SEGMENT_IDS = [
  'rail-710',
  'rail-708',
  'rail-706',
  'rail-704',
  'rail-702',
  'rail-700',
  'rail-622',
  'rail-620',
  'rail-618',
] as const
export const S700_R700_608_ROUTE_STATE_SEGMENT_ID = 'route-r700-608-command'
export const S700_R700_608_ROUTE_COMMAND_SEGMENT_IDS = [
  S700_R700_608_ROUTE_STATE_SEGMENT_ID,
  ...S700_R700_608_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S700_R700_610_REAL_ROUTE_SEGMENT_IDS = [
  'rail-710',
  'rail-708',
  'rail-706',
  'rail-P700',
  'rail-P701',
  'rail-703',
  'rail-701',
  'rail-621',
  'rail-619',
  'rail-617',
] as const
export const S700_R700_610_ROUTE_STATE_SEGMENT_ID = 'route-r700-610-command'
export const S700_R700_610_ROUTE_COMMAND_SEGMENT_IDS = [
  S700_R700_610_ROUTE_STATE_SEGMENT_ID,
  ...S700_R700_610_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S700_REAL_ROUTE_SEGMENT_IDS = S700_R700_608_REAL_ROUTE_SEGMENT_IDS
export const S700_ROUTE_STATE_SEGMENT_ID = S700_R700_608_ROUTE_STATE_SEGMENT_ID
export const S700_ROUTE_COMMAND_SEGMENT_IDS = S700_R700_608_ROUTE_COMMAND_SEGMENT_IDS

export const S701_R701_705_REAL_ROUTE_SEGMENT_IDS = [
  'rail-703',
  'rail-705',
] as const
export const S701_R701_705_ROUTE_STATE_SEGMENT_ID = 'route-r701-705-command'
export const S701_R701_705_ROUTE_COMMAND_SEGMENT_IDS = [
  S701_R701_705_ROUTE_STATE_SEGMENT_ID,
  ...S701_R701_705_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S701_R701_709_REAL_ROUTE_SEGMENT_IDS = [
  'rail-703',
  'rail-P701',
  'rail-P700',
  'rail-706',
  'rail-708',
  'rail-710',
] as const
export const S701_R701_709_ROUTE_STATE_SEGMENT_ID = 'route-r701-709-command'
export const S701_R701_709_ROUTE_COMMAND_SEGMENT_IDS = [
  S701_R701_709_ROUTE_STATE_SEGMENT_ID,
  ...S701_R701_709_REAL_ROUTE_SEGMENT_IDS,
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

export const S705_R705_707_REAL_ROUTE_SEGMENT_IDS = [
  'rail-705',
  'rail-707',
  'rail-709',
] as const
export const S705_R705_707_ROUTE_STATE_SEGMENT_ID = 'route-r705-707-command'
export const S705_R705_707_ROUTE_COMMAND_SEGMENT_IDS = [
  S705_R705_707_ROUTE_STATE_SEGMENT_ID,
  ...S705_R705_707_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S707_R707_1101_REAL_ROUTE_SEGMENT_IDS = [
  'rail-709',
  'rail-711',
  'rail-713',
  'rail-715',
  'rail-1103',
] as const
export const S707_R707_1101_ROUTE_STATE_SEGMENT_ID = 'route-r707-1101-command'
export const S707_R707_1101_ROUTE_COMMAND_SEGMENT_IDS = [
  S707_R707_1101_ROUTE_STATE_SEGMENT_ID,
  ...S707_R707_1101_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1101_R1101_1105_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1103',
  'rail-1105',
] as const
export const S1101_R1101_1105_ROUTE_STATE_SEGMENT_ID = 'route-r1101-1105-command'
export const S1101_R1101_1105_ROUTE_COMMAND_SEGMENT_IDS = [
  S1101_R1101_1105_ROUTE_STATE_SEGMENT_ID,
  ...S1101_R1101_1105_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1101_R1101_1109_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1103',
  'rail-P1101',
  'rail-1115',
  'rail-P1102',
  'rail-1108',
] as const
export const S1101_R1101_1109_ROUTE_STATE_SEGMENT_ID = 'route-r1101-1109-command'
export const S1101_R1101_1109_ROUTE_COMMAND_SEGMENT_IDS = [
  S1101_R1101_1109_ROUTE_STATE_SEGMENT_ID,
  ...S1101_R1101_1109_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1102_R1102_704_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1108',
  'rail-1106',
  'rail-1104',
  'rail-1102',
  'rail-716',
  'rail-714',
] as const
export const S1102_R1102_704_ROUTE_STATE_SEGMENT_ID = 'route-r1102-704-command'
export const S1102_R1102_704_ROUTE_COMMAND_SEGMENT_IDS = [
  S1102_R1102_704_ROUTE_STATE_SEGMENT_ID,
  ...S1102_R1102_704_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1102_R1102_706_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1108',
  'rail-P1102',
  'rail-1115',
  'rail-P1101',
  'rail-1103',
  'rail-715',
  'rail-713',
] as const
export const S1102_R1102_706_ROUTE_STATE_SEGMENT_ID = 'route-r1102-706-command'
export const S1102_R1102_706_ROUTE_COMMAND_SEGMENT_IDS = [
  S1102_R1102_706_ROUTE_STATE_SEGMENT_ID,
  ...S1102_R1102_706_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1104_R1104_704_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1109',
  'rail-P1103',
  'rail-1115',
  'rail-P1100',
  'rail-1102',
  'rail-716',
  'rail-714',
] as const
export const S1104_R1104_704_ROUTE_STATE_SEGMENT_ID = 'route-r1104-704-command'
export const S1104_R1104_704_ROUTE_COMMAND_SEGMENT_IDS = [
  S1104_R1104_704_ROUTE_STATE_SEGMENT_ID,
  ...S1104_R1104_704_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1104_R1104_706_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1109',
  'rail-1107',
  'rail-1105',
  'rail-1103',
  'rail-715',
  'rail-713',
] as const
export const S1104_R1104_706_ROUTE_STATE_SEGMENT_ID = 'route-r1104-706-command'
export const S1104_R1104_706_ROUTE_COMMAND_SEGMENT_IDS = [
  S1104_R1104_706_ROUTE_STATE_SEGMENT_ID,
  ...S1104_R1104_706_REAL_ROUTE_SEGMENT_IDS,
] as const

export const S1104_REAL_ROUTE_SEGMENT_IDS = S1104_R1104_704_REAL_ROUTE_SEGMENT_IDS

export const S1105_R1105_1107_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1105',
  'rail-1107',
  'rail-1109',
] as const
export const S1105_R1105_1107_ROUTE_STATE_SEGMENT_ID = 'route-r1105-1107-command'
export const S1105_R1105_1107_ROUTE_COMMAND_SEGMENT_IDS = [
  S1105_R1105_1107_ROUTE_STATE_SEGMENT_ID,
  ...S1105_R1105_1107_REAL_ROUTE_SEGMENT_IDS,
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
  S608_R608_600_ROUTE_STATE_SEGMENT_ID,
  S608_R608_602_ROUTE_STATE_SEGMENT_ID,
  S608_R608_803_ROUTE_STATE_SEGMENT_ID,
] as const

export const S700_SIGNAL_ROUTE_RAIL_IDS = [
  S700_R700_608_ROUTE_STATE_SEGMENT_ID,
  S700_R700_610_ROUTE_STATE_SEGMENT_ID,
] as const

export const S704_SIGNAL_ROUTE_RAIL_IDS = [
  S704_ROUTE_STATE_SEGMENT_ID,
] as const

export const SIGNAL_ROUTE_DEFINITIONS = [
  {
    commandSegmentIds: S610_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S610_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S610_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R610_652',
    signalLabel: 'S610',
  },
  {
    commandSegmentIds: S608_R608_600_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S608_R608_600_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S608_R608_600_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R608_600',
    signalLabel: 'S608',
  },
  {
    commandSegmentIds: S608_R608_602_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S608_R608_602_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S608_R608_602_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R608_602',
    signalLabel: 'S608',
  },
  {
    commandSegmentIds: S608_R608_803_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S608_R608_803_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S608_R608_803_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R608_803',
    signalLabel: 'S608',
  },
  {
    commandSegmentIds: S613_R613_617_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S613_R613_617_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S613_R613_617_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R613_617',
    signalLabel: 'S613',
  },
  {
    commandSegmentIds: S613_R613_621_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S613_R613_621_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S613_R613_621_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R613_621',
    signalLabel: 'S613',
  },
  {
    commandSegmentIds: S617_R617_619_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S617_R617_619_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S617_R617_619_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R617_619',
    signalLabel: 'S617',
  },
  {
    commandSegmentIds: S619_R619_701_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S619_R619_701_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S619_R619_701_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R619_701',
    signalLabel: 'S619',
  },
  {
    commandSegmentIds: S655_R655_617_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S655_R655_617_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S655_R655_617_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R655_617',
    signalLabel: 'S655',
  },
  {
    commandSegmentIds: S700_R700_608_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S700_R700_608_ROUTE_STATE_SEGMENT_ID],
    keepRealSegmentsUnsetOnUnset: true,
    realSegmentIds: S700_R700_608_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R700_608',
    signalLabel: 'S700',
  },
  {
    commandSegmentIds: S700_R700_610_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S700_R700_610_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    keepRealSegmentsUnsetOnUnset: true,
    realSegmentIds: S700_R700_610_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R700_610',
    signalLabel: 'S700',
  },
  {
    commandSegmentIds: S701_R701_705_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S701_R701_705_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S701_R701_705_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R701_705',
    signalLabel: 'S701',
  },
  {
    commandSegmentIds: S701_R701_709_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S701_R701_709_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S701_R701_709_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R701_709',
    signalLabel: 'S701',
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
    commandSegmentIds: S705_R705_707_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S705_R705_707_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S705_R705_707_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R705_707',
    signalLabel: 'S705',
  },
  {
    commandSegmentIds: S707_R707_1101_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S707_R707_1101_ROUTE_STATE_SEGMENT_ID],
    realSegmentIds: S707_R707_1101_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R707_1101',
    signalLabel: 'S707',
  },
  {
    commandSegmentIds: S1101_R1101_1105_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S1101_R1101_1105_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S1101_R1101_1105_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1101_1105',
    signalLabel: 'S1101',
  },
  {
    commandSegmentIds: S1101_R1101_1109_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S1101_R1101_1109_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S1101_R1101_1109_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1101_1109',
    signalLabel: 'S1101',
  },
  {
    commandSegmentIds: S1102_R1102_704_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S1102_R1102_704_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S1102_R1102_704_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1102_704',
    signalLabel: 'S1102',
  },
  {
    commandSegmentIds: S1102_R1102_706_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S1102_R1102_706_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S1102_R1102_706_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1102_706',
    signalLabel: 'S1102',
  },
  {
    commandSegmentIds: S1104_R1104_704_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S1104_R1104_704_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S1104_R1104_704_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1104_704',
    signalLabel: 'S1104',
  },
  {
    commandSegmentIds: S1104_R1104_706_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S1104_R1104_706_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S1104_R1104_706_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1104_706',
    signalLabel: 'S1104',
  },
  {
    commandSegmentIds: S1105_R1105_1107_ROUTE_COMMAND_SEGMENT_IDS,
    commandStateSegmentIds: [S1105_R1105_1107_ROUTE_STATE_SEGMENT_ID],
    fleetControlDisabled: true,
    realSegmentIds: S1105_R1105_1107_REAL_ROUTE_SEGMENT_IDS,
    routeLabel: 'Route R1105_1107',
    signalLabel: 'S1105',
  },
] as const satisfies readonly SignalRouteDefinition[]

export const STARTUP_SIGNAL_ROUTE_SEGMENT_IDS = SIGNAL_ROUTE_DEFINITIONS.flatMap((routeDefinition) => (
  routeDefinition.commandSegmentIds
))

export const SIGNAL_LABELS_WITHOUT_ROUTES = new Set<string>(['S709'])

export function getDefinedSignalRoutes(signalLabel: string): SignalRouteDefinition[] {
  return SIGNAL_ROUTE_DEFINITIONS.filter((route) => route.signalLabel === signalLabel)
}

export function getDefinedSignalRoute(signalLabel: string, routeLabel: string): SignalRouteDefinition | undefined {
  return SIGNAL_ROUTE_DEFINITIONS.find((route) => (
    route.signalLabel === signalLabel && route.routeLabel === routeLabel
  ))
}

export function getDefinedSignalRouteByLabel(routeLabel: string): SignalRouteDefinition | undefined {
  return SIGNAL_ROUTE_DEFINITIONS.find((route) => route.routeLabel === routeLabel)
}

export function getDefinedSignalRoutesByLabels(routeLabels: readonly string[]): SignalRouteDefinition[] {
  return routeLabels.flatMap((routeLabel) => {
    const routeDefinition = getDefinedSignalRouteByLabel(routeLabel)

    return routeDefinition ? [routeDefinition] : []
  })
}
