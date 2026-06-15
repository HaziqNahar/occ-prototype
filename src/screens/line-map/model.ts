import type { TrainReadinessMode, TrainState } from '../../types'

export const MONITOR_WIDTH = 1275
export const MONITOR_HEIGHT = 1019

const LINE_02_JOIN_SHIFT = 86
const LINE_03_JOIN_SHIFT = 70

export const LINE_SECTION_OFFSETS = {
  line01: 0,
  line02: MONITOR_WIDTH - LINE_02_JOIN_SHIFT,
  line03: MONITOR_WIDTH * 2 - LINE_02_JOIN_SHIFT - LINE_03_JOIN_SHIFT,
  line04: MONITOR_WIDTH * 3 - LINE_02_JOIN_SHIFT - LINE_03_JOIN_SHIFT,
} as const

export const LINE_VIEWPORT_PANS = [
  LINE_SECTION_OFFSETS.line01,
  LINE_SECTION_OFFSETS.line02,
  LINE_SECTION_OFFSETS.line03,
  LINE_SECTION_OFFSETS.line04,
] as const

export const LINE_MAP_END_X = LINE_SECTION_OFFSETS.line04 + 968
export const MAP_WORLD_WIDTH = LINE_SECTION_OFFSETS.line04 + MONITOR_WIDTH
export const DEFAULT_LINE_MAP_PAN = LINE_SECTION_OFFSETS.line03
export const MAP_PAN_STEP = MONITOR_WIDTH
export const MAP_PAN_MAX = LINE_MAP_END_X - MONITOR_WIDTH
export const DEFAULT_TRAIN_READINESS_MODE: TrainReadinessMode = 'MAINLINE_SERVICE'

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
  { id: '021', x: LINE_SECTION_OFFSETS.line01 + 42, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '089', x: LINE_SECTION_OFFSETS.line01 + 392, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '093', x: LINE_SECTION_OFFSETS.line01 + 904, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '095', x: LINE_SECTION_OFFSETS.line01 + 146, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '097', x: LINE_SECTION_OFFSETS.line01 + 638, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '065', x: LINE_SECTION_OFFSETS.line01 + 1096, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '047', x: LINE_SECTION_OFFSETS.line02 + 1104, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '053', x: LINE_SECTION_OFFSETS.line02 + 646, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '077', x: LINE_SECTION_OFFSETS.line02 + 52, y: 512, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '049', x: LINE_SECTION_OFFSETS.line02 + 646, y: 512, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '320', x: LINE_SECTION_OFFSETS.line03 + 292, y: 205, direction: 'right', status: 'RUN', service: 'NB' },
  { id: '317', x: LINE_SECTION_OFFSETS.line03 + 764, y: 205, direction: 'right', status: 'HOLD', service: 'NB' },
  {
    id: '013',
    x: LINE_SECTION_OFFSETS.line03 + 892,
    y: 205,
    direction: 'right',
    status: 'RUN',
    service: 'NB',
    occupancySegmentId: 'rail-653',
    readinessMode: 'MAINLINE_SERVICE',
    scheduleNumber: '1000',
    trainNumber: '301',
  },
  { id: '917', x: LINE_SECTION_OFFSETS.line03 + 1250, y: 205, direction: 'right', status: 'WAIT', service: 'NB' },
  { id: '301', x: LINE_SECTION_OFFSETS.line03 + 324, y: 512, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '304', x: LINE_SECTION_OFFSETS.line03 + 1194, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
  { id: '314', x: LINE_SECTION_OFFSETS.line04 + 105, y: 205, direction: 'left', status: 'RUN', service: 'NB' },
  { id: '312', x: LINE_SECTION_OFFSETS.line04 + 786, y: 205, direction: 'left', status: 'RUN', service: 'NB' },
  { id: '309', x: LINE_SECTION_OFFSETS.line04 + 794, y: 508, direction: 'left', status: 'RUN', service: 'SB' },
]

const s = LINE_SECTION_OFFSETS
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

export const platformData = [
  { code: 'HBF', x: s.line01 + 168, y: 268, commandY: 567 },
  { code: 'OTP', x: s.line01 + 610, y: 268, commandY: 567 },
  { code: 'CNT', x: s.line01 + 762, y: 268, commandY: 567 },
  { code: 'CQY', x: s.line01 + 918, y: 268, commandY: 567 },
  { code: 'DBG', x: s.line01 + 1112, y: 268, commandY: 567 },
  { code: 'LTI', x: s.line01 + 1260, y: 268, commandY: 567 },
  { code: 'FRP', x: s.line02 + 427, y: 268, commandY: 567 },
  { code: 'BNK', x: s.line02 + 600, y: 268, commandY: 567 },
  { code: 'PTP', x: s.line02 + 760, y: 268, commandY: 567 },
  { code: 'WLH', x: s.line02 + 1110, y: 268, commandY: 567 },
  { code: 'SER', x: s.line03 + 80, y: 268, commandY: 567 },
  { code: 'KVN', x: s.line03 + 232, y: 268, commandY: 567 },
  { code: 'HGN', x: s.line03 + 384, y: 268, commandY: 567 },
  { code: 'BGK', x: s.line03 + 760, y: 268, commandY: 567 },
  { code: 'SKG', x: s.line03 + 1195, y: 268, commandY: 567 },
  { code: 'PGL', x: s.line04 + 292, y: 268, commandY: 567 },
  { code: 'PGC', x: s.line04 + 791, y: 268, commandY: 567 },
]

export const commandData = platformData.map((platform) => ({
  x: platform.x,
  y: platform.commandY - LOWER_COMMAND_LIFT,
}))

const ATC_PANEL_Y = 56

export const atcData = [
  { x: s.line01 + 120, y: ATC_PANEL_Y, label: 'ATC01' },
  { x: s.line01 + 712, y: ATC_PANEL_Y, label: 'ATC02' },
  { x: s.line02 + 6, y: ATC_PANEL_Y, label: 'ATC03' },
  { x: s.line02 + 712, y: ATC_PANEL_Y, label: 'ATC04' },
  { x: s.line03 + 176, y: ATC_PANEL_Y, label: 'ATC05' },
  { x: s.line03 + 732, y: 14, label: 'ATC06' },
  { x: s.line04 + 240, y: ATC_PANEL_Y, label: 'ATC07' },
  { x: s.line04 + 739, y: ATC_PANEL_Y, label: 'ATC11' },
]

export const cycleData = [
  { x: s.line01 + 120, y: 16 },
  { x: s.line02 + 6, y: 16 },
  { x: s.line02 + 294, y: 16 },
  { x: s.line03 + 1062, y: 16 },
  { x: s.line04 + 240, y: 16 },
  { x: s.line04 + 739, y: 16 },
]

export const mapTitleData = [
  { x: s.line01 + 490, y: 7, lines: ['DETAIL SIGNALLING SYSTEM', 'HBF TO PGC'] },
  { x: s.line02 + 560, y: 7, lines: ['DETAIL SIGNALLING SYSTEM', 'HBF TO PGC'] },
  { x: s.line03 + 346, y: 7, lines: ['DETAIL SIGNALLING SYSTEM', 'HBF TO PGC'] },
] as const

