import {
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  PGC_TO_S608_HOLD_UPPER_ROUTE_STEPS,
  PGL_TO_SKG_MAINLINE_ROUTE_STEPS,
  PGC_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS,
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
  S1104_TO_S608_HOLD_ROUTE_STEPS,
  S702_TO_S608_HOLD_ROUTE_STEPS,
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
  SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX,
  SKG_TO_PGL_MAINLINE_ROUTE_STEPS,
  SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
  SKG_TO_PGL_TIMETABLE_ROUTE_STEPS,
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from './trainMovementRoutes'
import type { TrainRouteAnimationStep } from './trainMovementRoutes'
import type { TrainDirection } from '../../types'
import {
  getDefinedSignalRoutesByLabels,
} from './routeDefinitions'

export type LineMapRoutePathOwner = 'manual' | 'timetable'
export type ManualRouteDestinationKind = 'ANY' | 'RT2_DEPOT' | 'SKG' | 'SKG_NB_LAUNCH'

export type ManualLineMapRoutePathDefinition = {
  destinationKind: ManualRouteDestinationKind
  direction?: TrainDirection
  excludedTrainIds?: readonly string[]
  id: string
  movementRouteSteps: readonly TrainRouteAnimationStep[]
  owner: 'manual'
  requiresStartAtFirstStep?: boolean
  routeLabel: string
  routeLabels: readonly string[]
  routeModePanelCodes: readonly string[]
  service?: 'NB' | 'SB'
  stateRouteStepIndexOffset?: number
  stateRouteSteps: readonly TrainRouteAnimationStep[]
  trainIds?: readonly string[]
}

export type TimetableRouteLocation =
  | 'BGK'
  | 'BNK'
  | 'CNT'
  | 'CQY'
  | 'DBG'
  | 'FRP'
  | 'HBF'
  | 'HGN'
  | 'KVN'
  | 'LTI'
  | 'OTP'
  | 'PGC'
  | 'PGL'
  | 'PTP'
  | 'RT1_DEPOT'
  | 'RT2_DEPOT'
  | 'RT3_DEPOT'
  | 'SER'
  | 'SKG'
  | 'WLH'

export type TimetablePlatformStopDefinition = {
  platformCode: Extract<TimetableRouteLocation, 'BGK' | 'PGC' | 'PGL' | 'SKG'>
  stepIndex: number
  track: 'NB' | 'SB'
}

export type TimetableRoutePathMatcher = {
  anyOf?: readonly TimetableRoutePathMatcher[]
  destinationAny?: readonly TimetableRouteLocation[]
  originAny?: readonly TimetableRouteLocation[]
  run?: 'NB' | 'SB'
  stationAny?: readonly TimetableRouteLocation[]
}

export type TimetableLineMapRoutePathDefinition = {
  disallowGuideRails?: boolean
  from: TimetableRouteLocation
  id: string
  match: TimetableRoutePathMatcher
  owner: 'timetable'
  panelCode: string
  routeLabel: string
  signalRouteRefs?: readonly string[]
  platformStops?: readonly TimetablePlatformStopDefinition[]
  steps: readonly TrainRouteAnimationStep[]
  to: TimetableRouteLocation
  via?: readonly TimetableRouteLocation[]
}

export type LineMapRoutePathDefinition = ManualLineMapRoutePathDefinition | TimetableLineMapRoutePathDefinition

const SIGNAL_ROUTE_PANEL_CODES: Partial<Record<string, 'SKG' | 'PGL' | 'PGC'>> = {
  S608: 'SKG',
  S613: 'SKG',
  S617: 'SKG',
  S619: 'SKG',
  S655: 'SKG',
  S700: 'PGL',
  S701: 'PGL',
  S702: 'PGL',
  S704: 'PGL',
  S705: 'PGL',
  S707: 'PGL',
  S1101: 'PGC',
  S1102: 'PGC',
  S1104: 'PGC',
  S1105: 'PGC',
}

export const MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS: readonly ManualLineMapRoutePathDefinition[] = [
  {
    destinationKind: 'RT2_DEPOT',
    id: 'manual-s608-to-rt2-depot',
    movementRouteSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    owner: 'manual',
    requiresStartAtFirstStep: true,
    routeLabel: 'Manual S608 hold to RT2 depot',
    routeLabels: ['Route R608_803'],
    routeModePanelCodes: getRouteModePanelCodesForRouteLabels(['Route R608_803']),
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R608_803'],
      TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    ),
  },
  {
    destinationKind: 'SKG_NB_LAUNCH',
    direction: 'right',
    id: 'manual-rt1-launch-to-skg-northbound',
    movementRouteSteps: RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
    owner: 'manual',
    routeLabel: 'Manual RT1 launch to SKG northbound',
    routeLabels: ['Route R655_617'],
    routeModePanelCodes: getRouteModePanelCodesForRouteLabels(['Route R655_617']),
    service: 'NB',
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R655_617'],
      RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
    ),
  },
  {
    destinationKind: 'SKG',
    id: 'manual-upper-mainline-to-s608-hold',
    movementRouteSteps: PGC_TO_S608_HOLD_UPPER_ROUTE_STEPS,
    owner: 'manual',
    routeLabel: 'Manual destination SKG/SKGS upper route to S608 hold',
    routeLabels: [
      'Route R1105_1107',
      'Route R1101_1105',
      'Route R707_1101',
      'Route R705_707',
      'Route R701_705',
      'Route R619_701',
      'Route R617_619',
      'Route R613_621',
    ],
    routeModePanelCodes: getRouteModePanelCodesForRouteLabels([
      'Route R1105_1107',
      'Route R1101_1105',
      'Route R707_1101',
      'Route R705_707',
      'Route R701_705',
      'Route R619_701',
      'Route R617_619',
      'Route R613_621',
    ]),
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      [
        'Route R1105_1107',
        'Route R1101_1105',
        'Route R707_1101',
        'Route R705_707',
        'Route R701_705',
        'Route R619_701',
        'Route R617_619',
        'Route R613_621',
      ],
      PGC_TO_S608_HOLD_UPPER_ROUTE_STEPS,
    ),
  },
  {
    destinationKind: 'SKG',
    id: 'manual-lower-mainline-to-s608-hold',
    movementRouteSteps: S1104_TO_S608_HOLD_ROUTE_STEPS,
    owner: 'manual',
    routeLabel: 'Manual destination SKG/SKGS lower route to S608 hold',
    routeLabels: ['Route R1104_704', 'Route R704_700', 'Route R700_608'],
    routeModePanelCodes: getRouteModePanelCodesForRouteLabels([
      'Route R1104_704',
      'Route R704_700',
      'Route R700_608',
    ]),
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R1104_704', 'Route R704_700', 'Route R700_608'],
      S1104_TO_S608_HOLD_ROUTE_STEPS,
    ),
  },
  {
    destinationKind: 'SKG',
    id: 'manual-s702-to-s608-hold',
    movementRouteSteps: S702_TO_S608_HOLD_ROUTE_STEPS,
    owner: 'manual',
    routeLabel: 'Manual destination SKG/SKGS via S702 to S608 hold',
    routeLabels: ['Route R702_608'],
    routeModePanelCodes: getRouteModePanelCodesForRouteLabels(['Route R702_608']),
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R702_608'],
      S702_TO_S608_HOLD_ROUTE_STEPS,
    ),
  },
] as const

