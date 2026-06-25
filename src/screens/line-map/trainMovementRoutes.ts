import { MAP_SECTION_OFFSETS } from './model'

export type TrainRouteAnimationPoint = {
  x: number
  y: number
}

export type TrainRouteAnimationStep = {
  point: TrainRouteAnimationPoint
  segmentId: string
}

export const TRAIN_MARKER_UPPER_ROUTE_Y = 205
export const TRAIN_MARKER_LOWER_ROUTE_Y = 508
export const TRAIN_FLAT_RAIL_OCCUPANCY_TOLERANCE = 48
export const TRAIN_ROUTE_STEP_POSITION_TOLERANCE = 8
export const MANUAL_TRAIN_ROUTE_STEP_DURATION_MS = 2500

export const TRAIN_314_S610_TO_RT2_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-705',
    point: { x: MAP_SECTION_OFFSETS.section04 + 105, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-703',
    point: { x: MAP_SECTION_OFFSETS.section04 + 49, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-701',
    point: { x: MAP_SECTION_OFFSETS.section04 + 17, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-621',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1265, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-619',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1242, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-617',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1198, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P615',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1129, y: 283 },
  },
  {
    segmentId: 'rail-P610',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1111, y: 424 },
  },
  {
    segmentId: 'rail-614',
    point: { x: MAP_SECTION_OFFSETS.section03 + 999, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P606',
    point: { x: MAP_SECTION_OFFSETS.section03 + 840, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-650',
    point: { x: MAP_SECTION_OFFSETS.section03 + 819, y: 243 },
  },
  {
    segmentId: 'rail-652',
    point: { x: MAP_SECTION_OFFSETS.section03 + 796, y: 110 },
  },
] as const

export const TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-618',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1194, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-616',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1116, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-614',
    point: { x: MAP_SECTION_OFFSETS.section03 + 999, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P606',
    point: { x: MAP_SECTION_OFFSETS.section03 + 840, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-650',
    point: { x: MAP_SECTION_OFFSETS.section03 + 819, y: 243 },
  },
  {
    segmentId: 'rail-652',
    point: { x: MAP_SECTION_OFFSETS.section03 + 796, y: 110 },
  },
] as const

export const SKG_TO_PGC_MAINLINE_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-617',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1198, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-619',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1242, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-621',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1265, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-701',
    point: { x: MAP_SECTION_OFFSETS.section04 + 17, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-703',
    point: { x: MAP_SECTION_OFFSETS.section04 + 49, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-705',
    point: { x: MAP_SECTION_OFFSETS.section04 + 105, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-707',
    point: { x: MAP_SECTION_OFFSETS.section04 + 236, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-709',
    point: { x: MAP_SECTION_OFFSETS.section04 + 294, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-711',
    point: { x: MAP_SECTION_OFFSETS.section04 + 338, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-713',
    point: { x: MAP_SECTION_OFFSETS.section04 + 370, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-715',
    point: { x: MAP_SECTION_OFFSETS.section04 + 411, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-1103',
    point: { x: MAP_SECTION_OFFSETS.section04 + 493, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-1105',
    point: { x: MAP_SECTION_OFFSETS.section04 + 589, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-1107',
    point: { x: MAP_SECTION_OFFSETS.section04 + 690, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-1109',
    point: { x: MAP_SECTION_OFFSETS.section04 + 791, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
] as const

export const SKG_TO_PGL_MAINLINE_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = (
  SKG_TO_PGC_MAINLINE_ROUTE_STEPS.slice(0, 8)
)

export const PGC_TO_SKG_MAINLINE_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-1108',
    point: { x: MAP_SECTION_OFFSETS.section04 + 791, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-1106',
    point: { x: MAP_SECTION_OFFSETS.section04 + 703, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-1104',
    point: { x: MAP_SECTION_OFFSETS.section04 + 587, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-1102',
    point: { x: MAP_SECTION_OFFSETS.section04 + 492, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-716',
    point: { x: MAP_SECTION_OFFSETS.section04 + 410, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-714',
    point: { x: MAP_SECTION_OFFSETS.section04 + 369, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-712',
    point: { x: MAP_SECTION_OFFSETS.section04 + 337, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-710',
    point: { x: MAP_SECTION_OFFSETS.section04 + 292, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-708',
    point: { x: MAP_SECTION_OFFSETS.section04 + 248, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-706',
    point: { x: MAP_SECTION_OFFSETS.section04 + 199, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-704',
    point: { x: MAP_SECTION_OFFSETS.section04 + 132, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-702',
    point: { x: MAP_SECTION_OFFSETS.section04 + 61, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-700',
    point: { x: MAP_SECTION_OFFSETS.section04 + 12, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-622',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1265, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-620',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1230, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-618',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1194, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
] as const

export const PGL_TO_SKG_MAINLINE_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = (
  PGC_TO_SKG_MAINLINE_ROUTE_STEPS.slice(7)
)

export const TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-1109',
    point: { x: MAP_SECTION_OFFSETS.section04 + 791, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P1103',
    point: { x: MAP_SECTION_OFFSETS.section04 + 650, y: 285 },
  },
  {
    segmentId: 'rail-1115',
    point: { x: MAP_SECTION_OFFSETS.section04 + 633, y: 360 },
  },
  {
    segmentId: 'rail-P1100',
    point: { x: MAP_SECTION_OFFSETS.section04 + 575, y: 432 },
  },
  {
    segmentId: 'rail-1102',
    point: { x: MAP_SECTION_OFFSETS.section04 + 492, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-716',
    point: { x: MAP_SECTION_OFFSETS.section04 + 410, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-714',
    point: { x: MAP_SECTION_OFFSETS.section04 + 369, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-712',
    point: { x: MAP_SECTION_OFFSETS.section04 + 337, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-710',
    point: { x: MAP_SECTION_OFFSETS.section04 + 292, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-708',
    point: { x: MAP_SECTION_OFFSETS.section04 + 248, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-706',
    point: { x: MAP_SECTION_OFFSETS.section04 + 199, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-704',
    point: { x: MAP_SECTION_OFFSETS.section04 + 132, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-702',
    point: { x: MAP_SECTION_OFFSETS.section04 + 61, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-700',
    point: { x: MAP_SECTION_OFFSETS.section04 + 12, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-622',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1265, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-620',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1230, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-618',
    point: { x: MAP_SECTION_OFFSETS.section03 + 1194, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
] as const

export const TRAIN_312_TO_RT2_DEPOT_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  ...TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
  ...TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.slice(1),
]

export const TRAIN_312_TO_RT2_DEPOT_TIMETABLE_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = TRAIN_312_TO_RT2_DEPOT_ROUTE_STEPS
  .filter((step) => step.segmentId !== 'rail-1115' && !step.segmentId.startsWith('rail-P'))

export const TRAIN_ROUTE_RENDER_STEPS: readonly TrainRouteAnimationStep[] = [
  ...SKG_TO_PGC_MAINLINE_ROUTE_STEPS,
  ...PGC_TO_SKG_MAINLINE_ROUTE_STEPS,
  ...TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
  ...TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
  ...TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
]