export const sectionDividers = [
  s.line02,
  s.line03,
  s.line03 + 578,
  s.line04 + 875,
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
    from: [s.line01 + 118, 226],
    to: [s.line01 + 91, 338],
    flatCaps: true,
    segments: [
      { from: [s.line01 + 118, 226], to: [s.line01 + 91, 338] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line01 + 111, 215],
          [s.line01 + 145, 215],
          [s.line01 + 145, 226],
          [s.line01 + 121, 226],
          [s.line01 + 107.75, 278.5],
          [s.line01 + 95.75, 278.5],
          [s.line01 + 109, 226],
        ],
        pathD: [
          getClosedPathD([
            [s.line01 + 111, 215],
            [s.line01 + 145, 215],
            [s.line01 + 145, 226],
            [s.line01 + 121, 226],
            [s.line01 + 107.75, 278.5],
            [s.line01 + 95.75, 278.5],
            [s.line01 + 109, 226],
          ]),
          getClosedPathD([
            [s.line01 + 107.25, 280.5],
            [s.line01 + 94, 333],
            [s.line01 + 82, 333],
            [s.line01 + 95.25, 280.5],
          ]),
        ].join(' '),
        edgePathD: [
          getClosedPathD(makeSlantedTrackEdgePoints([s.line01 + 115, 226], [s.line01 + 101.75, 278.5])),
          getClosedPathD(makeSlantedTrackEdgePoints([s.line01 + 101.25, 280.5], [s.line01 + 88, 333])),
        ].join(' '),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'hbf-110-to-109-guide',
    from: [s.line01 + 277, 226],
    to: [s.line01 + 234, 455],
    flatCaps: true,
    segments: [
      { from: [s.line01 + 277, 226], to: [s.line01 + 234, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line01 + 273, 215],
          [s.line01 + 301, 215],
          [s.line01 + 301, 226],
          [s.line01 + 283, 226],
          [s.line01 + 262, 339.5],
          [s.line01 + 250, 339.5],
          [s.line01 + 271, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line01 + 277, 226], [s.line01 + 256, 339.5]),
      },
      {
        polygonPoints: [
          [s.line01 + 261, 341.5],
          [s.line01 + 240, 455],
          [s.line01 + 238, 466],
          [s.line01 + 204, 466],
          [s.line01 + 204, 455],
          [s.line01 + 228, 455],
          [s.line01 + 249, 341.5],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line01 + 255, 341.5], [s.line01 + 234, 455]),
        edgeVisualOnly: true,
      },
    ],
    tone: 'white',
  },
  {
    id: 'hbf-204-to-205-guide',
    from: [s.line01 + 560, 226],
    to: [s.line01 + 517, 455],
    flatCaps: true,
    segments: [
      { from: [s.line01 + 560, 226], to: [s.line01 + 517, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line01 + 556, 215],
          [s.line01 + 585, 215],
          [s.line01 + 585, 226],
          [s.line01 + 566, 226],
          [s.line01 + 545, 339.5],
          [s.line01 + 533, 339.5],
          [s.line01 + 554, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line01 + 560, 226], [s.line01 + 539, 339.5]),
      },
      {
        polygonPoints: [
          [s.line01 + 544, 341.5],
          [s.line01 + 523, 455],
          [s.line01 + 521, 466],
          [s.line01 + 477, 466],
          [s.line01 + 477, 455],
          [s.line01 + 511, 455],
          [s.line01 + 532, 341.5],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line01 + 538, 341.5], [s.line01 + 517, 455]),
        edgeVisualOnly: true,
      },
    ],
    tone: 'white',
  },
  {
    id: 'frp-p301-p300-guide',
    from: [s.line02 + 124, 226],
    to: [s.line02 + 187, 357],
    flatCaps: true,
    segments: [
      { from: [s.line02 + 124, 226], to: [s.line02 + 139.5, 294] },
      { from: [s.line02 + 139.5, 296], to: [s.line02 + 153.5, 357] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line02 + 88, 215],
          [s.line02 + 128, 215],
          [s.line02 + 145.5, 294],
          [s.line02 + 133.5, 294],
          [s.line02 + 118, 226],
          [s.line02 + 88, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 124, 226], [s.line02 + 139.5, 294]),
        edgeVisualOnly: true,
      },
      {
        polygonPoints: [
          [s.line02 + 133.5, 296],
          [s.line02 + 145.5, 296],
          [s.line02 + 159.5, 357],
          [s.line02 + 222, 357],
          [s.line02 + 222, 367],
          [s.line02 + 149.5, 367],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 139.5, 296], [s.line02 + 153.5, 357]),
        edgeVisualOnly: true,
      },
    ],
  },
  {
    id: 'frp-p305-p303-guide',
    from: [s.line02 + 318, 226],
    to: [s.line02 + 307, 357],
    flatCaps: true,
    segments: [
      { from: [s.line02 + 318, 226], to: [s.line02 + 300.6, 294] },
      { from: [s.line02 + 300.1, 296], to: [s.line02 + 284.5, 357] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line02 + 314, 215],
          [s.line02 + 345, 215],
          [s.line02 + 345, 226],
          [s.line02 + 324, 226],
          [s.line02 + 306.6, 294],
          [s.line02 + 294.6, 294],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 318, 226], [s.line02 + 300.6, 294]),
      },
      {
        polygonPoints: [
          [s.line02 + 306.1, 296],
          [s.line02 + 290.5, 357],
          [s.line02 + 288.5, 367],
          [s.line02 + 258, 367],
          [s.line02 + 258, 357],
          [s.line02 + 278.5, 357],
          [s.line02 + 294.1, 296],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 300.1, 296], [s.line02 + 284.5, 357]),
      },
    ],
  },
  {
    id: 'frp-p304-p302-guide',
    from: [s.line02 + 173, 367],
    to: [s.line02 + 151, 455],
    flatCaps: true,
    segments: [
      { from: [s.line02 + 173, 367], to: [s.line02 + 162, 410] },
      { from: [s.line02 + 162, 412], to: [s.line02 + 151, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line02 + 169, 357],
          [s.line02 + 222, 357],
          [s.line02 + 222, 367],
          [s.line02 + 179, 367],
          [s.line02 + 168, 410],
          [s.line02 + 156, 410],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 173, 367], [s.line02 + 162, 410]),
      },
      {
        polygonPoints: [
          [s.line02 + 168, 412],
          [s.line02 + 157, 455],
          [s.line02 + 155, 466],
          [s.line02 + 88, 466],
          [s.line02 + 88, 455],
          [s.line02 + 145, 455],
          [s.line02 + 156, 412],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 162, 412], [s.line02 + 151, 455]),
      },
    ],
  },
  {
    id: 'frp-p307-p306-guide',
    from: [s.line02 + 328, 367],
    to: [s.line02 + 348, 455],
    flatCaps: true,
    segments: [
      { from: [s.line02 + 333, 367], to: [s.line02 + 343, 410] },
      { from: [s.line02 + 343, 412], to: [s.line02 + 353, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line02 + 258, 357],
          [s.line02 + 337, 357],
          [s.line02 + 349, 410],
          [s.line02 + 337, 410],
          [s.line02 + 327, 367],
          [s.line02 + 258, 367],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 333, 367], [s.line02 + 343, 410]),
      },
      {
        polygonPoints: [
          [s.line02 + 337, 412],
          [s.line02 + 349, 412],
          [s.line02 + 359, 455],
          [s.line02 + 387, 455],
          [s.line02 + 387, 466],
          [s.line02 + 349, 466],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 343, 412], [s.line02 + 353, 455]),
        edgeVisualOnly: true,
      },
    ],
  },
  {
    id: 'wlh-p401-p400-guide',
    from: [s.line02 + 837.5, 226],
    to: [s.line02 + 882, 357],
    flatCaps: true,
    segments: [
      { from: [s.line02 + 837.5, 226], to: [s.line02 + 853, 294] },
      { from: [s.line02 + 853.5, 296], to: [s.line02 + 867.5, 357] },
    ],
    segmentPolygons: [
      {
        ...makeUpperLeftSlantedCornerPiece(s.line02 + 795, [s.line02 + 837.5, 226], [s.line02 + 853, 294]),
      },
      {
        polygonPoints: [
          [s.line02 + 847.5, 296],
          [s.line02 + 859.5, 296],
          [s.line02 + 873.5, 357],
          [s.line02 + 906, 357],
          [s.line02 + 906, 367],
          [s.line02 + 863.5, 367],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 853.5, 296], [s.line02 + 867.5, 357]),
      },
    ],
  },
  {
    id: 'wlh-p403-p402-guide',
    from: [s.line02 + 970.7, 367],
    to: [s.line02 + 990.5, 455],
    flatCaps: true,
    segments: [
      { from: [s.line02 + 970.7, 367], to: [s.line02 + 980.38, 410] },
      { from: [s.line02 + 980.85, 412], to: [s.line02 + 990.5, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line02 + 942, 357],
          [s.line02 + 974.7, 357],
          [s.line02 + 986.38, 410],
          [s.line02 + 974.38, 410],
          [s.line02 + 964.7, 367],
          [s.line02 + 942, 367],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 970.7, 367], [s.line02 + 980.38, 410]),
      },
      {
        polygonPoints: [
          [s.line02 + 974.85, 412],
          [s.line02 + 986.85, 412],
          [s.line02 + 996.5, 455],
          [s.line02 + 1022, 455],
          [s.line02 + 1022, 466],
          [s.line02 + 986.5, 466],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line02 + 980.85, 412], [s.line02 + 990.5, 455]),
      },
    ],
  },
  {
    id: 'skg-605-to-604-upper-guide',
    from: [s.line03 + 643, 225],
    to: [s.line03 + 622, 339],
    flatCaps: true,
    segments: [
      { from: [s.line03 + 643, 225], to: [s.line03 + 622, 339] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 639, 215],
          [s.line03 + 687, 215],
          [s.line03 + 687, 226],
          [s.line03 + 637, 226],
        ],
        edgePathPoints: [],
      },
      makeSlantedTrackPiece([s.line03 + 643, 225], [s.line03 + 622, 339]),
    ],
  },
  {
    id: 'skg-605-to-604-lower-guide',
    from: [s.line03 + 622, 341],
    to: [s.line03 + 599, 466],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 628, 341],
          [s.line03 + 605, 455],
          [s.line03 + 603, 466],
          [s.line03 + 572, 466],
          [s.line03 + 572, 455],
          [s.line03 + 593, 455],
          [s.line03 + 616, 341],
        ],
        edgePolygonPoints: [
          [s.line03 + 612, 341],
          [s.line03 + 615, 341],
          [s.line03 + 592.1, 454],
          [s.line03 + 589.1, 454],
        ],
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'skg-p606-guide',
    from: [s.line03 + 836, 341],
    to: [s.line03 + 857, 466],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 830, 341],
          [s.line03 + 842, 341],
          [s.line03 + 861, 455],
          [s.line03 + 982, 455],
          [s.line03 + 982, 466],
          [s.line03 + 851, 466],
        ],
        edgePolygons: [
          [
            [s.line03 + 826, 341],
            [s.line03 + 829, 341],
            [s.line03 + 848, 454],
            [s.line03 + 845, 454],
          ],
          [
            [s.line03 + 817, 468],
            [s.line03 + 982, 468],
            [s.line03 + 982, 471],
            [s.line03 + 817, 471],
          ],
        ],
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'bgk-p611-p609-guide',
    from: [s.line03 + 920, 226],
    to: [s.line03 + 892, 280],
    flatCaps: true,
    segments: [
      { from: [s.line03 + 920, 226], to: [s.line03 + 915, 252] },
      { from: [s.line03 + 914.5, 254], to: [s.line03 + 909.5, 280] },
    ],
    segmentPolygons: [
      makeSlantedTrackPiece([s.line03 + 920, 226], [s.line03 + 915, 252]),
      {
        polygonPoints: [
          [s.line03 + 920.5, 254],
          [s.line03 + 916.25, 276],
          [s.line03 + 914.25, 286],
          [s.line03 + 881, 286],
          [s.line03 + 893, 276],
          [s.line03 + 904.25, 276],
          [s.line03 + 908.5, 254],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line03 + 914.5, 254], [s.line03 + 909.5, 280]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'skg-613-to-614-guide',
    from: [s.line03 + 970, 226],
    to: [s.line03 + 988, 339],
    flatCaps: true,
    segments: [
      { from: [s.line03 + 970, 226], to: [s.line03 + 988, 339] },
    ],
    segmentPolygons: [
      makeUpperLeftSlantedCornerPiece(s.line03 + 952, [s.line03 + 970, 226], [s.line03 + 988, 339]),
    ],
    tone: 'yellow',
  },
  {
    id: 'skg-p608-guide',
    from: [s.line03 + 988, 341],
    to: [s.line03 + 1006, 455],
    flatCaps: true,
    segments: [
      { from: [s.line03 + 988, 341], to: [s.line03 + 1006, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 982, 341],
          [s.line03 + 994, 341],
          [s.line03 + 1012, 455],
          [s.line03 + 1048, 455],
          [s.line03 + 1048, 466],
          [s.line03 + 1000, 466],
        ],
        inactivePolygonPoints: [
          [s.line03 + 982, 341],
          [s.line03 + 994, 341],
          [s.line03 + 1012, 455],
          [s.line03 + 1000, 455],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line03 + 988, 341], [s.line03 + 1006, 455]),
      },
    ],
    tone: 'grey',
  },
  {
    id: 'skg-p615-guide',
    from: [s.line03 + 1138, 226],
    to: [s.line03 + 1120, 339],
    flatCaps: true,
    segments: [
      { from: [s.line03 + 1138, 226], to: [s.line03 + 1120, 339] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 1134, 215],
          [s.line03 + 1164, 215],
          [s.line03 + 1164, 226],
          [s.line03 + 1144, 226],
          [s.line03 + 1126, 339],
          [s.line03 + 1114, 339],
          [s.line03 + 1132, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line03 + 1138, 226], [s.line03 + 1120, 339]),
      },
    ],
    tone: 'grey',
  },
  {
    id: 'skg-p610-guide',
    from: [s.line03 + 1120, 341],
    to: [s.line03 + 1102, 455],
    flatCaps: true,
    segments: [
      { from: [s.line03 + 1120, 341], to: [s.line03 + 1102, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 1126, 341],
          [s.line03 + 1108, 455],
          [s.line03 + 1106, 466],
          [s.line03 + 1050, 466],
          [s.line03 + 1050, 455],
          [s.line03 + 1096, 455],
          [s.line03 + 1114, 341],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line03 + 1120, 341], [s.line03 + 1102, 455]),
      },
    ],
    tone: 'white',
  },
  {
    id: 'pgl-p701-p700-guide',
    from: [s.line04 + 105, 226],
    to: [s.line04 + 132, 455],
    flatCaps: true,
    segments: [
      { from: [s.line04 + 105, 226], to: [s.line04 + 119, 339] },
      { from: [s.line04 + 119, 341], to: [s.line04 + 132, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 66, 215],
          [s.line04 + 109, 215],
          [s.line04 + 125, 339],
          [s.line04 + 113, 339],
          [s.line04 + 99, 226],
          [s.line04 + 66, 226],
        ],
        pathD: getClosedPathD([
          [s.line04 + 66, 215],
          [s.line04 + 109, 215],
          [s.line04 + 125, 339],
          [s.line04 + 113, 339],
          [s.line04 + 99, 226],
          [s.line04 + 66, 226],
        ]),
        edgePathD: getClosedPathD(makeSlantedTrackEdgePoints([s.line04 + 105, 226], [s.line04 + 119, 339])),
      },
      {
        polygonPoints: [
          [s.line04 + 113, 341],
          [s.line04 + 125, 341],
          [s.line04 + 138, 455],
          [s.line04 + 164, 455],
          [s.line04 + 164, 466],
          [s.line04 + 127, 466],
        ],
        edgePathD: getClosedPathD(makeSlantedTrackEdgePoints([s.line04 + 119, 341], [s.line04 + 132, 455])),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgl-p703-p702-guide',
    from: [s.line04 + 236, 225],
    to: [s.line04 + 199, 455],
    flatCaps: true,
    segments: [
      { from: [s.line04 + 236, 225], to: [s.line04 + 218, 339] },
      { from: [s.line04 + 218, 341], to: [s.line04 + 199, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 232, 215],
          [s.line04 + 264, 215],
          [s.line04 + 264, 226],
          [s.line04 + 242, 226],
          [s.line04 + 224, 339],
          [s.line04 + 212, 339],
          [s.line04 + 230, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 236, 226], [s.line04 + 218, 339]),
      },
      {
        polygonPoints: [
          [s.line04 + 224, 341],
          [s.line04 + 205, 455],
          [s.line04 + 203, 466],
          [s.line04 + 166, 466],
          [s.line04 + 166, 455],
          [s.line04 + 193, 455],
          [s.line04 + 212, 341],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 218, 341], [s.line04 + 199, 455]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-1105-to-1106-guide',
    from: [s.line04 + 612, 225],
    to: [s.line04 + 676, 455],
    flatCaps: true,
    segments: [
      { from: [s.line04 + 612, 225], to: [s.line04 + 633, 300] },
      { from: [s.line04 + 634, 302], to: [s.line04 + 655, 380] },
      { from: [s.line04 + 656, 382], to: [s.line04 + 676, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 550, 215],
          [s.line04 + 616, 215],
          [s.line04 + 618, 226],
          [s.line04 + 639, 300],
          [s.line04 + 661, 380],
          [s.line04 + 682, 455],
          [s.line04 + 670, 455],
          [s.line04 + 650, 382],
          [s.line04 + 649, 380],
          [s.line04 + 628, 302],
          [s.line04 + 627, 300],
          [s.line04 + 606, 226],
          [s.line04 + 550, 226],
        ],
        edgePolygons: [
          makeSlantedTrackEdgePoints([s.line04 + 612, 226], [s.line04 + 633, 300]),
          makeSlantedTrackEdgePoints([s.line04 + 634, 302], [s.line04 + 655, 380]),
          makeSlantedTrackEdgePoints([s.line04 + 656, 382], [s.line04 + 676, 455]),
        ],
      },
    ],
  },
  {
    id: 'pgc-1107-to-1104-guide',
    from: [s.line04 + 676, 225],
    to: [s.line04 + 612, 455],
    tone: 'grey',
    flatCaps: true,
    segments: [
      { from: [s.line04 + 676, 225], to: [s.line04 + 655, 300] },
      { from: [s.line04 + 654, 302], to: [s.line04 + 633, 380] },
      { from: [s.line04 + 632, 382], to: [s.line04 + 612, 455] },
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 682, 225],
          [s.line04 + 661, 300],
          [s.line04 + 649, 300],
          [s.line04 + 670, 225],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 676, 225], [s.line04 + 655, 300]),
      },
      {
        polygonPoints: [
          [s.line04 + 660, 302],
          [s.line04 + 639, 380],
          [s.line04 + 627, 380],
          [s.line04 + 648, 302],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 654, 302], [s.line04 + 633, 380]),
      },
      {
        polygonPoints: [
          [s.line04 + 638, 382],
          [s.line04 + 618, 455],
          [s.line04 + 606, 455],
          [s.line04 + 626, 382],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 632, 382], [s.line04 + 612, 455]),
      },
    ],
  },
  {
    id: 'pgc-p1101-to-1115-guide',
    from: [s.line04 + 612, 225],
    to: [s.line04 + 633, 300],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 618, 226],
          [s.line04 + 639, 300],
          [s.line04 + 627, 300],
          [s.line04 + 606, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 612, 226], [s.line04 + 633, 300]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-p1103-to-1115-guide',
    from: [s.line04 + 676, 225],
    to: [s.line04 + 655, 300],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 682, 226],
          [s.line04 + 661, 300],
          [s.line04 + 649, 300],
          [s.line04 + 670, 226],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 676, 226], [s.line04 + 655, 300]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-p1100-to-1115-guide',
    from: [s.line04 + 612, 455],
    to: [s.line04 + 632, 382],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 638, 382],
          [s.line04 + 618, 455],
          [s.line04 + 606, 455],
          [s.line04 + 626, 382],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 632, 382], [s.line04 + 612, 455]),
      },
    ],
    tone: 'yellow',
  },
  {
    id: 'pgc-p1102-to-1115-guide',
    from: [s.line04 + 676, 455],
    to: [s.line04 + 656, 382],
    flatCaps: true,
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line04 + 650, 382],
          [s.line04 + 662, 382],
          [s.line04 + 682, 455],
        ],
        edgePolygonPoints: makeSlantedTrackEdgePoints([s.line04 + 656, 382], [s.line04 + 676, 455]),
      },
    ],
    tone: 'yellow',
  },
] as const

