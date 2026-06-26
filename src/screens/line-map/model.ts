import type { TrainReadinessMode, TrainState } from '../../types'

export const MONITOR_WIDTH = 1275
export const MONITOR_HEIGHT = 1019

const LINE_02_JOIN_SHIFT = 86
const LINE_03_JOIN_SHIFT = 70

export const MAP_SECTION_OFFSETS = {
  section01: 0,
  section02: MONITOR_WIDTH - LINE_02_JOIN_SHIFT,
  section03: MONITOR_WIDTH * 2 - LINE_02_JOIN_SHIFT - LINE_03_JOIN_SHIFT,
  section04: MONITOR_WIDTH * 3 - LINE_02_JOIN_SHIFT - LINE_03_JOIN_SHIFT,
} as const

export const LINE_VIEWPORT_PANS = [
  MAP_SECTION_OFFSETS.section01,
  MAP_SECTION_OFFSETS.section02,
  MAP_SECTION_OFFSETS.section03,
  MAP_SECTION_OFFSETS.section04,
] as const

export const LINE_MAP_END_X = MAP_SECTION_OFFSETS.section04 + 968
export const MAP_WORLD_WIDTH = MAP_SECTION_OFFSETS.section04 + MONITOR_WIDTH
export const DEFAULT_LINE_MAP_PAN = MAP_SECTION_OFFSETS.section03
export const MAP_PAN_STEP = MONITOR_WIDTH
export const MAP_PAN_MAX = LINE_MAP_END_X - MONITOR_WIDTH
export const DEFAULT_TRAIN_READINESS_MODE: TrainReadinessMode = 'MAINLINE_SERVICE'

const MIDDLE_TURNBACK_TRACK_TOP_Y = 335
const MIDDLE_TURNBACK_TRACK_CENTER_Y = 340
const MIDDLE_TURNBACK_TRACK_BOTTOM_Y = 345
const MIDDLE_TURNBACK_STRIP_TOP_Y = 347
const MIDDLE_TURNBACK_STRIP_BOTTOM_Y = 350
const MIDDLE_TURNBACK_UPPER_BREAK_Y = 294
const MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y = 296
const MIDDLE_TURNBACK_LOWER_BREAK_Y = 399
const MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y = 401

export const EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS = [
  { preferredSide: 0, sides: [['rail-P101'], ['rail-102']] },
  { preferredSide: 0, sides: [['rail-P102'], ['rail-110']] },
  { preferredSide: 0, sides: [['rail-P103'], ['rail-103']] },
  { preferredSide: 0, sides: [['rail-P105'], ['rail-109']] },
  { preferredSide: 0, sides: [['rail-P200'], ['rail-204']] },
  { preferredSide: 0, sides: [['rail-P201'], ['rail-205']] },
  { preferredSide: 0, sides: [['rail-P300'], ['rail-314']] },
  { preferredSide: 0, sides: [['rail-P301'], ['rail-313']] },
  { preferredSide: 0, sides: [['rail-P302'], ['rail-312']] },
  { preferredSide: 0, sides: [['rail-P303'], ['rail-320']] },
  { preferredSide: 0, sides: [['rail-P304'], ['rail-314']] },
  { preferredSide: 0, sides: [['rail-P305'], ['rail-317']] },
  { preferredSide: 0, sides: [['rail-P306'], ['rail-322']] },
  { preferredSide: 0, sides: [['rail-P400'], ['rail-416']] },
  { preferredSide: 0, sides: [['rail-P401'], ['rail-415']] },
  { preferredSide: 0, sides: [['rail-P402'], ['rail-422']] },
  { preferredSide: 0, sides: [['rail-P403'], ['rail-420']] },
  { preferredSide: 0, sides: [['rail-P600'], ['rail-604']] },
  { preferredSide: 0, sides: [['rail-P601'], ['rail-605A']] },
  { preferredSide: 0, sides: [['rail-P602'], ['rail-661']] },
  { preferredSide: 0, sides: [['rail-P603'], ['rail-605A']] },
  { preferredSide: 0, sides: [['rail-P606'], ['rail-612']] },
  { preferredSide: 0, sides: [['rail-P608'], ['rail-614']] },
  { preferredSide: 0, sides: [['rail-P609'], ['rail-651', 'bgk-651']] },
  { preferredSide: 0, sides: [['rail-P610'], ['rail-616']] },
  { preferredSide: 0, sides: [['rail-P611'], ['rail-611']] },
  { preferredSide: 0, sides: [['rail-P613'], ['rail-613']] },
  { preferredSide: 0, sides: [['rail-P615'], ['rail-615']] },
  { preferredSide: 0, sides: [['rail-P700'], ['rail-704']] },
  { preferredSide: 0, sides: [['rail-P701'], ['rail-705']] },
  { preferredSide: 0, sides: [['rail-P702'], ['rail-706']] },
  { preferredSide: 0, sides: [['rail-P703'], ['rail-707']] },
  { preferredSide: 0, sides: [['rail-P1100'], ['rail-1104']] },
  { preferredSide: 0, sides: [['rail-P1101'], ['rail-1105']] },
  { preferredSide: 0, sides: [['rail-P1102'], ['rail-1106']] },
  { preferredSide: 0, sides: [['rail-P1103'], ['rail-1107']] },
] as const

const stationCodes = [
  'HBF',
  'OTP',
  'CNT',
  'CQY',
  'DBG',
  'LTI',
  'FRP',
  'BNK',
  'PTP',
  'WLH',
  'SER',
  'KVN',
  'HGN',
  'BGK',
  'SKG',
  'PGL',
  'PGC',
  'O C C\nDEPOT',
]

const stationRibbonPositions = [
  24, 84, 147, 211, 276, 345, 410, 477, 536, 602, 671, 736, 801, 877, 938,
  1001, 1064, 1128,
]

export const stationRibbonItems = stationCodes.map((station, index) => ({
  label: station,
  x: stationRibbonPositions[index],
}))