export const TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS: readonly TimetableLineMapRoutePathDefinition[] = [
  {
    disallowGuideRails: true,
    from: 'PGC',
    id: 'timetable-pgc-skg-to-rt2-depot',
    match: {
      anyOf: [
        { originAny: ['SKG', 'PGC', 'PGL'] },
        { stationAny: ['SKG'] },
      ],
      destinationAny: ['RT2_DEPOT'],
    },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Timetable path PGC/SKG to RT2 depot',
    signalRouteRefs: ['Route R1104_704', 'Route R704_700', 'Route R700_608', 'Route R608_803'],
    steps: PGC_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS,
    to: 'RT2_DEPOT',
    via: ['SKG'],
  },
  {
    disallowGuideRails: true,
    from: 'SKG',
    id: 'timetable-skg-to-pgl-upper-mainline',
    match: {
      originAny: ['SKG'],
      destinationAny: ['PGL'],
      run: 'NB',
    },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Timetable path RT1 launch to SKG/PGL upper mainline',
    platformStops: [
      { platformCode: 'SKG', stepIndex: SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX, track: 'NB' },
      { platformCode: 'PGL', stepIndex: SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX + 7, track: 'NB' },
    ],
    signalRouteRefs: [
      'Route R655_617',
      'Route R619_701',
      'Route R701_705',
      'Route R705_707',
    ],
    steps: SKG_TO_PGL_TIMETABLE_ROUTE_STEPS,
    to: 'PGL',
  },
  {
    disallowGuideRails: true,
    from: 'SKG',
    id: 'timetable-skg-to-pgc-upper-mainline',
    match: {
      originAny: ['SKG'],
      destinationAny: ['PGC'],
      run: 'NB',
    },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Timetable path RT1 launch to SKG/PGL/PGC upper mainline',
    platformStops: [
      { platformCode: 'SKG', stepIndex: SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX, track: 'NB' },
      { platformCode: 'PGL', stepIndex: SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX + 7, track: 'NB' },
      { platformCode: 'PGC', stepIndex: SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX + 14, track: 'NB' },
    ],
    signalRouteRefs: [
      'Route R655_617',
      'Route R619_701',
      'Route R701_705',
      'Route R705_707',
      'Route R707_1101',
      'Route R1101_1105',
      'Route R1105_1107',
    ],
    steps: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
    to: 'PGC',
  },
  {
    disallowGuideRails: true,
    from: 'SKG',
    id: 'timetable-skg-through-to-pgl-upper-mainline',
    match: {
      stationAny: ['SKG'],
      destinationAny: ['PGL'],
      run: 'NB',
    },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Timetable path SKG/PGL upper mainline',
    platformStops: [
      { platformCode: 'SKG', stepIndex: 0, track: 'NB' },
      { platformCode: 'PGL', stepIndex: 7, track: 'NB' },
    ],
    signalRouteRefs: [
      'Route R617_619',
      'Route R619_701',
      'Route R701_705',
      'Route R705_707',
    ],
    steps: SKG_TO_PGL_MAINLINE_ROUTE_STEPS,
    to: 'PGL',
  },
  {
    disallowGuideRails: true,
    from: 'SKG',
    id: 'timetable-skg-through-to-pgc-upper-mainline',
    match: {
      stationAny: ['SKG'],
      destinationAny: ['PGC'],
      run: 'NB',
    },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Timetable path SKG/PGL/PGC upper mainline',
    platformStops: [
      { platformCode: 'SKG', stepIndex: 0, track: 'NB' },
      { platformCode: 'PGL', stepIndex: 7, track: 'NB' },
      { platformCode: 'PGC', stepIndex: 14, track: 'NB' },
    ],
    signalRouteRefs: [
      'Route R617_619',
      'Route R619_701',
      'Route R701_705',
      'Route R705_707',
      'Route R707_1101',
      'Route R1101_1105',
      'Route R1105_1107',
    ],
    steps: SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
    to: 'PGC',
  },
  {
    disallowGuideRails: true,
    from: 'PGC',
    id: 'timetable-pgc-to-skg-lower-mainline',
    match: {
      destinationAny: ['SKG', 'HBF'],
      originAny: ['PGC'],
      run: 'SB',
    },
    owner: 'timetable',
    panelCode: 'PGC',
    routeLabel: 'Timetable path PGC to SKG lower mainline',
    platformStops: [
      { platformCode: 'PGC', stepIndex: 0, track: 'SB' },
      { platformCode: 'PGL', stepIndex: 7, track: 'SB' },
      { platformCode: 'SKG', stepIndex: 15, track: 'SB' },
    ],
    signalRouteRefs: ['Route R1102_704', 'Route R704_700', 'Route R700_608'],
    steps: PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
    to: 'SKG',
  },
  {
    disallowGuideRails: true,
    from: 'PGL',
    id: 'timetable-pgl-to-skg-lower-mainline',
    match: {
      destinationAny: ['SKG', 'HBF'],
      originAny: ['PGL'],
      run: 'SB',
    },
    owner: 'timetable',
    panelCode: 'PGL',
    routeLabel: 'Timetable path PGL to SKG lower mainline',
    platformStops: [
      { platformCode: 'PGL', stepIndex: 0, track: 'SB' },
      { platformCode: 'SKG', stepIndex: 8, track: 'SB' },
    ],
    signalRouteRefs: ['Route R700_608'],
    steps: PGL_TO_SKG_MAINLINE_ROUTE_STEPS,
    to: 'SKG',
  },
] as const