export const staticTrackPieces = [
  {
    id: 'hbf-p101-approach-100',
    from: [s.line01 + 6, 338],
    to: [s.line01 + 60, 338],
    state: 'unset',
    width: 10,
  },
  {
    id: 'hbf-p101-approach-102',
    from: [s.line01 + 63, 338],
    to: [s.line01 + 91, 338],
    state: 'unset',
    width: 10,
  },
] as const

export const staticTrackPaths = [
  {
    id: 'hbf-p101-track-102',
    points: [
      [s.line01 + 63, 338],
      [s.line01 + 91, 338],
      [s.line01 + 106, 398],
    ],
    polygonPoints: [
      [s.line01 + 63, 333],
      [s.line01 + 95, 333],
      [s.line01 + 112, 398.5],
      [s.line01 + 100, 398.5],
      [s.line01 + 85, 343],
      [s.line01 + 63, 343],
    ],
    edgePolygonPoints: [
      [s.line01 + 81, 348],
      [s.line01 + 84, 348],
      [s.line01 + 97.6, 398.5],
      [s.line01 + 94.6, 398.5],
    ],
    lineJoin: 'miter',
    state: 'unset',
    width: 10,
  },
  {
    id: 'hbf-p101-track-106',
    points: [
      [s.line01 + 107, 400],
      [s.line01 + 121, 460],
      [s.line01 + 145, 460],
    ],
    polygonPoints: [
      [s.line01 + 101, 400],
      [s.line01 + 113, 400],
      [s.line01 + 127, 455],
      [s.line01 + 145, 455],
      [s.line01 + 145, 466],
      [s.line01 + 118, 466],
    ],
    edgePolygonPoints: [
      [s.line01 + 97, 400],
      [s.line01 + 100, 400],
      [s.line01 + 117.5, 468],
      [s.line01 + 114.5, 468],
    ],
    lineJoin: 'miter',
    state: 'unset',
    width: 10,
  },
] as const

export const staticTrackBoundaries = [
  { id: 'hbf-upper-start', x: s.line01 + 2, y: 220.5, angle: 0, width: 4 },
  { id: 'hbf-p101-approach-start', x: s.line01 + 2, y: 338, angle: 0, width: 4 },
  { id: 'line04-upper-end', x: s.line04 + 965, y: 220.5, angle: 0, width: 4 },
  { id: 'line04-lower-end', x: s.line04 + 965, y: 460.5, angle: 0, width: 4 },
  { id: 'bgk-rt3-663-feeder-end', x: s.line03 + 626, y: 177, angle: 0, width: 4, height: 16 },
  { id: 'bgk-rt1-651-end', x: s.line03 + 935, y: 281, angle: 0, width: 4, height: 22 },
] as const