export const initialTrains: TrainState[] = [
  { id: '021', x: MAP_SECTION_OFFSETS.section01 + 42, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '089', x: MAP_SECTION_OFFSETS.section01 + 392, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '093', x: MAP_SECTION_OFFSETS.section01 + 904, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '095', x: MAP_SECTION_OFFSETS.section01 + 146, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '097', x: MAP_SECTION_OFFSETS.section01 + 638, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '065', x: MAP_SECTION_OFFSETS.section01 + 1096, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '047', x: MAP_SECTION_OFFSETS.section02 + 1104, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '053', x: MAP_SECTION_OFFSETS.section02 + 646, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '077', x: MAP_SECTION_OFFSETS.section02 + 52, y: 512, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '049', x: MAP_SECTION_OFFSETS.section02 + 646, y: 512, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '320', x: MAP_SECTION_OFFSETS.section03 + 292, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '317', x: MAP_SECTION_OFFSETS.section03 + 764, y: 205, direction: 'right', status: 'HOLD', service: 'NB' },
  {
    id: '013',
    x: MAP_SECTION_OFFSETS.section03 + 892,
    y: 205,
    direction: 'right',
    status: 'RUN',
    service: 'NB',
    occupancySegmentId: 'rail-653',
    readinessMode: 'MAINLINE_SERVICE',
    scheduleNumber: '1000',
    trainNumber: '301',
  },
  { id: '917', x: MAP_SECTION_OFFSETS.section03 + 1250, y: 205, direction: 'right', status: 'WAIT', service: 'NB' },
  { id: '301', x: MAP_SECTION_OFFSETS.section03 + 324, y: 512, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '314', x: MAP_SECTION_OFFSETS.section04 + 105, y: 205, direction: 'left', status: 'RUN', service: 'NB' },
  { id: '312', x: MAP_SECTION_OFFSETS.section04 + 786, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '309', x: MAP_SECTION_OFFSETS.section04 + 794, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
]

const s = MAP_SECTION_OFFSETS
const LOWER_ARROW_LIFT = 33
const LOWER_COMMAND_LIFT = 15

export function getTrainReadinessMode(train: Pick<TrainState, 'readinessMode'>): TrainReadinessMode {
  return train.readinessMode ?? DEFAULT_TRAIN_READINESS_MODE
}

export function getTrainReadinessDisplayValue(train: Pick<TrainState, 'readinessMode'>) {
  switch (getTrainReadinessMode(train)) {
    case 'ASLEEP':
      return 'ASLEEP'
    case 'DEPOT_MOVEMENT':
      return 'DEPOT MOVEMENT'
    case 'HV_ISOLATED':
      return 'HV ISOLATED'
    case 'MAINLINE_OFF_SERVICE':
      return 'MAINLINE OFF SVC'
    case 'MAINLINE_SERVICE':
    default:
      return 'MAINLINE SERVICE'
  }
}

export function isTrainItamaGranted(train: Pick<TrainState, 'itamaGranted' | 'itamaStatus'>) {
  if (train.itamaStatus) {
    return train.itamaStatus === 'GRANTED'
  }

  return train.itamaGranted ?? true
}

export function getTrainItamaStatusValue(train: Pick<TrainState, 'itamaGranted' | 'itamaStatus'>) {
  return isTrainItamaGranted(train) ? 'GRANTED' : 'NOT GRANTED'
}

const RAIL_ANCHOR_X = {
  'rail-105': s.section01 + 174.5,
  'rail-203B': s.section01 + 509,
  'rail-207': s.section01 + 614,
  'rail-209': s.section01 + 691,
  'rail-305': s.section01 + 1106,
  'rail-309': s.section01 + 1212,
  'rail-309-seam': s.section02 + 14,
  'rail-311-seam': s.section02 + 58,
  'rail-316': s.section02 + 272,
  'rail-318': s.section02 + 238,
  'rail-326': s.section02 + 461,
  'rail-418': s.section02 + 924,
  'rail-605A': s.section03 + 725,
  'rail-607': s.section03 + 776,
  'rail-609': s.section03 + 838,
  'rail-611': s.section03 + 898,
  'rail-613': s.section03 + 1020,
  'rail-617': s.section03 + 1198,
  'rail-618': s.section03 + 1188,
  'rail-620': s.section03 + 1213,
  'rail-650': s.section03 + 879,
  'rail-653': s.section03 + 843,
  'rail-663': s.section03 + 621,
  'rail-702': s.section04 + 61,
  'rail-703': s.section04 + 49,
  'rail-705': s.section04 + 105,
  'rail-707': s.section04 + 236,
  'rail-709': s.section04 + 294,
  'rail-710': s.section04 + 292,
  'rail-711': s.section04 + 338,
  'rail-713': s.section04 + 370,
  'rail-714': s.section04 + 369,
  'rail-1103': s.section04 + 493,
  'rail-1102': s.section04 + 492,
  'rail-1105': s.section04 + 589,
  'rail-1107': s.section04 + 690,
  'rail-1108': s.section04 + 791,
  'rail-1109': s.section04 + 791,
  'rail-1111': s.section04 + 859,
  'rail-1112': s.section04 + 926,
  'rail-1113': s.section04 + 927,
} as const

const RAIL_EDGE_X = {
  'rail-100': {
    left: s.section01 + 6,
    right: s.section01 + 60,
  },
  'rail-101': {
    left: s.section01 + 6,
    right: s.section01 + 91,
  },
  'rail-105': {
    left: s.section01 + 147,
    right: s.section01 + 202,
  },
  'rail-106': {
    left: s.section01 + 114,
    right: s.section01 + 145,
  },
  'rail-108': {
    left: s.section01 + 147,
    right: s.section01 + 202,
  },
  'rail-111': {
    left: s.section01 + 303,
    right: s.section01 + 333,
  },
  'rail-112': {
    left: s.section01 + 265,
    right: s.section01 + 295,
  },
  'rail-202': {
    left: s.section01 + 426,
    right: s.section01 + 475,
  },
  'rail-203B': {
    left: s.section01 + 497,
    right: s.section01 + 527,
  },
  'rail-206': {
    left: s.section01 + 587,
    right: s.section01 + 643,
  },
  'rail-207': {
    left: s.section01 + 587,
    right: s.section01 + 643,
  },
  'rail-208': {
    left: s.section01 + 646,
    right: s.section01 + 736,
  },
  'rail-209': {
    left: s.section01 + 645,
    right: s.section01 + 735,
  },
  'rail-210': {
    left: s.section01 + 738,
    right: s.section01 + 793,
  },
  'rail-211': {
    left: s.section01 + 738,
    right: s.section01 + 793,
  },
  'rail-212': {
    left: s.section01 + 798,
    right: s.section01 + 892,
  },
  'rail-213': {
    left: s.section01 + 795,
    right: s.section01 + 890,
  },
  'rail-214': {
    left: s.section01 + 894,
    right: s.section01 + 949,
  },
  'rail-215': {
    left: s.section01 + 894,
    right: s.section01 + 949,
  },
  'rail-216': {
    left: s.section01 + 951,
    right: s.section01 + 981,
  },
  'rail-217': {
    left: s.section01 + 951,
    right: s.section01 + 981,
  },
  'rail-304': {
    left: s.section01 + 1079,
    right: s.section01 + 1134,
  },
  'rail-305': {
    left: s.section01 + 1079,
    right: s.section01 + 1134,
  },
  'rail-308': {
    left: s.section02 + 0,
    right: s.section02 + 29,
  },
  'rail-309': {
    left: s.section01 + 1190,
    right: s.section01 + 1220,
  },
  'rail-311-seam': {
    left: s.section02 + 31,
    right: s.section02 + 86,
  },
  'rail-310': {
    left: s.section02 + 31,
    right: s.section02 + 86,
  },
  'rail-311': {
    left: s.section02 + 58,
    right: s.section02 + 113,
  },
  'rail-315': {
    left: s.section02 + 161,
    right: s.section02 + 289,
  },
  'rail-316': {
    left: s.section02 + 216,
    right: s.section02 + 329,
  },
  'rail-318': {
    left: s.section02 + 224,
    right: s.section02 + 256,
  },
  'rail-317': {
    left: s.section02 + 318,
    right: s.section02 + 372,
  },
  'rail-319': {
    left: s.section02 + 347,
    right: s.section02 + 387,
  },
  'rail-321': {
    left: s.section02 + 389,
    right: s.section02 + 444,
  },
  'rail-323': {
    left: s.section02 + 446,
    right: s.section02 + 476,
  },
  'rail-324': {
    left: s.section02 + 389,
    right: s.section02 + 444,
  },
  'rail-326': {
    left: s.section02 + 446,
    right: s.section02 + 476,
  },
  'rail-402': {
    left: s.section02 + 542,
    right: s.section02 + 572,
  },
  'rail-403': {
    left: s.section02 + 557,
    right: s.section02 + 587,
  },
  'rail-404': {
    left: s.section02 + 574,
    right: s.section02 + 629,
  },
  'rail-405': {
    left: s.section02 + 574,
    right: s.section02 + 629,
  },
  'rail-406': {
    left: s.section02 + 631,
    right: s.section02 + 672,
  },
  'rail-407': {
    left: s.section02 + 631,
    right: s.section02 + 672,
  },
  'rail-410': {
    left: s.section02 + 706,
    right: s.section02 + 736,
  },
  'rail-411': {
    left: s.section02 + 695,
    right: s.section02 + 736,
  },
  'rail-412': {
    left: s.section02 + 738,
    right: s.section02 + 793,
  },
  'rail-413': {
    left: s.section02 + 738,
    right: s.section02 + 793,
  },
  'rail-414': {
    left: s.section02 + 795,
    right: s.section02 + 957,
  },
  'rail-417': {
    left: s.section02 + 882,
    right: s.section02 + 1034,
  },
  'rail-418': {
    left: s.section02 + 908,
    right: s.section02 + 940,
  },
  'rail-419': {
    left: s.section02 + 1036,
    right: s.section02 + 1067,
  },
  'rail-421': {
    left: s.section02 + 1069,
    right: s.section02 + 1124,
  },
  'rail-423': {
    left: s.section02 + 1126,
    right: s.section02 + 1156,
  },
  'rail-424': {
    left: s.section02 + 1024,
    right: s.section02 + 1067,
  },
  'rail-426': {
    left: s.section02 + 1069,
    right: s.section02 + 1124,
  },
  'rail-428': {
    left: s.section02 + 1126,
    right: s.section02 + 1156,
  },
  'rail-503': {
    left: s.section03 + 17,
    right: s.section03 + 47,
  },
  'rail-502': {
    left: s.section03 + 38,
    right: s.section03 + 93,
  },
  'rail-504': {
    left: s.section03 + 95,
    right: s.section03 + 125,
  },
  'rail-505': {
    left: s.section03 + 38,
    right: s.section03 + 93,
  },
  'rail-506': {
    left: s.section03 + 127,
    right: s.section03 + 157,
  },
  'rail-507': {
    left: s.section03 + 95,
    right: s.section03 + 125,
  },
  'rail-510': {
    left: s.section03 + 191,
    right: s.section03 + 246,
  },
  'rail-512': {
    left: s.section03 + 248,
    right: s.section03 + 278,
  },
  'rail-513': {
    left: s.section03 + 191,
    right: s.section03 + 246,
  },
  'rail-514': {
    left: s.section03 + 280,
    right: s.section03 + 310,
  },
  'rail-511': {
    left: s.section03 + 170,
    right: s.section03 + 200,
  },
  'rail-515': {
    left: s.section03 + 259,
    right: s.section03 + 289,
  },
  'rail-518': {
    left: s.section03 + 355,
    right: s.section03 + 410,
  },
  'rail-519': {
    left: s.section03 + 323,
    right: s.section03 + 353,
  },
  'rail-520': {
    left: s.section03 + 401,
    right: s.section03 + 431,
  },
  'rail-521': {
    left: s.section03 + 355,
    right: s.section03 + 410,
  },
  'rail-522': {
    left: s.section03 + 444,
    right: s.section03 + 474,
  },
  'rail-523': {
    left: s.section03 + 401,
    right: s.section03 + 431,
  },
  'rail-603': {
    left: s.section03 + 517,
    right: s.section03 + 586,
  },
  'rail-602': {
    left: s.section03 + 529,
    right: s.section03 + 559,
  },
  'rail-605B': {
    left: s.section03 + 689,
    right: s.section03 + 726,
  },
  'rail-606': {
    left: s.section03 + 624,
    right: s.section03 + 715,
  },
  'rail-608': {
    left: s.section03 + 717,
    right: s.section03 + 772,
  },
  'rail-607': {
    left: s.section03 + 728,
    right: s.section03 + 783,
  },
  'rail-609': {
    left: s.section03 + 785,
    right: s.section03 + 797,
  },
  'rail-610': {
    left: s.section03 + 774,
    right: s.section03 + 803,
  },
  'rail-611': {
    left: s.section03 + 898,
    right: s.section03 + 951,
  },
  'rail-613': {
    left: s.section03 + 952,
    right: s.section03 + 1102,
  },
  'rail-617': {
    left: s.section03 + 1166,
    right: s.section03 + 1221,
  },
  'rail-618': {
    left: s.section03 + 1157,
    right: s.section03 + 1221,
  },
  'rail-663': {
    left: s.section03 + 619,
    right: s.section03 + 626,
  },
  'rail-703': {
    left: s.section04 + 34,
    right: s.section04 + 64,
  },
  'rail-705': {
    left: s.section04 + 66,
    right: s.section04 + 204,
  },
  'rail-709': {
    left: s.section04 + 266,
    right: s.section04 + 321,
  },
  'rail-710': {
    left: s.section04 + 265,
    right: s.section04 + 320,
  },
  'rail-713': {
    left: s.section04 + 355,
    right: s.section04 + 385,
  },
  'rail-714': {
    left: s.section04 + 354,
    right: s.section04 + 384,
  },
  'rail-1103': {
    left: s.section04 + 436,
    right: s.section04 + 549,
  },
  'rail-1105': {
    left: s.section04 + 550,
    right: s.section04 + 628,
  },
  'rail-1109': {
    left: s.section04 + 752,
    right: s.section04 + 829,
  },
  'rail-1102': {
    left: s.section04 + 435,
    right: s.section04 + 548,
  },
  'rail-1108': {
    left: s.section04 + 752,
    right: s.section04 + 829,
  },
  'rail-1112': {
    left: s.section04 + 888,
    right: s.section04 + 965,
  },
  'rail-1113': {
    left: s.section04 + 888,
    right: s.section04 + 965,
  },
} as const

function centerOfRail(railId: keyof typeof RAIL_ANCHOR_X) {
  return RAIL_ANCHOR_X[railId]
}

function getDerivedTrackPieceRailEdgeX(railId: string) {
  const piece = [...upperTrackPieces, ...lowerTrackPieces].find((candidate) => (
    ('railId' in candidate && candidate.railId === railId)
    || ('railIds' in candidate && (candidate.railIds as readonly string[] | undefined)?.includes(railId))
  ))

  return piece ? { left: piece.x, right: piece.x + piece.width } : undefined
}

function edgeOfRail(railId: keyof typeof RAIL_EDGE_X, edge: 'left' | 'right', inset = 0) {
  const rail = getDerivedTrackPieceRailEdgeX(railId) ?? RAIL_EDGE_X[railId]

  return edge === 'left' ? rail.left + inset : rail.right - inset
}

const DEFAULT_SIGNAL_EDGE_INSET = 5

function signalAtRail<T extends { anchorRailId: keyof typeof RAIL_ANCHOR_X, xOffset?: number }>(
  signal: T,
) {
  const { anchorRailId, xOffset = 0, ...rest } = signal

  return {
    ...rest,
    anchorRailId,
    x: centerOfRail(anchorRailId) + xOffset,
  }
}

function signalAtRailEdge<T extends {
  anchorEdge: 'left' | 'right'
  anchorRailId: keyof typeof RAIL_EDGE_X
  edgeOffset?: number
  inset?: number
}>(
  signal: T,
) {
  const { anchorEdge, anchorRailId, edgeOffset = 0, inset, ...rest } = signal
  const edgeInset = inset ?? (edgeOffset === 0 ? DEFAULT_SIGNAL_EDGE_INSET : 0)

  return {
    ...rest,
    anchorEdge,
    anchorRailId,
    stemAnchored: true,
    x: edgeOfRail(anchorRailId, anchorEdge, edgeInset) + edgeOffset,
  }
}

export const platformData = [
  { code: 'HBF', x: s.section01 + 168, y: 268, commandY: 567 },
  { code: 'OTP', x: s.section01 + 610, y: 268, commandY: 567 },
  { code: 'CNT', x: s.section01 + 762, y: 268, commandY: 567 },
  { code: 'CQY', x: s.section01 + 918, y: 268, commandY: 567 },
  { code: 'DBG', x: s.section01 + 1112, y: 268, commandY: 567 },
  { code: 'LTI', x: s.section01 + 1260, y: 268, commandY: 567 },
  { code: 'FRP', x: s.section02 + 427, y: 268, commandY: 567 },
  { code: 'BNK', x: s.section02 + 600, y: 268, commandY: 567 },
  { code: 'PTP', x: s.section02 + 760, y: 268, commandY: 567 },
  { code: 'WLH', x: s.section02 + 1110, y: 268, commandY: 567 },
  { code: 'SER', x: s.section03 + 80, y: 268, commandY: 567 },
  { code: 'KVN', x: s.section03 + 232, y: 268, commandY: 567 },
  { code: 'HGN', x: s.section03 + 384, y: 268, commandY: 567 },
  { code: 'BGK', x: s.section03 + 760, y: 268, commandY: 567 },
  { code: 'SKG', x: s.section03 + 1195, y: 268, commandY: 567 },
  { code: 'PGL', x: s.section04 + 292, y: 268, commandY: 567 },
  { code: 'PGC', x: s.section04 + 791, y: 268, commandY: 567 },
]

export const commandData = platformData.map((platform) => ({
  code: platform.code,
  x: platform.x,
  y: platform.commandY - LOWER_COMMAND_LIFT,
}))

const ATC_PANEL_Y = 56

export const atcData = [
  { x: s.section01 + 120, y: ATC_PANEL_Y, label: 'ATC01' },
  { x: s.section01 + 712, y: ATC_PANEL_Y, label: 'ATC02' },
  { x: s.section02 + 6, y: ATC_PANEL_Y, label: 'ATC03' },
  { x: s.section02 + 712, y: ATC_PANEL_Y, label: 'ATC04' },
  { x: s.section03 + 176, y: ATC_PANEL_Y, label: 'ATC05' },
  { x: s.section03 + 732, y: 14, label: 'ATC06' },
  { x: s.section04 + 240, y: ATC_PANEL_Y, label: 'ATC07' },
  { x: s.section04 + 739, y: ATC_PANEL_Y, label: 'ATC11' },
]

export const cycleData = [
  { x: s.section01 + 120, y: 16 },
  { x: s.section02 + 6, y: 16 },
  { x: s.section02 + 294, y: 16 },
  { x: s.section03 + 1062, y: 16 },
  { x: s.section04 + 240, y: 16 },
  { x: s.section04 + 739, y: 16 },
]

export const mapTitleData = [
  { x: s.section01 + 490, y: 7, lines: ['DETAIL SIGNALLING SYSTEM', 'HBF TO PGC'] },
  { x: s.section02 + 560, y: 7, lines: ['DETAIL SIGNALLING SYSTEM', 'HBF TO PGC'] },
  { x: s.section03 + 346, y: 7, lines: ['DETAIL SIGNALLING SYSTEM', 'HBF TO PGC'] },
] as const

export const sectionDividers = [
  s.section02,
  s.section03,
  s.section03 + 578,
  s.section04 + 875,
]

export const branchData = []

type TrackPoint = readonly [number, number]
type TrackPolygonPiece = {
  pathD?: string
  polygonPoints: TrackPoint[]
  inactivePolygonPoints?: TrackPoint[]
  edgePathD?: string
  edgePolygons?: TrackPoint[][]
  edgePolygonPoints?: TrackPoint[]
  edgePathPoints?: TrackPoint[]
}

const SLANTED_TRACK_HALF_WIDTH = 6
const SLANTED_TRACK_EDGE_LEFT = 10
const SLANTED_TRACK_EDGE_RIGHT = 7

function makeSlantedTrackPoints(from: TrackPoint, to: TrackPoint): TrackPoint[] {
  const [fromX, fromY] = from
  const [toX, toY] = to

  if (toX >= fromX) {
    return [
      [fromX - SLANTED_TRACK_HALF_WIDTH, fromY],
      [fromX + SLANTED_TRACK_HALF_WIDTH, fromY],
      [toX + SLANTED_TRACK_HALF_WIDTH, toY],
      [toX - SLANTED_TRACK_HALF_WIDTH, toY],
    ]
  }

  return [
    [fromX + SLANTED_TRACK_HALF_WIDTH, fromY],
    [toX + SLANTED_TRACK_HALF_WIDTH, toY],
    [toX - SLANTED_TRACK_HALF_WIDTH, toY],
    [fromX - SLANTED_TRACK_HALF_WIDTH, fromY],
  ]
}

function makeSlantedTrackEdgePoints(from: TrackPoint, to: TrackPoint): TrackPoint[] {
  const [fromX, fromY] = from
  const [toX, toY] = to

  return [
    [fromX - SLANTED_TRACK_EDGE_LEFT, fromY],
    [fromX - SLANTED_TRACK_EDGE_RIGHT, fromY],
    [toX - SLANTED_TRACK_EDGE_RIGHT, toY],
    [toX - SLANTED_TRACK_EDGE_LEFT, toY],
  ]
}

function getClosedPathD(points: TrackPoint[]) {
  return `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')} Z`
}

function makeSlantedTrackPiece(from: TrackPoint, to: TrackPoint, edge: 'none' | 'strip' = 'strip'): TrackPolygonPiece {
  if (edge === 'none') {
    return {
      polygonPoints: makeSlantedTrackPoints(from, to),
      edgePathPoints: [],
    }
  }

  return {
    polygonPoints: makeSlantedTrackPoints(from, to),
    edgePolygonPoints: makeSlantedTrackEdgePoints(from, to),
  }
}

export function makeBrokenSlantedTrackPiece(from: TrackPoint, to: TrackPoint, breakSize = 2): TrackPolygonPiece {
  const [, fromY] = from
  const [, toY] = to
  const middleY = (fromY + toY) / 2
  const beforeBreak = interpolateTrackPoint(from, to, (middleY - breakSize / 2 - fromY) / (toY - fromY))
  const afterBreak = interpolateTrackPoint(from, to, (middleY + breakSize / 2 - fromY) / (toY - fromY))

  return {
    polygonPoints: makeSlantedTrackPoints(from, beforeBreak),
    pathD: [
      getClosedPathD(makeSlantedTrackPoints(from, beforeBreak)),
      getClosedPathD(makeSlantedTrackPoints(afterBreak, to)),
    ].join(' '),
    edgePathD: [
      getClosedPathD(makeSlantedTrackEdgePoints(from, beforeBreak)),
      getClosedPathD(makeSlantedTrackEdgePoints(afterBreak, to)),
    ].join(' '),
  }
}

function interpolateTrackPoint(from: TrackPoint, to: TrackPoint, ratio: number): TrackPoint {
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
  ]
}

function makeUpperLeftSlantedCornerPiece(capLeftX: number, from: TrackPoint, to: TrackPoint): TrackPolygonPiece {
  const [fromX, fromY] = from
  const topY = 215
  const [toX, toY] = to

  return {
    polygonPoints: [
      [capLeftX, topY],
      [fromX + 4, topY],
      [toX + SLANTED_TRACK_HALF_WIDTH, toY],
      [toX - SLANTED_TRACK_HALF_WIDTH, toY],
      [fromX - SLANTED_TRACK_HALF_WIDTH, fromY],
      [capLeftX, fromY],
    ],
    edgePolygonPoints: makeSlantedTrackEdgePoints(from, to),
  }
}