export const LINE_MAP_ROUTE_PATH_DEFINITIONS: readonly LineMapRoutePathDefinition[] = [
  ...MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS,
  ...TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS,
] as const

export function getManualLineMapRoutePath(
  trainId: string,
  destinationKind: ManualRouteDestinationKind,
) {
  return getManualLineMapRoutePathCandidates(trainId, destinationKind)[0]
}

export function getManualLineMapRoutePathCandidates(
  trainId: string,
  destinationKind: ManualRouteDestinationKind,
) {
  return MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS.filter((routePath) => (
    routePath.destinationKind === destinationKind
    && (!routePath.trainIds || routePath.trainIds.includes(trainId))
    && (!routePath.excludedTrainIds || !routePath.excludedTrainIds.includes(trainId))
  ))
}

export function getManualLineMapRoutePathStateStepIndex(
  routePath: ManualLineMapRoutePathDefinition,
  movementStepIndex: number,
) {
  return movementStepIndex + (routePath.stateRouteStepIndexOffset ?? 0)
}

export function getManualLineMapRoutePathSegmentIds(routePath: ManualLineMapRoutePathDefinition): readonly string[] {
  return getSignalRouteSegmentIds(routePath.routeLabels)
}

export function getManualLineMapRoutePathSetRouteCount(
  routePath: ManualLineMapRoutePathDefinition,
  routeSegments: Record<string, { status: string } | undefined>,
) {
  return getDefinedSignalRoutesByLabels(routePath.routeLabels)
    .filter((routeDefinition) => (
      routeDefinition.commandStateSegmentIds.some((segmentId) => routeSegments[segmentId]?.status === 'SET')
    ))
    .length
}