export const staticTrackLabels = [
  { x: s.line01 + 44, y: 319, label: '100' },
  { x: s.line01 + 68, y: 319, label: '102' },
  { x: s.line02 + 173, y: 348, label: '314' },
  { x: s.line02 + 238, y: 350, label: '318' },
  { x: s.line02 + 308, y: 350, label: '320' },
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

const mapSections = [s.line01, s.line02, s.line03, s.line04] as const

export const mapArrowData = mapSections.flatMap((offset) => [
  ...upperArrowPattern.filter((arrow) => !(
    (offset === s.line02 && arrow.x === 1198) ||
    (offset === s.line03 && (arrow.x === 552 || arrow.x === 650)) ||
    (offset === s.line04 && arrow.x >= 952)
  )).map((arrow) => ({
    direction: 'right' as const,
    tone: arrow.tone,
    x: offset + arrow.x,
    y: 146,
  })),
  ...lowerArrowPattern.filter((arrow) => !(
    (offset === s.line02 && arrow.x === 1200) ||
    (offset === s.line04 && arrow.x >= 960)
  )).map((arrow) => ({
    direction: 'left' as const,
    tone: arrow.tone,
    x: offset + arrow.x,
    y: 559 - LOWER_ARROW_LIFT,
  })),
])

const bgkP602RouteSegment = {
  id: 'bgk-p602',
  idleColor: '#eedc7f',
  idleOpacity: 1,
  joined: true,
  preserveTone: true,
  points: [
    [s.line03 + 673, 156],
    [s.line03 + 669, 183],
    [s.line03 + 630, 177],
    [s.line03 + 669, 177],
    [s.line03 + 669, 180],
  ],
  segmentPolygons: [
    {
      polygonPoints: [
        [s.line03 + 667, 156],
        [s.line03 + 679, 156],
        [s.line03 + 675, 183],
        [s.line03 + 630, 183],
        [s.line03 + 630, 171],
        [s.line03 + 665, 171],
      ],
      edgePolygonPoints: [
        [s.line03 + 663, 156],
        [s.line03 + 666, 156],
        [s.line03 + 664, 169],
        [s.line03 + 630, 169],
        [s.line03 + 630, 166],
        [s.line03 + 664.5, 166],
      ],
    },
  ],
  rounded: false,
  tone: 'yellow',
  width: 12,
} as const

const bgkRt3Track661Segment = {
  id: 'bgk-rt3-661',
  color: '#63869a',
  joined: true,
  opacity: 0.28,
  preserveTone: true,
  points: [
    [s.line03 + 673, 156],
    [s.line03 + 667, 194],
  ],
  ...makeSlantedTrackPiece([s.line03 + 673, 156], [s.line03 + 667, 194]),
  rounded: false,
  tone: 'yellow',
  width: 12,
} as const

type RouteTrackState = 'condition' | 'set' | 'unset'

export type TrackPieceDefinition = {
  readonly color?: string
  readonly opacity?: number
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

const line02MiddleTrackBlockedBySlant = blockedBySlantedTrack(s.line02 + 124, 232, 'unset')
const wlhTurnbackRail416 = blockedBySlantedTrack(s.line02 + 826, 80, 'unset')
const wlhTurnbackRail418 = blockedBySlantedTrack(s.line02 + 908, 32, 'unset')
const wlhTurnbackRail420 = blockedBySlantedTrack(s.line02 + 942, 80, 'unset')

function makeBlockedStraightRouteSegmentPiece(piece: Pick<TrackPieceDefinition, 'width' | 'x'>) {
  const x2 = piece.x + piece.width

  return {
    polygonPoints: [
      [piece.x, 357],
      [x2, 357],
      [x2, 367],
      [piece.x, 367],
    ],
    edgePolygonPoints: [
      [piece.x, 369],
      [x2, 369],
      [x2, 372],
      [piece.x, 372],
    ],
    edgeVisualOnly: true,
  }
}

export const routeSegmentData = [
  {
    id: 'hbf-turnback',
    points: [
      [s.line01 + 6, 338],
      [s.line01 + 91, 338],
      [s.line01 + 128, 460],
      [s.line01 + 266, 458],
    ],
    hideWhenIdle: true,
    rounded: false,
    tone: 'yellow',
    width: 10,
  },
  {
    id: 'line02-middle-turnback',
    idleColor: line02MiddleTrackBlockedBySlant.color,
    idleOpacity: line02MiddleTrackBlockedBySlant.opacity,
    points: [
      [s.line02 + 124, 362],
      [s.line02 + 356, 362],
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
          [s.line02 + 124, 357],
          [s.line02 + 222, 357],
          [s.line02 + 222, 367],
          [s.line02 + 124, 367],
        ],
        edgePolygonPoints: [
          [s.line02 + 124, 369],
          [s.line02 + 222, 369],
          [s.line02 + 222, 372],
          [s.line02 + 124, 372],
        ],
        edgeVisualOnly: true,
      },
      {
        polygonPoints: [
          [s.line02 + 224, 357],
          [s.line02 + 256, 357],
          [s.line02 + 256, 367],
          [s.line02 + 224, 367],
        ],
        edgePolygonPoints: [
          [s.line02 + 224, 369],
          [s.line02 + 256, 369],
          [s.line02 + 256, 372],
          [s.line02 + 224, 372],
        ],
        edgeVisualOnly: true,
      },
      {
        polygonPoints: [
          [s.line02 + 258, 357],
          [s.line02 + 356, 357],
          [s.line02 + 356, 367],
          [s.line02 + 258, 367],
        ],
        edgePolygonPoints: [
          [s.line02 + 258, 369],
          [s.line02 + 356, 369],
          [s.line02 + 356, 372],
          [s.line02 + 258, 372],
        ],
        edgeVisualOnly: true,
      },
    ],
  },
  {
    id: 'wlh-turnback',
    idleColor: wlhTurnbackRail416.color,
    idleOpacity: wlhTurnbackRail416.opacity,
    points: [
      [s.line02 + 826, 362],
      [s.line02 + 1022, 362],
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
    color: '#63869a',
    joined: true,
    opacity: 0.28,
    points: [
      [s.line03 + 667, 196],
      [s.line03 + 662, 226],
      [s.line03 + 588, 220.5],
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 661, 196],
          [s.line03 + 673, 196],
          [s.line03 + 668, 226],
          [s.line03 + 588, 226],
          [s.line03 + 588, 215],
          [s.line03 + 658, 215],
        ],
        // LOCKED GEOMETRY: user-approved P603 left/top strip. Do not edit this strip or its paired P603 polygon.
        edgePolygonPoints: [
          [s.line03 + 657, 196],
          [s.line03 + 660, 196],
          [s.line03 + 657, 213],
          [s.line03 + 588, 213],
          [s.line03 + 588, 210],
          [s.line03 + 655, 210],
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
    joined: true,
    preserveTone: true,
    points: [
      [s.line03 + 663, 215],
      [s.line03 + 667, 190],
      [s.line03 + 671, 164],
      [s.line03 + 676, 137],
      [s.line03 + 680, 110],
    ],
    segmentPolygons: [
      makeSlantedTrackPiece([s.line03 + 673, 154], [s.line03 + 676, 133]),
      makeSlantedTrackPiece([s.line03 + 677, 131], [s.line03 + 680, 110]),
    ],
    rounded: false,
    tone: 'yellow',
    width: 12,
  },
  {
    id: 'bgk-rt2-652',
    joined: true,
    preserveTone: true,
    points: [
      [s.line03 + 796, 110],
      [s.line03 + 802, 144],
    ],
    ...makeSlantedTrackPiece([s.line03 + 796, 110], [s.line03 + 802, 144]),
    rounded: false,
    tone: 'yellow',
    width: 12,
  },
  {
    id: 'bgk-rt2',
    joined: true,
    preserveTone: true,
    points: [
      [s.line03 + 803, 146],
      [s.line03 + 815, 214],
      [s.line03 + 842, 376],
    ],
    ...makeSlantedTrackPiece([s.line03 + 803, 146], [s.line03 + 836, 339]),
    rounded: false,
    tone: 'yellow',
    width: 12,
  },
  {
    id: 'bgk-rt1',
    joined: true,
    preserveTone: true,
    points: [
      [s.line03 + 858, 110],
      [s.line03 + 864, 144],
      [s.line03 + 865, 146],
      [s.line03 + 887, 274],
    ],
    segmentPolygons: [
      makeSlantedTrackPiece([s.line03 + 858, 110], [s.line03 + 864, 144]),
      {
        polygonPoints: [
          [s.line03 + 859, 146],
          [s.line03 + 871, 146],
          [s.line03 + 891, 275],
          [s.line03 + 879, 285],
        ],
        edgePolygonPoints: [
          [s.line03 + 855, 146],
          [s.line03 + 858, 146],
          [s.line03 + 878, 285],
          [s.line03 + 875, 285],
        ],
      },
    ],
    tone: 'yellow',
    rounded: false,
    width: 10,
  },
  {
    id: 'bgk-651',
    joined: true,
    idleColor: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR,
    idleOpacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY,
    preserveTone: true,
    points: [
      [s.line03 + 895, 280],
      [s.line03 + 935, 280],
    ],
    segmentPolygons: [
      {
        polygonPoints: [
          [s.line03 + 893, 276],
          [s.line03 + 935, 276],
          [s.line03 + 935, 286],
          [s.line03 + 881, 286],
        ],
        edgePolygonPoints: [
          [s.line03 + 881, 287],
          [s.line03 + 935, 287],
          [s.line03 + 935, 290],
          [s.line03 + 881, 290],
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
  '053': 'line02-middle-turnback',
  '065': 'wlh-turnback',
  '077': 'line02-middle-turnback',
  '089': 'line02-middle-turnback',
  '093': 'wlh-turnback',
  '095': 'hbf-turnback',
  '097': 'line02-middle-turnback',
  '301': 'bgk-rt3',
  '304': 'bgk-651',
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
    points: [
      [s.line03 + 884, 215],
      [s.line03 + 950, 215],
      [s.line03 + 950, 226],
      [s.line03 + 887, 226],
    ],
    state: 'set',
  },
  {
    id: 'bgk-rt2-right-edge',
    points: [
      [s.line03 + 821, 215],
      [s.line03 + 865, 215],
      [s.line03 + 867, 226],
      [s.line03 + 823, 226],
    ],
    state: 'set',
  },
] as const

export const upperTrackCrossingMasks = [
  {
    id: 'bgk-rt2-upper-cut',
    points: [
      [s.line03 + 815, 209],
      [s.line03 + 820, 240],
    ],
    width: 20,
  },
] as const

export const upperTrackEdgeStrips = [
  {
    id: 'hbf-103-top-strip',
    polygonPoints: [
      [s.line01 + 94, 210],
      [s.line01 + 145, 210],
      [s.line01 + 145, 213],
      [s.line01 + 94, 213],
    ],
  },
  {
    id: 'hbf-109-top-strip',
    polygonPoints: [
      [s.line01 + 250, 210],
      [s.line01 + 301, 210],
      [s.line01 + 301, 213],
      [s.line01 + 250, 213],
    ],
  },
  {
    id: 'hbf-203-top-strip',
    polygonPoints: [
      [s.line01 + 529, 210],
      [s.line01 + 585, 210],
      [s.line01 + 585, 213],
      [s.line01 + 529, 213],
    ],
  },
  {
    id: 'lti-313-top-strip',
    polygonPoints: [
      [s.line02 + 88, 210],
      [s.line02 + 159, 210],
      [s.line02 + 159, 213],
      [s.line02 + 88, 213],
    ],
  },
  {
    id: 'ptp-415-top-strip',
    polygonPoints: [
      [s.line02 + 795, 210],
      [s.line02 + 880, 210],
      [s.line02 + 880, 213],
      [s.line02 + 795, 213],
    ],
  },
  {
    id: 'bgk-p603-locked-strip',
    // LOCKED GEOMETRY: mirrored render of the user-approved P603 strip. Do not edit.
    polygonPoints: [
      [s.line03 + 657, 196],
      [s.line03 + 660, 196],
      [s.line03 + 657, 213],
      [s.line03 + 588, 213],
      [s.line03 + 588, 210],
      [s.line03 + 655, 210],
    ],
  },
  {
    id: 'bgk-605a-right-top-strip',
    // LOCKED GEOMETRY: user-approved separate top strip above right side of 605A. Do not edit.
    polygonPoints: [
      [s.line03 + 672, 210],
      [s.line03 + 687, 210],
      [s.line03 + 687, 213],
      [s.line03 + 671.5, 213],
    ],
  },
  {
    id: 'bgk-609-top-strip-left',
    polygonPoints: [
      [s.line03 + 785, 210],
      [s.line03 + 797, 210],
      [s.line03 + 797, 213],
      [s.line03 + 785, 213],
    ],
  },
  {
    id: 'bgk-609-top-strip-middle',
    polygonPoints: [
      [s.line03 + 825, 210],
      [s.line03 + 864.1, 210],
      [s.line03 + 864.6, 213],
      [s.line03 + 825.5, 213],
    ],
  },
  {
    id: 'bgk-611-top-strip',
    polygonPoints: [
      [s.line03 + 884, 210],
      [s.line03 + 950, 210],
      [s.line03 + 950, 213],
      [s.line03 + 884, 213],
    ],
  },
  {
    id: 'frp-317-top-strip',
    polygonPoints: [
      [s.line02 + 291, 210],
      [s.line02 + 345, 210],
      [s.line02 + 345, 213],
      [s.line02 + 291, 213],
    ],
  },
  {
    id: 'skg-613-top-strip',
    polygonPoints: [
      [s.line03 + 952, 210],
      [s.line03 + 1102, 210],
      [s.line03 + 1102, 213],
      [s.line03 + 952, 213],
    ],
  },
  {
    id: 'skg-615-top-strip',
    polygonPoints: [
      [s.line03 + 1104, 210],
      [s.line03 + 1164, 210],
      [s.line03 + 1164, 213],
      [s.line03 + 1104, 213],
    ],
  },
  {
    id: 'pgl-705-top-strip',
    polygonPoints: [
      [s.line04 + 66, 210],
      [s.line04 + 204, 210],
      [s.line04 + 204, 213],
      [s.line04 + 66, 213],
    ],
  },
  {
    id: 'pgl-707-top-strip',
    polygonPoints: [
      [s.line04 + 206, 210],
      [s.line04 + 264, 210],
      [s.line04 + 264, 213],
      [s.line04 + 206, 213],
    ],
  },
  {
    id: 'pgc-1105-top-strip',
    polygonPoints: [
      [s.line04 + 550, 210],
      [s.line04 + 628, 210],
      [s.line04 + 628, 213],
      [s.line04 + 550, 213],
    ],
  },
  {
    id: 'pgc-1107-top-strip',
    polygonPoints: [
      [s.line04 + 629, 210],
      [s.line04 + 750, 210],
      [s.line04 + 750, 213],
      [s.line04 + 629, 213],
    ],
  },
] as const

export const lowerTrackEdgeStrips = [
  {
    id: 'hbf-110-bottom-strip',
    polygonPoints: [
      [s.line01 + 204, 468],
      [s.line01 + 263, 468],
      [s.line01 + 263, 471],
      [s.line01 + 204, 471],
    ],
  },
  {
    id: 'hbf-204-bottom-strip',
    polygonPoints: [
      [s.line01 + 477, 468],
      [s.line01 + 585, 468],
      [s.line01 + 585, 471],
      [s.line01 + 477, 471],
    ],
  },
  {
    id: 'lti-312-bottom-strip',
    polygonPoints: [
      [s.line02 + 88, 468],
      [s.line02 + 214, 468],
      [s.line02 + 214, 471],
      [s.line02 + 88, 471],
    ],
  },
  {
    id: 'frp-322-bottom-strip',
    polygonPoints: [
      [s.line02 + 331, 468],
      [s.line02 + 387, 468],
      [s.line02 + 387, 471],
      [s.line02 + 331, 471],
    ],
  },
  {
    id: 'hbf-100-bottom-strip',
    polygonPoints: [
      [s.line01 + 6, 345],
      [s.line01 + 60, 345],
      [s.line01 + 60, 348],
      [s.line01 + 6, 348],
    ],
  },
  {
    id: 'hbf-102-bottom-strip',
    polygonPoints: [
      [s.line01 + 63, 345],
      [s.line01 + 84, 345],
      [s.line01 + 84, 348],
      [s.line01 + 63, 348],
    ],
  },
  {
    id: 'hbf-106-bottom-strip',
    polygonPoints: [
      [s.line01 + 114.5, 468],
      [s.line01 + 145, 468],
      [s.line01 + 145, 471],
      [s.line01 + 114.5, 471],
    ],
  },
  {
    id: 'bgk-604-bottom-strip',
    polygonPoints: [
      [s.line03 + 572, 468],
      [s.line03 + 633, 468],
      [s.line03 + 633, 471],
      [s.line03 + 572, 471],
    ],
  },
  {
    id: 'bgk-612-bottom-strip',
    polygonPoints: [
      [s.line03 + 817, 468],
      [s.line03 + 982, 468],
      [s.line03 + 982, 471],
      [s.line03 + 817, 471],
    ],
  },
  {
    id: 'skg-614-bottom-strip',
    polygonPoints: [
      [s.line03 + 984, 468],
      [s.line03 + 1048, 468],
      [s.line03 + 1048, 471],
      [s.line03 + 984, 471],
    ],
  },
  {
    id: 'skg-616-bottom-strip',
    polygonPoints: [
      [s.line03 + 1050, 468],
      [s.line03 + 1155, 468],
      [s.line03 + 1155, 471],
      [s.line03 + 1050, 471],
    ],
  },
  {
    id: 'skg-618-bottom-strip',
    polygonPoints: [
      [s.line03 + 1157, 468],
      [s.line03 + 1221, 468],
      [s.line03 + 1221, 471],
      [s.line03 + 1157, 471],
    ],
  },
  {
    id: 'pgl-704-bottom-strip',
    polygonPoints: [
      [s.line04 + 99, 468],
      [s.line04 + 164, 468],
      [s.line04 + 164, 471],
      [s.line04 + 99, 471],
    ],
  },
  {
    id: 'pgl-706-bottom-strip',
    polygonPoints: [
      [s.line04 + 166, 468],
      [s.line04 + 231, 468],
      [s.line04 + 231, 471],
      [s.line04 + 166, 471],
    ],
  },
  {
    id: 'pgc-1104-bottom-strip',
    polygonPoints: [
      [s.line04 + 549, 468],
      [s.line04 + 625, 468],
      [s.line04 + 625, 471],
      [s.line04 + 549, 471],
    ],
  },
  {
    id: 'pgc-1115-bottom-strip',
    polygonPoints: [
      [s.line04 + 627, 468],
      [s.line04 + 653, 468],
      [s.line04 + 653, 471],
      [s.line04 + 627, 471],
    ],
  },
  {
    id: 'pgc-1106-bottom-strip',
    polygonPoints: [
      [s.line04 + 655, 468],
      [s.line04 + 750, 468],
      [s.line04 + 750, 471],
      [s.line04 + 655, 471],
    ],
  },
] as const

export const upperTrackPieces = [
  { x: s.line01 + 6, width: 85, state: 'condition' },
  { x: s.line01 + 94, width: 51, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.line01 + 147, width: 55, state: 'unset' },
  { x: s.line01 + 204, width: 44, state: 'unset' },
  { x: s.line01 + 250, width: 51, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.line01 + 303, width: 30, state: 'set' },
  { x: s.line01 + 335, width: 30, state: 'set' },
  { x: s.line01 + 367, width: 30, state: 'condition' },
  { x: s.line01 + 399, width: 30, state: 'set' },
  { x: s.line01 + 432, width: 30, state: 'set' },
  { x: s.line01 + 464, width: 31, state: 'set' },
  { x: s.line01 + 497, width: 30, state: 'set' },
  { x: s.line01 + 529, width: 56, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.line01 + 587, width: 56, state: 'set' },
  { x: s.line01 + 645, width: 90, state: 'set' },
  { x: s.line01 + 738, width: 55, state: 'set' },
  { x: s.line01 + 795, width: 95, state: 'set' },
  { x: s.line01 + 894, width: 55, state: 'condition' },
  { x: s.line01 + 951, width: 30, state: 'set' },
  { x: s.line01 + 983, width: 30, state: 'set' },
  { x: s.line01 + 1015, width: 30, state: 'set' },
  { x: s.line01 + 1047, width: 30, state: 'set' },
  { x: s.line01 + 1079, width: 55, state: 'set' },
  { x: s.line01 + 1136, width: 51, state: 'set' },
  { x: s.line02 + 0, width: 29, state: 'condition' },
  { x: s.line02 + 31, width: 55, state: 'condition' },
  blockedBySlantedTrack(s.line02 + 88, 71, 'set'),
  { x: s.line02 + 161, width: 128, state: 'set' },
  blockedBySlantedTrack(s.line02 + 291, 54, 'set'),
  { x: s.line02 + 347, width: 40, state: 'set' },
  { x: s.line02 + 389, width: 55, state: 'set' },
  { x: s.line02 + 446, width: 30, state: 'set' },
  { x: s.line02 + 478, width: 30, state: 'set' },
  { x: s.line02 + 510, width: 30, state: 'set' },
  { x: s.line02 + 542, width: 30, state: 'set' },
  { x: s.line02 + 574, width: 55, state: 'set' },
  { x: s.line02 + 631, width: 30, state: 'condition' },
  { x: s.line02 + 663, width: 30, state: 'set' },
  { x: s.line02 + 695, width: 41, state: 'set' },
  { x: s.line02 + 738, width: 55, state: 'set' },
  blockedBySlantedTrack(s.line02 + 795, 85, 'set'),
  { x: s.line02 + 882, width: 152, state: 'set' },
  { x: s.line02 + 1036, width: 31, state: 'set' },
  { x: s.line02 + 1069, width: 55, state: 'condition' },
  { x: s.line02 + 1126, width: 30, state: 'set' },
  { x: s.line02 + 1158, width: 30, state: 'set' },
  { x: s.line02 + 1190, width: 30, state: 'set' },
  { x: s.line03 + 17, width: 30, state: 'condition' },
  { x: s.line03 + 49, width: 55, state: 'set' },
  { x: s.line03 + 106, width: 30, state: 'set' },
  { x: s.line03 + 138, width: 30, state: 'set' },
  { x: s.line03 + 170, width: 30, state: 'set' },
  { x: s.line03 + 202, width: 55, state: 'set' },
  { x: s.line03 + 259, width: 30, state: 'condition' },
  { x: s.line03 + 291, width: 30, state: 'set' },
  { x: s.line03 + 323, width: 30, state: 'set' },
  { x: s.line03 + 355, width: 55, state: 'set' },
  { x: s.line03 + 412, width: 30, state: 'set' },
  { x: s.line03 + 444, width: 30, state: 'set' },
  { x: s.line03 + 476, width: 39, state: 'set' },
  { x: s.line03 + 517, width: 69, state: 'set' },
  blockedBySlantedTrack(s.line03 + 588, 99, 'set'),
  { x: s.line03 + 689, width: 37, state: 'set' },
  { x: s.line03 + 728, width: 55, state: 'condition' },
  { x: s.line03 + 785, width: 12, state: 'set' },
  blockedBySlantedTrack(s.line03 + 952, 150, 'set'),
  blockedBySlantedTrack(s.line03 + 1104, 60, 'unset'),
  { x: s.line03 + 1166, width: 55, state: 'set' },
  { x: s.line03 + 1223, width: 30, state: 'condition' },
  { x: s.line03 + 1255, width: 20, state: 'set' },
  { x: s.line04 + 2, width: 30, state: 'set' },
  { x: s.line04 + 34, width: 30, state: 'set' },
  blockedBySlantedTrack(s.line04 + 66, 138, 'set'),
  blockedBySlantedTrack(s.line04 + 206, 58, 'set'),
  { x: s.line04 + 266, width: 55, state: 'set' },
  { x: s.line04 + 323, width: 30, state: 'set' },
  { x: s.line04 + 355, width: 30, state: 'set' },
  { x: s.line04 + 387, width: 47, state: 'set' },
  { x: s.line04 + 436, width: 113, state: 'condition' },
  blockedBySlantedTrack(s.line04 + 550, 78, 'set'),
  blockedBySlantedTrack(s.line04 + 629, 121, 'set'),
  { x: s.line04 + 752, width: 77, state: 'set' },
  { x: s.line04 + 831, width: 55, state: 'unset' },
  { x: s.line04 + 888, width: 77, state: 'unset' },
] as const satisfies readonly TrackPieceDefinition[]

export const lowerTrackPieces = [
  { x: s.line01 + 147, width: 55, state: 'condition' },
  { x: s.line01 + 204, width: 59, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.line01 + 265, width: 30, state: 'set' },
  { x: s.line01 + 297, width: 30, state: 'set' },
  { x: s.line01 + 329, width: 30, state: 'set' },
  { x: s.line01 + 361, width: 30, state: 'set' },
  { x: s.line01 + 393, width: 31, state: 'set' },
  { x: s.line01 + 426, width: 49, state: 'set' },
  { x: s.line01 + 477, width: 108, state: 'unset', color: STRAIGHT_TRACK_BLOCKED_BY_SLANT_COLOR, opacity: STRAIGHT_TRACK_BLOCKED_BY_SLANT_OPACITY },
  { x: s.line01 + 587, width: 56, state: 'set' },
  { x: s.line01 + 646, width: 90, state: 'condition' },
  { x: s.line01 + 738, width: 55, state: 'condition' },
  { x: s.line01 + 798, width: 94, state: 'set' },
  { x: s.line01 + 894, width: 55, state: 'set' },
  { x: s.line01 + 951, width: 30, state: 'set' },
  { x: s.line01 + 983, width: 30, state: 'set' },
  { x: s.line01 + 1015, width: 30, state: 'set' },
  { x: s.line01 + 1047, width: 30, state: 'set' },
  { x: s.line01 + 1079, width: 55, state: 'condition' },
  { x: s.line01 + 1136, width: 51, state: 'condition' },
  { x: s.line02 + 0, width: 29, state: 'set' },
  { x: s.line02 + 31, width: 55, state: 'condition' },
  blockedBySlantedTrack(s.line02 + 88, 126, 'set'),
  { x: s.line02 + 216, width: 113, state: 'set' },
  blockedBySlantedTrack(s.line02 + 331, 56, 'set'),
  { x: s.line02 + 389, width: 55, state: 'set' },
  { x: s.line02 + 446, width: 30, state: 'set' },
  { x: s.line02 + 478, width: 30, state: 'set' },
  { x: s.line02 + 510, width: 30, state: 'set' },
  { x: s.line02 + 542, width: 30, state: 'set' },
  { x: s.line02 + 574, width: 55, state: 'set' },
  { x: s.line02 + 631, width: 41, state: 'condition' },
  { x: s.line02 + 674, width: 30, state: 'condition' },
  { x: s.line02 + 706, width: 30, state: 'set' },
  { x: s.line02 + 738, width: 55, state: 'set' },
  { x: s.line02 + 795, width: 162, state: 'set' },
  { x: s.line02 + 959, width: 63, state: 'set' },
  { x: s.line02 + 1024, width: 43, state: 'set' },
  { x: s.line02 + 1069, width: 55, state: 'set' },
  { x: s.line02 + 1126, width: 30, state: 'set' },
  { x: s.line02 + 1158, width: 30, state: 'set' },
  { x: s.line02 + 1190, width: 30, state: 'set' },
  { x: s.line03 + 17, width: 30, state: 'condition' },
  { x: s.line03 + 49, width: 55, state: 'set' },
  { x: s.line03 + 106, width: 30, state: 'set' },
  { x: s.line03 + 138, width: 30, state: 'set' },
  { x: s.line03 + 170, width: 30, state: 'set' },
  { x: s.line03 + 202, width: 55, state: 'set' },
  { x: s.line03 + 259, width: 30, state: 'set' },
  { x: s.line03 + 291, width: 30, state: 'set' },
  { x: s.line03 + 323, width: 30, state: 'condition' },
  { x: s.line03 + 355, width: 55, state: 'set' },
  { x: s.line03 + 412, width: 30, state: 'set' },
  { x: s.line03 + 444, width: 30, state: 'set' },
  { x: s.line03 + 476, width: 30, state: 'set' },
  { x: s.line03 + 508, width: 30, state: 'set' },
  { x: s.line03 + 540, width: 30, state: 'set' },
  blockedBySlantedTrack(s.line03 + 572, 61, 'set'),
  { x: s.line03 + 635, width: 91, state: 'set' },
  { x: s.line03 + 728, width: 55, state: 'unset' },
  { x: s.line03 + 785, width: 29, state: 'unset' },
  blockedBySlantedTrack(s.line03 + 817, 32, 'unset'),
  blockedBySlantedTrack(s.line03 + 849, 133, 'unset'),
  blockedBySlantedTrack(s.line03 + 984, 64, 'unset'),
  blockedBySlantedTrack(s.line03 + 1050, 105, 'unset'),
  blockedBySlantedTrack(s.line03 + 1157, 64, 'unset'),
  { x: s.line03 + 1223, width: 30, state: 'condition' },
  { x: s.line03 + 1255, width: 20, state: 'set' },
  { x: s.line04 + 2, width: 20, state: 'set' },
  { x: s.line04 + 24, width: 73, state: 'set' },
  blockedBySlantedTrack(s.line04 + 99, 65, 'set'),
  blockedBySlantedTrack(s.line04 + 166, 65, 'set'),
  { x: s.line04 + 233, width: 30, state: 'condition' },
  { x: s.line04 + 265, width: 55, state: 'set' },
  { x: s.line04 + 322, width: 30, state: 'unset' },
  { x: s.line04 + 354, width: 30, state: 'unset' },
  { x: s.line04 + 386, width: 47, state: 'unset' },
  { x: s.line04 + 435, width: 113, state: 'unset' },
  blockedBySlantedTrack(s.line04 + 549, 76, 'unset'),
  blockedBySlantedTrack(s.line04 + 627, 26, 'unset'),
  blockedBySlantedTrack(s.line04 + 655, 95, 'unset'),
  { x: s.line04 + 752, width: 77, state: 'condition' },
  { x: s.line04 + 831, width: 55, state: 'unset' },
  { x: s.line04 + 888, width: 77, state: 'unset' },
] as const satisfies readonly TrackPieceDefinition[]

export const upperSignals = [
  { x: s.line01 + 4, track: 'upper', side: 'below', label: 'S104', tone: 'red' },
  { x: s.line01 + 98, label: 'S105', tone: 'red' },
  { x: s.line01 + 205, label: 'S107', tone: 'red' },
  { x: s.line01 + 194, track: 'lower', label: 'S109', tone: 'red' },
  { x: s.line01 + 532, label: 'S203', tone: 'white' },
  { x: s.line01 + 474, track: 'lower', label: 'S201', tone: 'red' },
  { x: s.line01 + 647, label: 'S205', tone: 'white' },
  { x: s.line01 + 645, track: 'lower', label: 'S207', tone: 'red' },
  { x: s.line01 + 741, label: 'S209', tone: 'white' },
  { x: s.line01 + 735, track: 'lower', label: 'S211', tone: 'red' },
  { x: s.line01 + 793, label: 'S213', tone: 'white' },
  { x: s.line01 + 791, track: 'lower', label: 'S215', tone: 'red' },
  { x: s.line01 + 891, label: 'S217', tone: 'white' },
  { x: s.line01 + 889, track: 'lower', label: 'S219', tone: 'red' },
  { x: s.line01 + 939, label: 'S221', tone: 'white' },
  { x: s.line01 + 943, track: 'lower', label: 'S223', tone: 'red' },
  { x: s.line01 + 1140, label: 'S305', tone: 'white' },
  { x: s.line01 + 1132, track: 'lower', label: 'S307', tone: 'red' },
  { x: s.line01 + 1238, label: 'S309', tone: 'white' },
  { x: s.line02 + 14, track: 'lower', label: 'S311', tone: 'red', seamVisible: true },
  { x: s.line02 + 32, label: 'S309', tone: 'white', seamVisible: true },
  { x: s.line02 + 92, label: 'S313', tone: 'white' },
  { x: s.line02 + 225, track: 'upper', side: 'below', label: 'S316', tone: 'red' },
  { x: s.line02 + 319, label: 'S319', tone: 'white' },
  { x: s.line02 + 392, label: 'S325', tone: 'white' },
  { x: s.line02 + 443, label: 'S327', tone: 'white' },
  { x: s.line02 + 578, label: 'S401', tone: 'white' },
  { x: s.line02 + 649, label: 'S405', tone: 'white' },
  { x: s.line02 + 742, label: 'S409', tone: 'white' },
  { x: s.line02 + 793, label: 'S413', tone: 'white' },
  { x: s.line02 + 1056, label: 'S423', tone: 'white' },
  { x: s.line02 + 1128, label: 'S427', tone: 'white' },
  { x: s.line03 + 54, label: 'S501', tone: 'white' },
  { x: s.line03 + 108, label: 'S505', tone: 'white' },
  { x: s.line03 + 208, label: 'S509', tone: 'white' },
  { x: s.line03 + 261, label: 'S513', tone: 'white', hideText: true },
  { x: s.line03 + 360, label: 'S517', tone: 'white' },
  { x: s.line03 + 414, label: 'S521', tone: 'white' },
  { x: s.line03 + 576, label: 'S603', tone: 'white' },
  { x: s.line03 + 629, y: 138, label: 'S652', tone: 'red', layout: 'left-stem' },
  { x: s.line03 + 725, label: 'S605', tone: 'white' },
  { x: s.line03 + 776, label: 'S609', tone: 'white' },
  { x: s.line03 + 898, label: 'S613', tone: 'white' },
  { x: s.line03 + 1134, label: 'S617', tone: 'white' },
  { x: s.line03 + 1198, label: 'S619', tone: 'white' },
  { x: s.line04 + 126, label: 'S617', tone: 'white' },
  { x: s.line04 + 235, label: 'S619', tone: 'white' },
  { x: s.line04 + 72, label: 'S701', tone: 'white' },
  { x: s.line04 + 205, label: 'S705', tone: 'white' },
  { x: s.line04 + 315, label: 'S707', tone: 'white' },
  { x: s.line04 + 555, label: 'S1101', tone: 'white' },
  { x: s.line04 + 632, label: 'S1105', tone: 'white' },
  { x: s.line04 + 828, label: 'S1107', tone: 'red' },
] as const

export const lowerSignals = [
  { x: s.line01 + 27, y: 333, track: 'lower', side: 'below', label: 'S100', labelPosition: 'below-lamp', tone: 'red' },
  { x: s.line01 + 66, y: 333, track: 'upper', label: 'S101', tone: 'red' },
  { x: s.line01 + 144, track: 'upper', side: 'below', label: 'S108', tone: 'red' },
  { x: s.line01 + 144, label: 'S106', tone: 'red' },
  { x: s.line01 + 319, track: 'upper', side: 'below', label: 'S112', tone: 'red' },
  { x: s.line01 + 254, label: 'S110', tone: 'red' },
  { x: s.line01 + 590, track: 'upper', side: 'below', label: 'S202', tone: 'red' },
  { x: s.line01 + 590, label: 'S200', tone: 'white' },
  { x: s.line01 + 640, track: 'upper', side: 'below', label: 'S206', tone: 'red' },
  { x: s.line01 + 640, label: 'S204', tone: 'white' },
  { x: s.line01 + 732, track: 'upper', side: 'below', label: 'S210', tone: 'red' },
  { x: s.line01 + 732, label: 'S208', tone: 'white' },
  { x: s.line01 + 790, track: 'upper', side: 'below', label: 'S214', tone: 'red' },
  { x: s.line01 + 790, label: 'S212', tone: 'white' },
  { x: s.line01 + 888, track: 'upper', side: 'below', label: 'S218', tone: 'red' },
  { x: s.line01 + 888, label: 'S216', tone: 'white' },
  { x: s.line01 + 940, track: 'upper', side: 'below', label: 'S222', tone: 'red' },
  { x: s.line01 + 940, label: 'S220', tone: 'white' },
  { x: s.line01 + 1080, track: 'upper', side: 'below', label: 'S302', tone: 'red' },
  { x: s.line01 + 1080, label: 'S300', tone: 'white' },
  { x: s.line01 + 1136, label: 'S304', tone: 'white' },
  { x: s.line01 + 1238, track: 'upper', side: 'below', label: 'S310', tone: 'red' },
  { x: s.line01 + 1238, label: 'S308', tone: 'white' },
  { x: s.line02 + 58, track: 'upper', side: 'below', label: 'S310', tone: 'red', seamVisible: true },
  { x: s.line02 + 58, side: 'above', label: 'S315', tone: 'red' },
  { x: s.line02 + 272, track: 'lower', side: 'below', label: 'S314', tone: 'red' },
  { x: s.line02 + 272, track: 'lower', side: 'above', label: 'S321', tone: 'red' },
  { x: s.line02 + 238, y: 357, side: 'above', label: 'S317', tone: 'red' },
  { x: s.line02 + 238, y: 360, side: 'below', label: 'S318', labelPosition: 'below-lamp', tone: 'red' },
  { x: s.line02 + 416, track: 'lower', side: 'below', label: 'S320', tone: 'red' },
  { x: s.line02 + 416, track: 'lower', side: 'above', label: 'S329', tone: 'red' },
  { x: s.line02 + 416, track: 'upper', side: 'below', label: 'S322', tone: 'red' },
  { x: s.line02 + 461, track: 'lower', side: 'below', label: 'S324', tone: 'red' },
  { x: s.line02 + 461, track: 'upper', side: 'below', label: 'S326', tone: 'red' },
  { x: s.line02 + 557, track: 'lower', side: 'above', label: 'S403', tone: 'red' },
  { x: s.line02 + 601, track: 'lower', side: 'below', label: 'S400', tone: 'red' },
  { x: s.line02 + 601, track: 'upper', side: 'below', label: 'S402', tone: 'red' },
  { x: s.line02 + 601, track: 'lower', side: 'above', label: 'S407', tone: 'red' },
  { x: s.line02 + 651, track: 'lower', side: 'below', label: 'S404', tone: 'red' },
  { x: s.line02 + 646, track: 'upper', side: 'below', label: 'S406', tone: 'red' },
  { x: s.line02 + 765, track: 'lower', side: 'below', label: 'S408', tone: 'red' },
  { x: s.line02 + 721, track: 'lower', side: 'above', label: 'S411', tone: 'red' },
  { x: s.line02 + 765, track: 'upper', side: 'below', label: 'S410', tone: 'red' },
  { x: s.line02 + 876, track: 'lower', side: 'below', label: 'S412', tone: 'red' },
  { x: s.line02 + 765, track: 'lower', side: 'above', label: 'S415', tone: 'red' },
  { x: s.line02 + 958, track: 'upper', side: 'below', label: 'S416', tone: 'red' },
  { x: s.line02 + 925, y: 350, side: 'above', label: 'S417', tone: 'red' },
  { x: s.line02 + 866, y: 360, side: 'below', label: 'S418', labelPosition: 'below-lamp', tone: 'red' },
  { x: s.line02 + 876, track: 'lower', side: 'above', label: 'S419', tone: 'red' },
  { x: s.line02 + 1045, track: 'lower', side: 'below', label: 'S420', tone: 'red' },
  { x: s.line02 + 1096, track: 'lower', side: 'below', label: 'S422', tone: 'red' },
  { x: s.line02 + 1045, track: 'lower', side: 'above', label: 'S425', tone: 'red' },
  { x: s.line02 + 1096, track: 'upper', side: 'below', label: 'S424', tone: 'red' },
  { x: s.line02 + 1096, track: 'lower', side: 'above', label: 'S429', tone: 'red' },
  { x: s.line02 + 1141, track: 'lower', side: 'below', label: 'S426', tone: 'red' },
  { x: s.line02 + 1141, track: 'upper', side: 'below', label: 'S428', tone: 'red' },
  { x: s.line03 + 47, track: 'upper', side: 'below', label: 'S502', tone: 'red' },
  { x: s.line03 + 95, track: 'upper', side: 'below', label: 'S506', tone: 'red' },
  { x: s.line03 + 200, track: 'upper', side: 'below', label: 'S510', tone: 'red' },
  { x: s.line03 + 248, track: 'upper', side: 'below', label: 'S514', tone: 'red' },
  { x: s.line03 + 353, track: 'upper', side: 'below', label: 'S518', tone: 'red' },
  { x: s.line03 + 401, track: 'upper', side: 'below', label: 'S522', tone: 'red' },
  { x: s.line03 + 44, track: 'lower', side: 'below', label: 'S500', tone: 'white' },
  { x: s.line03 + 54, side: 'above', label: 'S503', tone: 'red' },
  { x: s.line03 + 98, track: 'lower', side: 'below', label: 'S504', tone: 'white' },
  { x: s.line03 + 112, side: 'above', label: 'S507', tone: 'red' },
  { x: s.line03 + 198, track: 'lower', side: 'below', label: 'S508', tone: 'white' },
  { x: s.line03 + 207, side: 'above', label: 'S511', tone: 'red' },
  { x: s.line03 + 251, track: 'lower', side: 'below', label: 'S512', tone: 'white' },
  { x: s.line03 + 265, side: 'above', label: 'S515', tone: 'red' },
  { x: s.line03 + 353, track: 'lower', side: 'below', label: 'S516', tone: 'white' },
  { x: s.line03 + 361, side: 'above', label: 'S519', tone: 'red' },
  { x: s.line03 + 404, track: 'lower', side: 'below', label: 'S520', tone: 'white' },
  { x: s.line03 + 421, side: 'above', label: 'S523', tone: 'red' },
  { x: s.line03 + 544, side: 'above', label: 'S601', tone: 'red' },
  { x: s.line03 + 756, track: 'upper', side: 'below', label: 'S602', tone: 'red' },
  { x: s.line03 + 838, track: 'upper', side: 'below', label: 'S606', tone: 'red' },
  { x: s.line03 + 723, track: 'lower', side: 'below', label: 'S600', tone: 'white' },
  { x: s.line03 + 786, track: 'lower', side: 'below', label: 'S604', tone: 'red' },
  { x: s.line03 + 724, side: 'above', label: 'S607', tone: 'red' },
  { x: s.line03 + 776, side: 'above', label: 'S611', tone: 'red' },
  { x: s.line03 + 814, side: 'above', label: 'S615', tone: 'red' },
  { x: s.line03 + 856, y: 320, track: 'lower', side: 'below', label: 'S653', tone: 'red' },
  { x: s.line03 + 851, y: 262, track: 'lower', side: 'below', label: 'S655', tone: 'red' },
  { x: s.line03 + 1188, track: 'lower', side: 'below', label: 'S608', seamVisible: true, tone: 'red' },
  { x: s.line03 + 1213, side: 'above', label: 'S621', tone: 'red' },
  { x: s.line04 + 187, track: 'upper', side: 'below', label: 'S610', tone: 'red' },
  { x: s.line04 + 268, track: 'upper', side: 'below', label: 'S702', tone: 'red' },
  { x: s.line04 + 345, track: 'upper', side: 'below', label: 'S706', tone: 'red' },
  { x: s.line04 + 750, track: 'upper', side: 'below', label: 'S1104', tone: 'red' },
  { x: s.line04 + 890, track: 'upper', side: 'below', label: 'S1108', tone: 'red' },
  { x: s.line04 + 61, track: 'lower', side: 'above', label: 'S703', tone: 'red' },
  { x: s.line04 + 280, track: 'lower', side: 'below', label: 'S700', tone: 'white' },
  { x: s.line04 + 292, track: 'lower', side: 'above', label: 'S709', tone: 'red' },
  { x: s.line04 + 364, track: 'lower', side: 'below', label: 'S704', tone: 'white' },
  { x: s.line04 + 492, track: 'lower', side: 'above', label: 'S1103', tone: 'red' },
  { x: s.line04 + 801, label: 'S1102', tone: 'red' },
  { x: s.line04 + 791, track: 'lower', side: 'above', label: 'S1109', tone: 'red' },
  { x: s.line04 + 926, track: 'lower', side: 'above', label: 'S1111', tone: 'red' },
  { x: s.line04 + 927, track: 'upper', side: 'above', label: 'S110', tone: 'red' },
  { x: s.line04 + 941, label: 'S1106', tone: 'red' },
] as const

export type LineMapSignalData = (typeof upperSignals)[number] | (typeof lowerSignals)[number]

export const pointLabels = [
  { x: s.line01 + 101, y: 239, label: 'P103', bold: true },
  { x: s.line01 + 87, y: 335, label: 'P101', bold: true },
  { x: s.line01 + 229, y: 432, label: 'P102', bold: true },
  { x: s.line01 + 259, y: 239, label: 'P105', bold: true },
  { x: s.line01 + 544, y: 239, label: 'P201', bold: true },
  { x: s.line01 + 501, y: 432, label: 'P200', bold: true },
  { x: s.line02 + 116, y: 239, label: 'P301', bold: true },
  { x: s.line02 + 144, y: 335, label: 'P300', bold: true },
  { x: s.line02 + 164, y: 380, label: 'P304', bold: true },
  { x: s.line02 + 140, y: 438, label: 'P302', bold: true },
  { x: s.line02 + 304, y: 252, label: 'P305', bold: true },
  { x: s.line02 + 290, y: 330, label: 'P303', bold: true },
  { x: s.line02 + 322, y: 380, label: 'P307', bold: true },
  { x: s.line02 + 333, y: 438, label: 'P306', bold: true },
  { x: s.line03 + 932, y: 239, label: 'P611', bold: true },
  { x: s.line03 + 932, y: 258, label: 'P609', bold: true },
  { x: s.line02 + 838, y: 239, label: 'P401', bold: true },
  { x: s.line02 + 857, y: 330, label: 'P400', bold: true },
  { x: s.line02 + 954, y: 380, label: 'P403', bold: true },
  { x: s.line02 + 974, y: 438, label: 'P402', bold: true },
  { x: s.line03 + 630, y: 239, label: 'P601', bold: true },
  { x: s.line03 + 616, y: 188, label: 'P602', bold: true },
  { x: s.line03 + 677, y: 200, label: 'P603', bold: true },
  { x: s.line03 + 608, y: 432, label: 'P600', bold: true },
  { x: s.line03 + 840, y: 432, label: 'P606', bold: true },
  { x: s.line03 + 970, y: 239, label: 'P613', bold: true },
  { x: s.line03 + 1006, y: 432, label: 'P608', bold: true },
  { x: s.line03 + 1078, y: 432, label: 'P610', bold: true },
  { x: s.line03 + 1130, y: 239, label: 'P615', bold: true },
  { x: s.line04 + 75, y: 239, label: 'P701', bold: true },
  { x: s.line04 + 232, y: 239, label: 'P703', bold: true },
  { x: s.line04 + 109, y: 432, label: 'P700', bold: true },
  { x: s.line04 + 190, y: 432, label: 'P702', bold: true },
  { x: s.line04 + 575, y: 239, label: 'P1101', bold: true },
  { x: s.line04 + 650, y: 239, label: 'P1103', bold: true },
  { x: s.line04 + 575, y: 432, label: 'P1100', bold: true },
  { x: s.line04 + 650, y: 432, label: 'P1102', bold: true },
]

export const schematicAnnotations = [
  { x: s.line01 + 46, y: 211, label: '101' },
  { x: s.line01 + 123, y: 211, label: '103' },
  { x: s.line01 + 174, y: 211, label: '105' },
  { x: s.line01 + 226, y: 211, label: '107' },
  { x: s.line01 + 277, y: 211, label: '109' },
  { x: s.line01 + 319, y: 211, label: '111' },
  { x: s.line01 + 350, y: 211, label: '113' },
  { x: s.line01 + 382, y: 211, label: '115' },
  { x: s.line01 + 414, y: 211, label: '117' },
  { x: s.line01 + 448, y: 211, label: '201' },
  { x: s.line01 + 479, y: 211, label: '203A' },
  { x: s.line01 + 509, y: 211, label: '203B' },
  { x: s.line01 + 560, y: 211, label: '205' },
  { x: s.line01 + 614, y: 211, label: '207' },
  { x: s.line01 + 691, y: 211, label: '209' },
  { x: s.line01 + 765, y: 211, label: '211' },
  { x: s.line01 + 844, y: 211, label: '213' },
  { x: s.line01 + 921, y: 211, label: '215' },
  { x: s.line01 + 970, y: 211, label: '217' },
  { x: s.line01 + 996, y: 211, label: '219' },
  { x: s.line01 + 1031, y: 211, label: '301' },
  { x: s.line01 + 1063, y: 211, label: '303' },
  { x: s.line01 + 1106, y: 211, label: '305' },
  { x: s.line01 + 1161, y: 211, label: '307' },
  { x: s.line01 + 1212, y: 211, label: '309' },
  { x: s.line01 + 1267, y: 211, label: '311' },
  { x: s.line02 + 123, y: 211, label: '313' },
  { x: s.line02 + 225, y: 211, label: '315' },
  { x: s.line02 + 318, y: 211, label: '317' },
  { x: s.line02 + 367, y: 211, label: '319' },
  { x: s.line02 + 416, y: 211, label: '321' },
  { x: s.line02 + 461, y: 211, label: '323' },
  { x: s.line02 + 493, y: 211, label: '325' },
  { x: s.line02 + 525, y: 211, label: '401' },
  { x: s.line02 + 557, y: 211, label: '403' },
  { x: s.line02 + 601, y: 211, label: '405' },
  { x: s.line02 + 646, y: 211, label: '407' },
  { x: s.line02 + 678, y: 211, label: '409' },
  { x: s.line02 + 715, y: 211, label: '411' },
  { x: s.line02 + 765, y: 211, label: '413' },
  { x: s.line02 + 837, y: 211, label: '415' },
  { x: s.line02 + 958, y: 211, label: '417' },
  { x: s.line02 + 1051, y: 211, label: '419' },
  { x: s.line02 + 1096, y: 211, label: '421' },
  { x: s.line02 + 1141, y: 211, label: '423' },
  { x: s.line02 + 1173, y: 211, label: '425' },
  { x: s.line02 + 1205, y: 211, label: '501' },
  { x: s.line02 + 1237, y: 211, label: '503' },
  { x: s.line02 + 1266, y: 211, label: '505' },
  { x: s.line01 + 121, y: 478, label: '106' },
  { x: s.line01 + 174, y: 478, label: '108' },
  { x: s.line01 + 234, y: 478, label: '110' },
  { x: s.line01 + 282, y: 478, label: '112' },
  { x: s.line01 + 312, y: 478, label: '114' },
  { x: s.line01 + 344, y: 478, label: '116' },
  { x: s.line01 + 376, y: 478, label: '118' },
  { x: s.line01 + 409, y: 478, label: '200' },
  { x: s.line01 + 450, y: 478, label: '202' },
  { x: s.line01 + 517, y: 478, label: '204' },
  { x: s.line01 + 614, y: 478, label: '206' },
  { x: s.line01 + 689, y: 478, label: '208' },
  { x: s.line01 + 765, y: 478, label: '210' },
  { x: s.line01 + 842, y: 478, label: '212' },
  { x: s.line01 + 921, y: 478, label: '214' },
  { x: s.line01 + 969, y: 478, label: '216' },
  { x: s.line01 + 998, y: 478, label: '218' },
  { x: s.line01 + 1031, y: 478, label: '300' },
  { x: s.line01 + 1061, y: 478, label: '302' },
  { x: s.line01 + 1108, y: 478, label: '304' },
  { x: s.line01 + 1161, y: 478, label: '306' },
  { x: s.line01 + 1211, y: 478, label: '308' },
  { x: s.line01 + 1267, y: 478, label: '310' },
  { x: s.line01 + 220, y: 506, label: '110' },
  { x: s.line01 + 1046, y: 506, label: '65', tone: 'green' },
  { x: s.line01 + 1078, y: 506, label: '65', tone: 'green' },
  { x: s.line01 + 1110, y: 506, label: '6565', tone: 'green' },
  { x: s.line02 + 14, y: 211, label: '309' },
  { x: s.line02 + 58, y: 211, label: '311' },
  { x: s.line02 + 14, y: 478, label: '308' },
  { x: s.line02 + 58, y: 478, label: '310' },
  { x: s.line02 + 151, y: 478, label: '312' },
  { x: s.line02 + 272, y: 478, label: '316' },
  { x: s.line02 + 359, y: 478, label: '322' },
  { x: s.line02 + 416, y: 478, label: '324' },
  { x: s.line02 + 461, y: 478, label: '326' },
  { x: s.line02 + 493, y: 478, label: '328' },
  { x: s.line02 + 525, y: 478, label: '400' },
  { x: s.line02 + 557, y: 478, label: '402' },
  { x: s.line02 + 601, y: 478, label: '404' },
  { x: s.line02 + 651, y: 478, label: '406' },
  { x: s.line02 + 689, y: 478, label: '408' },
  { x: s.line02 + 721, y: 478, label: '410' },
  { x: s.line02 + 765, y: 478, label: '412' },
  { x: s.line02 + 876, y: 478, label: '414' },
  { x: s.line02 + 866, y: 348, label: '416' },
  { x: s.line02 + 924, y: 348, label: '418' },
  { x: s.line02 + 982, y: 348, label: '420' },
  { x: s.line02 + 990, y: 478, label: '422' },
  { x: s.line02 + 1045, y: 478, label: '424' },
  { x: s.line02 + 1096, y: 478, label: '426' },
  { x: s.line02 + 1141, y: 478, label: '428' },
  { x: s.line02 + 1173, y: 478, label: '430' },
  { x: s.line02 + 1205, y: 478, label: '500' },
  { x: s.line02 + 1237, y: 478, label: '502' },
  { x: s.line02 + 1266, y: 478, label: '504' },
  { x: s.line03 + 2, y: 211, label: '501' },
  { x: s.line03 + 34, y: 211, label: '503' },
  { x: s.line03 + 82, y: 211, label: '505' },
  { x: s.line03 + 121, y: 211, label: '507' },
  { x: s.line03 + 153, y: 211, label: '509' },
  { x: s.line03 + 185, y: 211, label: '511' },
  { x: s.line03 + 229, y: 211, label: '513' },
  { x: s.line03 + 274, y: 211, label: '515' },
  { x: s.line03 + 306, y: 211, label: '517' },
  { x: s.line03 + 338, y: 211, label: '519' },
  { x: s.line03 + 383, y: 211, label: '521' },
  { x: s.line03 + 427, y: 211, label: '523' },
  { x: s.line03 + 459, y: 211, label: '525' },
  { x: s.line03 + 496, y: 211, label: '601' },
  { x: s.line03 + 548, y: 211, label: '603' },
  { x: s.line03 + 638, y: 211, label: '605A' },
  { x: s.line03 + 702, y: 211, label: '605B' },
  { x: s.line03 + 684, y: 96, label: 'RT3' },
  { x: s.line03 + 679, y: 166, label: '661', rotate: -82, fontSize: 8, italic: true },
  { x: s.line03 + 655, y: 134, label: '663', rotate: -82, fontSize: 8, italic: true },
  { x: s.line03 + 659, y: 115, label: '665', rotate: -78, fontSize: 8 },
  { x: s.line03 + 778, y: 127, label: '652', rotate: 260, fontSize: 8 },
  { x: s.line03 + 784, y: 96, label: 'RT2' },
  { x: s.line03 + 841, y: 126, label: '655', rotate: -98, fontSize: 8 },
  { x: s.line03 + 849, y: 184, label: '653', rotate: -98, fontSize: 8 },
  { x: s.line03 + 858, y: 96, label: 'RT1' },
  { x: s.line03 + 802, y: 260, label: '650', rotate: 260, fontSize: 8 },
  { x: s.line03 + 907, y: 292, label: '651', fontSize: 8 },
  { x: s.line03 + 756, y: 211, label: '607' },
  { x: s.line03 + 839, y: 211, label: '609' },
  { x: s.line03 + 925, y: 211, label: '611' },
  { x: s.line03 + 1020, y: 211, label: '613' },
  { x: s.line03 + 1134, y: 211, label: '615' },
  { x: s.line03 + 1198, y: 211, label: '617' },
  { x: s.line03 + 1242, y: 211, label: '619' },
  { x: s.line03 + 1265, y: 211, label: '621' },
  { x: s.line03 + 32, y: 478, label: '500' },
  { x: s.line03 + 76, y: 478, label: '502' },
  { x: s.line03 + 121, y: 478, label: '504' },
  { x: s.line03 + 153, y: 478, label: '506' },
  { x: s.line03 + 185, y: 478, label: '508' },
  { x: s.line03 + 229, y: 478, label: '510' },
  { x: s.line03 + 274, y: 478, label: '512' },
  { x: s.line03 + 306, y: 478, label: '514' },
  { x: s.line03 + 338, y: 478, label: '516' },
  { x: s.line03 + 383, y: 478, label: '518' },
  { x: s.line03 + 427, y: 478, label: '520' },
  { x: s.line03 + 459, y: 478, label: '522' },
  { x: s.line03 + 491, y: 478, label: '524' },
  { x: s.line03 + 523, y: 478, label: '600' },
  { x: s.line03 + 555, y: 478, label: '602' },
  { x: s.line03 + 602, y: 478, label: '604' },
  { x: s.line03 + 681, y: 478, label: '606' },
  { x: s.line03 + 756, y: 478, label: '608' },
  { x: s.line03 + 800, y: 478, label: '610' },
  { x: s.line03 + 854, y: 478, label: '612' },
  { x: s.line03 + 999, y: 478, label: '614' },
  { x: s.line03 + 1082, y: 478, label: '616' },
  { x: s.line03 + 1169, y: 478, label: '618' },
  { x: s.line03 + 1230, y: 478, label: '620' },
  { x: s.line03 + 1265, y: 478, label: '622' },
  { x: s.line04 + 42, y: 211, label: '613' },
  { x: s.line04 + 17, y: 211, label: '701' },
  { x: s.line04 + 49, y: 211, label: '703' },
  { x: s.line04 + 105, y: 211, label: '705' },
  { x: s.line04 + 236, y: 211, label: '707' },
  { x: s.line04 + 294, y: 211, label: '709' },
  { x: s.line04 + 338, y: 211, label: '711' },
  { x: s.line04 + 370, y: 211, label: '713' },
  { x: s.line04 + 411, y: 211, label: '715' },
  { x: s.line04 + 493, y: 211, label: '1103' },
  { x: s.line04 + 589, y: 211, label: '1105' },
  { x: s.line04 + 690, y: 211, label: '1107' },
  { x: s.line04 + 632, y: 342, label: '1115' },
  { x: s.line04 + 791, y: 211, label: '1109' },
  { x: s.line04 + 859, y: 211, label: '1111' },
  { x: s.line04 + 927, y: 211, label: '1113' },
  { x: s.line04 + 929, y: 310, label: 'NB' },
  { x: s.line04 + 42, y: 478, label: '614' },
  { x: s.line04 + 116, y: 478, label: '616' },
  { x: s.line04 + 190, y: 478, label: '618' },
  { x: s.line04 + 246, y: 478, label: '620' },
  { x: s.line04 + 308, y: 478, label: '622' },
  { x: s.line04 + 12, y: 478, label: '700' },
  { x: s.line04 + 61, y: 478, label: '702' },
  { x: s.line04 + 132, y: 478, label: '704' },
  { x: s.line04 + 199, y: 478, label: '706' },
  { x: s.line04 + 248, y: 478, label: '708' },
  { x: s.line04 + 292, y: 478, label: '710' },
  { x: s.line04 + 337, y: 478, label: '712' },
  { x: s.line04 + 369, y: 478, label: '714' },
  { x: s.line04 + 410, y: 478, label: '716' },
  { x: s.line04 + 492, y: 478, label: '1102' },
  { x: s.line04 + 587, y: 478, label: '1104' },
  { x: s.line04 + 703, y: 478, label: '1106' },
  { x: s.line04 + 791, y: 478, label: '1108' },
  { x: s.line04 + 859, y: 478, label: '1110' },
  { x: s.line04 + 926, y: 478, label: '1112' },
  { x: s.line04 + 929, y: 410, label: 'SB' },
] as const