// Keep this helper available for future custom lower-left corner bends.
// function makeLowerLeftSlantedCornerPiece(capLeftX: number, to: TrackPoint): TrackPolygonPiece {
//   const [toX, toY] = to
//   const bottomY = 466
//
//   return {
//     polygonPoints: [
//       [capLeftX, toY],
//       [toX + SLANTED_TRACK_HALF_WIDTH, toY],
//       [toX + SLANTED_TRACK_HALF_WIDTH - 2, bottomY],
//       [capLeftX, bottomY],
//     ],
//     edgePathPoints: [],
//   }
// }

export const translucentTrackGuides = [
  {
    id: 'hbf-102-to-103-guide',
    railIds: ['rail-P103'],
    from: [s.section01 + 118, 226],
    to: [s.section01 + 91, 338],
    flatCaps: true,
    segments: [
      { from: [s.section01 + 118, 226], to: [s.section01 + 91, 338] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section01 + 111, 215],
          [s.section01 + 145, 215],
          [s.section01 + 145, 226],
          [s.section01 + 121, 226],
          [s.section01 + 107.75, 278.5],
          [s.section01 + 95.75, 278.5],
          [s.section01 + 109, 226],
        ],
        pathD: [
          getClosedPathD([
            [s.section01 + 111, 215],
            [s.section01 + 145, 215],
            [s.section01 + 145, 226],
            [s.section01 + 121, 226],
            [s.section01 + 107.75, 278.5],
            [s.section01 + 95.75, 278.5],
            [s.section01 + 109, 226],
          ]),
          getClosedPathD([
            [s.section01 + 107.25, 280.5],
            [s.section01 + 94, 333],
            [s.section01 + 82, 333],
            [s.section01 + 95.25, 280.5],
          ]),
        ].join(' '),
        edgePathD: [
          getClosedPathD(makeSlantedTrackEdgePoints([s.section01 + 115, 226], [s.section01 + 101.75, 278.5])),
          getClosedPathD(makeSlantedTrackEdgePoints([s.section01 + 101.25, 280.5], [s.section01 + 88, 333])),
        ].join(' '),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'hbf-110-to-109-guide',
    railIds: ['rail-P105', 'rail-P102'],
    from: [s.section01 + 277, 226],
    to: [s.section01 + 234, 455],
    flatCaps: true,
    segments: [
      { from: [s.section01 + 277, 226], to: [s.section01 + 234, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section01 + 273, 215],
          [s.section01 + 301, 215],
          [s.section01 + 301, 226],
          [s.section01 + 283, 226],
          [s.section01 + 262, 339.5],
          [s.section01 + 250, 339.5],
          [s.section01 + 271, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section01 + 277, 226], [s.section01 + 256, 339.5]),
      },
      {
        polygonPoints: [
          [s.section01 + 261, 341.5],
          [s.section01 + 240, 455],
          [s.section01 + 238, 466],
          [s.section01 + 204, 466],
          [s.section01 + 204, 455],
          [s.section01 + 228, 455],
          [s.section01 + 249, 341.5],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section01 + 255, 341.5], [s.section01 + 234, 455]),
        edgeVisualOnly: true,
      },
    ],
    tone: 'white',
  },
  {
    id: 'hbf-204-to-205-guide',
    railIds: ['rail-P201', 'rail-P200'],
    from: [s.section01 + 560, 226],
    to: [s.section01 + 517, 455],
    flatCaps: true,
    segments: [
      { from: [s.section01 + 560, 226], to: [s.section01 + 517, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section01 + 556, 215],
          [s.section01 + 585, 215],
          [s.section01 + 585, 226],
          [s.section01 + 566, 226],
          [s.section01 + 545, 339.5],
          [s.section01 + 533, 339.5],
          [s.section01 + 554, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section01 + 560, 226], [s.section01 + 539, 339.5]),
      },
      {
        polygonPoints: [
          [s.section01 + 544, 341.5],
          [s.section01 + 523, 455],
          [s.section01 + 521, 466],
          [s.section01 + 477, 466],
          [s.section01 + 477, 455],
          [s.section01 + 511, 455],
          [s.section01 + 532, 341.5],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section01 + 538, 341.5], [s.section01 + 517, 455]),
        edgeVisualOnly: true,
      },
    ],
    tone: 'white',
  },
  {
    id: 'frp-p301-p300-guide',
    railIds: ['rail-P301', 'rail-P300'],
    from: [s.section02 + 124, 226],
    to: [s.section02 + 187, MIDDLE_TURNBACK_TRACK_TOP_Y],
    flatCaps: true,
    segments: [
      { from: [s.section02 + 124, 226], to: [s.section02 + 139.5, MIDDLE_TURNBACK_UPPER_BREAK_Y] },
      { from: [s.section02 + 139.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y], to: [s.section02 + 148.4, MIDDLE_TURNBACK_TRACK_TOP_Y] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section02 + 88, 215],
          [s.section02 + 128, 215],
          [s.section02 + 145.5, MIDDLE_TURNBACK_UPPER_BREAK_Y],
          [s.section02 + 133.5, MIDDLE_TURNBACK_UPPER_BREAK_Y],
          [s.section02 + 118, 226],
          [s.section02 + 88, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 124, 226], [s.section02 + 139.5, MIDDLE_TURNBACK_UPPER_BREAK_Y]),
        edgeVisualOnly: true,
      },
      {
        polygonPoints: [
          [s.section02 + 133.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y],
          [s.section02 + 145.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y],
          [s.section02 + 154.4, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 144.4, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 139.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y], [s.section02 + 148.4, MIDDLE_TURNBACK_TRACK_TOP_Y]),
        edgeVisualOnly: true,
      },
    ],
  },
  {
    id: 'frp-p305-p303-guide',
    railIds: ['rail-P305', 'rail-P303'],
    from: [s.section02 + 318, 226],
    to: [s.section02 + 307, MIDDLE_TURNBACK_TRACK_TOP_Y],
    flatCaps: true,
    segments: [
      { from: [s.section02 + 318, 226], to: [s.section02 + 300.6, MIDDLE_TURNBACK_UPPER_BREAK_Y] },
      { from: [s.section02 + 300.1, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y], to: [s.section02 + 290.1, MIDDLE_TURNBACK_TRACK_TOP_Y] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section02 + 314, 215],
          [s.section02 + 345, 215],
          [s.section02 + 345, 226],
          [s.section02 + 324, 226],
          [s.section02 + 306.6, MIDDLE_TURNBACK_UPPER_BREAK_Y],
          [s.section02 + 294.6, MIDDLE_TURNBACK_UPPER_BREAK_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 318, 226], [s.section02 + 300.6, MIDDLE_TURNBACK_UPPER_BREAK_Y]),
      },
      {
        polygonPoints: [
          [s.section02 + 306.1, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y],
          [s.section02 + 296.1, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 294.1, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 258, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 258, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 284.1, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 294.1, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 300.1, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y], [s.section02 + 290.1, MIDDLE_TURNBACK_TRACK_TOP_Y]),
      },
    ],
  },
  {
    id: 'frp-p304-p302-guide',
    railIds: ['rail-P304', 'rail-P302'],
    from: [s.section02 + 173, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
    to: [s.section02 + 151, 455],
    flatCaps: true,
    segments: [
      { from: [s.section02 + 173, MIDDLE_TURNBACK_TRACK_BOTTOM_Y], to: [s.section02 + 162, MIDDLE_TURNBACK_LOWER_BREAK_Y] },
      { from: [s.section02 + 162, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y], to: [s.section02 + 151, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section02 + 169, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 179, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 168, MIDDLE_TURNBACK_LOWER_BREAK_Y],
          [s.section02 + 156, MIDDLE_TURNBACK_LOWER_BREAK_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 173, MIDDLE_TURNBACK_TRACK_BOTTOM_Y], [s.section02 + 162, MIDDLE_TURNBACK_LOWER_BREAK_Y]),
      },
      {
        polygonPoints: [
          [s.section02 + 168, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y],
          [s.section02 + 157, 455],
          [s.section02 + 155, 466],
          [s.section02 + 88, 466],
          [s.section02 + 88, 455],
          [s.section02 + 145, 455],
          [s.section02 + 156, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 162, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y], [s.section02 + 151, 455]),
      },
    ],
  },
  {
    id: 'frp-p307-p306-guide',
    railIds: ['rail-P307', 'rail-P306'],
    from: [s.section02 + 328, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
    to: [s.section02 + 348, 455],
    flatCaps: true,
    segments: [
      { from: [s.section02 + 333, MIDDLE_TURNBACK_TRACK_BOTTOM_Y], to: [s.section02 + 343, MIDDLE_TURNBACK_LOWER_BREAK_Y] },
      { from: [s.section02 + 343, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y], to: [s.section02 + 353, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section02 + 258, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 337, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 349, MIDDLE_TURNBACK_LOWER_BREAK_Y],
          [s.section02 + 337, MIDDLE_TURNBACK_LOWER_BREAK_Y],
          [s.section02 + 327, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 258, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 333, MIDDLE_TURNBACK_TRACK_BOTTOM_Y], [s.section02 + 343, MIDDLE_TURNBACK_LOWER_BREAK_Y]),
      },
      {
        polygonPoints: [
          [s.section02 + 337, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y],
          [s.section02 + 349, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y],
          [s.section02 + 359, 455],
          [s.section02 + 387, 455],
          [s.section02 + 387, 466],
          [s.section02 + 349, 466],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 343, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y], [s.section02 + 353, 455]),
        edgeVisualOnly: true,
      },
    ],
  },
  {
    id: 'wlh-p401-p400-guide',
    railIds: ['rail-P401', 'rail-P400'],
    from: [s.section02 + 837.5, 226],
    to: [s.section02 + 882, MIDDLE_TURNBACK_TRACK_TOP_Y],
    flatCaps: true,
    segments: [
      { from: [s.section02 + 837.5, 226], to: [s.section02 + 853, MIDDLE_TURNBACK_UPPER_BREAK_Y] },
      { from: [s.section02 + 853.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y], to: [s.section02 + 862.4, MIDDLE_TURNBACK_TRACK_TOP_Y] },
    ],
    segmentPolygons: [
      {
        ...makeUpperLeftSlantedCornerPiece(s.section02 + 795, [s.section02 + 837.5, 226], [s.section02 + 853, MIDDLE_TURNBACK_UPPER_BREAK_Y]),
      },
      {
        polygonPoints: [
          [s.section02 + 847.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y],
          [s.section02 + 859.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y],
          [s.section02 + 868.4, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 906, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 906, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 858.4, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 853.5, MIDDLE_TURNBACK_UPPER_BREAK_RESUME_Y], [s.section02 + 862.4, MIDDLE_TURNBACK_TRACK_TOP_Y]),
      },
    ],
  },
  {
    id: 'wlh-p403-p402-guide',
    railIds: ['rail-P403', 'rail-P402'],
    from: [s.section02 + 970.7, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
    to: [s.section02 + 990.5, 455],
    flatCaps: true,
    segments: [
      { from: [s.section02 + 970.7, MIDDLE_TURNBACK_TRACK_BOTTOM_Y], to: [s.section02 + 980.38, MIDDLE_TURNBACK_LOWER_BREAK_Y] },
      { from: [s.section02 + 980.85, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y], to: [s.section02 + 990.5, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section02 + 942, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 974.7, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 986.38, MIDDLE_TURNBACK_LOWER_BREAK_Y],
          [s.section02 + 974.38, MIDDLE_TURNBACK_LOWER_BREAK_Y],
          [s.section02 + 964.7, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 942, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 970.7, MIDDLE_TURNBACK_TRACK_BOTTOM_Y], [s.section02 + 980.38, MIDDLE_TURNBACK_LOWER_BREAK_Y]),
      },
      {
        polygonPoints: [
          [s.section02 + 974.85, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y],
          [s.section02 + 986.85, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y],
          [s.section02 + 996.5, 455],
          [s.section02 + 1022, 455],
          [s.section02 + 1022, 466],
          [s.section02 + 986.5, 466],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section02 + 980.85, MIDDLE_TURNBACK_LOWER_BREAK_RESUME_Y], [s.section02 + 990.5, 455]),
      },
    ],
  },
  {
    id: 'skg-605-to-604-upper-guide',
    railIds: ['rail-P601', 'rail-P601-2'],
    routeRailIds: ['rail-P601', 'rail-P601'],
    from: [s.section03 + 643, 225],
    to: [s.section03 + 622, 339],
    flatCaps: true,
    segments: [
      { from: [s.section03 + 643, 225], to: [s.section03 + 622, 339] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 639, 215],
          [s.section03 + 687, 215],
          [s.section03 + 687, 226],
          [s.section03 + 637, 226],
        ],
        edgePathPoints: [],
      },
      makeSlantedTrackPiece([s.section03 + 643, 225], [s.section03 + 622, 339]),
    ],
  },
  {
    id: 'skg-605-to-604-lower-guide',
    railIds: ['rail-P600'],
    from: [s.section03 + 622, 341],
    to: [s.section03 + 599, 466],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 628, 341],
          [s.section03 + 605, 455],
          [s.section03 + 603, 466],
          [s.section03 + 572, 466],
          [s.section03 + 572, 455],
          [s.section03 + 593, 455],
          [s.section03 + 616, 341],
        ],
        edgePolygonPoints: [
          [s.section03 + 612, 341],
          [s.section03 + 615, 341],
          [s.section03 + 592.1, 454],
          [s.section03 + 589.1, 454],
        ],
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'skg-p606-guide',
    railIds: ['rail-P606'],
    from: [s.section03 + 836, 341],
    to: [s.section03 + 857, 466],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 830, 341],
          [s.section03 + 842, 341],
          [s.section03 + 861, 455],
          [s.section03 + 982, 455],
          [s.section03 + 982, 466],
          [s.section03 + 851, 466],
        ],
        edgePolygons: [
          [
            [s.section03 + 826, 341],
            [s.section03 + 829, 341],
            [s.section03 + 848, 454],
            [s.section03 + 845, 454],
          ],
          [
            [s.section03 + 817, 468],
            [s.section03 + 982, 468],
            [s.section03 + 982, 471],
            [s.section03 + 817, 471],
          ],
        ],
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'bgk-p611-p609-guide',
    railIds: ['rail-P611', 'rail-P609'],
    from: [s.section03 + 920, 226],
    to: [s.section03 + 892, 280],
    flatCaps: true,
    segments: [
      { from: [s.section03 + 920, 226], to: [s.section03 + 915, 252] },
      { from: [s.section03 + 914.5, 254], to: [s.section03 + 909.5, 280] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 916, 215],
          [s.section03 + 950, 215],
          [s.section03 + 950, 226],
          [s.section03 + 926, 226],
          [s.section03 + 921, 252],
          [s.section03 + 909, 252],
          [s.section03 + 914, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section03 + 920, 226], [s.section03 + 915, 252]),
      },
      {
        polygonPoints: [
          [s.section03 + 920.5, 254],
          [s.section03 + 916.25, 276],
          [s.section03 + 914.25, 286],
          [s.section03 + 881, 286],
          [s.section03 + 893, 276],
          [s.section03 + 904.25, 276],
          [s.section03 + 908.5, 254],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section03 + 914.5, 254], [s.section03 + 909.5, 280]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'skg-613-to-614-guide',
    railIds: ['rail-P613'],
    from: [s.section03 + 970, 226],
    to: [s.section03 + 988, 339],
    flatCaps: true,
    segments: [
      { from: [s.section03 + 970, 226], to: [s.section03 + 988, 339] },
    ],
    segmentPolygons: [
      makeUpperLeftSlantedCornerPiece(s.section03 + 952, [s.section03 + 970, 226], [s.section03 + 988, 339]),
    ],
    tone: 'yellow',
  },
  {
    id: 'skg-p608-guide',
    railIds: ['rail-P608'],
    from: [s.section03 + 988, 341],
    to: [s.section03 + 1006, 455],
    flatCaps: true,
    segments: [
      { from: [s.section03 + 988, 341], to: [s.section03 + 1006, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 982, 341],
          [s.section03 + 994, 341],
          [s.section03 + 1012, 455],
          [s.section03 + 1048, 455],
          [s.section03 + 1048, 466],
          [s.section03 + 1000, 466],
        ],
        inactivePolygonPoints: [
          [s.section03 + 982, 341],
          [s.section03 + 994, 341],
          [s.section03 + 1012, 455],
          [s.section03 + 1000, 455],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section03 + 988, 341], [s.section03 + 1006, 455]),
      },
    ],
    tone: 'grey',
  },
  {
    id: 'skg-p615-guide',
    railIds: ['rail-P615'],
    from: [s.section03 + 1138, 226],
    to: [s.section03 + 1120, 339],
    flatCaps: true,
    segments: [
      { from: [s.section03 + 1138, 226], to: [s.section03 + 1120, 339] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 1134, 215],
          [s.section03 + 1164, 215],
          [s.section03 + 1164, 226],
          [s.section03 + 1144, 226],
          [s.section03 + 1126, 339],
          [s.section03 + 1114, 339],
          [s.section03 + 1132, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section03 + 1138, 226], [s.section03 + 1120, 339]),
      },
    ],
    tone: 'grey',
  },
  {
    id: 'skg-p610-guide',
    railIds: ['rail-P610'],
    from: [s.section03 + 1120, 341],
    to: [s.section03 + 1102, 455],
    flatCaps: true,
    segments: [
      { from: [s.section03 + 1120, 341], to: [s.section03 + 1102, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 1126, 341],
          [s.section03 + 1108, 455],
          [s.section03 + 1106, 466],
          [s.section03 + 1050, 466],
          [s.section03 + 1050, 455],
          [s.section03 + 1096, 455],
          [s.section03 + 1114, 341],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section03 + 1120, 341], [s.section03 + 1102, 455]),
      },
    ],
    tone: 'white',
  },
  {
    id: 'pgl-p701-p700-guide',
    railIds: ['rail-P701', 'rail-P700'],
    from: [s.section04 + 105, 226],
    to: [s.section04 + 132, 455],
    flatCaps: true,
    segments: [
      { from: [s.section04 + 105, 226], to: [s.section04 + 119, 339] },
      { from: [s.section04 + 119, 341], to: [s.section04 + 132, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 66, 215],
          [s.section04 + 109, 215],
          [s.section04 + 125, 339],
          [s.section04 + 113, 339],
          [s.section04 + 99, 226],
          [s.section04 + 66, 226],
        ],
        pathD: getClosedPathD([
          [s.section04 + 66, 215],
          [s.section04 + 109, 215],
          [s.section04 + 125, 339],
          [s.section04 + 113, 339],
          [s.section04 + 99, 226],
          [s.section04 + 66, 226],
        ]),
        edgePathD: getClosedPathD(makeSlantedTrackEdgePoints([s.section04 + 105, 226], [s.section04 + 119, 339])),
      },
      {
        polygonPoints: [
          [s.section04 + 113, 341],
          [s.section04 + 125, 341],
          [s.section04 + 138, 455],
          [s.section04 + 164, 455],
          [s.section04 + 164, 466],
          [s.section04 + 127, 466],
        ],
        edgePathD: getClosedPathD(makeSlantedTrackEdgePoints([s.section04 + 119, 341], [s.section04 + 132, 455])),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgl-p703-p702-guide',
    railIds: ['rail-P703', 'rail-P702'],
    from: [s.section04 + 236, 225],
    to: [s.section04 + 199, 455],
    flatCaps: true,
    segments: [
      { from: [s.section04 + 236, 225], to: [s.section04 + 218, 339] },
      { from: [s.section04 + 218, 341], to: [s.section04 + 199, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 232, 215],
          [s.section04 + 264, 215],
          [s.section04 + 264, 226],
          [s.section04 + 242, 226],
          [s.section04 + 224, 339],
          [s.section04 + 212, 339],
          [s.section04 + 230, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 236, 226], [s.section04 + 218, 339]),
      },
      {
        polygonPoints: [
          [s.section04 + 224, 341],
          [s.section04 + 205, 455],
          [s.section04 + 203, 466],
          [s.section04 + 166, 466],
          [s.section04 + 166, 455],
          [s.section04 + 193, 455],
          [s.section04 + 212, 341],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 218, 341], [s.section04 + 199, 455]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-1105-to-1106-guide',
    railIds: ['rail-1105-1106-guide'],
    from: [s.section04 + 612, 225],
    to: [s.section04 + 676, 455],
    flatCaps: true,
    segments: [
      { from: [s.section04 + 612, 225], to: [s.section04 + 633, 300] },
      { from: [s.section04 + 634, 302], to: [s.section04 + 655, 380] },
      { from: [s.section04 + 656, 382], to: [s.section04 + 676, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 550, 215],
          [s.section04 + 616, 215],
          [s.section04 + 618, 226],
          [s.section04 + 639, 300],
          [s.section04 + 661, 380],
          [s.section04 + 682, 455],
          [s.section04 + 670, 455],
          [s.section04 + 650, 382],
          [s.section04 + 649, 380],
          [s.section04 + 628, 302],
          [s.section04 + 627, 300],
          [s.section04 + 606, 226],
          [s.section04 + 550, 226],
        ],
        edgePolygons: [
          makeSlantedTrackEdgePoints([s.section04 + 612, 226], [s.section04 + 633, 300]),
          makeSlantedTrackEdgePoints([s.section04 + 634, 302], [s.section04 + 655, 380]),
          makeSlantedTrackEdgePoints([s.section04 + 656, 382], [s.section04 + 676, 455]),
        ],
      },
    ],
  },
  {
    id: 'pgc-1107-to-1104-guide',
    railIds: ['rail-1107-to-1115-background', 'rail-1115', 'rail-1115-to-1104-background'],
    from: [s.section04 + 676, 225],
    to: [s.section04 + 612, 455],
    tone: 'grey',
    flatCaps: true,
    segments: [
      { from: [s.section04 + 676, 225], to: [s.section04 + 655, 300] },
      { from: [s.section04 + 654, 302], to: [s.section04 + 633, 380] },
      { from: [s.section04 + 632, 382], to: [s.section04 + 612, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 682, 225],
          [s.section04 + 661, 300],
          [s.section04 + 649, 300],
          [s.section04 + 670, 225],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 676, 225], [s.section04 + 655, 300]),
      },
      {
        polygonPoints: [
          [s.section04 + 660, 302],
          [s.section04 + 639, 380],
          [s.section04 + 627, 380],
          [s.section04 + 648, 302],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 654, 302], [s.section04 + 633, 380]),
      },
      {
        polygonPoints: [
          [s.section04 + 638, 382],
          [s.section04 + 618, 455],
          [s.section04 + 606, 455],
          [s.section04 + 626, 382],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 632, 382], [s.section04 + 612, 455]),
      },
    ],
  },
  {
    id: 'pgc-p1101-to-1115-guide',
    railIds: ['rail-P1101'],
    from: [s.section04 + 612, 225],
    to: [s.section04 + 633, 300],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 618, 226],
          [s.section04 + 639, 300],
          [s.section04 + 627, 300],
          [s.section04 + 606, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 612, 226], [s.section04 + 633, 300]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-p1103-to-1115-guide',
    railIds: ['rail-P1103'],
    from: [s.section04 + 676, 225],
    to: [s.section04 + 655, 300],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 672, 215],
          [s.section04 + 750, 215],
          [s.section04 + 750, 226],
          [s.section04 + 682, 226],
          [s.section04 + 661, 300],
          [s.section04 + 649, 300],
          [s.section04 + 670, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 676, 226], [s.section04 + 655, 300]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-p1100-to-1115-guide',
    railIds: ['rail-P1100'],
    from: [s.section04 + 612, 455],
    to: [s.section04 + 632, 382],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 638, 382],
          [s.section04 + 618, 455],
          [s.section04 + 616, 466],
          [s.section04 + 549, 466],
          [s.section04 + 549, 455],
          [s.section04 + 606, 455],
          [s.section04 + 626, 382],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 632, 382], [s.section04 + 612, 455]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-p1102-to-1115-guide',
    railIds: ['rail-P1102'],
    from: [s.section04 + 676, 455],
    to: [s.section04 + 656, 382],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section04 + 650, 382],
          [s.section04 + 662, 382],
          [s.section04 + 682, 455],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.section04 + 656, 382], [s.section04 + 676, 455]),
      },
    ],
    tone: 'yellow',
  },
] as const

