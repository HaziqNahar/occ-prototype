import {
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
  TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
  TRAIN_312_TO_RT2_DEPOT_ROUTE_STEPS,
  TRAIN_312_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS,
  TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
  TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
} from './trainMovementRoutes'
import type { TrainRouteAnimationStep } from './trainMovementRoutes'
import {
  getDefinedSignalRoutesByLabels,
} from './routeDefinitions'

export type LineMapRoutePathOwner = 'manual' | 'timetable'
export type ManualRouteDestinationKind = 'ANY' | 'RT2_DEPOT'

export type ManualLineMapRoutePathDefinition = {
  destinationKind: ManualRouteDestinationKind
  excludedTrainIds?: readonly string[]
  id: string
  movementRouteSteps: readonly TrainRouteAnimationStep[]
  owner: 'manual'
  requiresStartAtFirstStep?: boolean
  routeLabel: string
  routeLabels: readonly string[]
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
  routeLabels: readonly string[]
  steps: readonly TrainRouteAnimationStep[]
  to: TimetableRouteLocation
  via?: readonly TimetableRouteLocation[]
}

export type LineMapRoutePathDefinition = ManualLineMapRoutePathDefinition | TimetableLineMapRoutePathDefinition

export const MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS: readonly ManualLineMapRoutePathDefinition[] = [
  {
    destinationKind: 'RT2_DEPOT',
    id: 'manual-train-312-s1104-to-rt2-depot',
    movementRouteSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    owner: 'manual',
    requiresStartAtFirstStep: true,
    routeLabel: 'Route R608_803',
    routeLabels: ['Route R1104_704', 'Route R704_700', 'Route R700_608', 'Route R608_803'],
    stateRouteStepIndexOffset: TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS.length - 1,
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R1104_704', 'Route R704_700', 'Route R700_608', 'Route R608_803'],
      TRAIN_312_TO_RT2_DEPOT_ROUTE_STEPS,
    ),
    trainIds: ['312'],
  },
  {
    destinationKind: 'RT2_DEPOT',
    excludedTrainIds: ['312'],
    id: 'manual-s608-to-rt2-depot',
    movementRouteSteps: TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    owner: 'manual',
    requiresStartAtFirstStep: true,
    routeLabel: 'Route R608_803',
    routeLabels: ['Route R608_803'],
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R608_803'],
      TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
    ),
  },
  {
    destinationKind: 'ANY',
    id: 'manual-train-314-s610-to-rt2',
    movementRouteSteps: TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
    owner: 'manual',
    routeLabel: 'Route R610_652',
    routeLabels: ['Route R610_652'],
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R610_652'],
      TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
    ),
    trainIds: ['314'],
  },
  {
    destinationKind: 'ANY',
    id: 'manual-train-312-s1104-to-s608',
    movementRouteSteps: TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
    owner: 'manual',
    routeLabel: 'Route R1104_704 / R704_700 / R700_608',
    routeLabels: ['Route R1104_704', 'Route R704_700', 'Route R700_608'],
    stateRouteSteps: createRouteDefinitionBackedStateRouteSteps(
      ['Route R1104_704', 'Route R704_700', 'Route R700_608'],
      TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
    ),
    trainIds: ['312'],
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
    routeLabels: ['Route R1104_704', 'Route R704_700', 'Route R700_608', 'Route R608_803'],
    steps: TRAIN_312_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS,
    to: 'RT2_DEPOT',
    via: ['SKG'],
  },
  {
    disallowGuideRails: true,
    from: 'SKG',
    id: 'timetable-skg-to-pgc-upper-mainline',
    match: {
      anyOf: [
        { originAny: ['SKG'] },
        { stationAny: ['SKG'] },
      ],
      destinationAny: ['PGC', 'PGL'],
      run: 'NB',
    },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Timetable path SKG to PGC upper mainline',
    routeLabels: [
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
      originAny: ['PGC', 'PGL'],
      run: 'SB',
    },
    owner: 'timetable',
    panelCode: 'PGC',
    routeLabel: 'Timetable path PGC to SKG lower mainline',
    routeLabels: ['Route R1102_704', 'Route R704_700', 'Route R700_608'],
    steps: PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
    to: 'SKG',
  },
] as const

export const LINE_MAP_ROUTE_PATH_DEFINITIONS: readonly LineMapRoutePathDefinition[] = [
  ...MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS,
  ...TIMETABLE_LINE_MAP_ROUTE_PATH_DEFINITIONS,
] as const

export const TRAIN_ROUTE_STEP_SEQUENCES_BY_TRAIN_ID: Record<string, readonly TrainRouteAnimationStep[]> = {
  '312': TRAIN_312_TO_RT2_DEPOT_ROUTE_STEPS,
  '314': TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
}

export function getManualLineMapRoutePath(
  trainId: string,
  destinationKind: ManualRouteDestinationKind,
) {
  return MANUAL_LINE_MAP_ROUTE_PATH_DEFINITIONS.find((routePath) => (
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