export function getManualLineMapRoutePathLatestSetRouteUpdatedAt(
  routePath: ManualLineMapRoutePathDefinition,
  routeSegments: Record<string, { status: string; updatedAt?: number } | undefined>,
) {
  return getDefinedSignalRoutesByLabels(routePath.routeLabels)
    .flatMap((routeDefinition) => routeDefinition.commandStateSegmentIds)
    .reduce((latestUpdatedAt, segmentId) => {
      const routeSegment = routeSegments[segmentId]

      if (routeSegment?.status !== 'SET') {
        return latestUpdatedAt
      }

      return Math.max(latestUpdatedAt, routeSegment.updatedAt ?? 0)
    }, 0)
}

export function getSignalRouteSegmentIds(routeLabels: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  const segmentIds: string[] = []

  getDefinedSignalRoutesByLabels(routeLabels).forEach((routeDefinition) => {
    routeDefinition.realSegmentIds.forEach((segmentId) => {
      if (seen.has(segmentId)) {
        return
      }

      seen.add(segmentId)
      segmentIds.push(segmentId)
    })
  })

  return segmentIds
}

function createRouteDefinitionBackedStateRouteSteps(
  routeLabels: readonly string[],
  movementRouteSteps: readonly TrainRouteAnimationStep[],
): readonly TrainRouteAnimationStep[] {
  const routeSegmentIds = new Set(getSignalRouteSegmentIds(routeLabels))

  return movementRouteSteps.filter((step) => routeSegmentIds.has(step.segmentId))
}

function getRouteModePanelCodesForRouteLabels(routeLabels: readonly string[]): readonly string[] {
  const panelCodes = getDefinedSignalRoutesByLabels(routeLabels)
    .map((routeDefinition) => SIGNAL_ROUTE_PANEL_CODES[routeDefinition.signalLabel])
    .filter((panelCode): panelCode is 'SKG' | 'PGL' | 'PGC' => Boolean(panelCode))

  return [...new Set(panelCodes)]
}