export const staticTrackPieces = [
  {
    id: 'hbf-p101-approach-100',
    railId: 'rail-100',
    from: [s.section01 + 6, 338],
    to: [s.section01 + 60, 338],
    state: 'unset',
    width: 10,
  },
  {
    id: 'hbf-p101-approach-102',
    railId: 'rail-102',
    from: [s.section01 + 63, 338],
    to: [s.section01 + 91, 338],
    state: 'unset',
    width: 10,
  },
] as const

export const staticTrackPaths = [
  {
    id: 'hbf-p101-track-102',
    railId: 'rail-102',
    points: [
      [s.section01 + 63, 338],
      [s.section01 + 91, 338],
      [s.section01 + 106, 398],
    ],
    polygonPoints: [
      [s.section01 + 63, 333],
      [s.section01 + 95, 333],
      [s.section01 + 112, 398.5],
      [s.section01 + 100, 398.5],
      [s.section01 + 85, 343],
      [s.section01 + 63, 343],
    ],
    edgePolygonPoints: [
      [s.section01 + 81, 348],
      [s.section01 + 84, 348],
      [s.section01 + 97.6, 398.5],
      [s.section01 + 94.6, 398.5],
    ],
    lineJoin: 'miter',
    state: 'unset',
    width: 10,
  },
  {
    id: 'hbf-p101-track-106',
    railId: 'rail-106',
    points: [
      [s.section01 + 107, 400],
      [s.section01 + 121, 460],
      [s.section01 + 145, 460],
    ],
    polygonPoints: [
      [s.section01 + 101, 400],
      [s.section01 + 113, 400],
      [s.section01 + 127, 455],
      [s.section01 + 145, 455],
      [s.section01 + 145, 466],
      [s.section01 + 118, 466],
    ],
    edgePolygonPoints: [
      [s.section01 + 97, 400],
      [s.section01 + 100, 400],
      [s.section01 + 117.5, 468],
      [s.section01 + 114.5, 468],
    ],
    lineJoin: 'miter',
    state: 'unset',
    width: 10,
  },
] as const

export const staticTrackBoundaries = [
  { id: 'hbf-upper-start', x: s.section01 + 2, y: 220.5, angle: 0, width: 4 },
  { id: 'hbf-p101-approach-start', x: s.section01 + 2, y: 338, angle: 0, width: 4 },
  { id: 'section04-upper-end', x: s.section04 + 965, y: 220.5, angle: 0, width: 4 },
  { id: 'section04-lower-end', x: s.section04 + 965, y: 460.5, angle: 0, width: 4 },
  { id: 'bgk-rt3-663-feeder-end', x: s.section03 + 626, y: 177, angle: 0, width: 4, height: 16 },
  { id: 'bgk-rt1-651-end', x: s.section03 + 935, y: 281, angle: 0, width: 4, height: 22 },
] as const

const upperArrowPattern = [
  { x: 0, tone: 'strong' },
  { x: 55, tone: 'soft' },
  { x: 128, tone: 'strong' },
  { x: 188, tone: 'soft' },
  { x: 258, tone: 'strong' },
  { x: 354, tone: 'soft' },
  { x: 454, tone: 'strong' },
  { x: 552, tone: 'soft' },
  { x: 650, tone: 'strong' },
  { x: 744, tone: 'soft' },
  { x: 828, tone: 'strong' },
  { x: 952, tone: 'soft' },
  { x: 1078, tone: 'soft' },
  { x: 1198, tone: 'strong' },
] as const

const lowerArrowPattern = [
  { x: 0, tone: 'soft' },
  { x: 55, tone: 'strong' },
  { x: 130, tone: 'soft' },
  { x: 210, tone: 'strong' },
  { x: 290, tone: 'soft' },
  { x: 360, tone: 'strong' },
  { x: 455, tone: 'soft' },
  { x: 630, tone: 'strong' },
  { x: 720, tone: 'soft' },
  { x: 840, tone: 'soft' },
  { x: 960, tone: 'soft' },
  { x: 1118, tone: 'strong' },
  { x: 1200, tone: 'strong' },
] as const

const mapSections = [s.section01, s.section02, s.section03, s.section04] as const

export const mapArrowData = mapSections.flatMap((offset) => [
  ...upperArrowPattern.filter((arrow) => !(
    (offset === s.section02 && arrow.x === 1198) ||
    (offset === s.section03 && (arrow.x === 552 || arrow.x === 650)) ||
    (offset === s.section04 && arrow.x >= 952)
  )).map((arrow) => ({
    direction: 'right' as const,
    tone: arrow.tone,
    x: offset + arrow.x,
    y: 146,
  })),
  ...lowerArrowPattern.filter((arrow) => !(
    (offset === s.section02 && arrow.x === 1200) ||
    (offset === s.section04 && arrow.x >= 960)
  )).map((arrow) => ({
    direction: 'left' as const,
    tone: arrow.tone,
    x: offset + arrow.x,
    y: 559 - LOWER_ARROW_LIFT,
  })),
])

const bgkP602RouteSegment = {
  id: 'bgk-p602',
  railId: 'rail-P602',
  idleColor: '#eedc7f',
  idleOpacity: 1,
  joined: true,
  preserveTone: true,
  points: [
    [s.section03 + 673, 156],
    [s.section03 + 669, 183],
    [s.section03 + 630, 177],
    [s.section03 + 669, 177],
    [s.section03 + 669, 180],
  ],
  segmentPolygons: [
    {
      polygonPoints: [
        [s.section03 + 667, 156],
        [s.section03 + 679, 156],
        [s.section03 + 675, 183],
        [s.section03 + 630, 183],
        [s.section03 + 630, 171],
        [s.section03 + 665, 171],
      ],
      edgePolygonPoints: [
        [s.section03 + 663, 156],
        [s.section03 + 666, 156],
        [s.section03 + 664, 169],
        [s.section03 + 630, 169],
        [s.section03 + 630, 166],
        [s.section03 + 664.5, 166],
      ],
    },
  ],
  rounded: false,
  tone: 'yellow',
  width: 12,
} as const

const bgkRt3Track661Segment = {
  id: 'bgk-rt3-661',
  railId: 'rail-661',
  color: '#63869a',
  joined: true,
  opacity: 0.28,
  preserveTone: true,
  points: [
    [s.section03 + 673, 156],
    [s.section03 + 667, 194],
  ],
  ...makeSlantedTrackPiece([s.section03 + 673, 156], [s.section03 + 667, 194]),
  rounded: false,
  tone: 'yellow',
  width: 12,
} as const

type RouteTrackState = 'condition' | 'set' | 'unset'

export type TrackPieceDefinition = {
  readonly clipPath?: string
  readonly color?: string
  readonly opacity?: number
  readonly railId?: string
  readonly railIds?: readonly string[]
  readonly state: RouteTrackState
  readonly width: number
  readonly x: number
}

const STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR = '#63869a'
const STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY = 0.42

function blockedBySlantedTrack(x: number, width: number, state: RouteTrackState): TrackPieceDefinition {
  return {
    color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR,
    opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY,
    state,
    width,
    x,
  }
}

const section02MiddleTrackBlockedBySlant = blockedBySlantedTrack(s.section02 + 124, 232, 'unset')
const wlhTurnbackRail416 = blockedBySlantedTrack(s.section02 + 826, 80, 'unset')
const wlhTurnbackRail418 = blockedBySlantedTrack(s.section02 + 908, 32, 'unset')
const wlhTurnbackRail420 = blockedBySlantedTrack(s.section02 + 942, 80, 'unset')

function makeBlockedStraightRouteSegmentPiece(piece: Pick<TrackPieceDefinition, 'width' | 'x'>) {
  const x2 = piece.x + piece.width

  return {
    polygonPoints: [
      [piece.x, MIDDLE_TURNBACK_TRACK_TOP_Y],
      [x2, MIDDLE_TURNBACK_TRACK_TOP_Y],
      [x2, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
      [piece.x, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
    ],
    edgePolygonPoints: [
      [piece.x, MIDDLE_TURNBACK_STRIP_TOP_Y],
      [x2, MIDDLE_TURNBACK_STRIP_TOP_Y],
      [x2, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
      [piece.x, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
    ],
    edgeVisualOnly: true,
  }
}

export const routeSegmentData = [
  {
    id: 'hbf-turnback',
    railId: 'rail-hbf-turnback',
    points: [
      [s.section01 + 6, 338],
      [s.section01 + 91, 338],
      [s.section01 + 128, 460],
      [s.section01 + 266, 458],
    ],
    hideWhenIdle: true,
    rounded: false,
    tone: 'yellow',
    width: 10,
  },
  {
    id: 'section02-middle-turnback',
    railId: 'rail-middle-turnback',
    railIds: ['rail-314', 'rail-318', 'rail-320'],
    idleColor: section02MiddleTrackBlockedBySlant.color,
    idleOpacity: section02MiddleTrackBlockedBySlant.opacity,
    points: [
      [s.section02 + 124, MIDDLE_TURNBACK_TRACK_CENTER_Y],
      [s.section02 + 356, MIDDLE_TURNBACK_TRACK_CENTER_Y],
    ],
    capColor: '#000000',
    capHeight: 22,
    capWidth: 4,
    tone: 'yellow',
    width: 10,
    caps: true,
    joined: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section02 + 124, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 124, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
        ],
        edgePolygonPoints: [
          [s.section02 + 124, MIDDLE_TURNBACK_STRIP_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_STRIP_TOP_Y],
          [s.section02 + 222, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
          [s.section02 + 124, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
        ],
        edgeVisualOnly: true,
      },
      {
        polygonPoints: [
          [s.section02 + 224, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 256, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 256, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 224, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
        ],
        edgePolygonPoints: [
          [s.section02 + 224, MIDDLE_TURNBACK_STRIP_TOP_Y],
          [s.section02 + 256, MIDDLE_TURNBACK_STRIP_TOP_Y],
          [s.section02 + 256, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
          [s.section02 + 224, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
        ],
        edgeVisualOnly: true,
      },
      {
        polygonPoints: [
          [s.section02 + 258, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 356, MIDDLE_TURNBACK_TRACK_TOP_Y],
          [s.section02 + 356, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
          [s.section02 + 258, MIDDLE_TURNBACK_TRACK_BOTTOM_Y],
        ],
        edgePolygonPoints: [
          [s.section02 + 258, MIDDLE_TURNBACK_STRIP_TOP_Y],
          [s.section02 + 356, MIDDLE_TURNBACK_STRIP_TOP_Y],
          [s.section02 + 356, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
          [s.section02 + 258, MIDDLE_TURNBACK_STRIP_BOTTOM_Y],
        ],
        edgeVisualOnly: true,
      },
    ],
  },
  {
    id: 'wlh-turnback',
    railId: 'rail-wlh-turnback',
    railIds: ['rail-416', 'rail-418', 'rail-420'],
    idleColor: wlhTurnbackRail416.color,
    idleOpacity: wlhTurnbackRail416.opacity,
    points: [
      [s.section02 + 826, MIDDLE_TURNBACK_TRACK_CENTER_Y],
      [s.section02 + 1022, MIDDLE_TURNBACK_TRACK_CENTER_Y],
    ],
    capColor: '#000000',
    capHeight: 22,
    capWidth: 4,
    tone: 'yellow',
    width: 10,
    caps: true,
    joined: true,
    segmentPolygons: [
      makeBlockedStraightRouteSegmentPiece(wlhTurnbackRail416),
      makeBlockedStraightRouteSegmentPiece(wlhTurnbackRail418),
      makeBlockedStraightRouteSegmentPiece(wlhTurnbackRail420),
    ],
  },
  {
    id: 'bgk-p603',
    railId: 'rail-P603',
    color: '#63869a',
    joined: true,
    opacity: 0.28,
    points: [
      [s.section03 + 667, 196],
      [s.section03 + 662, 226],
      [s.section03 + 588, 220.5],
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 661, 196],
          [s.section03 + 673, 196],
          [s.section03 + 668, 226],
          [s.section03 + 588, 226],
          [s.section03 + 588, 215],
          [s.section03 + 658, 215],
        ],
        // LOCKED GEOMETRY: user-approved P603 left/top strip. Do not edit this strip or its paired P603 polygon.
        edgePolygonPoints: [
          [s.section03 + 657, 196],
          [s.section03 + 660, 196],
          [s.section03 + 657, 213],
          [s.section03 + 588, 213],
          [s.section03 + 588, 210],
          [s.section03 + 655, 210],
        ],
      },
    ],
    rounded: false,
    width: 12,
  },
  bgkRt3Track661Segment,
  bgkP602RouteSegment,
  {
    id: 'bgk-rt3',
    railId: 'rail-RT3',
    railIds: ['rail-663', 'rail-665'],
    joined: true,
    preserveTone: true,
    points: [
      [s.section03 + 663, 215],
      [s.section03 + 667, 190],
      [s.section03 + 671, 164],
      [s.section03 + 676, 137],
      [s.section03 + 680, 110],
    ],
    segmentPolygons: [
      makeSlantedTrackPiece([s.section03 + 673, 154], [s.section03 + 676, 133]),
      makeSlantedTrackPiece([s.section03 + 677, 131], [s.section03 + 680, 110]),
    ],
    rounded: false,
    tone: 'yellow',
    width: 12,
  },
  {
    id: 'bgk-rt2-652',
    railId: 'rail-652',
    joined: true,
    preserveTone: true,
    points: [
      [s.section03 + 796, 110],
      [s.section03 + 802, 144],
    ],
    ...makeSlantedTrackPiece([s.section03 + 796, 110], [s.section03 + 802, 144]),
    rounded: false,
    tone: 'yellow',
    width: 12,
  },
  {
    id: 'bgk-rt2',
    railId: 'rail-650',
    joined: true,
    preserveTone: true,
    points: [
      [s.section03 + 803, 146],
      [s.section03 + 815, 214],
      [s.section03 + 842, 376],
    ],
    ...makeSlantedTrackPiece([s.section03 + 803, 146], [s.section03 + 836, 339]),
    rounded: false,
    tone: 'yellow',
    width: 12,
  },
  {
    id: 'bgk-rt1',
    railId: 'rail-RT1',
    railIds: ['rail-655', 'rail-653'],
    joined: true,
    preserveTone: true,
    points: [
      [s.section03 + 858, 110],
      [s.section03 + 864, 144],
      [s.section03 + 865, 146],
      [s.section03 + 887, 274],
    ],
    segmentPolygons: [
      makeSlantedTrackPiece([s.section03 + 858, 110], [s.section03 + 864, 144]),
      {
        polygonPoints: [
          [s.section03 + 859, 146],
          [s.section03 + 871, 146],
          [s.section03 + 894, 276],
          [s.section03 + 882, 286],
        ],
        edgePolygonPoints: [
          [s.section03 + 855, 146],
          [s.section03 + 858, 146],
          [s.section03 + 881, 286],
          [s.section03 + 878, 286],
        ],
      },
    ],
    tone: 'yellow',
    rounded: false,
    width: 10,
  },
  {
    id: 'bgk-651',
    railId: 'rail-651',
    joined: true,
    idleColor: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR,
    idleOpacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY,
    preserveTone: true,
    points: [
      [s.section03 + 898, 280],
      [s.section03 + 935, 280],
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.section03 + 896, 276],
          [s.section03 + 935, 276],
          [s.section03 + 935, 286],
          [s.section03 + 884, 286],
        ],
        edgePolygonPoints: [
          [s.section03 + 884, 287],
          [s.section03 + 935, 287],
          [s.section03 + 935, 290],
          [s.section03 + 884, 290],
        ],
        edgeVisualOnly: true,
      },
    ],
    tone: 'yellow',
    width: 10,
  },
] as const

const trainRouteSegmentIds: Record<string, string> = {
  '021': 'hbf-turnback',
  '047': 'wlh-turnback',
  '049': 'wlh-turnback',
  '053': 'section02-middle-turnback',
  '065': 'wlh-turnback',
  '077': 'section02-middle-turnback',
  '089': 'section02-middle-turnback',
  '093': 'wlh-turnback',
  '095': 'hbf-turnback',
  '097': 'section02-middle-turnback',
  '301': 'bgk-rt3',
  '309': 'pgc-depot',
  '312': 'pgc-depot',
  '314': 'pgc-depot',
  '317': 'bgk-rt2',
  '013': 'bgk-rt1',
  '320': 'bgk-rt3',
  '917': 'bgk-rt1',
}

export function getRouteSegmentIdForTrain(train: Pick<TrainState, 'id'>) {
  return trainRouteSegmentIds[train.id] ?? ''
}

export const shapedUpperTrackPieces = [
  {
    id: 'bgk-rt1-right-edge',
    railId: 'rail-611',
    points: [
      [s.section03 + 887, 215],
      [s.section03 + 950, 215],
      [s.section03 + 950, 226],
      [s.section03 + 888.9, 226],
    ],
    state: 'set',
  },
  {
    id: 'bgk-rt2-right-edge',
    railId: 'rail-RT2-edge',
    points: [
      [s.section03 + 821, 215],
      [s.section03 + 865, 215],
      [s.section03 + 866.9, 226],
      [s.section03 + 823, 226],
    ],
    state: 'set',
  },
] as const

export const upperTrackCrossingMasks = [
  {
    id: 'bgk-rt2-upper-cut',
    points: [
      [s.section03 + 815, 209],
      [s.section03 + 820, 240],
    ],
    width: 20,
  },
] as const

export const upperTrackEdgeStrips = [
  {
    id: 'hbf-103-top-strip',
    polygonPoints: [
      [s.section01 + 94, 210],
      [s.section01 + 145, 210],
      [s.section01 + 145, 213],
      [s.section01 + 94, 213],
    ],
  },
  {
    id: 'hbf-109-top-strip',
    polygonPoints: [
      [s.section01 + 250, 210],
      [s.section01 + 301, 210],
      [s.section01 + 301, 213],
      [s.section01 + 250, 213],
    ],
  },
  {
    id: 'hbf-203-top-strip',
    polygonPoints: [
      [s.section01 + 529, 210],
      [s.section01 + 585, 210],
      [s.section01 + 585, 213],
      [s.section01 + 529, 213],
    ],
  },
  {
    id: 'lti-313-top-strip',
    polygonPoints: [
      [s.section02 + 88, 210],
      [s.section02 + 159, 210],
      [s.section02 + 159, 213],
      [s.section02 + 88, 213],
    ],
  },
  {
    id: 'ptp-415-top-strip',
    polygonPoints: [
      [s.section02 + 795, 210],
      [s.section02 + 880, 210],
      [s.section02 + 880, 213],
      [s.section02 + 795, 213],
    ],
  },
  {
    id: 'bgk-p603-locked-strip',
    // LOCKED GEOMETRY: mirrored render of the user-approved P603 strip. Do not edit.
    polygonPoints: [
      [s.section03 + 657, 196],
      [s.section03 + 660, 196],
      [s.section03 + 657, 213],
      [s.section03 + 588, 213],
      [s.section03 + 588, 210],
      [s.section03 + 655, 210],
    ],
  },
  {
    id: 'bgk-605a-right-top-strip',
    // LOCKED GEOMETRY: user-approved separate top strip above right side of 605A. Do not edit.
    polygonPoints: [
      [s.section03 + 672, 210],
      [s.section03 + 687, 210],
      [s.section03 + 687, 213],
      [s.section03 + 671.5, 213],
    ],
  },
  {
    id: 'bgk-609-top-strip-left',
    polygonPoints: [
      [s.section03 + 785, 210],
      [s.section03 + 799, 210],
      [s.section03 + 799.5, 213],
      [s.section03 + 785, 213],
    ],
  },
  {
    id: 'bgk-609-top-strip-middle',
    polygonPoints: [
      [s.section03 + 825, 210],
      [s.section03 + 864.1, 210],
      [s.section03 + 864.6, 213],
      [s.section03 + 825.5, 213],
    ],
  },
  {
    id: 'bgk-611-top-strip',
    polygonPoints: [
      [s.section03 + 887, 210],
      [s.section03 + 950, 210],
      [s.section03 + 950, 213],
      [s.section03 + 887.5, 213],
    ],
  },
  {
    id: 'frp-317-top-strip',
    polygonPoints: [
      [s.section02 + 291, 210],
      [s.section02 + 345, 210],
      [s.section02 + 345, 213],
      [s.section02 + 291, 213],
    ],
  },
  {
    id: 'skg-613-top-strip',
    polygonPoints: [
      [s.section03 + 952, 210],
      [s.section03 + 1102, 210],
      [s.section03 + 1102, 213],
      [s.section03 + 952, 213],
    ],
  },
  {
    id: 'skg-615-top-strip',
    polygonPoints: [
      [s.section03 + 1104, 210],
      [s.section03 + 1164, 210],
      [s.section03 + 1164, 213],
      [s.section03 + 1104, 213],
    ],
  },
  {
    id: 'pgl-705-top-strip',
    polygonPoints: [
      [s.section04 + 66, 210],
      [s.section04 + 204, 210],
      [s.section04 + 204, 213],
      [s.section04 + 66, 213],
    ],
  },
  {
    id: 'pgl-707-top-strip',
    polygonPoints: [
      [s.section04 + 206, 210],
      [s.section04 + 264, 210],
      [s.section04 + 264, 213],
      [s.section04 + 206, 213],
    ],
  },
  {
    id: 'pgc-1105-top-strip',
    polygonPoints: [
      [s.section04 + 550, 210],
      [s.section04 + 628, 210],
      [s.section04 + 628, 213],
      [s.section04 + 550, 213],
    ],
  },
  {
    id: 'pgc-1107-top-strip',
    polygonPoints: [
      [s.section04 + 629, 210],
      [s.section04 + 750, 210],
      [s.section04 + 750, 213],
      [s.section04 + 629, 213],
    ],
  },
] as const

export const lowerTrackEdgeStrips = [
  {
    id: 'hbf-110-bottom-strip',
    polygonPoints: [
      [s.section01 + 204, 468],
      [s.section01 + 263, 468],
      [s.section01 + 263, 471],
      [s.section01 + 204, 471],
    ],
  },
  {
    id: 'hbf-204-bottom-strip',
    polygonPoints: [
      [s.section01 + 477, 468],
      [s.section01 + 585, 468],
      [s.section01 + 585, 471],
      [s.section01 + 477, 471],
    ],
  },
  {
    id: 'lti-312-bottom-strip',
    polygonPoints: [
      [s.section02 + 88, 468],
      [s.section02 + 214, 468],
      [s.section02 + 214, 471],
      [s.section02 + 88, 471],
    ],
  },
  {
    id: 'frp-322-bottom-strip',
    polygonPoints: [
      [s.section02 + 331, 468],
      [s.section02 + 387, 468],
      [s.section02 + 387, 471],
      [s.section02 + 331, 471],
    ],
  },
  {
    id: 'hbf-100-bottom-strip',
    polygonPoints: [
      [s.section01 + 6, 345],
      [s.section01 + 60, 345],
      [s.section01 + 60, 348],
      [s.section01 + 6, 348],
    ],
  },
  {
    id: 'hbf-102-bottom-strip',
    polygonPoints: [
      [s.section01 + 63, 345],
      [s.section01 + 84, 345],
      [s.section01 + 84, 348],
      [s.section01 + 63, 348],
    ],
  },
  {
    id: 'hbf-106-bottom-strip',
    polygonPoints: [
      [s.section01 + 114.5, 468],
      [s.section01 + 145, 468],
      [s.section01 + 145, 471],
      [s.section01 + 114.5, 471],
    ],
  },
  {
    id: 'bgk-604-bottom-strip',
    polygonPoints: [
      [s.section03 + 572, 468],
      [s.section03 + 633, 468],
      [s.section03 + 633, 471],
      [s.section03 + 572, 471],
    ],
  },
  {
    id: 'bgk-612-bottom-strip',
    polygonPoints: [
      [s.section03 + 817, 468],
      [s.section03 + 982, 468],
      [s.section03 + 982, 471],
      [s.section03 + 817, 471],
    ],
  },
  {
    id: 'skg-614-bottom-strip',
    polygonPoints: [
      [s.section03 + 984, 468],
      [s.section03 + 1048, 468],
      [s.section03 + 1048, 471],
      [s.section03 + 984, 471],
    ],
  },
  {
    id: 'skg-616-bottom-strip',
    polygonPoints: [
      [s.section03 + 1050, 468],
      [s.section03 + 1155, 468],
      [s.section03 + 1155, 471],
      [s.section03 + 1050, 471],
    ],
  },
  {
    id: 'skg-618-bottom-strip',
    polygonPoints: [
      [s.section03 + 1157, 468],
      [s.section03 + 1221, 468],
      [s.section03 + 1221, 471],
      [s.section03 + 1157, 471],
    ],
  },
  {
    id: 'pgl-704-bottom-strip',
    polygonPoints: [
      [s.section04 + 99, 468],
      [s.section04 + 164, 468],
      [s.section04 + 164, 471],
      [s.section04 + 99, 471],
    ],
  },
  {
    id: 'pgl-706-bottom-strip',
    polygonPoints: [
      [s.section04 + 166, 468],
      [s.section04 + 231, 468],
      [s.section04 + 231, 471],
      [s.section04 + 166, 471],
    ],
  },
  {
    id: 'pgc-1104-bottom-strip',
    polygonPoints: [
      [s.section04 + 549, 468],
      [s.section04 + 625, 468],
      [s.section04 + 625, 471],
      [s.section04 + 549, 471],
    ],
  },
  {
    id: 'pgc-1115-bottom-strip',
    polygonPoints: [
      [s.section04 + 627, 468],
      [s.section04 + 653, 468],
      [s.section04 + 653, 471],
      [s.section04 + 627, 471],
    ],
  },
  {
    id: 'pgc-1106-bottom-strip',
    polygonPoints: [
      [s.section04 + 655, 468],
      [s.section04 + 750, 468],
      [s.section04 + 750, 471],
      [s.section04 + 655, 471],
    ],
  },
] as const

export const upperTrackPieces = [
  { x: s.section01 + 6, width: 85, state: 'condition', railId: 'rail-101' },
  { x: s.section01 + 94, width: 51, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.section01 + 147, width: 55, state: 'unset', railIds: ['rail-105', 'rail-108'] },
  { x: s.section01 + 204, width: 44, state: 'unset' },
  { x: s.section01 + 250, width: 51, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.section01 + 303, width: 30, state: 'set', railId: 'rail-111' },
  { x: s.section01 + 335, width: 30, state: 'set' },
  { x: s.section01 + 367, width: 30, state: 'condition' },
  { x: s.section01 + 399, width: 30, state: 'set' },
  { x: s.section01 + 432, width: 30, state: 'set' },
  { x: s.section01 + 464, width: 31, state: 'set' },
  { x: s.section01 + 497, width: 30, state: 'set', railId: 'rail-203B' },
  { x: s.section01 + 529, width: 56, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.section01 + 587, width: 56, state: 'set', railIds: ['rail-206', 'rail-207'] },
  { x: s.section01 + 645, width: 90, state: 'set', railId: 'rail-209' },
  { x: s.section01 + 738, width: 55, state: 'set', railIds: ['rail-210', 'rail-211'] },
  { x: s.section01 + 795, width: 95, state: 'set', railId: 'rail-213' },
  { x: s.section01 + 894, width: 55, state: 'condition', railIds: ['rail-214', 'rail-215'] },
  { x: s.section01 + 951, width: 30, state: 'set', railIds: ['rail-216', 'rail-217'] },
  { x: s.section01 + 983, width: 30, state: 'set' },
  { x: s.section01 + 1015, width: 30, state: 'set' },
  { x: s.section01 + 1047, width: 30, state: 'set' },
  { x: s.section01 + 1079, width: 55, state: 'set', railIds: ['rail-304', 'rail-305'] },
  { x: s.section01 + 1136, width: 51, state: 'set', railIds: ['rail-309'] },
  { x: s.section02 + 0, width: 29, state: 'condition', railId: 'rail-308' },
  { x: s.section02 + 31, width: 55, state: 'condition', railIds: ['rail-311-seam', 'rail-310'] },
  blockedBySlantedTrack(s.section02 + 88, 71, 'set'),
  { x: s.section02 + 161, width: 128, state: 'set', railId: 'rail-315' },
  blockedBySlantedTrack(s.section02 + 291, 54, 'set'),
  { x: s.section02 + 347, width: 40, state: 'set', railId: 'rail-319' },
  { x: s.section02 + 389, width: 55, state: 'set', railIds: ['rail-321', 'rail-324'] },
  { x: s.section02 + 446, width: 30, state: 'set', railIds: ['rail-323', 'rail-326'] },
  { x: s.section02 + 478, width: 30, state: 'set' },
  { x: s.section02 + 510, width: 30, state: 'set' },
  { x: s.section02 + 542, width: 30, state: 'set', railId: 'rail-402', railIds: ['rail-403'] },
  { x: s.section02 + 574, width: 55, state: 'set', railIds: ['rail-404', 'rail-405'] },
  { x: s.section02 + 631, width: 30, state: 'condition' },
  { x: s.section02 + 663, width: 30, state: 'set' },
  { x: s.section02 + 695, width: 41, state: 'set', railId: 'rail-411' },
  { x: s.section02 + 738, width: 55, state: 'set', railIds: ['rail-412', 'rail-413'] },
  blockedBySlantedTrack(s.section02 + 795, 85, 'set'),
  { x: s.section02 + 882, width: 152, state: 'set', railId: 'rail-417' },
  { x: s.section02 + 1036, width: 31, state: 'set', railId: 'rail-419' },
  { x: s.section02 + 1069, width: 55, state: 'condition', railId: 'rail-421' },
  { x: s.section02 + 1126, width: 30, state: 'set', railId: 'rail-423' },
  { x: s.section02 + 1158, width: 30, state: 'set' },
  { x: s.section02 + 1190, width: 30, state: 'set' },
  { x: s.section03 + 17, width: 30, state: 'condition', railId: 'rail-503' },
  { x: s.section03 + 49, width: 55, state: 'set' },
  { x: s.section03 + 106, width: 30, state: 'set' },
  { x: s.section03 + 138, width: 30, state: 'set' },
  { x: s.section03 + 170, width: 30, state: 'set', railId: 'rail-511' },
  { x: s.section03 + 202, width: 55, state: 'set' },
  { x: s.section03 + 259, width: 30, state: 'condition', railId: 'rail-515' },
  { x: s.section03 + 291, width: 30, state: 'set' },
  { x: s.section03 + 323, width: 30, state: 'set', railId: 'rail-519' },
  { x: s.section03 + 355, width: 55, state: 'set', railIds: ['rail-518', 'rail-521'] },
  { x: s.section03 + 412, width: 30, state: 'set' },
  { x: s.section03 + 444, width: 30, state: 'set', railId: 'rail-522' },
  { x: s.section03 + 476, width: 39, state: 'set' },
  { x: s.section03 + 517, width: 69, state: 'set', railId: 'rail-603' },
  blockedBySlantedTrack(s.section03 + 588, 99, 'set'),
  { x: s.section03 + 689, width: 37, state: 'set', railId: 'rail-605B' },
  { x: s.section03 + 728, width: 55, state: 'condition', railId: 'rail-607' },
  { x: s.section03 + 785, width: 16, state: 'set', railId: 'rail-609', clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 100%, 0 100%)' },
  blockedBySlantedTrack(s.section03 + 952, 150, 'set'),
  blockedBySlantedTrack(s.section03 + 1104, 60, 'unset'),
  { x: s.section03 + 1166, width: 55, state: 'set', railId: 'rail-617' },
  { x: s.section03 + 1223, width: 30, state: 'condition' },
  { x: s.section03 + 1255, width: 20, state: 'set' },
  { x: s.section04 + 2, width: 30, state: 'set' },
  { x: s.section04 + 34, width: 30, state: 'set', railId: 'rail-703' },
  blockedBySlantedTrack(s.section04 + 66, 138, 'set'),
  blockedBySlantedTrack(s.section04 + 206, 58, 'set'),
  { x: s.section04 + 266, width: 55, state: 'set', railId: 'rail-709' },
  { x: s.section04 + 323, width: 30, state: 'set' },
  { x: s.section04 + 355, width: 30, state: 'set', railId: 'rail-713' },
  { x: s.section04 + 387, width: 47, state: 'set' },
  { x: s.section04 + 436, width: 113, state: 'condition', railId: 'rail-1103' },
  blockedBySlantedTrack(s.section04 + 550, 78, 'set'),
  blockedBySlantedTrack(s.section04 + 629, 121, 'set'),
  { x: s.section04 + 752, width: 77, state: 'set', railIds: ['rail-1109', 'rail-1108'] },
  { x: s.section04 + 831, width: 55, state: 'unset' },
  { x: s.section04 + 888, width: 77, state: 'unset', railIds: ['rail-1112', 'rail-1113'] },
] as const satisfies readonly TrackPieceDefinition[]

export const lowerTrackPieces = [
  { x: s.section01 + 147, width: 55, state: 'condition', railIds: ['rail-105', 'rail-108'] },
  { x: s.section01 + 204, width: 59, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.section01 + 265, width: 30, state: 'set', railId: 'rail-112' },
  { x: s.section01 + 297, width: 30, state: 'set' },
  { x: s.section01 + 329, width: 30, state: 'set' },
  { x: s.section01 + 361, width: 30, state: 'set' },
  { x: s.section01 + 393, width: 31, state: 'set' },
  { x: s.section01 + 426, width: 49, state: 'set', railId: 'rail-202' },
  { x: s.section01 + 477, width: 108, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.section01 + 587, width: 56, state: 'set', railIds: ['rail-206', 'rail-207'] },
  { x: s.section01 + 646, width: 90, state: 'condition', railId: 'rail-208' },
  { x: s.section01 + 738, width: 55, state: 'condition', railIds: ['rail-210', 'rail-211'] },
  { x: s.section01 + 798, width: 94, state: 'set', railId: 'rail-212' },
  { x: s.section01 + 894, width: 55, state: 'set', railIds: ['rail-214', 'rail-215'] },
  { x: s.section01 + 951, width: 30, state: 'set', railIds: ['rail-216', 'rail-217'] },
  { x: s.section01 + 983, width: 30, state: 'set' },
  { x: s.section01 + 1015, width: 30, state: 'set' },
  { x: s.section01 + 1047, width: 30, state: 'set' },
  { x: s.section01 + 1079, width: 55, state: 'condition', railIds: ['rail-304', 'rail-305'] },
  { x: s.section01 + 1136, width: 51, state: 'condition' },
  { x: s.section02 + 0, width: 29, state: 'set', railId: 'rail-308' },
  { x: s.section02 + 31, width: 55, state: 'condition', railIds: ['rail-311-seam', 'rail-310'] },
  blockedBySlantedTrack(s.section02 + 88, 126, 'set'),
  { x: s.section02 + 216, width: 113, state: 'set', railId: 'rail-316' },
  blockedBySlantedTrack(s.section02 + 331, 56, 'set'),
  { x: s.section02 + 389, width: 55, state: 'set', railIds: ['rail-321', 'rail-324'] },
  { x: s.section02 + 446, width: 30, state: 'set', railIds: ['rail-323', 'rail-326'] },
  { x: s.section02 + 478, width: 30, state: 'set' },
  { x: s.section02 + 510, width: 30, state: 'set' },
  { x: s.section02 + 542, width: 30, state: 'set', railId: 'rail-402' },
  { x: s.section02 + 574, width: 55, state: 'set', railIds: ['rail-404', 'rail-405'] },
  { x: s.section02 + 631, width: 41, state: 'condition', railIds: ['rail-406', 'rail-407'] },
  { x: s.section02 + 674, width: 30, state: 'condition' },
  { x: s.section02 + 706, width: 30, state: 'set', railId: 'rail-410' },
  { x: s.section02 + 738, width: 55, state: 'set', railIds: ['rail-412', 'rail-413'] },
  { x: s.section02 + 795, width: 162, state: 'set', railId: 'rail-414' },
  { x: s.section02 + 959, width: 63, state: 'set' },
  { x: s.section02 + 1024, width: 43, state: 'set', railId: 'rail-424' },
  { x: s.section02 + 1069, width: 55, state: 'set', railId: 'rail-426' },
  { x: s.section02 + 1126, width: 30, state: 'set', railId: 'rail-428' },
  { x: s.section02 + 1158, width: 30, state: 'set' },
  { x: s.section02 + 1190, width: 30, state: 'set' },
  { x: s.section03 + 17, width: 30, state: 'condition', railId: 'rail-503' },
  { x: s.section03 + 49, width: 55, state: 'set' },
  { x: s.section03 + 106, width: 30, state: 'set' },
  { x: s.section03 + 138, width: 30, state: 'set' },
  { x: s.section03 + 170, width: 30, state: 'set', railId: 'rail-511' },
  { x: s.section03 + 202, width: 55, state: 'set' },
  { x: s.section03 + 259, width: 30, state: 'set', railId: 'rail-515', railIds: ['rail-512'] },
  { x: s.section03 + 291, width: 30, state: 'set' },
  { x: s.section03 + 323, width: 30, state: 'condition', railId: 'rail-519' },
  { x: s.section03 + 355, width: 55, state: 'set', railIds: ['rail-518', 'rail-521'] },
  { x: s.section03 + 412, width: 30, state: 'set' },
  { x: s.section03 + 444, width: 30, state: 'set', railId: 'rail-522' },
  { x: s.section03 + 476, width: 30, state: 'set' },
  { x: s.section03 + 508, width: 30, state: 'set', railId: 'rail-600' },
  { x: s.section03 + 540, width: 30, state: 'set', railId: 'rail-602' },
  { ...blockedBySlantedTrack(s.section03 + 572, 61, 'set'), railId: 'rail-604' },
  { x: s.section03 + 635, width: 91, state: 'set', railId: 'rail-606' },
  { x: s.section03 + 728, width: 55, state: 'unset', railId: 'rail-608' },
  { x: s.section03 + 785, width: 29, state: 'unset' },
  blockedBySlantedTrack(s.section03 + 817, 32, 'unset'),
  blockedBySlantedTrack(s.section03 + 849, 133, 'unset'),
  blockedBySlantedTrack(s.section03 + 984, 64, 'unset'),
  blockedBySlantedTrack(s.section03 + 1050, 105, 'unset'),
  blockedBySlantedTrack(s.section03 + 1157, 64, 'unset'),
  { x: s.section03 + 1223, width: 30, state: 'condition' },
  { x: s.section03 + 1255, width: 20, state: 'set' },
  { x: s.section04 + 2, width: 20, state: 'set' },
  { x: s.section04 + 24, width: 73, state: 'set' },
  blockedBySlantedTrack(s.section04 + 99, 65, 'set'),
  blockedBySlantedTrack(s.section04 + 166, 65, 'set'),
  { x: s.section04 + 233, width: 30, state: 'condition' },
  { x: s.section04 + 265, width: 55, state: 'set', railId: 'rail-710' },
  { x: s.section04 + 322, width: 30, state: 'unset' },
  { x: s.section04 + 354, width: 30, state: 'unset', railId: 'rail-714' },
  { x: s.section04 + 386, width: 47, state: 'unset' },
  { x: s.section04 + 435, width: 113, state: 'unset', railId: 'rail-1102' },
  blockedBySlantedTrack(s.section04 + 549, 76, 'unset'),
  blockedBySlantedTrack(s.section04 + 627, 26, 'unset'),
  blockedBySlantedTrack(s.section04 + 655, 95, 'unset'),
  { x: s.section04 + 752, width: 77, state: 'condition', railIds: ['rail-1109', 'rail-1108'] },
  { x: s.section04 + 831, width: 55, state: 'unset' },
  { x: s.section04 + 888, width: 77, state: 'unset', railIds: ['rail-1112', 'rail-1113'] },
] as const satisfies readonly TrackPieceDefinition[]

export const upperSignals = [
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-101', track: 'upper', side: 'below', label: 'S104', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-101', label: 'S105', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-105', label: 'S107', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-108', inset: 10, track: 'lower', label: 'S109', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-203B', label: 'S203', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-202', track: 'lower', label: 'S201', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-207', label: 'S205', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-206', track: 'lower', label: 'S207', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-209', edgeOffset: 2, label: 'S209', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-208', track: 'lower', label: 'S211', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-211', label: 'S213', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-210', track: 'lower', label: 'S215', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-213', label: 'S217', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-212', track: 'lower', label: 'S219', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-215', label: 'S221', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-214', track: 'lower', label: 'S223', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-305', label: 'S305', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-304', track: 'lower', label: 'S307', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-309', label: 'S309', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-308', track: 'lower', label: 'S311', tone: 'red', seamVisible: true }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-311', inset: 5, label: 'S313', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-315', track: 'upper', side: 'below', label: 'S316', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-315', label: 'S319', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-319', label: 'S325', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-321', label: 'S327', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-403', label: 'S401', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-405', label: 'S405', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-411', edgeOffset: 2, label: 'S409', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-413', label: 'S413', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-419', label: 'S423', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-421', label: 'S427', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-503', label: 'S501', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-505', label: 'S505', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-511', label: 'S509', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-513', label: 'S513', tone: 'white', hideText: true }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-519', label: 'S517', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-521', label: 'S521', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-603', inset: 5, label: 'S603', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-663', inset: 15, y: 138, label: 'S652', tone: 'red', layout: 'left-stem' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-605B', inset: 1, label: 'S605', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-607', inset: 7, label: 'S609', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-611', label: 'S613', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-613', edgeOffset: -5, label: 'S617', seamVisible: true, tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-617', label: 'S619', seamVisible: true, tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-703', edgeOffset: -4, label: 'S701', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-705', label: 'S705', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-709', label: 'S707', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-1103', inset: 5, label: 'S1101', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-1105', inset: 5, label: 'S1105', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-1109', inset: 5, label: 'S1107', tone: 'red' }),
] as const

export const lowerSignals = [
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-100', y: 333, track: 'lower', side: 'below', label: 'S100', labelPosition: 'below-lamp', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-100', y: 333, track: 'upper', label: 'S101', tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-105', track: 'upper', side: 'below', label: 'S108', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-106', label: 'S106', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-111', track: 'upper', side: 'below', label: 'S112', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-112', label: 'S110', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-207', track: 'upper', side: 'below', label: 'S202', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-206', label: 'S200', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-209', track: 'upper', side: 'below', label: 'S206', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-208', label: 'S204', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-211', track: 'upper', side: 'below', label: 'S210', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-210', label: 'S208', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-213', track: 'upper', side: 'below', label: 'S214', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-212', label: 'S212', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-215', track: 'upper', side: 'below', label: 'S218', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-214', label: 'S216', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-217', track: 'upper', side: 'below', label: 'S222', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-216', label: 'S220', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-305', track: 'upper', side: 'below', label: 'S302', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-304', label: 'S300', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-310', track: 'upper', side: 'below', label: 'S310', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-310', label: 'S308', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-310', side: 'above', label: 'S315', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-316', track: 'lower', side: 'below', label: 'S314', tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-316', track: 'lower', side: 'above', label: 'S321', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-318', y: 335, side: 'above', label: 'S317', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-318', y: 338, side: 'below', label: 'S318', labelPosition: 'below-lamp', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-324', track: 'lower', side: 'below', label: 'S320', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-324', track: 'lower', side: 'above', label: 'S329', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-321', track: 'upper', side: 'below', label: 'S322', tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-326', track: 'lower', side: 'below', label: 'S324', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-323', track: 'upper', side: 'below', label: 'S326', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-402', track: 'lower', side: 'above', label: 'S403', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-404', track: 'lower', side: 'below', label: 'S400', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-405', track: 'upper', side: 'below', label: 'S402', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-404', track: 'lower', side: 'above', label: 'S407', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-406', track: 'lower', side: 'below', label: 'S404', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-407', track: 'upper', side: 'below', label: 'S406', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-412', track: 'lower', side: 'below', label: 'S408', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-410', track: 'lower', side: 'above', label: 'S411', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-413', track: 'upper', side: 'below', label: 'S410', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-414', track: 'lower', side: 'below', label: 'S412', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-412', track: 'lower', side: 'above', label: 'S415', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-417', track: 'upper', side: 'below', label: 'S416', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-418', y: 333, side: 'above', label: 'S417', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-418', y: 338, side: 'below', label: 'S418', labelPosition: 'below-lamp', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-414', track: 'lower', side: 'above', label: 'S419', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-424', track: 'lower', side: 'below', label: 'S420', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-426', track: 'lower', side: 'below', label: 'S422', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-424', track: 'lower', side: 'above', label: 'S425', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-421', track: 'upper', side: 'below', label: 'S424', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-426', track: 'lower', side: 'above', label: 'S429', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-428', track: 'lower', side: 'below', label: 'S426', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-423', track: 'upper', side: 'below', label: 'S428', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-505', track: 'upper', side: 'below', label: 'S502', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-507', track: 'upper', side: 'below', label: 'S506', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-513', track: 'upper', side: 'below', label: 'S510', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-515', track: 'upper', side: 'below', label: 'S514', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-521', track: 'upper', side: 'below', label: 'S518', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-523', track: 'upper', side: 'below', label: 'S522', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-504', track: 'lower', side: 'below', label: 'S500', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-502', side: 'above', label: 'S503', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-506', track: 'lower', side: 'below', label: 'S504', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-504', side: 'above', label: 'S507', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-512', track: 'lower', side: 'below', label: 'S508', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-510', side: 'above', label: 'S511', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-514', track: 'lower', side: 'below', label: 'S512', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-512', side: 'above', label: 'S515', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-520', track: 'lower', side: 'below', label: 'S516', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-518', side: 'above', label: 'S519', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-522', track: 'lower', side: 'below', label: 'S520', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-520', side: 'above', label: 'S523', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-602', side: 'above', label: 'S601', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-607', inset: 5, track: 'upper', side: 'below', label: 'S602', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-609', inset: 5, track: 'upper', side: 'below', label: 'S606', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-608', track: 'lower', side: 'below', label: 'S600', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-610', track: 'lower', side: 'below', label: 'S604', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-606', side: 'above', label: 'S607', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-608', side: 'above', label: 'S611', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-610', side: 'above', label: 'S615', tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-650', y: 320, track: 'lower', side: 'below', label: 'S653', tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-653', y: 262, track: 'lower', side: 'below', label: 'S655', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-618', inset: 5, track: 'lower', side: 'below', label: 'S608', seamVisible: true, tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-620', side: 'above', label: 'S621', tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-617', xOffset: -10, track: 'upper', side: 'below', label: 'S610', seamVisible: true, tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-709', xOffset: -26, track: 'upper', side: 'below', label: 'S702', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-713', inset: 5, track: 'upper', side: 'below', label: 'S706', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-1109', track: 'upper', side: 'below', label: 'S1104', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-1113', track: 'upper', side: 'below', label: 'S1108', tone: 'red' }),
  signalAtRail({ anchorRailId: 'rail-702', track: 'lower', side: 'above', label: 'S703', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-710', edgeOffset: 4, track: 'lower', side: 'below', label: 'S700', tone: 'white' }),
  signalAtRail({ anchorRailId: 'rail-710', track: 'lower', side: 'above', label: 'S709', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-714', edgeOffset: 4, track: 'lower', side: 'below', label: 'S704', tone: 'white' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-1102', track: 'lower', side: 'above', label: 'S1103', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-1108', edgeOffset: 4, label: 'S1102', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-1108', track: 'lower', side: 'above', label: 'S1109', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-1112', edgeOffset: 2, track: 'lower', side: 'above', label: 'S1111', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'right', anchorRailId: 'rail-1113', inset: 5, track: 'upper', side: 'above', label: 'S1110', tone: 'red' }),
  signalAtRailEdge({ anchorEdge: 'left', anchorRailId: 'rail-1112', label: 'S1106', tone: 'red' }),
] as const

export type LineMapSignalData = (typeof upperSignals)[number] | (typeof lowerSignals)[number]

export const pointLabels = [
  { x: s.section01 + 101, y: 239, label: 'P103', bold: true },
  { x: s.section01 + 87, y: 335, label: 'P101', bold: true },
  { x: s.section01 + 229, y: 432, label: 'P102', bold: true },
  { x: s.section01 + 259, y: 239, label: 'P105', bold: true },
  { x: s.section01 + 544, y: 239, label: 'P201', bold: true },
  { x: s.section01 + 501, y: 432, label: 'P200', bold: true },
  { x: s.section02 + 116, y: 239, label: 'P301', bold: true },
  { x: s.section02 + 144, y: 320, label: 'P300', bold: true },
  { x: s.section02 + 164, y: 358, label: 'P304', bold: true },
  { x: s.section02 + 140, y: 438, label: 'P302', bold: true },
  { x: s.section02 + 304, y: 239, label: 'P305', bold: true },
  { x: s.section02 + 290, y: 320, label: 'P303', bold: true },
  { x: s.section02 + 322, y: 358, label: 'P307', bold: true },
  { x: s.section02 + 333, y: 438, label: 'P306', bold: true },
  { x: s.section03 + 932, y: 239, label: 'P611', bold: true },
  { x: s.section03 + 932, y: 258, label: 'P609', bold: true },
  { x: s.section02 + 838, y: 239, label: 'P401', bold: true },
  { x: s.section02 + 857, y: 320, label: 'P400', bold: true },
  { x: s.section02 + 954, y: 358, label: 'P403', bold: true },
  { x: s.section02 + 974, y: 438, label: 'P402', bold: true },
  { x: s.section03 + 630, y: 239, label: 'P601', bold: true },
  { x: s.section03 + 616, y: 188, label: 'P602', bold: true },
  { x: s.section03 + 677, y: 200, label: 'P603', bold: true },
  { x: s.section03 + 608, y: 432, label: 'P600', bold: true },
  { x: s.section03 + 840, y: 432, label: 'P606', bold: true },
  { x: s.section03 + 970, y: 239, label: 'P613', bold: true },
  { x: s.section03 + 1006, y: 432, label: 'P608', bold: true },
  { x: s.section03 + 1078, y: 432, label: 'P610', bold: true },
  { x: s.section03 + 1130, y: 239, label: 'P615', bold: true },
  { x: s.section04 + 75, y: 239, label: 'P701', bold: true },
  { x: s.section04 + 232, y: 239, label: 'P703', bold: true },
  { x: s.section04 + 109, y: 432, label: 'P700', bold: true },
  { x: s.section04 + 190, y: 432, label: 'P702', bold: true },
  { x: s.section04 + 575, y: 239, label: 'P1101', bold: true },
  { x: s.section04 + 650, y: 239, label: 'P1103', bold: true },
  { x: s.section04 + 575, y: 432, label: 'P1100', bold: true },
  { x: s.section04 + 650, y: 432, label: 'P1102', bold: true },
]

const schematicAnnotationDefinitions = [
  { x: s.section01 + 44, y: 319, label: '100', routeNumber: true },
  { x: s.section01 + 68, y: 319, label: '102', routeNumber: true },
  { x: s.section01 + 46, y: 211, label: '101' },
  { x: s.section01 + 123, y: 211, label: '103' },
  { x: s.section01 + 174, y: 211, label: '105' },
  { x: s.section01 + 226, y: 211, label: '107' },
  { x: s.section01 + 277, y: 211, label: '109' },
  { x: s.section01 + 319, y: 211, label: '111' },
  { x: s.section01 + 350, y: 211, label: '113' },
  { x: s.section01 + 382, y: 211, label: '115' },
  { x: s.section01 + 414, y: 211, label: '117' },
  { x: s.section01 + 448, y: 211, label: '201' },
  { x: s.section01 + 479, y: 211, label: '203A' },
  { x: s.section01 + 509, y: 211, label: '203B' },
  { x: s.section01 + 560, y: 211, label: '205' },
  { x: s.section01 + 614, y: 211, label: '207' },
  { x: s.section01 + 691, y: 211, label: '209' },
  { x: s.section01 + 765, y: 211, label: '211' },
  { x: s.section01 + 844, y: 211, label: '213' },
  { x: s.section01 + 921, y: 211, label: '215' },
  { x: s.section01 + 970, y: 211, label: '217' },
  { x: s.section01 + 996, y: 211, label: '219' },
  { x: s.section01 + 1031, y: 211, label: '301' },
  { x: s.section01 + 1063, y: 211, label: '303' },
  { x: s.section01 + 1106, y: 211, label: '305' },
  { x: s.section01 + 1161, y: 211, label: '307' },
  { x: s.section01 + 1212, y: 211, label: '309' },
  { x: s.section01 + 1267, y: 211, label: '311' },
  { x: s.section02 + 123, y: 211, label: '313' },
  { x: s.section02 + 225, y: 211, label: '315' },
  { x: s.section02 + 318, y: 211, label: '317' },
  { x: s.section02 + 367, y: 211, label: '319' },
  { x: s.section02 + 416, y: 211, label: '321' },
  { x: s.section02 + 461, y: 211, label: '323' },
  { x: s.section02 + 493, y: 211, label: '325' },
  { x: s.section02 + 525, y: 211, label: '401' },
  { x: s.section02 + 557, y: 211, label: '403' },
  { x: s.section02 + 601, y: 211, label: '405' },
  { x: s.section02 + 646, y: 211, label: '407' },
  { x: s.section02 + 678, y: 211, label: '409' },
  { x: s.section02 + 715, y: 211, label: '411' },
  { x: s.section02 + 765, y: 211, label: '413' },
  { x: s.section02 + 837, y: 211, label: '415' },
  { x: s.section02 + 958, y: 211, label: '417' },
  { x: s.section02 + 1051, y: 211, label: '419' },
  { x: s.section02 + 1096, y: 211, label: '421' },
  { x: s.section02 + 1141, y: 211, label: '423' },
  { x: s.section02 + 1173, y: 211, label: '425' },
  { x: s.section02 + 1205, y: 211, label: '501' },
  { x: s.section02 + 1237, y: 211, label: '503' },
  { x: s.section02 + 1266, y: 211, label: '505' },
  { x: s.section01 + 121, y: 478, label: '106' },
  { x: s.section01 + 174, y: 478, label: '108' },
  { x: s.section01 + 234, y: 478, label: '110' },
  { x: s.section01 + 282, y: 478, label: '112' },
  { x: s.section01 + 312, y: 478, label: '114' },
  { x: s.section01 + 344, y: 478, label: '116' },
  { x: s.section01 + 376, y: 478, label: '118' },
  { x: s.section01 + 409, y: 478, label: '200' },
  { x: s.section01 + 450, y: 478, label: '202' },
  { x: s.section01 + 517, y: 478, label: '204' },
  { x: s.section01 + 614, y: 478, label: '206' },
  { x: s.section01 + 689, y: 478, label: '208' },
  { x: s.section01 + 765, y: 478, label: '210' },
  { x: s.section01 + 842, y: 478, label: '212' },
  { x: s.section01 + 921, y: 478, label: '214' },
  { x: s.section01 + 969, y: 478, label: '216' },
  { x: s.section01 + 998, y: 478, label: '218' },
  { x: s.section01 + 1031, y: 478, label: '300' },
  { x: s.section01 + 1061, y: 478, label: '302' },
  { x: s.section01 + 1108, y: 478, label: '304' },
  { x: s.section01 + 1161, y: 478, label: '306' },
  { x: s.section01 + 1211, y: 478, label: '308' },
  { x: s.section01 + 1267, y: 478, label: '310' },
  { x: s.section01 + 220, y: 506, label: '110' },
  { x: s.section02 + 14, y: 211, label: '309' },
  { x: s.section02 + 58, y: 211, label: '311' },
  { x: s.section02 + 14, y: 478, label: '308' },
  { x: s.section02 + 58, y: 478, label: '310' },
  { x: s.section02 + 151, y: 478, label: '312' },
  { x: s.section02 + 193, y: 326, label: '314', routeNumber: true, fontSize: 10 },
  { x: s.section02 + 238, y: 326, label: '318', routeNumber: true, fontSize: 10 },
  { x: s.section02 + 328, y: 326, label: '320', routeNumber: true, fontSize: 10 },
  { x: s.section02 + 272, y: 478, label: '316' },
  { x: s.section02 + 359, y: 478, label: '322' },
  { x: s.section02 + 416, y: 478, label: '324' },
  { x: s.section02 + 461, y: 478, label: '326' },
  { x: s.section02 + 493, y: 478, label: '328' },
  { x: s.section02 + 525, y: 478, label: '400' },
  { x: s.section02 + 557, y: 478, label: '402' },
  { x: s.section02 + 601, y: 478, label: '404' },
  { x: s.section02 + 651, y: 478, label: '406' },
  { x: s.section02 + 689, y: 478, label: '408' },
  { x: s.section02 + 721, y: 478, label: '410' },
  { x: s.section02 + 765, y: 478, label: '412' },
  { x: s.section02 + 876, y: 478, label: '414' },
  { x: s.section02 + 836, y: 326, label: '416' },
  { x: centerOfRail('rail-418'), y: 326, label: '418', routeNumber: true },
  { x: s.section02 + 982, y: 326, label: '420' },
  { x: s.section02 + 990, y: 478, label: '422' },
  { x: s.section02 + 1045, y: 478, label: '424' },
  { x: s.section02 + 1096, y: 478, label: '426' },
  { x: s.section02 + 1141, y: 478, label: '428' },
  { x: s.section02 + 1173, y: 478, label: '430' },
  { x: s.section02 + 1205, y: 478, label: '500' },
  { x: s.section02 + 1237, y: 478, label: '502' },
  { x: s.section02 + 1266, y: 478, label: '504' },
  { x: s.section03 + 2, y: 211, label: '501' },
  { x: s.section03 + 34, y: 211, label: '503' },
  { x: s.section03 + 82, y: 211, label: '505' },
  { x: s.section03 + 121, y: 211, label: '507' },
  { x: s.section03 + 153, y: 211, label: '509' },
  { x: s.section03 + 185, y: 211, label: '511' },
  { x: s.section03 + 229, y: 211, label: '513' },
  { x: s.section03 + 274, y: 211, label: '515' },
  { x: s.section03 + 306, y: 211, label: '517' },
  { x: s.section03 + 338, y: 211, label: '519' },
  { x: s.section03 + 383, y: 211, label: '521' },
  { x: s.section03 + 427, y: 211, label: '523' },
  { x: s.section03 + 459, y: 211, label: '525' },
  { x: s.section03 + 496, y: 211, label: '601' },
  { x: s.section03 + 548, y: 211, label: '603' },
  { x: s.section03 + 638, y: 211, label: '605A' },
  { x: s.section03 + 702, y: 211, label: '605B' },
  { x: s.section03 + 684, y: 96, label: 'RT3' },
  { x: s.section03 + 679, y: 166, label: '661', rotate: -82, fontSize: 8, italic: true },
  { x: s.section03 + 655, y: 134, label: '663', rotate: -82, fontSize: 8, italic: true },
  { x: s.section03 + 659, y: 115, label: '665', rotate: -78, fontSize: 8 },
  { x: s.section03 + 778, y: 127, label: '652', rotate: 260, fontSize: 8 },
  { x: s.section03 + 784, y: 96, label: 'RT2' },
  { x: s.section03 + 841, y: 126, label: '655', rotate: -98, fontSize: 8 },
  { x: s.section03 + 849, y: 184, label: '653', rotate: -98, fontSize: 8 },
  { x: s.section03 + 858, y: 96, label: 'RT1' },
  { x: s.section03 + 802, y: 260, label: '650', rotate: 260, fontSize: 8 },
  { x: s.section03 + 907, y: 292, label: '651', fontSize: 8 },
  { x: s.section03 + 756, y: 211, label: '607' },
  { x: s.section03 + 839, y: 211, label: '609' },
  { x: s.section03 + 925, y: 211, label: '611' },
  { x: s.section03 + 1020, y: 211, label: '613' },
  { x: s.section03 + 1134, y: 211, label: '615' },
  { x: s.section03 + 1198, y: 211, label: '617' },
  { x: s.section03 + 1242, y: 211, label: '619' },
  { x: s.section03 + 1265, y: 211, label: '621' },
  { x: s.section03 + 32, y: 478, label: '500' },
  { x: s.section03 + 76, y: 478, label: '502' },
  { x: s.section03 + 121, y: 478, label: '504' },
  { x: s.section03 + 153, y: 478, label: '506' },
  { x: s.section03 + 185, y: 478, label: '508' },
  { x: s.section03 + 229, y: 478, label: '510' },
  { x: s.section03 + 274, y: 478, label: '512' },
  { x: s.section03 + 306, y: 478, label: '514' },
  { x: s.section03 + 338, y: 478, label: '516' },
  { x: s.section03 + 383, y: 478, label: '518' },
  { x: s.section03 + 427, y: 478, label: '520' },
  { x: s.section03 + 459, y: 478, label: '522' },
  { x: s.section03 + 491, y: 478, label: '524' },
  { x: s.section03 + 523, y: 478, label: '600' },
  { x: s.section03 + 555, y: 478, label: '602' },
  { x: s.section03 + 602, y: 478, label: '604' },
  { x: s.section03 + 681, y: 478, label: '606' },
  { x: s.section03 + 756, y: 478, label: '608' },
  { x: s.section03 + 800, y: 478, label: '610' },
  { x: s.section03 + 854, y: 478, label: '612' },
  { x: s.section03 + 999, y: 478, label: '614' },
  { x: s.section03 + 1082, y: 478, label: '616' },
  { x: s.section03 + 1189, y: 478, label: '618' },
  { x: s.section03 + 1230, y: 478, label: '620' },
  { x: s.section03 + 1265, y: 478, label: '622' },
  { x: s.section04 + 42, y: 211, label: '613' },
  { x: s.section04 + 17, y: 211, label: '701' },
  { x: s.section04 + 49, y: 211, label: '703' },
  { x: s.section04 + 105, y: 211, label: '705' },
  { x: s.section04 + 236, y: 211, label: '707' },
  { x: s.section04 + 294, y: 211, label: '709' },
  { x: s.section04 + 338, y: 211, label: '711' },
  { x: s.section04 + 370, y: 211, label: '713' },
  { x: s.section04 + 411, y: 211, label: '715' },
  { x: s.section04 + 493, y: 211, label: '1103' },
  { x: s.section04 + 589, y: 211, label: '1105' },
  { x: s.section04 + 690, y: 211, label: '1107' },
  { x: s.section04 + 632, y: 342, label: '1115' },
  { x: s.section04 + 791, y: 211, label: '1109' },
  { x: s.section04 + 859, y: 211, label: '1111' },
  { x: s.section04 + 927, y: 211, label: '1113' },
  { x: s.section04 + 929, y: 310, label: 'NB' },
  { x: s.section04 + 42, y: 478, label: '614' },
  { x: s.section04 + 116, y: 478, label: '616' },
  { x: s.section04 + 190, y: 478, label: '618' },
  { x: s.section04 + 246, y: 478, label: '620' },
  { x: s.section04 + 308, y: 478, label: '622' },
  { x: s.section04 + 12, y: 478, label: '700' },
  { x: s.section04 + 61, y: 478, label: '702' },
  { x: s.section04 + 132, y: 478, label: '704' },
  { x: s.section04 + 199, y: 478, label: '706' },
  { x: s.section04 + 248, y: 478, label: '708' },
  { x: s.section04 + 292, y: 478, label: '710' },
  { x: s.section04 + 337, y: 478, label: '712' },
  { x: s.section04 + 369, y: 478, label: '714' },
  { x: s.section04 + 410, y: 478, label: '716' },
  { x: s.section04 + 492, y: 478, label: '1102' },
  { x: s.section04 + 587, y: 478, label: '1104' },
  { x: s.section04 + 703, y: 478, label: '1106' },
  { x: s.section04 + 791, y: 478, label: '1108' },
  { x: s.section04 + 859, y: 478, label: '1110' },
  { x: s.section04 + 926, y: 478, label: '1112' },
  { x: s.section04 + 929, y: 410, label: 'SB' },
] as const

type SchematicAnnotationDefinition = (typeof schematicAnnotationDefinitions)[number]

function isRailLabelAnnotationDefinition(annotation: SchematicAnnotationDefinition) {
  return (
    ('routeNumber' in annotation && annotation.routeNumber)
    || (!('tone' in annotation) && !('rotate' in annotation) && (annotation.y === 211 || annotation.y === 478))
  )
}

export const schematicAnnotations = schematicAnnotationDefinitions.map((annotation) => ({
  ...annotation,
  railLabel: isRailLabelAnnotationDefinition(annotation),
}))
