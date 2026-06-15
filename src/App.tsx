import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import './App.css'
import controlTabIcon from './assets/control-tab-icon.png'
import footerAdminIcon from './assets/toolbar-icons/admin.png'
import footerCardIcon from './assets/toolbar-icons/card.png'
import footerCommandIcon from './assets/toolbar-icons/command.png'
import footerComsIcon from './assets/toolbar-icons/coms.png'
import footerDeviceArrowIcon from './assets/toolbar-icons/device_arrow.png'
import footerDocumentSearchIcon from './assets/toolbar-icons/document_search.png'
import footerEcsIcon from './assets/toolbar-icons/ecs.png'
import footerHelpIcon from './assets/toolbar-icons/help.png'
import footerLayoutIcon from './assets/toolbar-icons/layout.png'
import footerMoveArrowsIcon from './assets/toolbar-icons/move_arrows.png'
import footerNavLayoutLeftIcon from './assets/toolbar-icons/nav_layout_left.png'
import footerNavLayoutRightIcon from './assets/toolbar-icons/nav_layout_right.png'
import footerNavWindowLeftIcon from './assets/toolbar-icons/nav_window_left.png'
import footerNavWindowRightIcon from './assets/toolbar-icons/nav_window_right.png'
import footerNetworkGearsIcon from './assets/toolbar-icons/network_gears.png'
import footerPowerIcon from './assets/toolbar-icons/power.png'
import footerPrinterIcon from './assets/toolbar-icons/printer.png'
import footerTrafficIcon from './assets/toolbar-icons/traffic.png'
import footerUtilityIcon from './assets/toolbar-icons/utility.png'
import footerWindowPairIcon from './assets/toolbar-icons/window_pair.png'
import footerWindowPanelIcon from './assets/toolbar-icons/window_panel.png'
import { submitOccSessionAction } from './backendClient'
import type { OccSessionAction } from './backendClient'
import LiveScadaClock from './components/LiveScadaClock'
import MonitorWorkspace from './components/MonitorWorkspace'
import ScadaFooter from './components/ScadaFooter'
import {
  DEFAULT_LINE_MAP_PAN,
  LINE_SECTION_OFFSETS,
  LINE_VIEWPORT_PANS,
  MAP_PAN_MAX,
  MAP_PAN_STEP,
  MAP_WORLD_WIDTH,
  MONITOR_HEIGHT,
  MONITOR_WIDTH,
  getTrainItamaStatusValue,
  getTrainReadinessDisplayValue,
  getTrainReadinessMode,
  getRouteSegmentIdForTrain,
  initialTrains,
  lowerTrackPieces,
  platformData,
  schematicAnnotations,
  upperTrackPieces,
} from './screens/line-map/model'
import type { LineMapSignalData } from './screens/line-map/model'
import LineMapMonitorDom from './screens/line-map/LineMapDom'
import { ToolbarButton } from './components/ScadaSvgToolbarButton'
import { appendScenarioEvidence, createScenarioEvidence, scenarioTaskList } from './scenario'
import { createOccSessionTransport, OCC_SESSION_KEY } from './sessionTransport'
import type { MonitorLaunchRequest, ScreenRegistration } from './sessionTransport'
import { prototypeScenarios } from './prototypeData'
import AssessmentRubricScreen from './screens/AssessmentRubricScreen'
import DemoGuideScreen from './screens/DemoGuideScreen'
import IosModulesScreen from './screens/IosModulesScreen'
import LoginPage from './screens/LoginPage'
import ReportScreen from './screens/ReportScreen'
import ScenarioBuilderScreen from './screens/ScenarioBuilderScreen'
import TraineeLobbyScreen from './screens/TraineeLobbyScreen'
import type {
  AlarmSummaryRow,
  AppRoute,
  AssessmentTaskMetric,
  CycleMode,
  LineMapRouteSegmentStatus,
  LineMapRuntimeState,
  MonitorAlarmRow,
  OccAssessmentMetrics,
  OccSessionMeta,
  OccSessionState,
  ScenarioNotice,
  ScenarioNoticeTone,
  SessionLifecycle,
  ScenarioTaskId,
  ScenarioTaskState,
  TraineeParticipant,
  TimetableRow,
  TrainingMode,
  TrainCommand,
  TrainDoorFailureState,
  TrainReadinessMode,
  TrainState,
  TrainStatus,
} from './types'

type PopupDragStyle = CSSProperties & {
  '--popup-drag-x': string
  '--popup-drag-y': string
}

function usePopupDrag() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    mode: 'mouse' | 'pointer'
    originX: number
    originY: number
    pointerId?: number
    startX: number
    startY: number
  } | null>(null)
  const style: PopupDragStyle = {
    '--popup-drag-x': `${position.x}px`,
    '--popup-drag-y': `${position.y}px`,
  }

  const updateDragPosition = (clientX: number, clientY: number) => {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    setPosition({
      x: drag.originX + clientX - drag.startX,
      y: drag.originY + clientY - drag.startY,
    })
  }

  const shouldStartDrag = (event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || dragRef.current) {
      return false
    }

    const target = event.target as HTMLElement

    return !target.closest('button, input, select, textarea')
  }

  const startDrag = (clientX: number, clientY: number, mode: 'mouse' | 'pointer', pointerId?: number) => {
    dragRef.current = {
      mode,
      originX: position.x,
      originY: position.y,
      pointerId,
      startX: clientX,
      startY: clientY,
    }
  }

  const stopPointerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current

    if (!drag || drag.mode !== 'pointer' || drag.pointerId !== event.pointerId) {
      return
    }

    dragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) {
        return
      }

      event.preventDefault()
      updateDragPosition(event.clientX, event.clientY)
    }

    const handleMouseUp = () => {
      dragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return {
    style,
    titleBarProps: {
      onMouseDown: (event: ReactMouseEvent<HTMLElement>) => {
        if (!shouldStartDrag(event)) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        startDrag(event.clientX, event.clientY, 'mouse')
      },
      onPointerCancel: stopPointerDrag,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (!shouldStartDrag(event)) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        startDrag(event.clientX, event.clientY, 'pointer', event.pointerId)
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        const drag = dragRef.current

        if (!drag || drag.mode !== 'pointer' || drag.pointerId !== event.pointerId) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        updateDragPosition(event.clientX, event.clientY)
      },
      onPointerUp: stopPointerDrag,
    },
  }
}

const LINE_MAP_LAYOUT_VERSION = 10
const STALE_LINE_MAP_TRAIN_DELTAS = new Set([MONITOR_WIDTH - 1064, MONITOR_WIDTH * 2 - 2084, MONITOR_WIDTH * 3 - 3066, -164, -16, -2, 2, 3, 10])
const LEGACY_OCC_SESSION_KEYS = [
  'sbs-occ-training-session-v1',
  'sbs-occ-training-session-v2',
  'sbs-occ-training-session-v3',
  'sbs-occ-training-session-v4',
] as const
const DEFAULT_LINE_MAP_ROUTE_SEGMENT_STATUSES = {
  'rail-314': 'UNSET',
  'rail-318': 'UNSET',
  'rail-320': 'UNSET',
  'rail-416': 'UNSET',
  'rail-418': 'UNSET',
  'rail-420': 'UNSET',
  'rail-653': 'UNSET',
  'rail-655': 'UNSET',
  'rail-661': 'UNSET',
  'rail-RT3': 'UNSET',
} as const satisfies Record<string, LineMapRouteSegmentStatus>

const EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS = [
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

const DEFAULT_P_ROUTE_SEGMENT_IDS: ReadonlySet<string> = new Set(
  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.flatMap((group) => group.sides[0]),
)

const DEFAULT_ACTIVE_STRAIGHT_TRACK_SEGMENT_IDS: ReadonlySet<string> = new Set([
  ...getDefaultActiveStraightTrackSegmentIds(upperTrackPieces, 'upper'),
  ...getDefaultActiveStraightTrackSegmentIds(lowerTrackPieces, 'lower'),
])

const S610_ROUTE_SEGMENT_IDS = [
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

const S610_LEGACY_ROUTE_SEGMENT_MIGRATIONS = [
  ['bgk-rt2-652', 'route-r610-652-652'],
  ['bgk-rt2', 'route-r610-652-650'],
] as const

const REMOVED_ROUTE_SEGMENT_IDS = [
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

const S610_REAL_ROUTE_SEGMENT_IDS = [
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

const S608_R608_803_REAL_ROUTE_SEGMENT_IDS = [
  'rail-618',
  'rail-616',
  'rail-614',
  'rail-P606',
  'rail-650',
  'rail-652',
] as const

const S700_REAL_ROUTE_SEGMENT_IDS = [
  'rail-710',
  'rail-708',
  'rail-706',
  'rail-704',
  'rail-702',
  'rail-700',
  'rail-622',
  'rail-620',
] as const

const S704_REAL_ROUTE_SEGMENT_IDS = [
  'rail-712',
  'rail-710',
] as const

const S1104_REAL_ROUTE_SEGMENT_IDS = [
  'rail-1109',
  'rail-P1103',
  'rail-1115',
  'rail-P1100',
  'rail-1102',
  'rail-716',
  'rail-714',
] as const

const STARTUP_SIGNAL_ROUTE_SEGMENT_IDS = [
  ...S610_REAL_ROUTE_SEGMENT_IDS,
  ...S608_R608_803_REAL_ROUTE_SEGMENT_IDS,
  ...S700_REAL_ROUTE_SEGMENT_IDS,
  ...S704_REAL_ROUTE_SEGMENT_IDS,
  ...S1104_REAL_ROUTE_SEGMENT_IDS,
] as const

const LINE_SUFFIX_ROUTE_SEGMENT_MIGRATIONS = [
  ['rail-614-line03', 'rail-614'],
  ['rail-617-line03', 'rail-617'],
  ['rail-619-line03', 'rail-619'],
  ['rail-621-line03', 'rail-621'],
  ['rail-705-line04', 'rail-705'],
  ['rail-701-line04', 'rail-701'],
  ['rail-703-line04', 'rail-703'],
  ['rail-1109-line04', 'rail-1109'],
  ['rail-1102-line04', 'rail-1102'],
  ['rail-716-line04', 'rail-716'],
  ['rail-712-line04', 'rail-712'],
  ['rail-710-line04', 'rail-710'],
  ['rail-714-line04', 'rail-714'],
] as const

const S610_RETIRED_ROUTE_SEGMENT_IDS = [
  'rail-P701',
] as const

const S610_SIGNAL_TRACK_SEGMENT_IDS = [
  `track:${Math.round(LINE_SECTION_OFFSETS.line03 + 1198)}`,
  `track:${Math.round(LINE_SECTION_OFFSETS.line04 + 187)}`,
] as const

type TrainRouteAnimationPoint = {
  x: number
  y: number
}

type TrainRouteAnimationStep = {
  point: TrainRouteAnimationPoint
  segmentId: string
}

const TRAIN_MARKER_UPPER_ROUTE_Y = 205
const TRAIN_MARKER_LOWER_ROUTE_Y = 508
const TRAIN_FLAT_RAIL_OCCUPANCY_TOLERANCE = 48
const TRAIN_ROUTE_STEP_POSITION_TOLERANCE = 8
const TRAIN_314_S610_TO_RT2_ROUTE_STEP_DURATION_MS = 2500
const TRAIN_314_S610_TO_RT2_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-705',
    point: { x: LINE_SECTION_OFFSETS.line04 + 105, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-703',
    point: { x: LINE_SECTION_OFFSETS.line04 + 49, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-701',
    point: { x: LINE_SECTION_OFFSETS.line04 + 17, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-621',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1265, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-619',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1242, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-617',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1198, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P615',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1129, y: 283 },
  },
  {
    segmentId: 'rail-P610',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1111, y: 424 },
  },
  {
    segmentId: 'rail-614',
    point: { x: LINE_SECTION_OFFSETS.line03 + 999, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P606',
    point: { x: LINE_SECTION_OFFSETS.line03 + 840, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-650',
    point: { x: LINE_SECTION_OFFSETS.line03 + 819, y: 243 },
  },
  {
    segmentId: 'rail-652',
    point: { x: LINE_SECTION_OFFSETS.line03 + 796, y: 110 },
  },
] as const

const TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-618',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1194, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-616',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1116, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-614',
    point: { x: LINE_SECTION_OFFSETS.line03 + 999, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P606',
    point: { x: LINE_SECTION_OFFSETS.line03 + 840, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-650',
    point: { x: LINE_SECTION_OFFSETS.line03 + 819, y: 243 },
  },
  {
    segmentId: 'rail-652',
    point: { x: LINE_SECTION_OFFSETS.line03 + 796, y: 110 },
  },
] as const

const TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS: readonly TrainRouteAnimationStep[] = [
  {
    segmentId: 'rail-1109',
    point: { x: LINE_SECTION_OFFSETS.line04 + 791, y: TRAIN_MARKER_UPPER_ROUTE_Y },
  },
  {
    segmentId: 'rail-P1103',
    point: { x: LINE_SECTION_OFFSETS.line04 + 650, y: 285 },
  },
  {
    segmentId: 'rail-1115',
    point: { x: LINE_SECTION_OFFSETS.line04 + 633, y: 360 },
  },
  {
    segmentId: 'rail-P1100',
    point: { x: LINE_SECTION_OFFSETS.line04 + 575, y: 432 },
  },
  {
    segmentId: 'rail-1102',
    point: { x: LINE_SECTION_OFFSETS.line04 + 492, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-716',
    point: { x: LINE_SECTION_OFFSETS.line04 + 410, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-714',
    point: { x: LINE_SECTION_OFFSETS.line04 + 369, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-712',
    point: { x: LINE_SECTION_OFFSETS.line04 + 337, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-710',
    point: { x: LINE_SECTION_OFFSETS.line04 + 292, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-708',
    point: { x: LINE_SECTION_OFFSETS.line04 + 248, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-706',
    point: { x: LINE_SECTION_OFFSETS.line04 + 199, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-704',
    point: { x: LINE_SECTION_OFFSETS.line04 + 132, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-702',
    point: { x: LINE_SECTION_OFFSETS.line04 + 61, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-700',
    point: { x: LINE_SECTION_OFFSETS.line04 + 12, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-622',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1265, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-620',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1230, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
  {
    segmentId: 'rail-618',
    point: { x: LINE_SECTION_OFFSETS.line03 + 1194, y: TRAIN_MARKER_LOWER_ROUTE_Y },
  },
] as const

const TRAIN_ROUTE_RENDER_STEPS: readonly TrainRouteAnimationStep[] = [
  ...TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
  ...TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS,
  ...TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
]

const TRAIN_ROUTE_STEP_SEQUENCES_BY_TRAIN_ID: Record<string, readonly TrainRouteAnimationStep[]> = {
  '312': TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS,
  '314': TRAIN_314_S610_TO_RT2_ROUTE_STEPS,
}

type SignalMenuState = {
  signal: LineMapSignalData
  x: number
  y: number
}

const alarmRows: MonitorAlarmRow[] = [
  {
    level: 'S',
    time: '05/11 11:00:06',
    asset: 'SIG/SKG/RT1/SIGN0655',
    message: 'Signal S655: Signal Lamp Filament Status',
    value: 'BURNT',
    tone: 'orange',
  },
  {
    level: 'S',
    time: '05/11 11:02:17',
    asset: 'EMU/032/TRN/XXXXXXX',
    message: 'Train 032: Action Needed (from operator for recovery)',
    value: 'YES',
    tone: 'red',
  },
  {
    level: 'S',
    time: '05/11 11:02:17',
    asset: 'EMU/032/TRN/XXXXXXX',
    message: 'Train 032: Train ITAMA Status',
    value: 'NOT GRANTED',
    tone: 'yellow',
  },
  {
    level: 'S',
    time: '05/11 11:02:21',
    asset: 'EMU/049/TRN/XXXXXXX',
    message: 'Train 049: Train Hold',
    value: 'APPLIED',
    tone: 'yellow',
  },
]

const scenarioSteps = [
  {
    label: 'T+00',
    title: 'Ready',
    text: 'Session reset and monitors synchronized',
  },
  {
    label: 'T+30',
    title: 'Hold train',
    text: 'Train 317 is held for launch / withdrawal handling',
  },
  {
    label: 'T+60',
    title: 'Inject alarm',
    text: 'Door fault alarm appears on Alarm Summary monitor',
  },
  {
    label: 'T+90',
    title: 'Route command',
    text: 'Route command selected and train waits for dispatch',
  },
  {
    label: 'T+120',
    title: 'Dispatch',
    text: 'Train dispatches and cycle mode starts movement',
  },
  {
    label: 'T+150',
    title: 'Complete',
    text: 'Scenario complete and operator response recorded',
  },
]

const demoCues = [
  {
    primary: 'Confirm three monitor windows are online.',
    secondary: 'Start at IOS, then point to Monitor 02.',
  },
  {
    primary: 'Monitor 02: Train 317 changes to HOLD.',
    secondary: 'Explain launch / withdrawal control.',
  },
  {
    primary: 'Monitor 01: red alarm needs acknowledgement.',
    secondary: 'Show sync with IOS event feed.',
  },
  {
    primary: 'Monitor 03: timetable state changes.',
    secondary: 'Explain route and timetable linkage.',
  },
  {
    primary: 'Monitor 02: dispatch starts AUTO cycle.',
    secondary: 'Watch train state update across screens.',
  },
  {
    primary: 'Wrap up: acknowledge, replay, or reset.',
    secondary: 'Close the loop without stale state.',
  },
]

const trainingModeDetails: Record<TrainingMode, { label: string; title: string; cue: string; report: string }> = {
  PRACTICE: {
    label: 'Practice',
    title: 'Guided practice mode',
    cue: 'Hints and trainer step controls are visible.',
    report: 'Guided learning with trainer support.',
  },
  ASSESSMENT: {
    label: 'Assessment',
    title: 'Assessment mode',
    cue: 'Hints hidden. Operator actions and rejected commands are scored.',
    report: 'Timed competency check with reduced guidance.',
  },
  PLAYER: {
    label: 'Player',
    title: 'Player replay mode',
    cue: 'Auto-run playback walks the client through the scenario.',
    report: 'Demonstration playback for review and presentation.',
  },
}

const scenarioTaskStep: Record<ScenarioTaskId, number> = {
  ackAlarm: 2,
  completeScenario: 5,
  dispatchTrain: 4,
  selectTrain: 1,
  setRoute: 3,
}

const scenarioTaskEvidenceLabels: Record<ScenarioTaskId, string> = {
  ackAlarm: 'Alarm acknowledged',
  completeScenario: 'Scenario reviewed',
  dispatchTrain: 'Train dispatched',
  selectTrain: 'Train selected',
  setRoute: 'Route command applied',
}

const scenarioTaskThresholds: Record<ScenarioTaskId, number> = {
  ackAlarm: 45,
  completeScenario: 150,
  dispatchTrain: 105,
  selectTrain: 20,
  setRoute: 75,
}

const initialScenarioTasks: ScenarioTaskState = {
  ackAlarm: false,
  completeScenario: false,
  dispatchTrain: false,
  selectTrain: false,
  setRoute: false,
}

const defaultSessionCode = 'OCC-DEMO-001'

const initialScenarioNotice: ScenarioNotice = {
  text: 'Ready for Train 317 launch / withdrawal drill.',
  tone: 'info',
}

const defaultScenarioTemplate = prototypeScenarios[0]

const initialActiveScenario = {
  duration: defaultScenarioTemplate.duration,
  id: defaultScenarioTemplate.id,
  incident: defaultScenarioTemplate.incidents[0],
  target: defaultScenarioTemplate.target,
  title: defaultScenarioTemplate.title,
}

const initialTrainees: TraineeParticipant[] = [
  {
    email: 'traffic.controller@sbs.local',
    joinedAt: '11:00',
    monitor: 'Monitor 02 - Line Map',
    name: 'Traffic Controller',
    role: 'Traffic Controller',
    status: 'Joined',
  },
  {
    email: 'station.manager@sbs.local',
    joinedAt: '--',
    monitor: 'Monitor 01 - Alarms',
    name: 'Station Manager',
    role: 'Station Manager',
    status: 'Waiting',
  },
]

const alarmSummaryRows: AlarmSummaryRow[] = [
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/BNK/B2/DMS0901',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/HGN/B2/DMS0401',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:42:19',
    asset: 'SIG/OTP/B4/DMS1501',
    description: 'DMS: Timetable Loading Acknowledgement',
    value: 'NO ACK',
    tone: 'yellow',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:55:50',
    asset: 'EMU/042/TRN/XXXXXXX',
    description: 'Train 042: Action Needed (from operator for recovery)',
    value: 'YES',
    tone: 'red',
  },
  {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:55:52',
    asset: 'EMU/037/TRN/XXXXXXX',
    description: 'Train 037: Status of Train Hold Request',
    value: 'AUTOMATIC HOLD',
    tone: 'yellow',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:56:50',
    asset: 'SIG/NED/1133/DMS0003',
    description: 'DMS:HMI Status',
    value: 'OK',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:57:09',
    asset: 'EMU/017/TRN/XXXXXXX',
    description: 'Train 017: Train Hold',
    value: 'NOT APPLIED',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: '',
    timestamp: '05/11/25 10:57:48',
    asset: 'EMU/032/TRN/XXXXXXX',
    description: 'Train 032: Train Skip Stop Demand',
    value: 'FAILED: RET. COND',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: '',
    timestamp: '05/11/25 10:58:31',
    asset: 'SKG_ROUT_S003',
    description: 'Route abandoned: R613_617/Management of Route Control',
    value: '',
    tone: 'grey',
  },
  {
    ack: 'N',
    avl: '',
    mms: 'S',
    timestamp: '05/11/25 10:58:33',
    asset: 'EMU/048/TRN/XXXXXXX',
    description: 'Train 048: Emergency Brake',
    value: 'NOT APPLIED',
    tone: 'grey',
  },
]

const timetableRows: TimetableRow[] = []

function createLiveTimetableRow(trainId: string, state: string): TimetableRow {
  return {
    state,
    train: trainId,
    sched: '',
    originPoint: '',
    originTime: '',
    stationPoint: '',
    stationTime: '',
    dwell: '',
    run: '',
    destinationPoint: '',
    destinationTime: '',
    revision: '',
    speed: '',
  }
}

function upsertTimetableRow(rows: TimetableRow[], trainId: string, state: string): TimetableRow[] {
  const match = rows.findIndex((row) => row.train === trainId)

  if (match === -1) {
    return [...rows, createLiveTimetableRow(trainId, state)]
  }

  return rows.map((row, index) => (
    index === match ? { ...row, state } : row
  ))
}

function normalizeTimetableRows(rows: TimetableRow[] | undefined): TimetableRow[] {
  if (!rows) {
    return timetableRows
  }

  return rows.filter((row) => !(row.originPoint === 'HBFS' && row.stationPoint === 'SKGN' && row.sched !== ''))
}

function clampPan(value: number) {
  return Math.min(MAP_PAN_MAX, Math.max(0, value))
}

function snapLineMapPan(value: number) {
  const clamped = clampPan(value)

  return LINE_VIEWPORT_PANS.reduce((closest, pan) => (
    Math.abs(pan - clamped) < Math.abs(closest - clamped) ? pan : closest
  ), LINE_VIEWPORT_PANS[0])
}

function advanceTrain(train: TrainState): TrainState {
  if (train.status !== 'RUN') {
    return train
  }

  const delta = train.direction === 'right' ? 18 : -18
  const nextX = train.x + delta

  if (nextX > MAP_WORLD_WIDTH - 50) {
    return { ...train, x: 60 }
  }

  if (nextX < 40) {
    return { ...train, x: MAP_WORLD_WIDTH - 70 }
  }

  return { ...train, x: nextX }
}

function formatScenarioTime() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${day}/${month} ${hours}:${minutes}:${seconds}`
}

function formatAlarmSummaryTimestamp(time: string) {
  if (/^\d{2}\/\d{2}\/\d{2}\s/.test(time)) {
    return time
  }

  const year = String(new Date().getFullYear()).slice(-2)

  return time.replace(/^(\d{2}\/\d{2})\s/, `$1/${year} `)
}

function createMonitorEvent(
  trainId: string,
  message: string,
  value: string,
  tone: MonitorAlarmRow['tone'] = 'yellow',
): MonitorAlarmRow {
  return {
    level: 'S',
    time: formatScenarioTime(),
    asset: `EMU/${trainId}/TRN/OCC`,
    message,
    value,
    tone,
  }
}

function createSummaryEvent(event: MonitorAlarmRow, tone: AlarmSummaryRow['tone'] = 'yellow'): AlarmSummaryRow {
  return {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: formatAlarmSummaryTimestamp(event.time),
    asset: event.asset,
    description: event.message,
    value: event.value,
    tone,
  }
}

function updateScenarioTask(
  tasks: ScenarioTaskState | undefined,
  taskId: ScenarioTaskId,
  complete = true,
): ScenarioTaskState {
  return {
    ...initialScenarioTasks,
    ...tasks,
    [taskId]: complete,
  }
}

function getScenarioTaskBlocker(tasks: ScenarioTaskState | undefined, taskId: ScenarioTaskId) {
  const currentTasks = { ...initialScenarioTasks, ...tasks }

  if (taskId === 'ackAlarm' && !currentTasks.selectTrain) {
    return 'Select Train 317 before acknowledging the injected alarm.'
  }

  if (taskId === 'setRoute') {
    if (!currentTasks.selectTrain) {
      return 'Select Train 317 before applying route.'
    }

    if (!currentTasks.ackAlarm) {
      return 'Acknowledge the door fault before applying route.'
    }
  }

  if (taskId === 'dispatchTrain') {
    if (!currentTasks.ackAlarm) {
      return 'Acknowledge the door fault before dispatch.'
    }

    if (!currentTasks.setRoute) {
      return 'Apply route command before dispatch.'
    }
  }

  if (taskId === 'completeScenario' && !currentTasks.dispatchTrain) {
    return 'Dispatch Train 317 before completing the scenario.'
  }

  return ''
}

function withScenarioNotice(
  current: OccSessionState,
  text: string,
  tone: ScenarioNoticeTone = 'info',
): OccSessionState {
  return {
    ...current,
    scenarioNotice: { text, tone },
  }
}

function rejectScenarioAction(
  current: OccSessionState,
  text: string,
  trainId = '317',
  source = 'Scenario Guard',
): OccSessionState {
  const event = createMonitorEvent(trainId, `Command rejected: ${text}`, 'REJECTED', 'red')

  return {
    ...withScenarioNotice(current, text, 'warning'),
    evidenceLog: appendScenarioEvidence(
      current.evidenceLog,
      createScenarioEvidence(source, 'Action rejected', 'rejected', text),
    ),
    eventRows: [event, ...current.eventRows].slice(0, 4),
  }
}

type InspectorPage = 'information' | 'control' | 'tag'
type TrainAuxiliaryView = 'alarms' | 'cctv' | 'details' | 'pec-reset' | 'pis' | 'regulation'
type TrainDoorCommand =
  | 'cycle-door'
  | 'confirm-closed-locked'
  | 'authorize-door-isolation'
  | 'authorize-move'
  | 'withdraw-service'

function completeScenarioTask(
  current: OccSessionState,
  taskId: ScenarioTaskId,
  successText: string,
  source = 'OCC Workflow',
): { allowed: boolean; next: OccSessionState } {
  const blocker = getScenarioTaskBlocker(current.scenarioTasks, taskId)

  if (blocker) {
    return {
      allowed: false,
      next: rejectScenarioAction(current, blocker),
    }
  }

  return {
    allowed: true,
    next: {
      ...withScenarioNotice(current, successText, taskId === 'completeScenario' ? 'success' : 'info'),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(source, scenarioTaskEvidenceLabels[taskId], 'accepted', successText),
      ),
      scenarioMode: taskId === 'completeScenario' ? 'COMPLETE' : current.scenarioMode === 'COMPLETE' ? 'COMPLETE' : 'RUNNING',
      sessionMeta: updateSessionLifecycle(
        current.sessionMeta,
        taskId === 'completeScenario' ? 'COMPLETE' : 'RUNNING',
      ),
      scenarioStep: Math.max(current.scenarioStep, scenarioTaskStep[taskId]),
      scenarioTasks: updateScenarioTask(current.scenarioTasks, taskId),
    },
  }
}

function getScenarioStepBlocker(current: OccSessionState, nextStep: number) {
  if (nextStep === 3) {
    return getScenarioTaskBlocker(current.scenarioTasks, 'setRoute')
  }

  if (nextStep === 4) {
    return getScenarioTaskBlocker(current.scenarioTasks, 'dispatchTrain')
  }

  if (nextStep >= 5) {
    return getScenarioTaskBlocker(current.scenarioTasks, 'completeScenario')
  }

  return ''
}

function applyScenarioStep(current: OccSessionState, step: number): OccSessionState {
  const scenarioStep = Math.min(step, scenarioSteps.length - 1)
  const trainId = '317'
  let status: TrainStatus = 'RUN'
  let cycleMode: CycleMode = 'NONE'
  let timetableState = '>'
  let event = createMonitorEvent(trainId, 'Trainer scenario ready: Train launch and withdrawal', 'READY', 'yellow')
  let summaryTone: AlarmSummaryRow['tone'] = 'yellow'
  let scenarioTasks = { ...initialScenarioTasks, ...current.scenarioTasks }
  let doorFailureState: TrainDoorFailureState | undefined

  if (scenarioStep === 1) {
    status = 'HOLD'
    timetableState = 'H>'
    event = createMonitorEvent(trainId, 'Trainer scenario started: Train 317 launch / withdrawal hold', 'HOLD', 'red')
    summaryTone = 'red'
    scenarioTasks = updateScenarioTask(scenarioTasks, 'selectTrain')
  }

  if (scenarioStep === 2) {
    status = 'HOLD'
    timetableState = 'H>'
    event = createMonitorEvent(trainId, 'Trainer injected alarm: Train 317 door fault pending', 'YES', 'red')
    summaryTone = 'red'
    doorFailureState = 'FAULT_ALARM'
  }

  if (scenarioStep === 3) {
    status = 'WAIT'
    timetableState = 'R'
    event = createMonitorEvent(trainId, 'Instructor command: Train 317 route selected', 'WAIT', 'yellow')
    scenarioTasks = updateScenarioTask(scenarioTasks, 'setRoute')
  }

  if (scenarioStep === 4) {
    status = 'RUN'
    cycleMode = 'AUTO'
    timetableState = '>'
    event = createMonitorEvent(trainId, 'Instructor command: Train 317 dispatch', 'RUN', 'yellow')
    scenarioTasks = updateScenarioTask(updateScenarioTask(scenarioTasks, 'setRoute'), 'dispatchTrain')
  }

  if (scenarioStep === 5) {
    status = 'RUN'
    cycleMode = 'AUTO'
    timetableState = '>'
    event = createMonitorEvent(trainId, 'Scenario complete: Train 317 launch / withdrawal response recorded', 'COMPLETE', 'yellow')
    scenarioTasks = {
      ...scenarioTasks,
      completeScenario: true,
      dispatchTrain: true,
      selectTrain: true,
      setRoute: true,
    }
  }

  const shouldAddEvent = scenarioStep > current.scenarioStep || current.scenarioMode === 'IDLE'

  return {
    ...current,
    alarmSummaryRows: shouldAddEvent
      ? [createSummaryEvent(event, summaryTone), ...current.alarmSummaryRows].slice(0, 12)
      : current.alarmSummaryRows,
    cycleMode,
    eventRows: shouldAddEvent ? [event, ...current.eventRows].slice(0, 4) : current.eventRows,
    lineMap: scenarioStep === 0
      ? createLineMapRuntimeState()
      : scenarioStep >= 3
        ? updateLineMapRouteState(current.lineMap, { id: trainId }, scenarioStep >= 4 ? 'DISPATCHED' : 'SET')
        : current.lineMap,
    evidenceLog: shouldAddEvent
      ? appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'IOS Scenario Control',
          scenarioSteps[scenarioStep]?.title ?? 'Scenario step',
          scenarioStep === scenarioSteps.length - 1 ? 'accepted' : 'info',
          scenarioSteps[scenarioStep]?.text ?? 'Scenario step updated.',
        ),
      )
      : current.evidenceLog,
    scenarioMode: scenarioStep === 0 ? 'IDLE' : scenarioStep === scenarioSteps.length - 1 ? 'COMPLETE' : 'RUNNING',
    sessionMeta: updateSessionLifecycle(
      current.sessionMeta,
      scenarioStep === 0 ? 'CREATED' : scenarioStep === scenarioSteps.length - 1 ? 'COMPLETE' : 'RUNNING',
    ),
    scenarioNotice: {
      text: scenarioSteps[scenarioStep]?.text ?? initialScenarioNotice.text,
      tone: scenarioStep === scenarioSteps.length - 1 ? 'success' : 'info',
    },
    scenarioStep,
    scenarioTasks,
    selectedTrainId: trainId,
    timetableRows: upsertTimetableRow(current.timetableRows, trainId, timetableState),
    trains: current.trains.map((train) => (
      train.id === trainId
        ? {
            ...train,
            status,
            ...(doorFailureState ? { doorFailureState } : {}),
          }
        : train
    )),
  }
}

function createSessionMeta(lifecycle: SessionLifecycle = 'CREATED'): OccSessionMeta {
  const createdAt = new Date().toISOString()

  return {
    code: defaultSessionCode,
    createdAt,
    lifecycle,
    screens: {},
    trainer: 'MNADZRULS [TSR1] @ OCC',
  }
}

function createAssessmentMetrics(): OccAssessmentMetrics {
  const tasks = scenarioTaskList.reduce((currentTasks, task) => ({
    ...currentTasks,
    [task.id]: {
      label: task.label,
      score: 0,
      status: 'PENDING',
      taskId: task.id,
      thresholdSeconds: scenarioTaskThresholds[task.id],
    } satisfies AssessmentTaskMetric,
  }), {} as OccAssessmentMetrics['tasks'])

  return {
    lateTasks: 0,
    onTimeTasks: 0,
    rejectedActions: 0,
    result: 'INCOMPLETE',
    score: 0,
    tasks,
  }
}

function normalizeAssessmentMetrics(metrics: Partial<OccAssessmentMetrics> | undefined): OccAssessmentMetrics {
  const fallback = createAssessmentMetrics()
  const tasks = scenarioTaskList.reduce((currentTasks, task) => ({
    ...currentTasks,
    [task.id]: {
      ...fallback.tasks[task.id],
      ...metrics?.tasks?.[task.id],
    },
  }), {} as OccAssessmentMetrics['tasks'])

  return {
    ...fallback,
    ...metrics,
    tasks,
  }
}

function updateSessionLifecycle(sessionMeta: OccSessionMeta | undefined, lifecycle: SessionLifecycle): OccSessionMeta {
  const currentMeta = sessionMeta ?? createSessionMeta(lifecycle)
  const now = new Date().toISOString()

  return {
    ...currentMeta,
    completedAt: lifecycle === 'COMPLETE' ? currentMeta.completedAt ?? now : currentMeta.completedAt,
    lifecycle,
    startedAt: lifecycle === 'RUNNING' || lifecycle === 'COMPLETE'
      ? currentMeta.startedAt ?? now
      : currentMeta.startedAt,
  }
}

function createInitialTrainStates(): TrainState[] {
  return initialTrains.map((train) => ({
    ...train,
    doorFailureState: undefined,
    isMoving: false,
  }))
}

function createInitialSession(trainingMode: TrainingMode = 'PRACTICE'): OccSessionState {
  return {
    activeScenario: initialActiveScenario,
    alarmSummaryRows,
    assessmentMetrics: createAssessmentMetrics(),
    cycleMode: 'NONE',
    evidenceLog: [
      createScenarioEvidence(
        'IOS',
        'Session initialized',
        'info',
        `${trainingModeDetails[trainingMode].label} session ready for Train 317 drill.`,
      ),
    ],
    eventRows: alarmRows,
    lineMap: createLineMapRuntimeState(),
    scenarioMode: 'IDLE',
    sessionMeta: createSessionMeta(),
    scenarioNotice: initialScenarioNotice,
    scenarioStep: 0,
    scenarioTasks: initialScenarioTasks,
    selectedTrainId: '317',
    timetableRows,
    trainingMode,
    trainees: initialTrainees,
    trains: createInitialTrainStates(),
    updatedAt: Date.now(),
  }
}

function isTrainDemoBaselineSession(session: OccSessionState) {
  const baselineTrains = createInitialTrainStates()

  return baselineTrains.every((baselineTrain) => {
    const train = session.trains.find((item) => item.id === baselineTrain.id)

    return Boolean(train)
      && train?.x === baselineTrain.x
      && train?.y === baselineTrain.y
      && train?.direction === baselineTrain.direction
      && train?.status === baselineTrain.status
      && train?.isMoving !== true
      && !train?.doorFailureState
  })
}

function mergeStoredTrains(storedTrains: TrainState[] | undefined, preserveGeometry = true): TrainState[] {
  if (!storedTrains) {
    return createInitialTrainStates()
  }

  const storedById = new Map(storedTrains.map((train) => [train.id, train]))

  return createInitialTrainStates().map((train) => {
    const stored = storedById.get(train.id)

    if (!stored) {
      return train
    }

    if (train.id === '314') {
      return {
        ...train,
        ...stored,
        itamaGranted: stored.itamaGranted ?? train.itamaGranted,
        readinessMode: stored.readinessMode ?? train.readinessMode,
      }
    }

    const hasStaleGeometry = STALE_LINE_MAP_TRAIN_DELTAS.has(Math.round(train.x - stored.x))

    if (preserveGeometry && !hasStaleGeometry) {
      return {
        ...train,
        ...stored,
        direction: train.id === '312' ? 'left' : stored.direction ?? train.direction,
        itamaGranted: stored.itamaGranted ?? train.itamaGranted,
        readinessMode: stored.readinessMode ?? train.readinessMode,
        y: train.id === '047' || train.id === '314' ? stored.y ?? train.y : train.y,
      }
    }

    return {
      ...train,
      direction: train.id === '312' ? 'left' : stored.direction ?? train.direction,
      status: stored.status ?? train.status,
    }
  })
}

function hasTrain317DoorFaultIncident(session: Partial<OccSessionState>) {
  return session.scenarioMode === 'RUNNING'
    && Number(session.scenarioStep ?? 0) >= 2
    && String(session.activeScenario?.incident ?? '').trim().toLowerCase() === 'door fault'
}

function getTrain317DoorFailureStateFromRows(session: Partial<OccSessionState>): TrainDoorFailureState | null {
  const rows = [
    ...(session.eventRows ?? []).map((row) => ({
      message: row.message,
      value: row.value,
    })),
    ...(session.alarmSummaryRows ?? []).map((row) => ({
      message: row.description,
      value: row.value,
    })),
  ]

  for (const row of rows) {
    const message = String(row.message ?? '').toLowerCase()
    const value = String(row.value ?? '').toUpperCase()

    if (!message.includes('train 317')) {
      continue
    }

    switch (value) {
      case 'CYCLE DOOR REQUESTED':
        return 'CYCLE_DOOR_REQUESTED'
      case 'CLOSED/LOCKED':
        return 'CLOSED_LOCKED_CONFIRMED'
      case 'DOOR ISOLATED':
        return 'DOOR_ISOLATED'
      case 'AUTHORISED TO MOVE':
      case 'AUTHORIZED TO MOVE':
        return 'AUTHORIZED_TO_MOVE'
      case 'WITHDRAW FROM SERVICE':
        return 'WITHDRAW_FROM_SERVICE'
      default:
        break
    }
  }

  return null
}

function inferTrain317DoorFailureState(session: Partial<OccSessionState>, trains: TrainState[]) {
  if (!hasTrain317DoorFaultIncident(session)) {
    return trains
  }

  const derivedDoorFailureState = getTrain317DoorFailureStateFromRows(session)

  return trains.map((train) => {
    if (train.id !== '317') {
      return train
    }

    if (derivedDoorFailureState) {
      return {
        ...train,
        doorFailureState: derivedDoorFailureState,
      }
    }

    if (train.doorFailureState && train.doorFailureState !== 'NORMAL') {
      return train
    }

    return {
      ...train,
      doorFailureState: 'FAULT_ALARM' as const,
    }
  })
}

function createLineMapRuntimeState(): LineMapRuntimeState {
  const routeSegments = createDefaultLineMapRouteSegments()

  routeSegments['rail-651'] = {
    segmentId: 'rail-651',
    status: 'SET',
    trainId: '',
    updatedAt: 0,
  }
  routeSegments['bgk-651'] = {
    segmentId: 'bgk-651',
    status: 'SET',
    trainId: '',
    updatedAt: 0,
  }

  delete routeSegments['rail-P609']
  enforceLineMapRouteSegmentExclusivity(routeSegments, ['rail-651', 'bgk-651'])

  return {
    layoutVersion: LINE_MAP_LAYOUT_VERSION,
    routeSegments,
  }
}

function clearStartupSignalRouteState(lineMap: LineMapRuntimeState): LineMapRuntimeState {
  const routeSegments = { ...lineMap.routeSegments }

  STARTUP_SIGNAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    resetLineMapRouteSegmentState(routeSegments, segmentId)
  })

  return {
    ...lineMap,
    routeSegments,
  }
}

function normalizeLineMapRuntimeState(lineMap: Partial<LineMapRuntimeState> | undefined): LineMapRuntimeState {
  if (lineMap?.layoutVersion !== LINE_MAP_LAYOUT_VERSION) {
    return createLineMapRuntimeState()
  }

  let normalized = {
    layoutVersion: LINE_MAP_LAYOUT_VERSION,
    routeSegments: migrateLineMapRouteSegments(lineMap?.routeSegments),
  }

  Object.entries(TRAIN_ROUTE_STEP_SEQUENCES_BY_TRAIN_ID).forEach(([trainId, routeSteps]) => {
    const routeStepIndex = getTrainRouteStepIndexFromRouteSegments(normalized.routeSegments, trainId, routeSteps)

    if (routeStepIndex === undefined) {
      return
    }

    normalized = {
      ...normalized,
      routeSegments: applyTrainRouteStepStates(normalized.routeSegments, trainId, routeSteps, routeStepIndex),
    }
  })

  return normalized
}

function migrateLineMapRouteSegments(routeSegments: LineMapRuntimeState['routeSegments'] | undefined) {
  const next = {
    ...createDefaultLineMapRouteSegments(),
    ...(routeSegments ?? {}),
  }

  DEFAULT_ACTIVE_STRAIGHT_TRACK_SEGMENT_IDS.forEach((segmentId) => {
    const state = next[segmentId]

    if (!state || state.status === 'UNSET' || isSeededLineMapRouteSegmentState(state)) {
      next[segmentId] = {
        segmentId,
        status: 'SET',
        trainId: '',
        updatedAt: 0,
      }
    }
  })

  if (routeSegments) {
    EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
      const preferredSideStates = group.sides[0]
        .map((segmentId) => next[segmentId])
        .filter((state): state is NonNullable<typeof state> => Boolean(state))
      const straightSideStates = group.sides[1]
        .map((segmentId) => next[segmentId])
        .filter((state): state is NonNullable<typeof state> => Boolean(state))
      const hasLegacyPreferredSeed = preferredSideStates.length > 0 && preferredSideStates.every(isSeededLineMapRouteSegmentState)
      const hasMeaningfulPreferredState = preferredSideStates.some((state) => !isSeededLineMapRouteSegmentState(state))
      const hasMeaningfulStraightState = straightSideStates.some((state) => !isSeededLineMapRouteSegmentState(state))
      const hasMeaningfulState = hasMeaningfulPreferredState || hasMeaningfulStraightState

      if (!hasLegacyPreferredSeed && hasMeaningfulState) {
        return
      }

      group.sides[0].forEach((segmentId) => {
        delete next[segmentId]
      })

      group.sides[1].forEach((segmentId) => {
        next[segmentId] = {
          segmentId,
          status: 'SET',
          trainId: '',
          updatedAt: 0,
        }
      })
    })
  }

  Array.from(DEFAULT_P_ROUTE_SEGMENT_IDS).forEach((segmentId) => {
    const state = next[segmentId]

    if (state && state.updatedAt === 0 && state.trainId === '') {
      delete next[segmentId]
    }
  })

  LINE_SUFFIX_ROUTE_SEGMENT_MIGRATIONS.forEach(([legacySegmentId, migratedSegmentId]) => {
    if (next[legacySegmentId] && !next[migratedSegmentId]) {
      next[migratedSegmentId] = {
        ...next[legacySegmentId],
        segmentId: migratedSegmentId,
      }
    }

    delete next[legacySegmentId]
  })

  REMOVED_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    delete next[segmentId]
  })

  S610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    if (!isSignalRouteCommandState(next[segmentId])) {
      delete next[segmentId]
    }
  })

  const activeS610SignalSegment = S610_SIGNAL_TRACK_SEGMENT_IDS
    .map((segmentId) => next[segmentId])
    .find(isActiveLineMapRouteSegment)
  const activeS610RetiredSegment = S610_RETIRED_ROUTE_SEGMENT_IDS
    .map((segmentId) => next[segmentId])
    .find(isActiveLineMapRouteSegment)
  const activeS610CurrentSegment = S610_REAL_ROUTE_SEGMENT_IDS
    .map((segmentId) => next[segmentId])
    .find(isActiveLineMapRouteSegment)
  const activeS610MigrationSegment = activeS610SignalSegment
    ?? (activeS610RetiredSegment && activeS610CurrentSegment ? activeS610RetiredSegment : undefined)

  if (activeS610MigrationSegment) {
    S610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
      next[segmentId] = {
        ...activeS610MigrationSegment,
        segmentId,
      }
    })
  }
  S610_RETIRED_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
    delete next[segmentId]
  })

  enforceLineMapRouteSegmentExclusivity(next)

  delete next['rail-P609']
  next['rail-651'] = {
    segmentId: 'rail-651',
    status: 'SET',
    trainId: '',
    updatedAt: Date.now(),
  }
  next['bgk-651'] = {
    segmentId: 'bgk-651',
    status: 'SET',
    trainId: '',
    updatedAt: Date.now(),
  }
  enforceLineMapRouteSegmentExclusivity(next, ['rail-651', 'bgk-651'])

  return next
}

function createDefaultLineMapRouteSegments(): LineMapRuntimeState['routeSegments'] {
  return Object.fromEntries([
    ...Object.entries(DEFAULT_LINE_MAP_ROUTE_SEGMENT_STATUSES).map(([segmentId, status]) => [
      segmentId,
      {
        segmentId,
        status,
        trainId: '',
        updatedAt: 0,
      },
    ]),
    ...Array.from(DEFAULT_ACTIVE_STRAIGHT_TRACK_SEGMENT_IDS).map((segmentId) => [
      segmentId,
      {
        segmentId,
        status: 'SET' as const,
        trainId: '',
        updatedAt: 0,
      },
    ]),
  ])
}

function getDefaultLineMapRouteSegmentState(segmentId: string) {
  if (DEFAULT_ACTIVE_STRAIGHT_TRACK_SEGMENT_IDS.has(segmentId)) {
    return {
      segmentId,
      status: 'SET' as const,
      trainId: '',
      updatedAt: 0,
    }
  }

  const status = DEFAULT_LINE_MAP_ROUTE_SEGMENT_STATUSES[segmentId as keyof typeof DEFAULT_LINE_MAP_ROUTE_SEGMENT_STATUSES]

  return status
    ? {
        segmentId,
        status,
        trainId: '',
        updatedAt: 0,
      }
    : undefined
}

function resetLineMapRouteSegmentState(routeSegments: LineMapRuntimeState['routeSegments'], segmentId: string) {
  const defaultState = getDefaultLineMapRouteSegmentState(segmentId)

  if (defaultState) {
    routeSegments[segmentId] = defaultState
    enforceLineMapRouteSegmentExclusivity(routeSegments, [segmentId])
    return
  }

  delete routeSegments[segmentId]
  enforceLineMapRouteSegmentExclusivity(routeSegments)
}

function enforceLineMapRouteSegmentExclusivity(
  routeSegments: LineMapRuntimeState['routeSegments'],
  prioritySegmentIds: readonly string[] = [],
) {
  const prioritySegmentIdSet = new Set(prioritySegmentIds)

  EXCLUSIVE_LINE_MAP_ROUTE_SEGMENT_GROUPS.forEach((group) => {
    const prioritySideIndex = group.sides.findIndex((side) => side.some((segmentId) => prioritySegmentIdSet.has(segmentId)))
    const keepSideIndex = prioritySideIndex >= 0
      ? prioritySideIndex
      : getExclusiveLineMapRouteSegmentSideToKeep(routeSegments, group.sides, group.preferredSide)

    if (keepSideIndex === undefined) {
      return
    }

    group.sides.forEach((side, sideIndex) => {
      if (sideIndex === keepSideIndex) {
        return
      }

      side.forEach((segmentId) => {
        delete routeSegments[segmentId]
      })
    })
  })
}

function withLineMapRouteSegmentExclusivity(
  routeSegments: LineMapRuntimeState['routeSegments'],
  prioritySegmentIds: readonly string[] = [],
) {
  const next = { ...routeSegments }

  enforceLineMapRouteSegmentExclusivity(next, prioritySegmentIds)

  return next
}

function getExclusiveLineMapRouteSegmentSideToKeep(
  routeSegments: LineMapRuntimeState['routeSegments'],
  sides: readonly (readonly string[])[],
  preferredSide: number,
) {
  const sideScores = sides.map((side) => Math.max(...side.map((segmentId) => getLineMapRouteSegmentExclusivityScore(routeSegments[segmentId]))))
  const presentSides = sideScores.filter((score) => score > 0).length

  if (presentSides <= 1) {
    return undefined
  }

  const highestScore = Math.max(...sideScores)
  const highestScoreSideIndexes = sideScores
    .map((score, sideIndex) => ({ score, sideIndex }))
    .filter(({ score }) => score === highestScore)
    .map(({ sideIndex }) => sideIndex)

  return highestScoreSideIndexes.includes(preferredSide) ? preferredSide : highestScoreSideIndexes[0]
}

function getLineMapRouteSegmentExclusivityScore(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  if (!state) {
    return 0
  }

  if (isActiveLineMapRouteSegment(state)) {
    return 3
  }

  return state.updatedAt > 0 ? 2 : 1
}

function getClosestTrainRoutePointIndex(
  train: TrainState | undefined,
  routePoints: readonly TrainRouteAnimationPoint[],
) {
  if (!train) {
    return 0
  }

  return routePoints.reduce((closestIndex, point, pointIndex) => {
    const closestPoint = routePoints[closestIndex]
    const pointDistance = Math.hypot(train.x - point.x, train.y - point.y)
    const closestDistance = Math.hypot(train.x - closestPoint.x, train.y - closestPoint.y)

    return pointDistance < closestDistance ? pointIndex : closestIndex
  }, 0)
}

function getVisibleTrainRoutePointIndex(
  train: TrainState | undefined,
  routePoints: readonly TrainRouteAnimationPoint[],
) {
  if (!train) {
    return undefined
  }

  const closestIndex = getClosestTrainRoutePointIndex(train, routePoints)
  const closestPoint = routePoints[closestIndex]
  const distance = Math.hypot(train.x - closestPoint.x, train.y - closestPoint.y)

  return distance <= TRAIN_ROUTE_STEP_POSITION_TOLERANCE ? closestIndex : undefined
}

function isActiveLineMapRouteSegment(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  return Boolean(state && ['DISPATCHED', 'HELD', 'SET'].includes(state.status))
}

function isSignalRouteCommandState(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  return Boolean(isActiveLineMapRouteSegment(state) && state && (state.trainId || state.updatedAt > 0))
}

function isSeededLineMapRouteSegmentState(state: LineMapRuntimeState['routeSegments'][string] | undefined) {
  return Boolean(state && state.updatedAt === 0 && state.trainId === '')
}

function getDefaultActiveStraightTrackSegmentIds(
  pieces: readonly { x: number; width: number }[],
  track: 'lower' | 'upper',
) {
  const labelY = track === 'upper' ? 211 : 478

  return pieces
    .map((piece) => {
      const section = getLineMapDefaultRailSection(piece.x)
      const centerX = piece.x + piece.width / 2
      const candidates = schematicAnnotations.filter((annotation) => (
        annotation.y === labelY
        && getLineMapDefaultRailSection(annotation.x).name === section.name
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
        ? `rail-${normalizeLineMapDefaultRailLabel(closest.label)}`
        : undefined
    })
    .filter((segmentId): segmentId is string => Boolean(segmentId))
}

function getLineMapDefaultRailSection(x: number) {
  const sections = [
    { name: 'line01', start: LINE_SECTION_OFFSETS.line01 },
    { name: 'line02', start: LINE_SECTION_OFFSETS.line02 },
    { name: 'line03', start: LINE_SECTION_OFFSETS.line03 },
    { name: 'line04', start: LINE_SECTION_OFFSETS.line04 },
  ] as const

  return sections.reduce((current, section) => (x >= section.start ? section : current), sections[0])
}

function normalizeLineMapDefaultRailLabel(label: string) {
  return label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function createRouteCommandSegmentStates(
  segmentIds: readonly string[],
  train: Pick<TrainState, 'id'>,
  status: LineMapRouteSegmentStatus,
): LineMapRuntimeState['routeSegments'] {
  const updatedAt = Date.now()

  return Object.fromEntries(segmentIds.map((segmentId) => [
    segmentId,
    {
      segmentId,
      status,
      trainId: train.id,
      updatedAt,
    },
  ]))
}

function getSignalRouteTargetTrain(trains: readonly TrainState[], selectedTrainId: string) {
  return trains.find((train) => train.id === selectedTrainId)
    ?? trains.find((train) => train.id === '314')
    ?? trains.find((train) => train.id === '317')
    ?? trains[0]
}

function getLineMapRouteStatus(status: TrainStatus): LineMapRouteSegmentStatus {
  if (status === 'RUN') {
    return 'DISPATCHED'
  }

  if (status === 'HOLD') {
    return 'HELD'
  }

  return 'SET'
}

function getTrainReadinessRequestValue(train: Pick<TrainState, 'readinessMode'>) {
  switch (getTrainReadinessMode(train)) {
    case 'ASLEEP':
      return 'Asleep'
    case 'DEPOT_MOVEMENT':
      return 'Depot movement'
    case 'HV_ISOLATED':
      return 'HV isolated'
    case 'MAINLINE_OFF_SERVICE':
      return 'Mainline off service'
    case 'MAINLINE_SERVICE':
    default:
      return 'Mainline service'
  }
}

function getTrainReadinessModeFromCommand(command: string): TrainReadinessMode {
  switch (command) {
    case 'ASLEEP':
      return 'ASLEEP'
    case 'DEPOT MOVEMENT':
      return 'DEPOT_MOVEMENT'
    case 'HV ISOLATED':
      return 'HV_ISOLATED'
    case 'MAINLINE OFF SERVICE':
      return 'MAINLINE_OFF_SERVICE'
    case 'MAINLINE SERVICE':
    default:
      return 'MAINLINE_SERVICE'
  }
}

function getTrainDoorFailureState(train: Pick<TrainState, 'doorFailureState'>): TrainDoorFailureState {
  return train.doorFailureState ?? 'NORMAL'
}

function getTrainDoorFaultDisplayValue(state: TrainDoorFailureState) {
  return state === 'NORMAL' || state === 'CLOSED_LOCKED_CONFIRMED'
    ? 'NO'
    : 'YES'
}

function getTrainDoorSummaryStatus(state: TrainDoorFailureState) {
  switch (state) {
    case 'FAULT_ALARM':
      return 'NOT OPEN/CLOSE'
    case 'CYCLE_DOOR_REQUESTED':
      return 'CYCLE DOOR REQUESTED'
    case 'CLOSED_LOCKED_CONFIRMED':
      return 'CLOSED/LOCKED'
    case 'ISOLATION_REQUIRED':
      return 'ISOLATION REQUIRED'
    case 'DOOR_ISOLATED':
      return 'DOOR ISOLATED'
    case 'AUTHORIZED_TO_MOVE':
      return 'AUTHORISED TO MOVE'
    case 'WITHDRAW_FROM_SERVICE':
      return 'WITHDRAW FROM SERVICE'
    case 'NORMAL':
    default:
      return 'CLOSED/LOCKED'
  }
}

function getTrainDoorIsolationStatus(state: TrainDoorFailureState) {
  return state === 'DOOR_ISOLATED' || state === 'AUTHORIZED_TO_MOVE' || state === 'WITHDRAW_FROM_SERVICE'
    ? 'ISOLATED'
    : 'NOT ISOLATED'
}

function getTrainDoorCommandLabel(command: TrainDoorCommand) {
  switch (command) {
    case 'cycle-door':
      return 'Cycle Door'
    case 'confirm-closed-locked':
      return 'Confirm Closed/Locked'
    case 'authorize-door-isolation':
      return 'Authorize Door Isolation'
    case 'authorize-move':
      return 'Authorize Movement'
    case 'withdraw-service':
      return 'Withdraw From Service'
    default:
      return ''
  }
}

function getTrainDoorCommandValue(command: TrainDoorCommand) {
  switch (command) {
    case 'cycle-door':
      return 'CYCLE DOOR'
    case 'confirm-closed-locked':
      return 'CONFIRM CLOSED/LOCKED'
    case 'authorize-door-isolation':
      return 'AUTHORIZE ISOLATION'
    case 'authorize-move':
      return 'AUTHORIZE MOVEMENT'
    case 'withdraw-service':
      return 'WITHDRAW SERVICE'
    default:
      return ''
  }
}

function getTrainDoorCommandFromRequest(value: string): TrainDoorCommand | null {
  switch (value) {
    case 'Cycle Door':
      return 'cycle-door'
    case 'Confirm Closed/Locked':
      return 'confirm-closed-locked'
    case 'Authorize door isolation':
      return 'authorize-door-isolation'
    case 'Authorize movement':
      return 'authorize-move'
    case 'Withdraw from service':
      return 'withdraw-service'
    default:
      return null
  }
}

function getAllowedTrainDoorCommands(state: TrainDoorFailureState): TrainDoorCommand[] {
  switch (state) {
    case 'FAULT_ALARM':
      return ['cycle-door']
    case 'CYCLE_DOOR_REQUESTED':
      return ['confirm-closed-locked', 'authorize-door-isolation']
    case 'DOOR_ISOLATED':
      return ['authorize-move', 'withdraw-service']
    case 'CLOSED_LOCKED_CONFIRMED':
      return ['authorize-move']
    default:
      return []
  }
}

function getTrainDoorCommandRejectionMessage(state: TrainDoorFailureState, command: TrainDoorCommand) {
  if (state === 'NORMAL') {
    return `${getTrainDoorCommandLabel(command)} rejected\nNo active train door failure`
  }

  if (state === 'WITHDRAW_FROM_SERVICE' || state === 'AUTHORIZED_TO_MOVE') {
    return `${getTrainDoorCommandLabel(command)} rejected\nDoor failure workflow already completed`
  }

  return `${getTrainDoorCommandLabel(command)} rejected\nFollow train door failure sequence`
}

function getTrainDoorStateAfterCommand(command: TrainDoorCommand): TrainDoorFailureState {
  switch (command) {
    case 'cycle-door':
      return 'CYCLE_DOOR_REQUESTED'
    case 'confirm-closed-locked':
      return 'CLOSED_LOCKED_CONFIRMED'
    case 'authorize-door-isolation':
      return 'DOOR_ISOLATED'
    case 'authorize-move':
      return 'AUTHORIZED_TO_MOVE'
    case 'withdraw-service':
      return 'WITHDRAW_FROM_SERVICE'
    default:
      return 'NORMAL'
  }
}

function getTrainDoorCommandStatusMessage(command: TrainDoorCommand) {
  return `${getTrainDoorCommandLabel(command)} request\nCommand successful`
}

function updateLineMapRouteState(
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
    [segmentId]: {
      segmentId,
      status,
      trainId: train.id,
      updatedAt: Date.now(),
    },
  }

  enforceLineMapRouteSegmentExclusivity(routeSegments, [segmentId])

  return {
    ...current,
    routeSegments,
  }
}

function clearLineMapRouteState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  train: Pick<TrainState, 'id'>,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const segmentId = getRouteSegmentIdForTrain(train)

  if (!segmentId) {
    return current
  }

  const routeSegments = { ...current.routeSegments }
  resetLineMapRouteSegmentState(routeSegments, segmentId)

  return {
    ...current,
    routeSegments,
  }
}

function updateTrainRouteStepState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
  currentStepIndex: number,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)

  return {
    ...current,
    routeSegments: applyTrainRouteStepStates(current.routeSegments, trainId, routeSteps, currentStepIndex),
  }
}

function applyTrainRouteStepStates(
  currentRouteSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
  currentStepIndex: number,
) {
  const routeSegments = { ...currentRouteSegments }
  const updatedAt = Date.now()

  routeSteps.forEach((step, stepIndex) => {
    routeSegments[step.segmentId] = {
      segmentId: step.segmentId,
      status: stepIndex < currentStepIndex
        ? 'UNSET'
        : stepIndex === currentStepIndex
          ? 'DISPATCHED'
          : 'SET',
      trainId,
      updatedAt,
    }
  })

  enforceLineMapRouteSegmentExclusivity(routeSegments, routeSteps.map((step) => step.segmentId))

  return routeSegments
}

function getTrainRouteStepIndexFromRouteSegments(
  routeSegments: LineMapRuntimeState['routeSegments'],
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  const dispatchedStepIndex = routeSteps.findIndex((step) => {
    const state = routeSegments[step.segmentId]

    return state?.status === 'DISPATCHED' && state.trainId === trainId
  })

  return dispatchedStepIndex >= 0 ? dispatchedStepIndex : undefined
}

function getTrainRouteStepIndexFromLineMap(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  trainId: string,
  routeSteps: readonly TrainRouteAnimationStep[],
) {
  const current = normalizeLineMapRuntimeState(lineMap)

  return getTrainRouteStepIndexFromRouteSegments(current.routeSegments, trainId, routeSteps)
}

function getTrainRouteStepFromLineMap(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  trainId: string,
) {
  const current = normalizeLineMapRuntimeState(lineMap)

  return TRAIN_ROUTE_RENDER_STEPS.find((step) => {
    const state = current.routeSegments[step.segmentId]

    return state?.status === 'DISPATCHED' && state.trainId === trainId
  })
}

function createTrainOccupancyRouteSegmentStates(
  trains: readonly TrainState[],
  lineMap: Partial<LineMapRuntimeState> | undefined,
): LineMapRuntimeState['routeSegments'] {
  const current = normalizeLineMapRuntimeState(lineMap)

  return Object.fromEntries(trains.flatMap((train) => {
    const routeStep = getTrainRouteStepFromLineMap(current, train.id)
    const segmentId = routeStep?.segmentId ?? train.occupancySegmentId ?? getFlatRailSegmentIdForTrain(train)

    if (!segmentId) {
      return []
    }

    return [[
      segmentId,
      {
        segmentId,
        status: 'DISPATCHED' as const,
        trainId: '',
        updatedAt: 0,
      },
    ]]
  }))
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
    { name: 'line01', start: LINE_SECTION_OFFSETS.line01 },
    { name: 'line02', start: LINE_SECTION_OFFSETS.line02 },
    { name: 'line03', start: LINE_SECTION_OFFSETS.line03 },
    { name: 'line04', start: LINE_SECTION_OFFSETS.line04 },
  ] as const

  return sections.reduce((current, section) => (
    x >= section.start ? section : current
  ), sections[0])
}

function normalizeOccupancyRailLabel(label: string) {
  return label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getSignalNumber(signal: LineMapSignalData) {
  return signal.label.replace(/\D/g, '') || '000'
}

function getSignalStationCode(signal: LineMapSignalData) {
  return platformData.reduce((closest, platform) => (
    Math.abs(platform.x - signal.x) < Math.abs(closest.x - signal.x) ? platform : closest
  )).code
}

function getSignalEquipmentLabel(signal: LineMapSignalData) {
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

function getSignalRouteLabel(signal: LineMapSignalData) {
  const routeNumber = Number(getSignalNumber(signal))
  const routeEndOverrides: Record<string, string> = {
    S610: '652',
    S700: '608',
    S704: '700',
    S1104: '704',
  }
  const routeEnd = routeEndOverrides[signal.label] ?? (
    Number.isFinite(routeNumber) ? String(Math.max(0, routeNumber - 4)).padStart(3, '0') : '000'
  )

  return `Route R${String(routeNumber).padStart(3, '0')}_${routeEnd}`
}

function getSignalRouteLabels(signal: LineMapSignalData) {
  const routeLabelOverrides: Record<string, readonly string[]> = {
    S608: ['Route R608_600', 'Route R608_602', 'Route R608_803'],
  }

  return routeLabelOverrides[signal.label] ?? [getSignalRouteLabel(signal)]
}

function getSignalRouteSegmentIds(signal: LineMapSignalData) {
  const routeSegmentOverrides: Record<string, readonly string[]> = {
    S610: S610_ROUTE_SEGMENT_IDS,
  }

  return routeSegmentOverrides[signal.label] ?? []
}

function getSignalRuntimeRouteSegmentIdsForRoute(signal: LineMapSignalData, routeLabel: string) {
  if (signal.label === 'S608') {
    return routeLabel === 'Route R608_803' ? S608_R608_803_REAL_ROUTE_SEGMENT_IDS : []
  }

  if (signal.label === 'S610') {
    return S610_REAL_ROUTE_SEGMENT_IDS
  }

  if (signal.label === 'S700') {
    return S700_REAL_ROUTE_SEGMENT_IDS
  }

  if (signal.label === 'S704') {
    return S704_REAL_ROUTE_SEGMENT_IDS
  }

  if (signal.label === 'S1104') {
    return S1104_REAL_ROUTE_SEGMENT_IDS
  }

  return [getSignalTrackSegmentId(signal), ...getSignalRouteSegmentIds(signal)]
}

function getKnownSignalRuntimeRouteSegmentIds(signal: LineMapSignalData) {
  return [...new Set(getSignalRouteLabels(signal).flatMap((routeLabel) => (
    getSignalRuntimeRouteSegmentIdsForRoute(signal, routeLabel)
  )))]
}

function getSignalTrackSegmentId(signal: LineMapSignalData) {
  return `track:${Math.round(signal.x)}`
}

function updateLineMapSignalTrackState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  signal: LineMapSignalData,
  train: Pick<TrainState, 'id'>,
  status: LineMapRouteSegmentStatus,
  routeLabel = getSignalRouteLabel(signal),
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const segmentId = getSignalTrackSegmentId(signal)
  const routeSegments = { ...current.routeSegments }
  const trainRouteSegmentId = getRouteSegmentIdForTrain(train)

  getSignalRouteSegmentIds(signal).forEach((routeSegmentId) => {
    delete routeSegments[routeSegmentId]
  })
  if (signal.label === 'S610') {
    S610_SIGNAL_TRACK_SEGMENT_IDS.forEach((routeSegmentId) => {
      delete routeSegments[routeSegmentId]
    })
    S610_REAL_ROUTE_SEGMENT_IDS.forEach((routeSegmentId) => {
      delete routeSegments[routeSegmentId]
    })
    S610_RETIRED_ROUTE_SEGMENT_IDS.forEach((routeSegmentId) => {
      delete routeSegments[routeSegmentId]
    })
  }
  if (signal.label === 'S608') {
    getKnownSignalRuntimeRouteSegmentIds(signal).forEach((routeSegmentId) => {
      delete routeSegments[routeSegmentId]
    })
  }
  if (signal.label === 'S700') {
    S700_REAL_ROUTE_SEGMENT_IDS.forEach((routeSegmentId) => {
      delete routeSegments[routeSegmentId]
    })
  }
  if (signal.label === 'S704') {
    S704_REAL_ROUTE_SEGMENT_IDS.forEach((routeSegmentId) => {
      delete routeSegments[routeSegmentId]
    })
  }
  if (signal.label === 'S1104') {
    S1104_REAL_ROUTE_SEGMENT_IDS.forEach((routeSegmentId) => {
      delete routeSegments[routeSegmentId]
    })
  }
  S610_LEGACY_ROUTE_SEGMENT_MIGRATIONS.forEach(([legacySegmentId, migratedSegmentId]) => {
    delete routeSegments[legacySegmentId]
    delete routeSegments[migratedSegmentId]
  })
  if (trainRouteSegmentId) {
    delete routeSegments[trainRouteSegmentId]
  }

  const updatedAt = Date.now()

  if (signal.label === 'S610') {
    Object.assign(routeSegments, createRouteCommandSegmentStates(S610_REAL_ROUTE_SEGMENT_IDS, train, status))
    enforceLineMapRouteSegmentExclusivity(routeSegments, S610_REAL_ROUTE_SEGMENT_IDS)

    return {
      ...current,
      routeSegments,
    }
  }

  if (signal.label === 'S608') {
    const routeSegmentIds = getSignalRuntimeRouteSegmentIdsForRoute(signal, routeLabel)

    Object.assign(routeSegments, createRouteCommandSegmentStates(routeSegmentIds, train, status))
    enforceLineMapRouteSegmentExclusivity(routeSegments, routeSegmentIds)

    return {
      ...current,
      routeSegments,
    }
  }

  if (signal.label === 'S700') {
    Object.assign(routeSegments, createRouteCommandSegmentStates(S700_REAL_ROUTE_SEGMENT_IDS, train, status))
    enforceLineMapRouteSegmentExclusivity(routeSegments, S700_REAL_ROUTE_SEGMENT_IDS)

    return {
      ...current,
      routeSegments,
    }
  }

  if (signal.label === 'S704') {
    Object.assign(routeSegments, createRouteCommandSegmentStates(S704_REAL_ROUTE_SEGMENT_IDS, train, status))
    enforceLineMapRouteSegmentExclusivity(routeSegments, S704_REAL_ROUTE_SEGMENT_IDS)

    return {
      ...current,
      routeSegments,
    }
  }

  if (signal.label === 'S1104') {
    Object.assign(routeSegments, createRouteCommandSegmentStates(S1104_REAL_ROUTE_SEGMENT_IDS, train, status))
    enforceLineMapRouteSegmentExclusivity(routeSegments, S1104_REAL_ROUTE_SEGMENT_IDS)

    return {
      ...current,
      routeSegments,
    }
  }

  routeSegments[segmentId] = {
    segmentId,
    status,
    trainId: train.id,
    updatedAt,
  }
  enforceLineMapRouteSegmentExclusivity(routeSegments, [segmentId])

  return {
    ...current,
    routeSegments,
  }
}

function clearLineMapSignalTrackState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  signal: LineMapSignalData,
): LineMapRuntimeState {
  const current = normalizeLineMapRuntimeState(lineMap)
  const routeSegments = { ...current.routeSegments }

  resetLineMapRouteSegmentState(routeSegments, getSignalTrackSegmentId(signal))
  getSignalRouteSegmentIds(signal).forEach((segmentId) => {
    resetLineMapRouteSegmentState(routeSegments, segmentId)
  })
  if (signal.label === 'S610') {
    S610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    })
    S610_RETIRED_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
      delete routeSegments[segmentId]
    })
    S610_LEGACY_ROUTE_SEGMENT_MIGRATIONS.forEach(([legacySegmentId]) => {
      delete routeSegments[legacySegmentId]
    })
  }
  if (signal.label === 'S608') {
    getKnownSignalRuntimeRouteSegmentIds(signal).forEach((segmentId) => {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    })
  }
  if (signal.label === 'S700') {
    S700_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    })
  }
  if (signal.label === 'S704') {
    S704_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    })
  }
  if (signal.label === 'S1104') {
    S1104_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
      resetLineMapRouteSegmentState(routeSegments, segmentId)
    })
  }

  return {
    ...current,
    routeSegments,
  }
}

function normalizeClientSession(session: OccSessionState): OccSessionState {
  const lineMap = normalizeLineMapRuntimeState(session.lineMap)
  const trains = mergeStoredTrains(session.trains, session.lineMap?.layoutVersion === LINE_MAP_LAYOUT_VERSION)

  return {
    ...session,
    lineMap,
    timetableRows: normalizeTimetableRows(session.timetableRows),
    trains: inferTrain317DoorFailureState(session, trains),
  }
}

function clearStoredOccSessions(includeCurrent = false) {
  try {
    const keys = includeCurrent
      ? [...LEGACY_OCC_SESSION_KEYS, OCC_SESSION_KEY]
      : [...LEGACY_OCC_SESSION_KEYS]

    keys.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Storage is a fallback transport; reset still works through in-memory state.
  }
}

function readStoredSession(): OccSessionState {
  try {
    clearStoredOccSessions()

    const stored = window.localStorage.getItem(OCC_SESSION_KEY)

    if (!stored) {
      return createInitialSession()
    }

    const parsed = JSON.parse(stored) as Partial<OccSessionState>

    const lineMap = clearStartupSignalRouteState(normalizeLineMapRuntimeState(parsed.lineMap))

    const nextSession: OccSessionState = {
      ...createInitialSession(),
      ...parsed,
      activeScenario: parsed.activeScenario ?? initialActiveScenario,
      alarmSummaryRows: parsed.alarmSummaryRows ?? alarmSummaryRows,
      assessmentMetrics: normalizeAssessmentMetrics(parsed.assessmentMetrics),
      evidenceLog: parsed.evidenceLog ?? [],
      eventRows: parsed.eventRows ?? alarmRows,
      scenarioMode: parsed.scenarioMode ?? 'IDLE',
      sessionMeta: {
        ...createSessionMeta(parsed.scenarioMode === 'COMPLETE' ? 'COMPLETE' : 'CREATED'),
        ...parsed.sessionMeta,
        screens: parsed.sessionMeta?.screens ?? {},
      },
      scenarioNotice: parsed.scenarioNotice ?? initialScenarioNotice,
      scenarioStep: parsed.scenarioStep ?? 0,
      scenarioTasks: { ...initialScenarioTasks, ...parsed.scenarioTasks },
      lineMap,
      timetableRows: normalizeTimetableRows(parsed.timetableRows),
      trainingMode: parsed.trainingMode ?? 'PRACTICE',
      trainees: parsed.trainees ?? initialTrainees,
      trains: mergeStoredTrains(parsed.trains, parsed.lineMap?.layoutVersion === LINE_MAP_LAYOUT_VERSION),
      updatedAt: Date.now(),
    }

    return {
      ...nextSession,
      trains: inferTrain317DoorFailureState(nextSession, nextSession.trains),
    }
  } catch {
    return createInitialSession()
  }
}

// Submit golden-path actions to the backend validator. If the local backend is
// down during a demo, the fallback keeps the same UI reducer path working.
function submitBackendScenarioAction(
  session: OccSessionState,
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void,
  action: OccSessionAction,
  fallback?: (current: OccSessionState) => OccSessionState,
  onComplete?: (accepted: boolean, reason: string | null) => void,
) {
  void submitOccSessionAction(session, action)
    .then((payload) => {
      const normalized = normalizeClientSession(payload.session)

      updateSession(() => ({
        ...normalized,
        selectedTrainId: action.trainId ?? normalized.selectedTrainId,
      }))
      onComplete?.(payload.accepted, payload.reason)
    })
    .catch(() => {
      if (fallback) {
        updateSession(fallback)
      }
      onComplete?.(false, 'Backend unavailable. Used local fallback.')
    })
}

function useOccSession() {
  const [session, setSession] = useState<OccSessionState>(readStoredSession)
  const monitorLaunchSubscribersRef = useRef(new Set<(request: MonitorLaunchRequest) => void>())
  const sessionRef = useRef(session)
  const transportRef = useRef<ReturnType<typeof createOccSessionTransport> | null>(null)

  useEffect(() => {
    setSession((current) => {
      const timetableRows = normalizeTimetableRows(current.timetableRows)

      if (timetableRows.length === current.timetableRows.length) {
        return current
      }

      const next = {
        ...current,
        timetableRows,
        updatedAt: Date.now(),
      }

      transportRef.current?.publish(next)
      return next
    })
  }, [session.timetableRows.length])

  useEffect(() => {
    sessionRef.current = session

    try {
      window.localStorage.setItem(OCC_SESSION_KEY, JSON.stringify(session))
    } catch {
      // Storage is a fallback transport; the SharedWorker/BroadcastChannel bus can still run.
    }
  }, [session])

  useEffect(() => {
    transportRef.current = createOccSessionTransport({
      initialSession: sessionRef.current,
      onMonitorLaunchRequest: (request) => {
        monitorLaunchSubscribersRef.current.forEach((subscriber) => subscriber(request))
      },
      onSession: (nextSession) => {
        setSession((currentSession) => {
          const normalizedSession = normalizeClientSession(nextSession)

          if (normalizedSession.updatedAt <= currentSession.updatedAt) {
            return currentSession
          }

          return normalizedSession
        })
      },
    })

    return () => {
      transportRef.current?.close()
      transportRef.current = null
    }
  }, [])

  const requestMonitorPeerLaunch = useCallback(() => (
    transportRef.current?.requestMonitorPeerLaunch() ?? ''
  ), [])

  const registerScreen = useCallback((screen: ScreenRegistration) => {
    transportRef.current?.registerScreen(screen, sessionRef.current)
  }, [])

  const subscribeMonitorLaunch = useCallback((subscriber: (request: MonitorLaunchRequest) => void) => {
    monitorLaunchSubscribersRef.current.add(subscriber)

    return () => {
      monitorLaunchSubscribersRef.current.delete(subscriber)
    }
  }, [])

  const updateSession = useCallback((updater: (current: OccSessionState) => OccSessionState) => {
    setSession((current) => {
      const next = {
        ...updater(current),
        updatedAt: Date.now(),
      }

      transportRef.current?.publish(next)

      return next
    })
  }, [])

  const resetSession = useCallback((trainingMode: TrainingMode = 'PRACTICE') => {
    clearStoredOccSessions(true)
    const baseSession = createInitialSession(trainingMode)
    const baselineReady = isTrainDemoBaselineSession(baseSession)
    const next = {
      ...baseSession,
      scenarioNotice: {
        text: baselineReady
          ? 'Train demo reset complete. Trains, routes and movement state returned to baseline.'
          : 'Train demo reset requested. Review train baseline state.',
        tone: baselineReady ? 'success' : 'warning',
      } satisfies ScenarioNotice,
      updatedAt: Date.now(),
    }
    sessionRef.current = next
    transportRef.current?.publish(next)
    setSession(next)
  }, [])

  return { registerScreen, requestMonitorPeerLaunch, resetSession, session, subscribeMonitorLaunch, updateSession }
}

function getCurrentRoute(): AppRoute {
  const path = window.location.pathname as AppRoute
  if (
    path === '/login' ||
    path === '/screen/alarms' ||
    path === '/screen/line-map' ||
    path === '/screen/timetable' ||
    path === '/ios' ||
    path === '/ios/modules' ||
    path === '/ios/scenarios' ||
    path === '/ios/assessment' ||
    path === '/session/join' ||
    path === '/guide' ||
    path === '/report'
  ) {
    return path
  }

  return '/'
}

// Routes that should register as active backend participants in OCC-DEMO-001.
const screenRegistrationByRoute: Partial<Record<AppRoute, ScreenRegistration>> = {
  '/ios': { label: 'IOS Trainer Control', role: 'IOS', route: '/ios' },
  '/ios/modules': { label: 'IOS Trainer Modules', role: 'IOS', route: '/ios/modules' },
  '/ios/scenarios': { label: 'Scenario Builder', role: 'IOS', route: '/ios/scenarios' },
  '/report': { label: 'Post-Session Report', role: 'REPORT', route: '/report' },
  '/screen/alarms': { label: 'Monitor 01 - Alarms', role: 'ALARM', route: '/screen/alarms' },
  '/screen/line-map': { label: 'Monitor 02 - Line Map', role: 'LINE_MAP', route: '/screen/line-map' },
  '/screen/timetable': { label: 'Monitor 03 - Timetable', role: 'TIMETABLE', route: '/screen/timetable' },
  '/session/join': { label: 'Session Lobby', role: 'LOBBY', route: '/session/join' },
}

function App() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
  const {
    registerScreen,
    requestMonitorPeerLaunch,
    resetSession,
    session,
    subscribeMonitorLaunch,
    updateSession,
  } = useOccSession()

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const registration = screenRegistrationByRoute[route]

    if (!registration) {
      return undefined
    }

    registerScreen(registration)

    const heartbeat = window.setInterval(() => registerScreen(registration), 15000)

    return () => window.clearInterval(heartbeat)
  }, [registerScreen, route])

  const navigate = (nextRoute: AppRoute) => {
    window.history.pushState(null, '', nextRoute)
    setRoute(nextRoute)
  }

  if (route === '/screen/line-map') {
    return (
      <LineMapScreen
        onNavigate={navigate}
        requestMonitorPeerLaunch={requestMonitorPeerLaunch}
        session={session}
        subscribeMonitorLaunch={subscribeMonitorLaunch}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/screen/alarms') {
    return <AlarmsScreen onNavigate={navigate} session={session} updateSession={updateSession} />
  }

  if (route === '/screen/timetable') {
    return <TimetableScreen onNavigate={navigate} session={session} updateSession={updateSession} />
  }

  if (route === '/ios') {
    return (
      <IosScreen
        onNavigate={navigate}
        resetSession={resetSession}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/ios/modules') {
    return (
      <IosModulesScreen
        onNavigate={navigate}
        resetSession={resetSession}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/ios/scenarios') {
    return (
      <ScenarioBuilderScreen
        onNavigate={navigate}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/ios/assessment') {
    return <AssessmentRubricScreen onNavigate={navigate} session={session} />
  }

  if (route === '/session/join') {
    return (
      <TraineeLobbyScreen
        onNavigate={navigate}
        session={session}
        updateSession={updateSession}
      />
    )
  }

  if (route === '/guide') {
    return <DemoGuideScreen onNavigate={navigate} resetSession={resetSession} session={session} />
  }

  if (route === '/report') {
    return <ReportScreen onNavigate={navigate} session={session} />
  }

  return <LoginPage onNavigate={navigate} resetSession={resetSession} />
}

function LineMapScreen({
  onNavigate,
  requestMonitorPeerLaunch,
  session,
  subscribeMonitorLaunch,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  requestMonitorPeerLaunch: () => string
  session: OccSessionState
  subscribeMonitorLaunch: (subscriber: (request: MonitorLaunchRequest) => void) => () => void
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const [monitorLaunchStatus, setMonitorLaunchStatus] = useState('Peer monitors ready')
  const handledLaunchIdsRef = useRef(new Set<string>())
  const requestedLaunchRef = useRef(false)

  // Monitor 02 is the operator's main control screen, so it can launch the
  // peer monitor layout for first-round vetting.
  const openPeerMonitorWindows = useCallback((targets: MonitorLaunchRequest['targets']) => {
    const monitorConfig: Record<MonitorLaunchRequest['targets'][number], { left: number; name: string; top: number }> = {
      '/screen/alarms': { left: 0, name: 'occ-monitor-1-alarms', top: 0 },
      '/screen/timetable': { left: 180, name: 'occ-monitor-3-timetable', top: 90 },
    }
    const blockedTargets: string[] = []

    targets.forEach((target) => {
      const config = monitorConfig[target]
      const openedWindow = window.open(
        target,
        config.name,
        `popup=yes,width=1280,height=1040,left=${config.left},top=${config.top}`,
      )

      if (!openedWindow) {
        blockedTargets.push(target)
        return
      }

      openedWindow.focus()
    })

    if (blockedTargets.length) {
      setMonitorLaunchStatus('Pop-ups blocked: use button')
      return
    }

    setMonitorLaunchStatus('Alarms + Timetable opened')
  }, [])

  const launchPeerMonitors = useCallback(() => {
    const launchId = requestMonitorPeerLaunch()

    if (launchId) {
      handledLaunchIdsRef.current.add(launchId)
    }

    openPeerMonitorWindows(['/screen/alarms', '/screen/timetable'])
  }, [openPeerMonitorWindows, requestMonitorPeerLaunch])

  useEffect(() => subscribeMonitorLaunch((request) => {
    if (request.originRoute !== '/screen/line-map' || handledLaunchIdsRef.current.has(request.launchId)) {
      return
    }

    handledLaunchIdsRef.current.add(request.launchId)
    openPeerMonitorWindows(request.targets)
  }), [openPeerMonitorWindows, subscribeMonitorLaunch])

  useEffect(() => {
    if (requestedLaunchRef.current) {
      return undefined
    }

    requestedLaunchRef.current = true
    let attempts = 0
    let retryTimer: number | undefined

    const requestLaunch = () => {
      attempts += 1
      const launchId = requestMonitorPeerLaunch()

      if (!launchId && attempts < 10) {
        retryTimer = window.setTimeout(requestLaunch, 120)
      }
    }

    retryTimer = window.setTimeout(requestLaunch, 0)

    return () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [requestMonitorPeerLaunch])

  return (
    <MonitorWorkspace
      extraActions={(
        <>
          <span className="monitor-peer-status">{monitorLaunchStatus}</span>
          <button type="button" onClick={launchPeerMonitors}>Open 01 + 03</button>
        </>
      )}
      monitorLabel="MONITOR 02 - LINE MAP"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Line Map Monitor"
    >
      <MonitorCanvas onNavigate={onNavigate} session={session} updateSession={updateSession} />
    </MonitorWorkspace>
  )
}

function AlarmsScreen({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  return (
    <MonitorWorkspace
      monitorLabel="MONITOR 01 - ALARMS"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Alarm Summary Monitor"
    >
      <AlarmSummaryCanvas onNavigate={onNavigate} session={session} updateSession={updateSession} />
    </MonitorWorkspace>
  )
}

function TimetableScreen({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  return (
    <MonitorWorkspace
      monitorLabel="MONITOR 03 - TIMETABLE"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Traffic Timetable Monitor"
    >
      <TimetableCanvas onNavigate={onNavigate} session={session} updateSession={updateSession} />
    </MonitorWorkspace>
  )
}

function IosScreen({
  onNavigate,
  resetSession,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  return (
    <MonitorWorkspace
      monitorLabel="IOS - TRAINER CONTROL"
      onNavigate={onNavigate}
      session={session}
      title="Instructor Operating Station"
    >
      <IosCanvas
        onNavigate={onNavigate}
        resetSession={resetSession}
        session={session}
        updateSession={updateSession}
      />
    </MonitorWorkspace>
  )
}

function IosCanvas({
  onNavigate,
  resetSession,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  resetSession: (trainingMode?: TrainingMode) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const selectedTrain = session.trains.find((train) => train.id === session.selectedTrainId) ?? session.trains[0]
  const [autoRun, setAutoRun] = useState(false)
  const currentScenario = scenarioSteps[session.scenarioStep] ?? scenarioSteps[0]
  const demoCue = demoCues[session.scenarioStep] ?? demoCues[0]
  const trainingMode = trainingModeDetails[session.trainingMode]
  const cuePrimary = session.trainingMode === 'PRACTICE' ? demoCue.primary : trainingMode.title
  const cueSecondary = session.trainingMode === 'PRACTICE' ? demoCue.secondary : trainingMode.cue
  const completedTasks = scenarioTaskList.filter((task) => session.scenarioTasks[task.id]).length
  const scenarioScore = Math.round((completedTasks / scenarioTaskList.length) * 100)
  const noticeFill = session.scenarioNotice.tone === 'warning'
    ? '#ff0000'
    : session.scenarioNotice.tone === 'success'
      ? '#008000'
      : '#000080'
  const noticeText = session.scenarioNotice.text.length > 68
    ? `${session.scenarioNotice.text.slice(0, 65)}...`
    : session.scenarioNotice.text

  const pushInstructorEvent = (
    trainId: string,
    message: string,
    value: string,
    tone: MonitorAlarmRow['tone'] = 'yellow',
    summaryTone: AlarmSummaryRow['tone'] = tone === 'red' ? 'red' : 'yellow',
  ) => {
    const event = createMonitorEvent(trainId, message, value, tone)

    updateSession((current) => ({
      ...current,
      activeScenario: {
        ...current.activeScenario,
        incident: 'Door fault',
      },
      alarmSummaryRows: [createSummaryEvent(event, summaryTone), ...current.alarmSummaryRows].slice(0, 12),
      eventRows: [event, ...current.eventRows].slice(0, 4),
      scenarioMode: 'RUNNING',
      sessionMeta: updateSessionLifecycle(current.sessionMeta, 'RUNNING'),
      scenarioNotice: {
        text: `Door fault injected for Train ${trainId}. Await alarm acknowledgement.`,
        tone: 'warning',
      },
      scenarioStep: Math.max(current.scenarioStep, 2),
      selectedTrainId: trainId,
      timetableRows: upsertTimetableRow(current.timetableRows, trainId, 'H>'),
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              doorFailureState: 'FAULT_ALARM',
              status: 'HOLD',
            }
          : train
      )),
    }))
  }

  const selectTrainingMode = (nextMode: TrainingMode) => {
    setAutoRun(nextMode === 'PLAYER')
    updateSession((current) => {
      const event = createMonitorEvent('317', `Trainer selected ${trainingModeDetails[nextMode].label} mode`, nextMode, 'yellow')

      return {
        ...current,
        alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        scenarioNotice: {
          text: trainingModeDetails[nextMode].cue,
          tone: 'info',
        },
        trainingMode: nextMode,
      }
    })
  }

  const setTrainStatus = (trainId: string, status: TrainStatus, reason: string, tone: MonitorAlarmRow['tone'] = 'yellow') => {
    const event = createMonitorEvent(trainId, reason, status, tone)
    const taskId: ScenarioTaskId = status === 'RUN' ? 'dispatchTrain' : status === 'WAIT' ? 'setRoute' : 'selectTrain'
    const backendAction: OccSessionAction['type'] = status === 'RUN'
      ? 'DISPATCH_TRAIN'
      : status === 'WAIT'
        ? 'SET_ROUTE'
        : 'SELECT_TRAIN'

    // IOS train-control commands are scored by the backend validator first.
    submitBackendScenarioAction(session, updateSession, {
      detail: `Operator task accepted: ${reason}`,
      source: 'IOS Train Control',
      trainId,
      type: backendAction,
    }, (current) => {
      if (trainId !== '317') {
        return rejectScenarioAction(
          current,
          'Scenario target is Train 317. Select Train 317 for route and dispatch.',
          trainId,
          'IOS Train Control',
        )
      }

      const guard = completeScenarioTask(current, taskId, `Operator task accepted: ${reason}`, 'IOS Train Control')

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event, tone === 'red' ? 'red' : 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        selectedTrainId: trainId,
        lineMap: updateLineMapRouteState(current.lineMap, { id: trainId }, getLineMapRouteStatus(status)),
        timetableRows: upsertTimetableRow(current.timetableRows, trainId, status === 'HOLD' ? 'H>' : status === 'RUN' ? '>' : 'R'),
        trains: current.trains.map((train) => (
          train.id === trainId ? { ...train, status } : train
        )),
      }
    })
  }

  const startScenario = () => {
    setAutoRun(false)
    updateSession((current) => applyScenarioStep({
      ...createInitialSession(current.trainingMode),
      sessionMeta: updateSessionLifecycle(current.sessionMeta, 'RUNNING'),
    }, 1))
  }

  const advanceScenario = useCallback(() => {
    const anticipatedNextStep = Math.min(session.scenarioStep + 1, scenarioSteps.length - 1)
    if (getScenarioStepBlocker(session, anticipatedNextStep)) {
      setAutoRun(false)
    }

    updateSession((current) => {
      const nextStep = Math.min(current.scenarioStep + 1, scenarioSteps.length - 1)
      const blocker = getScenarioStepBlocker(current, nextStep)

      if (blocker) {
        return rejectScenarioAction(current, blocker, '317', 'IOS Scenario Control')
      }

      return applyScenarioStep(current, nextStep)
    })
  }, [session, updateSession])

  const replayScenario = () => {
    setAutoRun(false)
    updateSession((current) => createInitialSession(current.trainingMode))
  }

  const completeScenarioReview = () => {
    setAutoRun(false)
    submitBackendScenarioAction(session, updateSession, {
      detail: 'Scenario review complete. Report is ready.',
      source: 'IOS Trainer Review',
      trainId: '317',
      type: 'COMPLETE_SCENARIO',
    }, (current) => {
      const event = createMonitorEvent('317', 'Scenario complete: Trainer reviewed Train 317 response', 'COMPLETE', 'yellow')
      const guard = completeScenarioTask(
        current,
        'completeScenario',
        'Scenario review complete. Report is ready.',
        'IOS Trainer Review',
      )

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        scenarioMode: 'COMPLETE',
        scenarioStep: scenarioSteps.length - 1,
      }
    })
  }

  const openMonitor = (route: AppRoute, name: string) => {
    window.open(route, name, 'popup=yes,width=1280,height=1040,left=120,top=80')
  }

  useEffect(() => {
    if (!autoRun) {
      return undefined
    }

    if (session.scenarioMode === 'PAUSED' || session.scenarioStep >= scenarioSteps.length - 1) {
      const stopTimer = window.setTimeout(() => setAutoRun(false), 0)

      return () => window.clearTimeout(stopTimer)
    }

    const timer = window.setTimeout(() => {
      advanceScenario()
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [advanceScenario, autoRun, session.scenarioMode, session.scenarioStep])

  return (
    <svg className="occ-monitor-svg" viewBox={`0 0 ${MONITOR_WIDTH} ${MONITOR_HEIGHT}`} role="img" aria-label="Instructor operating station">
      <rect width={MONITOR_WIDTH} height={MONITOR_HEIGHT} fill="#c0c0c0" />
      <rect x="0" y="0" width={MONITOR_WIDTH} height="44" fill="#000080" />
      <text className="svg-ios-title" x="14" y="29">Instructor Operating Station - OCC Scenario Control</text>
      <text className="svg-ios-clock" x="1260" y="28" textAnchor="end">{session.activeScenario.title}  |  {session.trainingMode}  |  {session.cycleMode}</text>

      <IosPanel x={14} y={60} w={396} h={260} title="SCENARIO CONTROL">
        <text className="svg-ios-label" x="34" y="112">Active scenario</text>
        <rect x="34" y="126" width="336" height="32" fill="#ffffff" stroke="#404040" />
        <text className="svg-ios-value" x="44" y="148">{session.scenarioMode} - {session.activeScenario.title}</text>
        <text className="svg-ios-label" x="34" y="174">{currentScenario.text}</text>
        <rect x="34" y="184" width="336" height="46" fill="#ffffcc" stroke="#808000" />
        <text className="svg-ios-cue" x="44" y="203">{cuePrimary}</text>
        <text className="svg-ios-cue" x="44" y="219">{cueSecondary}</text>
        <IosButton x={34} y={242} w={105} label="Start" onClick={startScenario} />
        <IosButton x={148} y={242} w={105} label="Next Step" onClick={advanceScenario} />
        <IosButton x={262} y={242} w={100} label={autoRun ? 'Pause Auto' : 'Auto Run'} onClick={() => setAutoRun((value) => !value)} />
        <IosButton x={34} y={282} w={105} label="Replay" onClick={replayScenario} />
        <IosButton x={148} y={282} w={105} label="Reset Trains" onClick={() => { setAutoRun(false); resetSession(session.trainingMode) }} />
        <IosButton x={262} y={282} w={100} label="Door Fault" onClick={() => pushInstructorEvent('317', 'Trainer injected alarm: Train 317 door fault pending', 'YES', 'red', 'red')} />
      </IosPanel>

      <IosPanel x={430} y={60} w={396} h={250} title="TRAIN CONTROL">
        <text className="svg-ios-label" x="450" y="112">Selected train</text>
        <rect x="450" y="126" width="90" height="46" fill="#aab4c2" stroke="#000" strokeWidth="2" />
        <text className="svg-ios-train" x="495" y="156" textAnchor="middle">{selectedTrain.id}</text>
        <text className="svg-ios-value" x="560" y="142">Service: {selectedTrain.service}</text>
        <text className="svg-ios-value" x="560" y="162">Status: {selectedTrain.status}</text>
        <text className="svg-ios-label" x="450" y="186">Incident: {session.activeScenario.incident}</text>
        <IosButton x={450} y={206} w={100} label="Hold" onClick={() => setTrainStatus(selectedTrain.id, 'HOLD', `Instructor command: Train ${selectedTrain.id} hold`, 'orange')} />
        <IosButton x={562} y={206} w={100} label="Dispatch" onClick={() => setTrainStatus(selectedTrain.id, 'RUN', `Instructor command: Train ${selectedTrain.id} dispatch`, 'yellow')} />
        <IosButton x={674} y={206} w={100} label="Route" onClick={() => setTrainStatus(selectedTrain.id, 'WAIT', `Instructor command: Train ${selectedTrain.id} route selected`, 'yellow')} />
        <text className="svg-ios-label" x="450" y="260">Training mode</text>
        <IosButton x={450} y={272} w={100} active={session.trainingMode === 'PRACTICE'} label="Practice" onClick={() => selectTrainingMode('PRACTICE')} />
        <IosButton x={562} y={272} w={100} active={session.trainingMode === 'ASSESSMENT'} label="Assess" onClick={() => selectTrainingMode('ASSESSMENT')} />
        <IosButton x={674} y={272} w={100} active={session.trainingMode === 'PLAYER'} label="Player" onClick={() => selectTrainingMode('PLAYER')} />
      </IosPanel>

      <IosPanel x={846} y={60} w={414} h={250} title="MONITOR LINKS">
        <IosLinkStatus x={868} y={116} label="Alarms monitor" route="/screen/alarms" onOpen={openMonitor} />
        <IosLinkStatus x={868} y={166} label="Line map monitor" route="/screen/line-map" onOpen={openMonitor} />
        <IosLinkStatus x={868} y={216} label="Timetable monitor" route="/screen/timetable" onOpen={openMonitor} />
        <IosButton x={868} y={258} w={112} label="Report" onClick={() => onNavigate('/report')} />
        <IosButton x={992} y={258} w={112} label="Complete" onClick={completeScenarioReview} />
        <text className="svg-ios-label" x="1118" y="278">Updated: {new Date(session.updatedAt).toLocaleTimeString()}</text>
      </IosPanel>

      <IosPanel x={14} y={330} w={580} h={330} title="OPERATOR CHECKLIST">
        <rect x="34" y="348" width="526" height="24" fill={session.scenarioNotice.tone === 'warning' ? '#fff0f0' : '#f8f8f8'} stroke={noticeFill} />
        <text className="svg-ios-notice" x="44" y="365" fill={noticeFill}>NOTICE: {noticeText}</text>
        <text className="svg-ios-label" x="34" y="394">Scenario progress</text>
        <rect x="164" y="380" width="290" height="20" fill="#ffffff" stroke="#000000" />
        <rect x="166" y="382" width={Math.max(0, Math.min(286, scenarioScore * 2.86))} height="16" fill={scenarioScore === 100 ? '#00c800' : '#ffff00'} />
        <text className="svg-ios-value" x="470" y="395">{scenarioScore}%</text>
        {scenarioTaskList.map((task, index) => {
          const complete = session.scenarioTasks[task.id]
          const y = 438 + index * 42

          return (
            <g key={task.id}>
              <rect x="34" y={y - 24} width="526" height="34" fill={complete ? '#d8ffd8' : '#ffffff'} stroke="#808080" />
              <rect x="48" y={y - 16} width="16" height="16" fill={complete ? '#00c800' : '#c0c0c0'} stroke="#000" />
              {complete && <text className="svg-ios-value" x="50" y={y - 3}>OK</text>}
              <text className="svg-ios-value" x="78" y={y - 4}>{task.label}</text>
              <text className="svg-ios-label" x="380" y={y - 4}>{task.monitor}</text>
            </g>
          )
        })}
      </IosPanel>

      <IosPanel x={614} y={330} w={646} h={330} title="TRAIN LIST">
        {session.trains.map((train, index) => (
          <g
            className="svg-clickable"
            onClick={() => submitBackendScenarioAction(session, updateSession, {
              detail: train.id === '317'
                ? 'Train 317 selected. Acknowledge alarm before route.'
                : `Train ${train.id} selected. Active drill target remains Train 317.`,
              source: 'IOS Train List',
              trainId: train.id,
              type: 'SELECT_TRAIN',
            }, (current) => ({
              ...current,
              scenarioNotice: train.id === '317'
                ? { text: 'Train 317 selected. Acknowledge alarm before route.', tone: 'info' }
                : { text: 'Scenario target is Train 317.', tone: 'warning' },
              scenarioTasks: train.id === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
              selectedTrainId: train.id,
            }))}
            transform={`translate(638 ${380 + index * 34})`}
            key={train.id}
          >
            <rect width="526" height="28" fill={train.id === session.selectedTrainId ? '#000080' : '#ffffff'} stroke="#808080" />
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="14" y="19">TRN {train.id}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="120" y="19">{train.service}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="220" y="19">{train.status}</text>
            <text className={train.id === session.selectedTrainId ? 'svg-ios-selected-row' : 'svg-ios-row'} x="330" y="19">X {Math.round(train.x)}</text>
          </g>
        ))}
      </IosPanel>

      <IosPanel x={14} y={682} w={580} h={244} title="SCENARIO TIMELINE">
        {scenarioSteps.map((step, index) => (
          <IosTimelineStep
            x={38}
            y={734 + index * 30}
            active={session.scenarioStep >= index}
            current={session.scenarioStep === index}
            label={step.label}
            text={`${step.title}: ${step.text}`}
            key={step.label}
          />
        ))}
      </IosPanel>

      <rect x="614" y="682" width="646" height="244" fill="#b8b8b8" stroke="#ffffff" />
      <text className="svg-ios-panel-title" x="630" y="710">Live Event Feed</text>
      {session.eventRows.map((row, index) => (
        <g transform={`translate(630 ${730 + index * 42})`} key={`${row.time}-${row.message}`}>
          <rect width="606" height="34" fill={row.tone === 'red' ? '#ff0000' : row.tone === 'orange' ? '#ff9900' : '#ffff00'} stroke="#000" />
          <text className="svg-ios-feed" x="12" y="22">{row.time}</text>
          <text className="svg-ios-feed" x="150" y="22">{row.asset}</text>
          <text className="svg-ios-feed" x="330" y="22">{row.value}</text>
          <text className="svg-ios-feed" x="420" y="22">{row.message.slice(0, 26)}</text>
        </g>
      ))}

      <CommonFooterSvg active="ADMIN" leftMode="Train" status={`${trainingMode.label} | IOS TRN ${selectedTrain.id} ${selectedTrain.status}`} />
    </svg>
  )
}

function IosPanel({
  children,
  h,
  title,
  w,
  x,
  y,
}: {
  children: ReactNode
  h: number
  title: string
  w: number
  x: number
  y: number
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#c0c0c0" stroke="#ffffff" strokeWidth="2" />
      <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill="none" stroke="#808080" />
      <rect x={x + 8} y={y + 8} width={w - 16} height="26" fill="#000080" />
      <text className="svg-ios-panel-title" x={x + 18} y={y + 27}>{title}</text>
      {children}
    </g>
  )
}

function IosButton({
  active,
  label,
  onClick,
  w,
  x,
  y,
}: {
  active?: boolean
  label: string
  onClick: () => void
  w: number
  x: number
  y: number
}) {
  return (
    <g className="svg-clickable" onClick={onClick} transform={`translate(${x} ${y})`}>
      <rect width={w} height="32" fill={active ? '#ffff00' : '#c0c0c0'} stroke="#ffffff" strokeWidth="2" />
      <rect x="2" y="2" width={w - 4} height="28" fill="none" stroke="#404040" />
      <text className="svg-ios-button" x={w / 2} y="21" textAnchor="middle">{label}</text>
    </g>
  )
}

function IosLinkStatus({
  label,
  onOpen,
  route,
  x,
  y,
}: {
  label: string
  onOpen: (route: AppRoute, name: string) => void
  route: AppRoute
  x: number
  y: number
}) {
  return (
    <g>
      <circle cx={x + 8} cy={y - 5} r="7" fill="#00c800" stroke="#006000" />
      <text className="svg-ios-value" x={x + 24} y={y}>{label}: ONLINE</text>
      <IosButton x={x + 230} y={y - 22} w={112} label="Open" onClick={() => onOpen(route, label)} />
    </g>
  )
}

function IosTimelineStep({
  active,
  current,
  label,
  text,
  x = 638,
  y,
}: {
  active: boolean
  current?: boolean
  label: string
  text: string
  x?: number
  y: number
}) {
  return (
    <g>
      <rect x={x} y={y - 22} width="532" height="26" fill={current ? '#ffffcc' : active ? '#ffffff' : '#a8a8a8'} stroke={current ? '#000080' : '#808080'} strokeWidth={current ? 2 : 1} />
      <rect x={x + 12} y={y - 15} width="12" height="12" fill={current ? '#ffff00' : active ? '#00c800' : '#808080'} stroke="#000" />
      <text className="svg-ios-value" x={x + 34} y={y - 4}>{label}</text>
      <text className="svg-ios-value" x={x + 88} y={y - 4}>{text}</text>
    </g>
  )
}

function ScadaDomSurface({
  children,
  className = '',
  title,
}: {
  children: ReactNode
  className?: string
  title: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const root = rootRef.current

    if (!root) {
      return
    }

    const updateScale = () => {
      setScale(root.clientWidth > 0 ? root.clientWidth / MONITOR_WIDTH : 1)
    }
    const observer = new ResizeObserver(updateScale)

    updateScale()
    observer.observe(root)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      aria-label={title}
      className={`scada-dom-root ${className}`}
      ref={rootRef}
      role="img"
      style={{ height: MONITOR_HEIGHT * scale }}
      title={title}
    >
      <div className="scada-dom-surface" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}

function ScadaDomButton({
  className = '',
  disabled = false,
  icon,
  label,
  onClick,
  style,
}: {
  className?: string
  disabled?: boolean
  icon?: string
  label: string
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <button
      className={`scada-dom-button ${className}`}
      disabled={disabled}
      onClick={onClick}
      style={style}
      type="button"
    >
      {icon ? (
        <>
          <img alt="" draggable={false} src={icon} />
          <span>{label}</span>
        </>
      ) : label}
    </button>
  )
}

const DOM_STATIONS = ['HBF', 'OTP', 'CNT', 'CQY', 'DBG', 'LTI', 'FRP', 'BNK', 'PTP', 'WLH', 'SER', 'KVN', 'HGN', 'BGK', 'SKG', 'PGL', 'PGC']

function ScadaStationStripDom({ top = 0 }: { top?: number }) {
  return (
    <div className="scada-station-strip" style={{ top }}>
      <div className="scada-station-line" />
      {DOM_STATIONS.map((station, index) => (
        <div className="scada-station" key={station} style={{ left: 30 + index * 64 }}>
          <span>{station}</span>
          <i />
        </div>
      ))}
      <div className="scada-station-depot">
        <span>O C C</span>
        <span>DEPOT</span>
      </div>
      <div className="scada-station-overall">OVERALL</div>
    </div>
  )
}

const DOM_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDomClock(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')

  return {
    date: `${DOM_WEEKDAY_LABELS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  }
}

function ScadaDomClock() {
  const [now, setNow] = useState(() => new Date())
  const display = formatDomClock(now)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="scada-dom-clock" title={`Current workstation time: ${display.time} ${display.date}`}>
      <span>{display.time}</span>
      <span>{display.date}</span>
    </div>
  )
}

function FooterIconStrip({
  activeTool,
  compact = false,
  onSelect,
}: {
  activeTool: string | null
  compact?: boolean
  onSelect: (tool: string, label: string) => void
}) {
  const iconButtons = [
    { icon: footerMoveArrowsIcon, label: 'Move view', tool: 'MOVE', x: 550 },
    { icon: footerDocumentSearchIcon, label: 'Search document', tool: 'DOCUMENT SEARCH', x: 596 },
    { icon: footerWindowPairIcon, label: 'Open sheet', tool: 'SHEET', x: 642 },
    { icon: footerWindowPanelIcon, label: 'Open panel', tool: 'PANEL', x: 688 },
    { icon: footerNetworkGearsIcon, label: 'Comms tools', tool: 'COMMS TOOLS', x: 746 },
    { icon: footerCardIcon, label: 'Card', tool: 'CARD', x: 792 },
    { icon: footerDeviceArrowIcon, label: 'Device control', tool: 'DEVICE', x: 838 },
  ]

  return (
    <div className="line-map-footer-icon-row" style={compact ? { top: 6 } : undefined}>
      {iconButtons.map((item) => (
        <button
          aria-pressed={activeTool === item.tool}
          className={activeTool === item.tool ? 'is-selected' : undefined}
          key={item.tool}
          onClick={() => onSelect(item.tool, item.label)}
          style={{ left: item.x }}
          title={item.label}
          type="button"
        >
          <img alt="" draggable={false} src={item.icon} />
        </button>
      ))}
    </div>
  )
}

export function CommonFooterDom({ active, leftMode, status, compact = false }: { active: string; leftMode: string; status: string; compact?: boolean }) {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [footerNote, setFooterNote] = useState('')
  const primaryButtons = [
    { icon: footerLayoutIcon, label: 'LAYOUT', tool: 'LAYOUT', width: 108, x: 1 },
    { icon: footerCommandIcon, label: 'COMMAND', tool: 'COMMAND', width: 108, x: 129 },
    { icon: footerPowerIcon, label: 'POWER', tool: 'POWER', width: 108, x: 257 },
    { icon: footerEcsIcon, label: 'E C S', tool: 'E C S', width: 108, x: 385 },
    { icon: footerTrafficIcon, label: 'TRAFFIC', tool: 'TRAFFIC', width: 108, x: 513 },
    { icon: footerComsIcon, label: 'COMS', tool: 'COMS', width: 108, x: 641 },
    { icon: footerUtilityIcon, label: 'UTILITY', tool: 'UTILITY', width: 108, x: 769 },
    { icon: footerAdminIcon, label: 'ADMIN', tool: 'ADMIN', width: 108, x: 897 },
  ]
  const navButtons = [
    { icon: footerNavLayoutLeftIcon, label: 'Previous layout page', tool: 'NAV LAYOUT LEFT', width: 44, x: 1029 },
    { icon: footerNavLayoutRightIcon, label: 'Next layout page', tool: 'NAV LAYOUT RIGHT', width: 47, x: 1073 },
    { icon: footerNavWindowLeftIcon, label: 'Previous window', tool: 'NAV WINDOW LEFT', width: 44, x: 1132 },
    { icon: footerNavWindowRightIcon, label: 'Next window', tool: 'NAV WINDOW RIGHT', width: 47, x: 1176 },
  ]
  const secondaryButtons = [
    { x: 31, w: 58, label: 'Point No.' },
    { x: 96, w: 58, label: 'Track No.' },
    { x: 165, w: 60, label: 'FB No.' },
    { x: 236, w: 62, label: 'Signal No.' },
    { x: 305, w: 60, label: 'Train' },
    { x: 367, w: 84, label: 'NorthBound' },
    { x: 451, w: 83, label: 'SouthBound' },
  ]
  const statusTool = activeTool ?? active
  const statusMode = activeMode ?? leftMode

  return (
    <div className={`scada-dom-footer${compact ? ' scada-dom-footer--compact' : ''}`}>
      {!compact && primaryButtons.map((button) => (
        <ScadaDomButton
          className={`line-map-footer-primary-button${button.tool === activeTool ? ' is-selected' : ''}`}
          icon={button.icon}
          key={button.tool}
          label={button.label}
          onClick={() => {
            setActiveTool(button.tool)
            setFooterNote(`${button.label} toolbar selected`)
          }}
          style={{ left: button.x, top: 8, width: button.width }}
        />
      ))}
      {!compact && (
        <>
          <div className="line-map-footer-nav-row">
            {navButtons.map((button) => (
              <button
                aria-label={button.label}
                aria-pressed={activeTool === button.tool}
                className={activeTool === button.tool ? 'is-selected' : undefined}
                key={button.tool}
                onClick={() => {
                  setActiveTool(button.tool)
                  setFooterNote(button.label)
                }}
                style={{ left: button.x, width: button.width }}
                title={button.label}
                type="button"
              >
                <img alt="" draggable={false} src={button.icon} />
              </button>
            ))}
          </div>
          <button
            aria-label="Help"
            aria-pressed={activeTool === 'HELP'}
            className={`line-map-footer-help-button${activeTool === 'HELP' ? ' is-selected' : ''}`}
            onClick={() => {
              setActiveTool('HELP')
              setFooterNote('Help')
            }}
            type="button"
          >
            <img alt="" draggable={false} src={footerHelpIcon} />
          </button>
        </>
      )}
      {secondaryButtons.map((button) => (
        <ScadaDomButton
          className={[
            'scada-dom-footer-mode-button',
            (button.label === 'NorthBound' || button.label === 'SouthBound' ? 'scada-dom-footer-speed-button' : ''),
            (button.label === activeMode ? 'is-selected' : ''),
          ].filter(Boolean).join(' ')}
          key={button.label}
          label={button.label}
          onClick={() => {
            setActiveMode(button.label)
            setFooterNote(`${button.label} mode selected`)
          }}
          style={{ left: button.x, top: 54, width: button.w }}
        />
      ))}
      <div className="scada-dom-footer-speed-label">Temporary Speed Restriction</div>
      <FooterIconStrip
        activeTool={activeTool}
        compact={compact}
        onSelect={(tool, label) => {
          setActiveTool(tool)
          setFooterNote(label)
        }}
      />
      <button
        aria-label="Print"
        aria-pressed={activeTool === 'PRINTER'}
        className={`line-map-footer-print${activeTool === 'PRINTER' ? ' is-selected' : ''}`}
        onClick={() => {
          setActiveTool('PRINTER')
          setFooterNote('Printer')
        }}
        style={compact ? { top: 7 } : undefined}
        title="Print"
        type="button"
      >
        <img alt="" draggable={false} src={footerPrinterIcon} />
      </button>
      <div className="scada-dom-footer-status">
        <span>{footerNote || status}</span>
        <span>{footerNote ? `${statusTool} / ${statusMode}` : '[ TSR1 ] @ OCC'}</span>
      </div>
      <ScadaDomClock />
    </div>
  )
}

function AlarmSummaryCanvas({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const rows = session.alarmSummaryRows
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'Archives' | 'Events' | 'Alarms'>('Alarms')
  const [statusNote, setStatusNote] = useState('Live alarm summary ready')
  const seedRowKeys = new Set(alarmSummaryRows.map((row) => `${row.timestamp}|${row.asset}|${row.description}`))
  const liveRows = rows
    .map((row, originalIndex) => ({ originalIndex, row }))
    .filter(({ row }) => !seedRowKeys.has(`${row.timestamp}|${row.asset}|${row.description}`))
  const visibleRows = liveRows.slice(0, 20)
  const selectedEntry = selectedIndex >= 0 ? liveRows[selectedIndex] : undefined
  const selectedRow = selectedEntry?.row
  const notAcknowledged = liveRows.filter(({ row }) => row.ack === 'Y').length
  const liveRowIndexes = new Set(liveRows.map(({ originalIndex }) => originalIndex))

  const rowToneClass = (tone: AlarmSummaryRow['tone']) => {
    if (tone === 'red') {
      return 'is-red'
    }

    if (tone === 'grey') {
      return 'is-grey'
    }

    return 'is-yellow'
  }

  const selectAlarmRow = (index: number) => {
    const entry = liveRows[index]

    if (!entry) {
      setSelectedIndex(-1)
      setStatusNote('No live alarm row at this position')
      return
    }

    setSelectedIndex(index)
    setStatusNote(`Live alarm row ${index + 1} selected: ${entry.row.asset}`)
  }

  const acknowledgeSelected = () => {
    if (!selectedRow || selectedEntry === undefined) {
      setStatusNote('No live alarm selected for acknowledgement')
      return
    }

    submitBackendScenarioAction(session, updateSession, {
      detail: `Alarm acknowledgement accepted for ${selectedRow.asset}.`,
      source: 'Monitor 01 Alarms',
      trainId: '317',
      type: 'ACK_ALARM',
    }, (current) => {
      const guard = completeScenarioTask(current, 'ackAlarm', 'Alarm acknowledgement accepted.', 'Monitor 01 Alarms')

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: current.alarmSummaryRows.map((row, index) => (
          index === selectedEntry.originalIndex ? { ...row, ack: 'N', tone: 'grey', value: row.value === 'NO ACK' ? 'ACK' : row.value } : row
        )),
      }
    }, (accepted, reason) => {
      setStatusNote(accepted ? `Acknowledged selected alarm: ${selectedRow.asset}` : reason ?? 'Alarm acknowledgement rejected')
    })
  }

  const acknowledgeAll = () => {
    if (liveRows.length === 0) {
      setStatusNote('No live alarm rows to acknowledge')
      return
    }

    submitBackendScenarioAction(session, updateSession, {
      detail: 'All visible live alarms acknowledged.',
      source: 'Monitor 01 Alarms',
      trainId: '317',
      type: 'ACK_ALARM',
    }, (current) => {
      const guard = completeScenarioTask(current, 'ackAlarm', 'All visible live alarms acknowledged.', 'Monitor 01 Alarms')

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: current.alarmSummaryRows.map((row, index) => (
          liveRowIndexes.has(index)
            ? {
                ...row,
                ack: 'N',
                tone: row.tone === 'red' ? 'red' : 'grey',
                value: row.value === 'NO ACK' ? 'ACK' : row.value,
              }
            : row
        )),
      }
    }, (accepted, reason) => {
      setStatusNote(accepted ? 'Acknowledged all visible live alarms' : reason ?? 'Alarm acknowledgement rejected')
    })
  }

  const cycleAlarmFilter = () => {
    const tabs: Array<typeof activeTab> = ['Alarms', 'Events', 'Archives']
    const nextTab = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length]

    setActiveTab(nextTab)
    setStatusNote(`Filter applied: ${nextTab}`)
  }

  const printAlarmSummary = () => {
    setStatusNote('Print requested for live alarm summary')
    window.print()
  }

  return (
    <ScadaDomSurface
      className="scada-dom-root--alarms"
      title={`${activeTab} | ${statusNote} | ${selectedRow ? selectedRow.asset : 'No live alarm selected'} | ${notAcknowledged} pending`}
    >
      <ScadaStationStripDom />
      <section className="alarm-dom-panel">
        <div className="alarm-dom-strip">Alarm summary display (filter: none)</div>
        <div className="alarm-dom-tabs" role="tablist">
          {(['Archives', 'Events', 'Alarms'] as const).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'is-active' : ''}
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setStatusNote(`${tab} tab selected`)
              }}
              role="tab"
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="alarm-dom-controls">
          <label>Total <output>{liveRows.length}</output></label>
          <label>Not Acknowledged <output>{notAcknowledged}</output></label>
          <ScadaDomButton label="Ack. all" onClick={acknowledgeAll} />
          <ScadaDomButton label="Ack. selection" onClick={acknowledgeSelected} />
          <ScadaDomButton label="Unselect alarms" onClick={() => { setSelectedIndex(-1); setStatusNote('Alarm selection cleared') }} />
          <ScadaDomButton label="Help" onClick={() => setStatusNote('Select a live row, then acknowledge or inspect it.')} />
          <ScadaDomButton label="Filter..." onClick={cycleAlarmFilter} />
          <ScadaDomButton label="Print" onClick={printAlarmSummary} />
          <ScadaDomButton label="Close" onClick={() => onNavigate('/')} />
          <label className="alarm-dom-sort">Sort column <output>TIMESTAMP - Descending</output></label>
        </div>
        <div className="alarm-dom-table" role="table">
          <div className="alarm-dom-row alarm-dom-row--head" role="row">
            <span>Ack</span>
            <span>AVL</span>
            <span>MMS</span>
            <span>TIMESTAMP</span>
            <span>ASSET</span>
            <span>DESCRIPTION</span>
            <span>VALUE</span>
          </div>
          {Array.from({ length: 20 }).map((_, index) => {
            const entry = visibleRows[index]

            if (!entry) {
              return <div className="alarm-dom-row alarm-dom-row--empty" key={`empty-${index}`} role="row" />
            }

            const isSelected = liveRows[selectedIndex]?.originalIndex === entry.originalIndex

            return (
              <button
                aria-pressed={isSelected}
                className={`alarm-dom-row alarm-dom-row--data ${rowToneClass(entry.row.tone)} ${isSelected ? 'is-selected' : ''}`}
                key={`${entry.originalIndex}-${entry.row.timestamp}-${entry.row.asset}-${entry.row.description}`}
                onClick={() => selectAlarmRow(index)}
                role="row"
                type="button"
              >
                <span>{entry.row.ack}</span>
                <span>{entry.row.avl}</span>
                <span>{entry.row.mms}</span>
                <span>{entry.row.timestamp}</span>
                <span>{entry.row.asset}</span>
                <span>{entry.row.description}</span>
                <span>{entry.row.value}</span>
              </button>
            )
          })}
          <div className="scada-dom-scrollbar scada-dom-scrollbar--alarm">
            <i />
          </div>
        </div>
        {liveRows.length === 0 ? (
          <div className="alarm-dom-empty">No live alarm rows yet. Confirm a command on Monitor 02 to populate this table.</div>
        ) : null}
        <div className="alarm-dom-status">{statusNote}</div>
      </section>
      <ScadaFooter active="TRAFFIC" leftMode="Train" status="MNADZRULS" />
    </ScadaDomSurface>
  )
}

function TimetableCanvas({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const rows = session.timetableRows
  const tableRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [direction, setDirection] = useState<'NB' | 'SB'>('NB')
  const [scrollState, setScrollState] = useState({ clientHeight: 0, max: 0, scrollHeight: 0, top: 0 })
  const loadedTimeTableName = 'NEL_OTES_Weekday_03'
  const [actionNote, setActionNote] = useState('')
  const selectedRowIndex = rows.length > 0 ? Math.min(selectedIndex, rows.length - 1) : -1
  const selectedRow = selectedRowIndex >= 0 ? rows[selectedRowIndex] : undefined
  const tripActions = ['Service cancellation', 'Service restoration', 'Shift trips', 'Trip interruption', 'Trip modification', 'Creation of additional trips']
  const scrollbarHeight = 286
  const scrollbarButtonSize = 16
  const scrollbarTrackHeight = scrollbarHeight - scrollbarButtonSize * 2
  const scrollbarThumbHeight = scrollState.max > 0
    ? Math.max(38, Math.round(scrollbarTrackHeight * (scrollState.clientHeight / Math.max(scrollState.scrollHeight, 1))))
    : 106
  const scrollbarThumbTravel = Math.max(0, scrollbarTrackHeight - scrollbarThumbHeight)
  const scrollbarThumbTop = scrollbarButtonSize + (
    scrollState.max > 0 ? Math.round(scrollbarThumbTravel * (scrollState.top / scrollState.max)) : 0
  )

  const updateTimetableScroll = useCallback(() => {
    const table = tableRef.current

    if (!table) {
      return
    }

    setScrollState({
      clientHeight: table.clientHeight,
      max: Math.max(0, table.scrollHeight - table.clientHeight),
      scrollHeight: table.scrollHeight,
      top: table.scrollTop,
    })
  }, [])

  useEffect(() => {
    updateTimetableScroll()
  }, [rows.length, updateTimetableScroll])


  const scrollTimetableBy = (delta: number) => {
    const table = tableRef.current

    if (!table) {
      return
    }

    table.scrollTop = Math.max(0, Math.min(scrollState.max, table.scrollTop + delta))
    updateTimetableScroll()
  }

  const startTimetableThumbDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (scrollState.max <= 0 || scrollbarThumbTravel <= 0) {
      return
    }

    const table = tableRef.current

    if (!table) {
      return
    }

    const startY = event.clientY
    const startTop = table.scrollTop

    const moveThumb = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      table.scrollTop = Math.max(0, Math.min(scrollState.max, startTop + (deltaY / scrollbarThumbTravel) * scrollState.max))
      updateTimetableScroll()
    }

    const stopDrag = () => {
      window.removeEventListener('pointermove', moveThumb)
      window.removeEventListener('pointerup', stopDrag)
    }

    window.addEventListener('pointermove', moveThumb)
    window.addEventListener('pointerup', stopDrag)
  }

  const selectTimetableRow = (index: number) => {
    setSelectedIndex(index)
    const row = rows[index]

    if (row) {
      submitBackendScenarioAction(session, updateSession, {
        detail: row.train === '317'
          ? 'Train 317 timetable row selected.'
          : `Train ${row.train} timetable row selected. Active drill target remains Train 317.`,
        source: 'Monitor 03 Timetable',
        trainId: row.train,
        type: 'SELECT_TRAIN',
      }, (current) => ({
        ...current,
        scenarioNotice: row.train === '317'
          ? { text: 'Train 317 timetable row selected.', tone: 'info' }
          : { text: 'Scenario target is Train 317.', tone: 'warning' },
        scenarioTasks: row.train === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
        selectedTrainId: row.train,
      }))
    }
  }

  const setDirectionFilter = (nextDirection: 'NB' | 'SB') => {
    setDirection(nextDirection)
    setActionNote(`Direction filter changed to ${nextDirection}`)
  }

  const applyTripAction = (action: string) => {
    if (!selectedRow) {
      setActionNote('No timetable row selected')
      return
    }

    const actionMeta: Record<string, { state: string; status: TrainStatus; tone: MonitorAlarmRow['tone']; value: string }> = {
      'Service cancellation': { state: 'C>', status: 'HOLD', tone: 'red', value: 'CANCELLED' },
      'Service restoration': { state: '>', status: 'RUN', tone: 'yellow', value: 'RESTORED' },
      'Shift trips': { state: 'S>', status: 'WAIT', tone: 'yellow', value: 'SHIFTED' },
      'Trip interruption': { state: 'H>', status: 'HOLD', tone: 'orange', value: 'INTERRUPT' },
      'Trip modification': { state: 'M>', status: 'WAIT', tone: 'yellow', value: 'MODIFIED' },
      'Creation of additional trips': { state: 'A>', status: 'WAIT', tone: 'yellow', value: 'ADDED' },
    }
    const meta = actionMeta[action] ?? actionMeta['Trip modification']
    const taskId: ScenarioTaskId = action === 'Service restoration' ? 'dispatchTrain' : 'setRoute'
    const event = createMonitorEvent(
      selectedRow.train,
      `Timetable ${action.toLowerCase()}: Train ${selectedRow.train}`,
      meta.value,
      meta.tone,
    )

    submitBackendScenarioAction(session, updateSession, {
      detail: `${action} accepted for Train ${selectedRow.train}.`,
      source: 'Monitor 03 Timetable',
      trainId: selectedRow.train,
      type: taskId === 'dispatchTrain' ? 'DISPATCH_TRAIN' : 'SET_ROUTE',
    }, (current) => {
      const guard = completeScenarioTask(
        current,
        taskId,
        `${action} accepted for Train ${selectedRow.train}.`,
        'Monitor 03 Timetable',
      )

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: [createSummaryEvent(event, meta.tone === 'red' ? 'red' : 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        selectedTrainId: selectedRow.train,
        lineMap: updateLineMapRouteState(current.lineMap, { id: selectedRow.train }, getLineMapRouteStatus(meta.status)),
        timetableRows: current.timetableRows.map((row, index) => (
          index === selectedRowIndex ? { ...row, state: meta.state } : row
        )),
        trains: current.trains.map((train) => (
          train.id === selectedRow.train ? { ...train, status: meta.status } : train
        )),
      }
    }, (accepted, reason) => {
      setActionNote(accepted ? `${action}: Train ${selectedRow.train} schedule ${selectedRow.sched}` : reason ?? 'Timetable action rejected')
    })
  }

  const printTimetable = () => {
    setActionNote('Print requested for traffic current timetable')
    window.print()
  }

  const renderTripButton = (label: string) => (
    <ScadaDomButton
      className="timetable-dom-trip-button"
      key={label}
      label={label}
      onClick={() => applyTripAction(label)}
    />
  )

  return (
    <ScadaDomSurface
      className="scada-dom-root--timetable"
      title={`${actionNote || `Loaded time table ${loadedTimeTableName}`} | ${selectedRow ? `TRN ${selectedRow.train} ${direction}` : 'TRN --'}`}
    >
      <div className="timetable-dom-title-strip">Traffic current time table</div>
      <section className="timetable-dom-panel">
        <div className="timetable-dom-filters">
          <label>
            <span>Loaded time table</span>
            <output>{loadedTimeTableName}</output>
          </label>
          <label>
            <span>Station</span>
            <select value="SKG" onChange={() => setActionNote('Station SKG selected')}>
              <option value="SKG">SKG</option>
            </select>
          </label>
          <fieldset>
            <legend>Direction</legend>
            <label><input checked={direction === 'NB'} onChange={() => setDirectionFilter('NB')} type="radio" /> NB</label>
            <label><input checked={direction === 'SB'} onChange={() => setDirectionFilter('SB')} type="radio" /> SB</label>
          </fieldset>
        </div>
        <div className="timetable-dom-headings">
          <span className="origin">ORIGIN</span>
          <span className="selected">SELECTED STATION</span>
          <span className="destination">DESTINATION</span>
        </div>
        <div className="timetable-dom-table" onScroll={updateTimetableScroll} ref={tableRef} role="table">
          <div className="timetable-dom-row timetable-dom-row--head" role="row">
            <span>Stat.</span>
            <span>Train<br />#</span>
            <span>Sched.<br />#</span>
            <span>Point</span>
            <span>Time</span>
            <span>Manoeuvre before</span>
            <span>Point</span>
            <span>Time</span>
            <span>Dwell</span>
            <span>Run</span>
            <span>Point</span>
            <span>Time</span>
            <span>Manoeuvre after</span>
            <span>Rev.</span>
            <span>Speed<br />inc.</span>
            <span>Min.<br />dwell</span>
            <span>Crew<br />#</span>
          </div>
          {rows.map((row, index) => (
            <button
              aria-pressed={selectedRowIndex === index}
              className={`timetable-dom-row timetable-dom-row--data ${selectedRowIndex === index ? 'is-selected' : ''}`}
              key={`${row.train}-${row.sched}-${index}`}
              onClick={() => selectTimetableRow(index)}
              role="row"
              type="button"
            >
              <span>{row.state}</span>
              <span>{row.train}</span>
              <span>{row.sched}</span>
              <span>{row.originPoint}</span>
              <span>{row.originTime}</span>
              <span>-</span>
              <span>{row.stationPoint}</span>
              <span>{row.stationTime}</span>
              <span>{row.dwell}</span>
              <span>{row.run}</span>
              <span>{row.destinationPoint}</span>
              <span>{row.destinationTime}</span>
              <span>-</span>
              <span>{row.revision}</span>
              <span>{row.speed}</span>
              <span />
              <span />
            </button>
          ))}
        </div>
        <div className="timetable-dom-custom-scrollbar" aria-label="Timetable vertical scroll">
          <button
            aria-label="Scroll timetable up"
            className="timetable-dom-scroll-button timetable-dom-scroll-button--up"
            onClick={() => scrollTimetableBy(-28)}
            type="button"
          />
          <button
            aria-label="Drag timetable scroll position"
            className="timetable-dom-scroll-thumb"
            onPointerDown={startTimetableThumbDrag}
            style={{ height: scrollbarThumbHeight, top: scrollbarThumbTop }}
            type="button"
          />
          <button
            aria-label="Scroll timetable down"
            className="timetable-dom-scroll-button timetable-dom-scroll-button--down"
            onClick={() => scrollTimetableBy(28)}
            type="button"
          />
        </div>
        <div className="timetable-dom-actions">
          {tripActions.map(renderTripButton)}
        </div>
        <ScadaDomButton className="timetable-dom-help" label="Help" onClick={() => setActionNote('Help: select a train row, then apply a timetable action')} />
        <ScadaDomButton className="timetable-dom-print" label="Print" onClick={printTimetable} />
        <ScadaDomButton className="timetable-dom-close" label="Close" onClick={() => onNavigate('/')} />
      </section>
      <ScadaFooter active="TRAFFIC" leftMode="FB No." status="MNADZRULS" compact />
    </ScadaDomSurface>
  )
}
function CommonFooterSvg({ active, leftMode, status }: { active: string; leftMode: string; status: string }) {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [footerNote, setFooterNote] = useState('')
  const primaryButtons = ['LAYOUT', 'COMMAND', 'POWER', 'E C S', 'TRAFFIC', 'COMS', 'UTILITY', 'ADMIN']
  const secondaryButtons = [
    { x: 30, w: 60, label: 'Point No.' },
    { x: 96, w: 58, label: 'Track No.' },
    { x: 164, w: 62, label: 'FB No.' },
    { x: 234, w: 62, label: 'Signal No.' },
    { x: 306, w: 58, label: 'Train' },
    { x: 370, w: 80, label: 'NorthBound' },
    { x: 452, w: 80, label: 'SouthBound' },
  ]

  const selectedTool = activeTool ?? active
  const selectedMode = activeMode ?? leftMode

  return (
    <g transform="translate(0 926)">
      <rect width={MONITOR_WIDTH} height="93" fill="#b8c7dc" />
      <line x1="0" y1="0" x2={MONITOR_WIDTH} y2="0" stroke="#fff" strokeWidth="3" />
      {primaryButtons.map((label, index) => (
        <ToolbarButton
          x={8 + index * 128}
          y={8}
          w={108}
          label={label}
          selected={label === selectedTool}
          onClick={() => {
            setActiveTool(label)
            setFooterNote(`${label} toolbar selected`)
          }}
          key={label}
        />
      ))}
      {secondaryButtons.map((button) => (
        <ToolbarButton
          x={button.x}
          y={54}
          w={button.w}
          label={button.label}
          selected={button.label === selectedMode}
          onClick={() => {
            setActiveMode(button.label)
            setFooterNote(`${button.label} mode selected`)
          }}
          key={button.label}
        />
      ))}
      <rect x="898" y="52" width="166" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <text className="svg-status-text" x="981" y="68" textAnchor="middle">{footerNote || status}</text>
      <text className="svg-status-text" x="981" y="82" textAnchor="middle">{footerNote ? `${selectedTool} / ${selectedMode}` : '[ TSR1 ] @ OCC'}</text>
      <rect x="1122" y="52" width="144" height="36" fill="#c8cede" stroke="#fff" strokeWidth="2" />
      <LiveScadaClock height={36} width={144} x={1122} y={52} />
    </g>
  )
}

function ItamaStatusPanel({
  onAcknowledge,
  onClose,
  train,
}: {
  onAcknowledge: () => void
  onClose: () => void
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const trainRef = `EMU/${train.id}/TRN/XXXXXXXX`
  const nearestPlatform = platformData.reduce((closest, platform) => (
    Math.abs(platform.x - train.x) < Math.abs(closest.x - train.x) ? platform : closest
  ))
  const statusText = train.status === 'HOLD'
    ? 'Train readiness mode request'
    : train.status === 'WAIT'
      ? 'Route command not confirmed'
      : 'ITAMA status normal'

  return (
    <div
      className="line-map-popup-window line-map-popup-window--itama"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: 318, top: 510, width: 560, ...popupDrag.style }}
    >
      <div className="line-map-popup-titlebar" {...popupDrag.titleBarProps}>
        <span>Inspecting: {trainRef} CRT TR 0032 27/02</span>
        <button type="button" onClick={onClose}>x</button>
      </div>
      <div className="line-map-popup-body">
        <div className="line-map-popup-side">
          {['Information', 'PTI Initialis...', 'Departure', 'Train Hold', 'Train Readiness Request', 'ITAMA AM/CAT Auto...'].map((label) => (
            <button disabled={label.includes('PTI') || label.includes('ITAMA')} key={label} type="button">{label}</button>
          ))}
        </div>
        <div className="line-map-popup-main">
          <strong>Train {train.id}</strong>
          <div className="line-map-popup-fieldset">
            <span>Information area</span>
            <small>Train readiness and command state shown for operator reference.</small>
            <dl>
              <dt>Station</dt>
              <dd>{nearestPlatform.code}</dd>
              <dt>Status</dt>
              <dd>{statusText}</dd>
            </dl>
          </div>
          <label className="line-map-popup-status">
            <span>Status</span>
            <output>{statusText}<br />Command not confirmed</output>
          </label>
          <div className="line-map-popup-actions">
            <button type="button">Help</button>
            <button type="button" onClick={onAcknowledge}>Apply</button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScadaCommandDialog({
  command,
  onApply,
  onClose,
  train,
}: {
  command: TrainCommand
  onApply: () => void
  onClose: () => void
  train?: TrainState
}) {
  const popupDrag = usePopupDrag()
  const trainRef = train ? `EMU/${train.id}/TRN/XXXXXXXX` : 'EMU/---/TRN/XXXXXXXX'
  const meta = {
    DISPATCH: {
      commandCode: 'DISPATCH',
      label: 'Dispatch Train',
      message: 'Dispatch command will be sent to selected train.',
      next: 'Train movement authority requested',
    },
    HOLD: {
      commandCode: 'HII',
      label: 'Train Hold',
      message: 'Hold train command will be issued to controller workstation.',
      next: 'Train readiness mode request',
    },
    ROUTE: {
      commandCode: 'ROUTE',
      label: 'Route Command',
      message: 'Route command must be confirmed before dispatch.',
      next: 'Command not confirmed',
    },
  }[command]

  return (
    <div
      className="line-map-popup-window line-map-popup-window--command"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: 458, top: 620, width: 430, ...popupDrag.style }}
    >
      <div className="line-map-popup-titlebar" {...popupDrag.titleBarProps}>
        <span>SIG Command Request : {trainRef}</span>
      </div>
      <div className="line-map-command-body">
        <div className="line-map-popup-fieldset">
          <dl>
            <dt>Command</dt>
            <dd>{meta.commandCode}</dd>
            <dt>Request</dt>
            <dd>{meta.label}</dd>
          </dl>
          <small>{meta.message}</small>
        </div>
        <label className="line-map-popup-status">
          <span>Status</span>
          <output>{meta.next}</output>
        </label>
        <div className="line-map-popup-actions line-map-popup-actions--right">
          <button type="button" onClick={onApply}>Apply</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function SignalContextMenu({
  onClose,
  onDefineRoute,
  onOpenDetails,
  onOpenInspector,
  signal,
  x,
  y,
}: {
  onClose: () => void
  onDefineRoute: () => void
  onOpenDetails: () => void
  onOpenInspector: () => void
  signal: LineMapSignalData
  x: number
  y: number
}) {
  return (
    <div
      className="line-map-signal-menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: x, top: y }}
    >
      <div className="line-map-signal-menu-title">{getSignalEquipmentLabel(signal)}</div>
      <button type="button" onClick={onOpenInspector}>
        <span>Open inspector...</span>
        <span>&gt;</span>
      </button>
      <button type="button" onClick={onOpenDetails}>
        <span>Open details...</span>
        <span>&gt;</span>
      </button>
      <button className="has-divider" type="button" onClick={onDefineRoute}>Define Route</button>
      <button type="button" onClick={onClose}>Define Beginning of Route</button>
      <button className="has-divider" type="button" onClick={onClose}>Work request</button>
    </div>
  )
}

function SignalRouteDefinitionWindow({
  onClose,
  onSet,
  onUnset,
  routeSetLabels,
  signal,
  statusText,
}: {
  onClose: () => void
  onSet: (routeLabel: string) => void
  onUnset: (routeLabel: string) => void
  routeSetLabels: readonly string[]
  signal: LineMapSignalData
  statusText: string
}) {
  const popupDrag = usePopupDrag()
  const confirmationDrag = usePopupDrag()
  const ROUTE_SCROLL_TRACK_HEIGHT = 140
  const ROUTE_SCROLL_THUMB_HEIGHT = 52
  const routeTableRef = useRef<HTMLDivElement>(null)
  const setRouteActionRef = useRef(false)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [optimisticRouteSetLabels, setOptimisticRouteSetLabels] = useState<readonly string[]>(routeSetLabels)
  const [routeScroll, setRouteScroll] = useState({ max: 1, top: 0 })
  const [routeScrollDrag, setRouteScrollDrag] = useState<{ startScrollTop: number; startY: number } | null>(null)
  const [routeSetConfirmationOpen, setRouteSetConfirmationOpen] = useState(false)
  const routeLabels = getSignalRouteLabels(signal)
  const selectedRouteLabel = routeLabels[selectedRouteIndex] ?? routeLabels[0] ?? getSignalRouteLabel(signal)
  const selectedRouteSet = optimisticRouteSetLabels.includes(selectedRouteLabel)
  const canSetRoute = !selectedRouteSet && !routeSetConfirmationOpen
  const canUnsetRoute = selectedRouteSet
  const showRouteSetConfirmation = routeSetConfirmationOpen || (setRouteActionRef.current && selectedRouteSet)

  const updateRouteScroll = () => {
    const table = routeTableRef.current

    if (!table) {
      return
    }

    setRouteScroll({
      max: Math.max(1, table.scrollHeight - table.clientHeight),
      top: table.scrollTop,
    })
  }

  useEffect(() => {
    updateRouteScroll()
  }, [routeSetLabels, signal.label])

  useEffect(() => {
    setSelectedRouteIndex(0)
    setOptimisticRouteSetLabels(routeSetLabels)
    setRouteSetConfirmationOpen(false)
    setRouteActionRef.current = false
  }, [signal.label])

  useEffect(() => {
    setOptimisticRouteSetLabels(routeSetLabels)

    if (routeSetLabels.length) {
      if (setRouteActionRef.current) {
        setRouteSetConfirmationOpen(true)
      }
    }

    if (!routeSetLabels.length) {
      setRouteActionRef.current = false
    }
  }, [routeSetLabels])

  const applyRouteSet = () => {
    if (selectedRouteSet || setRouteActionRef.current) {
      return
    }

    setRouteActionRef.current = true
    setRouteSetConfirmationOpen(true)
  }

  const applyRouteUnset = () => {
    if (!canUnsetRoute) {
      return
    }

    setOptimisticRouteSetLabels((current) => current.filter((routeLabel) => routeLabel !== selectedRouteLabel))
    setRouteActionRef.current = false
    onUnset(selectedRouteLabel)
  }

  const setRouteScrollTop = (top: number) => {
    const table = routeTableRef.current

    if (!table) {
      return
    }

    table.scrollTop = Math.max(0, Math.min(top, table.scrollHeight - table.clientHeight))
    updateRouteScroll()
  }

  const scrollRouteTable = (direction: -1 | 1) => {
    const table = routeTableRef.current

    if (!table) {
      return
    }

    setRouteScrollTop(table.scrollTop + direction * 54)
  }
  const routeThumbTop = (routeScroll.top / routeScroll.max) * (ROUTE_SCROLL_TRACK_HEIGHT - ROUTE_SCROLL_THUMB_HEIGHT)

  return (
    <div
      className="sig-route-window"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="sig-route-titlebar" {...popupDrag.titleBarProps}>SIG Define Route</div>
      <div className="sig-route-body">
        <h3>{getSignalEquipmentLabel(signal)} (Signal {signal.label})</h3>
        <fieldset className="sig-route-fieldset">
          <legend>Available Routes</legend>
          <div className="sig-route-column-headings" role="row">
            <span>Route ID</span>
            <span>Set status</span>
            <span>Fleet status</span>
          </div>
          <div className="sig-route-table-frame">
            <div className="sig-route-table" ref={routeTableRef} role="table" aria-label="Available routes" onScroll={updateRouteScroll}>
              {routeLabels.map((routeLabel, index) => (
                <button
                  className={`sig-route-row ${selectedRouteIndex === index ? 'is-selected' : ''}`}
                  key={routeLabel}
                  onClick={() => setSelectedRouteIndex(index)}
                  role="row"
                  type="button"
                >
                  <span>{routeLabel}</span>
                  <span>{optimisticRouteSetLabels.includes(routeLabel) ? 'Set' : 'Not Set'}<i /></span>
                  <span>Not Fleet<i /></span>
                </button>
              ))}
              {Array.from({ length: Math.max(0, 9 - routeLabels.length) }, (_, index) => (
                <div className="sig-route-row" key={`blank-${index}`} role="row">
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
            <div className="sig-route-scrollbar">
              <button aria-label="Scroll available routes up" onClick={() => scrollRouteTable(-1)} type="button">
                <span />
              </button>
              <div
                onPointerDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return
                  }

                  const bounds = event.currentTarget.getBoundingClientRect()
                  scrollRouteTable(event.clientY - bounds.top < routeThumbTop ? -1 : 1)
                }}
              >
                <span
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setRouteScrollDrag({
                      startScrollTop: routeTableRef.current?.scrollTop ?? 0,
                      startY: event.clientY,
                    })
                  }}
                  onPointerMove={(event) => {
                    if (!routeScrollDrag) {
                      return
                    }

                    event.stopPropagation()
                    const trackTravel = ROUTE_SCROLL_TRACK_HEIGHT - ROUTE_SCROLL_THUMB_HEIGHT
                    const scrollDelta = ((event.clientY - routeScrollDrag.startY) / trackTravel) * routeScroll.max
                    setRouteScrollTop(routeScrollDrag.startScrollTop + scrollDelta)
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation()
                    setRouteScrollDrag(null)
                  }}
                  style={{ top: routeThumbTop }}
                />
              </div>
              <button aria-label="Scroll available routes down" onClick={() => scrollRouteTable(1)} type="button">
                <span />
              </button>
            </div>
          </div>
        </fieldset>
        <div className="sig-route-actions">
          <button disabled={!canUnsetRoute} onClick={applyRouteUnset} type="button">Unset</button>
          <button
            disabled={!canSetRoute}
            onMouseDown={(event) => {
              event.preventDefault()
              applyRouteSet()
            }}
            onPointerDown={(event) => {
              event.preventDefault()
              applyRouteSet()
            }}
            onClick={applyRouteSet}
            type="button"
          >
            Set
          </button>
          <button disabled type="button">Unfleet</button>
          <button disabled type="button">Fleet</button>
        </div>
        <label className="sig-route-status">
          <span>Status</span>
          <output>{selectedRouteSet ? 'Route set successful' : statusText}</output>
        </label>
        <div className="sig-route-footer">
          <button type="button">Help</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
      {showRouteSetConfirmation ? (
        <div
          className="train-command-confirmation sig-route-command-confirmation"
          onPointerDown={(event) => event.stopPropagation()}
          style={confirmationDrag.style}
        >
          <div className="train-command-confirmation__title" {...confirmationDrag.titleBarProps}>Command confirmation</div>
          <fieldset>
            <legend>Please confirm command...</legend>
            <div className="train-command-confirmation__grid">
              <label>Equipment</label>
              <div>{getSignalEquipmentLabel(signal)} (Signal {signal.label})</div>
              <label>Attribute</label>
              <div>{selectedRouteLabel}</div>
              <label>Command</label>
              <div>SET</div>
              <label>No wait</label>
              <input type="checkbox" />
            </div>
          </fieldset>
          <div className="train-command-confirmation__actions">
            <Win98HtmlButton>Help</Win98HtmlButton>
            <span />
            <Win98HtmlButton
              onClick={() => {
                setRouteActionRef.current = false
                setOptimisticRouteSetLabels((current) => (
                  current.includes(selectedRouteLabel) ? current : [...current, selectedRouteLabel]
                ))
                setRouteSetConfirmationOpen(false)
                onSet(selectedRouteLabel)
              }}
            >
              Confirm
            </Win98HtmlButton>
            <Win98HtmlButton
              onClick={() => {
                setRouteActionRef.current = false
                setRouteSetConfirmationOpen(false)
              }}
            >
              Cancel
            </Win98HtmlButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TrainAuxiliaryPanel({
  onClose,
  train,
  view,
}: {
  onClose: () => void
  train: TrainState
  view: TrainAuxiliaryView
}) {
  const popupDrag = usePopupDrag()
  const trainRef = `EMU/${train.id}/TRN/XXXXXXXX`
  const nearestPlatform = platformData.reduce((closest, platform) => (
    Math.abs(platform.x - train.x) < Math.abs(closest.x - train.x) ? platform : closest
  ))
  const viewMeta: Record<TrainAuxiliaryView, {
    title: string
    heading: string
    status: string
    rows: Array<[string, string]>
  }> = {
    alarms: {
      title: `Alarms: ${trainRef}`,
      heading: `Train ${train.id} active alarms`,
      status: train.status === 'HOLD' ? 'Action needed (from operator for recovery)' : 'No active train alarm selected',
      rows: [
        ['SIG', `Train ${train.id}: Train ITAMA Status`],
        ['TRN', train.status === 'HOLD' ? 'Train readiness mode request' : 'Train status normal'],
        ['OCC', 'Alarm list opened from line map command menu'],
      ],
    },
    cctv: {
      title: `Restricted CCTV: ${trainRef}`,
      heading: 'Restricted CCTV',
      status: 'Restricted CCTV request logged for trainer review',
      rows: [
        ['Station', nearestPlatform.code],
        ['Platform', `${nearestPlatform.code}${train.service}`],
        ['Access', 'Restricted operator function'],
      ],
    },
    details: {
      title: `Details: ${trainRef}`,
      heading: `Train ${train.id} details`,
      status: 'Details page opened',
      rows: [
        ['Train number', train.id.padStart(3, '0')],
        ['Current station', nearestPlatform.code],
        ['Service', train.service],
        ['State', train.status],
      ],
    },
    'pec-reset': {
      title: `PEC Reset: ${trainRef}`,
      heading: 'PEC Reset All',
      status: 'PEC reset request prepared. No reset applied in prototype.',
      rows: [
        ['Equipment', trainRef],
        ['Command', 'PEC RESET ALL'],
        ['Result', 'Request only'],
      ],
    },
    pis: {
      title: `Restricted PIS: ${trainRef}`,
      heading: 'Restricted PIS',
      status: 'Restricted PIS request logged for trainer review',
      rows: [
        ['Station', nearestPlatform.code],
        ['Platform', `${nearestPlatform.code}${train.service}`],
        ['Access', 'Restricted passenger information function'],
      ],
    },
    regulation: {
      title: `Regulation parameters: ${trainRef}`,
      heading: 'Regulation parameters',
      status: 'Regulation parameters opened',
      rows: [
        ['Threshold', train.status === 'HOLD' ? '0' : '50'],
        ['Peak mode', train.id === '317' ? 'Peak' : 'Not Peak'],
        ['Readiness', getTrainReadinessDisplayValue(train)],
      ],
    },
  }
  const meta = viewMeta[view]

  return (
    <div
      className="line-map-popup-window line-map-popup-window--aux"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: 386, top: 548, width: 620, ...popupDrag.style }}
    >
      <div className="line-map-popup-titlebar" {...popupDrag.titleBarProps}>
        <span>{meta.title}</span>
        <button type="button" onClick={onClose}>x</button>
      </div>
      <div className="line-map-popup-body line-map-popup-body--stack">
        <h3>{meta.heading}</h3>
        <div className="line-map-popup-fieldset">
          <dl>
            {meta.rows.map(([label, value]) => (
              <div className="line-map-popup-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <label className="line-map-popup-status">
          <span>Status</span>
          <output>{meta.status}</output>
        </label>
        <div className="line-map-popup-actions">
          <button type="button">Help</button>
          <button type="button">{view === 'pec-reset' ? 'Request' : 'OK'}</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function TrainContextMenu({
  onClose,
  onOpenAuxiliary,
  onOpenInspector,
  train,
  x,
  y,
}: {
  onClose: () => void
  onOpenAuxiliary: (view: TrainAuxiliaryView) => void
  onOpenInspector: (page: InspectorPage) => void
  train: TrainState
  x: number
  y: number
}) {
  const [stage, setStage] = useState<'root' | 'main' | 'inspector' | 'details' | 'alarms'>('main')
  const objectLabel = `C${Number(train.id) || train.id}/T0`
  const mainRows: Array<{
    disabled?: boolean
    dividerBefore?: boolean
    label: string
    action?: () => void
    submenu?: 'inspector' | 'details' | 'alarms'
  }> = [
    { label: 'Open inspector...', submenu: 'inspector' },
    { label: 'Open details...', submenu: 'details' },
    { label: 'Open alarms...', submenu: 'alarms' },
    { label: 'Restricted CCTV', action: () => onOpenAuxiliary('cctv'), dividerBefore: true },
    { label: 'Restricted PIS', action: () => onOpenAuxiliary('pis') },
    { label: 'Maintenance', disabled: true, dividerBefore: true },
    { label: 'Regulation parameters', action: () => onOpenAuxiliary('regulation') },
    { label: 'PEC Reset All', action: () => onOpenAuxiliary('pec-reset') },
  ]
  const inspectorRows: Array<{ label: string; page: InspectorPage }> = [
    { label: 'Information page', page: 'information' },
    { label: 'Control page', page: 'control' },
    { label: 'Tag page', page: 'tag' },
  ]
  const detailsRows: Array<{ label: string; view: TrainAuxiliaryView }> = [
    { label: 'Details page', view: 'details' },
    { label: 'Regulation parameters', view: 'regulation' },
    { label: 'PEC Reset All', view: 'pec-reset' },
  ]
  const alarmRows: Array<{ label: string; view: TrainAuxiliaryView }> = [
    { label: 'Active alarms', view: 'alarms' },
    { label: 'Restricted CCTV', view: 'cctv' },
    { label: 'Restricted PIS', view: 'pis' },
  ]

  return (
    <div
      className="line-map-cascade"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: x, top: y }}
    >
      <button
        className={`line-map-cascade-root ${stage !== 'root' ? 'is-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          setStage('main')
        }}
        type="button"
      >
        <span>{objectLabel}</span>
        <span>&gt;</span>
      </button>

      {stage !== 'root' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--main">
          {mainRows.map((item) => (
            <button
              className={`${item.dividerBefore ? 'has-divider' : ''} ${item.submenu === stage ? 'is-active' : ''}`}
              disabled={item.disabled}
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()

                if (item.submenu) {
                  setStage(item.submenu)
                  return
                }

                if (item.action) {
                  item.action()
                  onClose()
                }
              }}
              type="button"
            >
              <span>{item.label}</span>
              {item.submenu ? <span>&gt;</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {stage === 'inspector' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--sub line-map-cascade-menu--inspector">
          {inspectorRows.map((item) => (
            <button
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()
                onOpenInspector(item.page)
                onClose()
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {stage === 'details' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--sub line-map-cascade-menu--details">
          {detailsRows.map((item) => (
            <button
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()
                onOpenAuxiliary(item.view)
                onClose()
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {stage === 'alarms' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--sub line-map-cascade-menu--alarms">
          {alarmRows.map((item) => (
            <button
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()
                onOpenAuxiliary(item.view)
                onClose()
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function InspectorInfoRow({
  label,
  tone = 'green',
  value,
}: {
  label: string
  tone?: 'green' | 'red'
  value: string
}) {
  return (
    <div className="train-inspector-info-row">
      <span className="train-inspector-info-label">{label}</span>
      <span className="train-inspector-info-field">
        <span>{value}</span>
        <i className={tone === 'red' ? 'is-red' : undefined} />
      </span>
    </div>
  )
}

function TrainInspectorScrollbar({
  axis,
  contentSize,
  onChange,
  value,
  viewportSize,
}: {
  axis: 'vertical' | 'horizontal'
  contentSize: number
  onChange: (nextValue: number) => void
  value: number
  viewportSize: number
}) {
  const isVertical = axis === 'vertical'
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackLength, setTrackLength] = useState(1)
  const [drag, setDrag] = useState<{ startPointer: number; startValue: number } | null>(null)
  const max = Math.max(0, contentSize - viewportSize)
  const thumbLength = max > 0 ? Math.min(52, trackLength) : Math.max(18, trackLength)
  const thumbTravel = Math.max(1, trackLength - thumbLength)
  const thumbOffset = max > 0 ? (value / max) * thumbTravel : 0
  const stepSize = Math.max(54, viewportSize * 0.78)
  const setScrollValue = (nextValue: number) => onChange(Math.max(0, Math.min(max, nextValue)))

  useEffect(() => {
    const track = trackRef.current

    if (!track) {
      return undefined
    }

    const updateTrackLength = () => {
      setTrackLength(Math.max(1, isVertical ? track.clientHeight : track.clientWidth))
    }

    updateTrackLength()

    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(updateTrackLength)
    observer.observe(track)

    return () => observer.disconnect()
  }, [isVertical])

  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const pointer = isVertical ? event.clientY - bounds.top : event.clientX - bounds.left

    setScrollValue(value + (pointer < thumbOffset ? -stepSize : stepSize))
  }

  const handleThumbPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!drag) {
      return
    }

    event.stopPropagation()

    const pointer = isVertical ? event.clientY : event.clientX
    const pointerDelta = pointer - drag.startPointer
    const scrollDelta = max > 0 ? (pointerDelta / thumbTravel) * max : 0

    setScrollValue(drag.startValue + scrollDelta)
  }

  const startThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      startPointer: isVertical ? event.clientY : event.clientX,
      startValue: value,
    })
  }

  return (
    <div className={`train-inspector-scrollbar train-inspector-scrollbar--${axis}`}>
      <button
        aria-label={`Scroll inspector ${isVertical ? 'up' : 'left'}`}
        className="train-inspector-scrollbar__button"
        onClick={() => setScrollValue(value - stepSize)}
        type="button"
      >
        <span className={`train-inspector-scrollbar__arrow train-inspector-scrollbar__arrow--${isVertical ? 'up' : 'left'}`} />
      </button>
      <div className="train-inspector-scrollbar__track" onPointerDown={handleTrackPointerDown} ref={trackRef}>
        <span
          className="train-inspector-scrollbar__thumb"
          onPointerCancel={() => setDrag(null)}
          onPointerDown={startThumbDrag}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={() => setDrag(null)}
          style={isVertical ? { height: thumbLength, top: thumbOffset } : { left: thumbOffset, width: thumbLength }}
        />
      </div>
      <button
        aria-label={`Scroll inspector ${isVertical ? 'down' : 'right'}`}
        className="train-inspector-scrollbar__button"
        onClick={() => setScrollValue(value + stepSize)}
        type="button"
      >
        <span className={`train-inspector-scrollbar__arrow train-inspector-scrollbar__arrow--${isVertical ? 'down' : 'right'}`} />
      </button>
    </div>
  )
}

function ScadaDropdown({
  id,
  onChange,
  options,
  value,
}: {
  id: string
  onChange: (value: string) => void
  options: readonly string[]
  value: string
}) {
  const visibleRows = 6
  const scrollTrackHeight = 126
  const [open, setOpen] = useState(false)
  const [scrollIndex, setScrollIndex] = useState(0)
  const [scrollDrag, setScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const scrollMax = Math.max(0, options.length - visibleRows)
  const visibleOptions = options.slice(scrollIndex, scrollIndex + visibleRows)
  const thumbHeight = Math.max(28, Math.round((visibleRows / options.length) * scrollTrackHeight))
  const thumbTop = scrollMax > 0 ? Math.round((scrollIndex / scrollMax) * (scrollTrackHeight - thumbHeight)) : 0

  const setScroll = (nextIndex: number) => {
    setScrollIndex(Math.max(0, Math.min(scrollMax, nextIndex)))
  }

  const selectOption = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  const handleScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = visibleRows - 1

    setScroll(clickY < thumbTop ? scrollIndex - pageSize : scrollIndex + pageSize)
  }

  const startThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setScrollDrag({
      startIndex: scrollIndex,
      startY: event.clientY,
    })
  }

  const handleThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!scrollDrag || scrollMax === 0) {
      return
    }

    const thumbTravel = scrollTrackHeight - thumbHeight
    const dragRatio = (event.clientY - scrollDrag.startY) / thumbTravel

    setScroll(scrollDrag.startIndex + Math.round(dragRatio * scrollMax))
  }

  useEffect(() => {
    if (scrollIndex > scrollMax) {
      setScrollIndex(scrollMax)
    }
  }, [scrollIndex, scrollMax])

  return (
    <div className="arrival-time-dialog__station-combo train-inspector-dropdown">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="arrival-time-dialog__control arrival-time-dialog__station-trigger train-inspector-dropdown__trigger"
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{value}</span>
        <i aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="arrival-time-dialog__station-list train-inspector-dropdown__list"
          onWheel={(event) => {
            event.preventDefault()
            setScroll(scrollIndex + (event.deltaY > 0 ? 1 : -1))
          }}
          role="listbox"
        >
          <div className="arrival-time-dialog__station-options train-inspector-dropdown__options">
            {visibleOptions.map((option) => (
              <button
                aria-selected={value === option}
                className={value === option ? 'is-selected' : undefined}
                key={option || 'blank'}
                onClick={() => selectOption(option)}
                role="option"
                type="button"
              >
                {option || '\u00a0'}
              </button>
            ))}
          </div>
          <div className="arrival-time-dialog__station-scrollbar">
            <button disabled={scrollIndex === 0} onClick={() => setScroll(scrollIndex - 1)} type="button">
              <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
            </button>
            <div className="arrival-time-dialog__station-scroll-track" onPointerDown={handleScrollTrackPointerDown}>
              <span
                className="arrival-time-dialog__station-scroll-thumb"
                onPointerCancel={() => setScrollDrag(null)}
                onPointerDown={startThumbDrag}
                onPointerMove={handleThumbDrag}
                onPointerUp={() => setScrollDrag(null)}
                style={{ height: thumbHeight, top: thumbTop }}
              />
            </div>
            <button disabled={scrollIndex === scrollMax} onClick={() => setScroll(scrollIndex + 1)} type="button">
              <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TrainInspectorPanel({
  arrivalTimeSelection,
  onClose,
  onConfirmItamaAuthorised,
  onConfirmItamaAuthorisedPreparation,
  onConfirmItamaNotAuthorised,
  onConfirmItamaNotAuthorisedPreparation,
  onConfirmArrivalTime,
  onConfirmDepartureTime,
  onConfirmDoorCommand,
  onConfirmReadiness,
  onOpenDetails,
  onPageChange,
  page,
  train,
}: {
  arrivalTimeSelection?: TrainTimeSelection
  onClose: () => void
  onConfirmItamaAuthorised: () => void
  onConfirmItamaAuthorisedPreparation: () => void
  onConfirmItamaNotAuthorised: () => void
  onConfirmItamaNotAuthorisedPreparation: () => void
  onConfirmArrivalTime: (selection: TrainTimeSelection) => void
  onConfirmDepartureTime: () => void
  onConfirmDoorCommand: (command: TrainDoorCommand) => void
  onConfirmReadiness: (command: string) => void
  onOpenDetails: () => void
  onPageChange: (page: InspectorPage) => void
  page: InspectorPage
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const confirmationDrag = usePopupDrag()
  const trainIdentityLabel = train.id.padStart(3, '0')
  const trainNumber = train.trainNumber ?? '0'
  const scheduleNumber = train.scheduleNumber ?? '0'
  const trainRef = `EMU/${train.id}/TRN/XXXXXXXX`
  const nearestPlatform = platformData.reduce((closest, platform) => (
    Math.abs(platform.x - train.x) < Math.abs(closest.x - train.x) ? platform : closest
  ))
  const currentDirection = getTrainServiceDirectionLabel(train)
  const [readiness, setReadiness] = useState(() => getTrainReadinessRequestValue(train))
  const [doorRequest, setDoorRequest] = useState('')
  const [brakeResetRequest, setBrakeResetRequest] = useState('')
  const [readinessModeOverride, setReadinessModeOverride] = useState<TrainReadinessMode | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [trainTimeDialogKind, setTrainTimeDialogKind] = useState<'arrival' | 'departure' | null>(null)
  const [changeEndsDialogOpen, setChangeEndsDialogOpen] = useState(false)
  const [displayedItamaStatus, setDisplayedItamaStatus] = useState<'GRANTED' | 'NOT GRANTED'>(() => getTrainItamaStatusValue(train))
  const [itamaAuthorisedPreparationOverride, setItamaAuthorisedPreparationOverride] = useState<boolean | null>(null)
  const [itamaNotAuthorisedPreparationOverride, setItamaNotAuthorisedPreparationOverride] = useState<boolean | null>(null)
  const inspectorScrollRef = useRef<HTMLDivElement>(null)
  const [inspectorScroll, setInspectorScroll] = useState({
    clientHeight: 1,
    clientWidth: 1,
    left: 0,
    scrollHeight: 1,
    scrollWidth: 1,
    top: 0,
  })
  const [confirmationCommand, setConfirmationCommand] = useState<{
    attribute: string
    command: string
    kind:
      | 'itama-authorised-preparation'
      | 'itama-authorised-confirmation'
      | 'itama-not-authorised-preparation'
      | 'itama-not-authorised-confirmation'
      | 'door-command'
      | 'readiness-command'
    doorCommand?: TrainDoorCommand
  } | null>(null)
  const effectiveReadinessMode = readinessModeOverride ?? getTrainReadinessMode(train)
  const readinessInfoValue = getTrainReadinessDisplayValue({ readinessMode: effectiveReadinessMode })
  const itamaStatus = displayedItamaStatus
  const isItamaGranted = itamaStatus === 'GRANTED'
  const isAuthorisedCommandSideAvailable = !isItamaGranted
  const isNotAuthorisedCommandSideAvailable = isItamaGranted
  const isItamaAuthorisedPreparationConfirmed = itamaAuthorisedPreparationOverride
    ?? train.itamaAuthorisedPreparationConfirmed === true
  const isItamaNotAuthorisedPreparationConfirmed = itamaNotAuthorisedPreparationOverride
    ?? train.itamaNotAuthorisedPreparationConfirmed === true
  const canRequestItamaAuthorisedPreparation = isAuthorisedCommandSideAvailable
    && !isItamaAuthorisedPreparationConfirmed
  const canRequestItamaAuthorisedConfirmation = isAuthorisedCommandSideAvailable
    && isItamaAuthorisedPreparationConfirmed
  const canRequestItamaNotAuthorisedPreparation = isNotAuthorisedCommandSideAvailable
    && !isItamaNotAuthorisedPreparationConfirmed
  const canRequestItamaNotAuthorisedConfirmation = isNotAuthorisedCommandSideAvailable
    && isItamaNotAuthorisedPreparationConfirmed
  const doorFailureState = getTrainDoorFailureState(train)
  const doorFaultActive = getTrainDoorFaultDisplayValue(doorFailureState) === 'YES'
  const doorSummaryStatus = getTrainDoorSummaryStatus(doorFailureState)
  const doorIsolationStatus = getTrainDoorIsolationStatus(doorFailureState)

  const recordStatus = (message: string) => setStatusMessage(message)

  const openTrainTimeDialog = (kind: 'arrival' | 'departure') => {
    setConfirmationCommand(null)
    setChangeEndsDialogOpen(false)
    setTrainTimeDialogKind(kind)
    setStatusMessage(`${kind === 'arrival' ? 'Arrival' : 'Departure'} time selected`)
  }

  const openChangeEndsDialog = () => {
    setConfirmationCommand(null)
    setTrainTimeDialogKind(null)
    setChangeEndsDialogOpen(true)
    setStatusMessage('Change of ends request selected')
  }

  const updateInspectorScroll = useCallback(() => {
    const scrollArea = inspectorScrollRef.current

    if (!scrollArea) {
      return
    }

    setInspectorScroll({
      clientHeight: Math.max(1, scrollArea.clientHeight),
      clientWidth: Math.max(1, scrollArea.clientWidth),
      left: scrollArea.scrollLeft,
      scrollHeight: Math.max(1, scrollArea.scrollHeight),
      scrollWidth: Math.max(1, scrollArea.scrollWidth),
      top: scrollArea.scrollTop,
    })
  }, [])

  const setInspectorScrollPosition = useCallback(
    (axis: 'vertical' | 'horizontal', nextValue: number) => {
      const scrollArea = inspectorScrollRef.current

      if (!scrollArea) {
        return
      }

      if (axis === 'vertical') {
        scrollArea.scrollTop = Math.max(0, Math.min(nextValue, scrollArea.scrollHeight - scrollArea.clientHeight))
      } else {
        scrollArea.scrollLeft = Math.max(0, Math.min(nextValue, scrollArea.scrollWidth - scrollArea.clientWidth))
      }

      updateInspectorScroll()
    },
    [updateInspectorScroll],
  )

  useEffect(() => {
    const scrollArea = inspectorScrollRef.current

    if (!scrollArea) {
      return
    }

    scrollArea.scrollTop = 0
    scrollArea.scrollLeft = 0
    updateInspectorScroll()
  }, [page, train.id, updateInspectorScroll])

  useEffect(() => {
    const scrollArea = inspectorScrollRef.current

    if (!scrollArea || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(updateInspectorScroll)
    observer.observe(scrollArea)

    return () => observer.disconnect()
  }, [updateInspectorScroll])

  useEffect(() => {
    const trainReadinessMode = getTrainReadinessMode(train)

    if (readinessModeOverride !== null && readinessModeOverride !== trainReadinessMode) {
      return
    }

    setReadinessModeOverride(null)
    setReadiness(getTrainReadinessRequestValue({ readinessMode: trainReadinessMode }))
  }, [train.id, train.readinessMode, readinessModeOverride])

  useEffect(() => {
    setDisplayedItamaStatus(getTrainItamaStatusValue(train))
    setItamaAuthorisedPreparationOverride(null)
    setItamaNotAuthorisedPreparationOverride(null)
  }, [train.id])

  const renderTab = (targetPage: InspectorPage, label: string) => (
    <button
      className={`train-inspector-tab ${page === targetPage ? 'is-active' : ''}`}
      onClick={() => onPageChange(targetPage)}
      type="button"
    >
      {targetPage === 'control' ? (
        <img alt="" className="train-inspector-tab__control-icon" src={controlTabIcon} />
      ) : (
        <span
          className={`train-inspector-tab__icon ${
            targetPage === 'tag' ? 'train-inspector-tab__icon--tag' : 'train-inspector-tab__icon--information'
          }`}
        />
      )}
      {label}
    </button>
  )

  const requestItamaCommand = (
    attribute: string,
    kind:
      | 'itama-authorised-preparation'
      | 'itama-authorised-confirmation'
      | 'itama-not-authorised-preparation'
      | 'itama-not-authorised-confirmation',
  ) => {
    setConfirmationCommand({
      attribute,
      command: 'OK',
      kind,
    })
  }

  const requestDoorCommand = (request: string) => {
    setDoorRequest(request)

    if (!request) {
      setConfirmationCommand(null)
      return
    }

    const doorCommand = getTrainDoorCommandFromRequest(request)

    if (!doorCommand) {
      setConfirmationCommand(null)
      return
    }

    if (!getAllowedTrainDoorCommands(doorFailureState).includes(doorCommand)) {
      setConfirmationCommand(null)
      setStatusMessage(getTrainDoorCommandRejectionMessage(doorFailureState, doorCommand))
      return
    }

    setConfirmationCommand({
      attribute: 'Train Door Open/Close Request',
      command: getTrainDoorCommandValue(doorCommand),
      doorCommand,
      kind: 'door-command',
    })
  }

  const handleReadinessChange = (nextReadiness: string) => {
    setReadiness(nextReadiness)

    const command = nextReadiness.toUpperCase()

    setConfirmationCommand({
      attribute: 'Train Readiness Request',
      command,
      kind: 'readiness-command',
    })
    setStatusMessage(`Train readiness request ${command} selected`)
  }

  const cancelCommand = () => {
    if (confirmationCommand?.kind === 'readiness-command') {
      setReadiness(getTrainReadinessRequestValue({ readinessMode: effectiveReadinessMode }))
    }

    setConfirmationCommand(null)
  }

  const confirmCommand = () => {
    if (!confirmationCommand) {
      return
    }

    if (confirmationCommand.kind === 'itama-authorised-preparation') {
      onConfirmItamaAuthorisedPreparation()
      setItamaAuthorisedPreparationOverride(true)
      setItamaNotAuthorisedPreparationOverride(false)
      setStatusMessage('ITAMA authorised preparation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'itama-authorised-confirmation') {
      onConfirmItamaAuthorised()
      setDisplayedItamaStatus('GRANTED')
      setItamaAuthorisedPreparationOverride(false)
      setItamaNotAuthorisedPreparationOverride(false)
      setStatusMessage('ITAMA authorised confirmation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'itama-not-authorised-preparation') {
      onConfirmItamaNotAuthorisedPreparation()
      setItamaAuthorisedPreparationOverride(false)
      setItamaNotAuthorisedPreparationOverride(true)
      setStatusMessage('ITAMA not authorised preparation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'itama-not-authorised-confirmation') {
      onConfirmItamaNotAuthorised()
      setDisplayedItamaStatus('NOT GRANTED')
      setItamaAuthorisedPreparationOverride(false)
      setItamaNotAuthorisedPreparationOverride(false)
      setStatusMessage('ITAMA not authorised confirmation request\nCommand successful')
    }

    if (confirmationCommand.kind === 'door-command' && confirmationCommand.doorCommand) {
      onConfirmDoorCommand(confirmationCommand.doorCommand)
      setStatusMessage(getTrainDoorCommandStatusMessage(confirmationCommand.doorCommand))
    }

    if (confirmationCommand.kind === 'readiness-command') {
      const confirmedReadinessMode = getTrainReadinessModeFromCommand(confirmationCommand.command)

      onConfirmReadiness(confirmationCommand.command)
      setReadinessModeOverride(confirmedReadinessMode)
      setReadiness(getTrainReadinessRequestValue({ readinessMode: confirmedReadinessMode }))
      setStatusMessage(`Train readiness request ${confirmationCommand.command}\nCommand successful`)
    }

    setConfirmationCommand(null)
  }

  return (
    <div
      aria-label={`Inspecting Train ${trainNumber}`}
      className="train-inspector-window"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="train-inspector-titlebar" {...popupDrag.titleBarProps}>
        Inspecting: {trainRef} &nbsp; (TRT_ - TR____{train.id.padStart(4, '0')} - 27/12)
      </div>
      <div className="train-inspector-body">
        <div className="train-inspector-train-label">Train {trainIdentityLabel}</div>
        <div className="train-inspector-tabs">
          {renderTab('information', 'Information')}
          {renderTab('control', 'Control')}
          {renderTab('tag', 'Tag')}
        </div>

        <section className="train-inspector-panel">
          <div className="train-inspector-scrollarea" onScroll={updateInspectorScroll} ref={inspectorScrollRef}>
            {page === 'information' ? (
              <div className="train-inspector-page train-inspector-page--information">
                <InspectorInfoRow label="Train number" value={trainNumber} />
                <InspectorInfoRow label="Schedule number, given by ATC" value={scheduleNumber} />
                <InspectorInfoRow label="Train Readiness State" value={train.status === 'HOLD' ? 'AUTO HOLD' : 'AUTO MODE'} />
                <InspectorInfoRow label="Train Readiness Mode: Manual" value="NONE" />
                <InspectorInfoRow label="Train Readiness Mode: Auto" value={readinessInfoValue} />
                <InspectorInfoRow label="Train ITAMA Status" tone={itamaStatus === 'NOT GRANTED' ? 'red' : 'green'} value={itamaStatus} />
                <InspectorInfoRow label="Train Door Not Open/Close or Not Fully Open/Close" tone={doorFaultActive ? 'red' : 'green'} value={doorFaultActive ? 'YES' : 'NO'} />
                <InspectorInfoRow label="Train Door Summary Status" tone={doorFaultActive ? 'red' : 'green'} value={doorSummaryStatus} />
                <InspectorInfoRow label="Train Door Isolation Status" value={doorIsolationStatus} />
                <InspectorInfoRow label="Action Needed (from operator for recovery)" value={train.status === 'HOLD' || doorFaultActive ? 'YES' : 'NO'} />
                <InspectorInfoRow label="Train Emergency Brake" value={train.status === 'HOLD' || doorFaultActive ? 'APPLIED' : 'NOT APPLIED'} />
              </div>
            ) : null}

            {page === 'control' ? (
              <div className="train-inspector-page train-inspector-page--control">
                <fieldset className="train-inspector-fieldset">
                  <legend>CONTROL TRAIN ATC</legend>
                  <div className="train-inspector-atc">
                    <div className="train-inspector-command-grid">
                      <Win98HtmlButton onClick={() => recordStatus('PTI initialisation selected')}>PTI Initialisation</Win98HtmlButton>
                      <Win98HtmlButton onClick={openChangeEndsDialog}>Change of Ends Request</Win98HtmlButton>
                      <Win98HtmlButton onClick={() => openTrainTimeDialog('departure')}>Departure Time</Win98HtmlButton>
                      <Win98HtmlButton onClick={() => openTrainTimeDialog('arrival')}>Arrival Time</Win98HtmlButton>
                      <Win98HtmlButton onClick={() => recordStatus('Train hold command selected')}>Train Hold</Win98HtmlButton>
                      <Win98HtmlButton onClick={() => recordStatus('Skip stop command selected')}>Skip Stop</Win98HtmlButton>
                    </div>
                    <div className="train-inspector-request-grid">
                      <label htmlFor="train-readiness-request">Train Readiness Request</label>
                      <ScadaDropdown
                        id="train-readiness-request"
                        onChange={handleReadinessChange}
                        options={['Asleep', 'Depot movement', 'Mainline service', 'Mainline off service', 'HV isolated']}
                        value={readiness}
                      />
                      <span className={canRequestItamaAuthorisedPreparation ? undefined : 'is-muted'}>ITAMA AM/CM Authorised Preparation</span>
                      <Win98HtmlButton
                        disabled={!canRequestItamaAuthorisedPreparation}
                        onClick={() => requestItamaCommand('ITAMA AM/CM Authorised Preparation', 'itama-authorised-preparation')}
                      >
                        OK
                      </Win98HtmlButton>
                      <span className={canRequestItamaAuthorisedConfirmation ? undefined : 'is-muted'}>ITAMA AM/CM Authorised Confirmation</span>
                      <Win98HtmlButton
                        disabled={!canRequestItamaAuthorisedConfirmation}
                        onClick={() => requestItamaCommand('ITAMA AM/CM Authorised Confirmation', 'itama-authorised-confirmation')}
                      >
                        OK
                      </Win98HtmlButton>
                      <span className={canRequestItamaNotAuthorisedPreparation ? undefined : 'is-muted'}>ITAMA AM/CM Not Authorised Preparation</span>
                      <Win98HtmlButton
                        disabled={!canRequestItamaNotAuthorisedPreparation}
                        onClick={() => requestItamaCommand('ITAMA AM/CM Not Authorised Preparation', 'itama-not-authorised-preparation')}
                      >
                        OK
                      </Win98HtmlButton>
                      <span className={canRequestItamaNotAuthorisedConfirmation ? undefined : 'is-muted'}>ITAMA AM/CM Not Authorised Confirmation</span>
                      <Win98HtmlButton
                        disabled={!canRequestItamaNotAuthorisedConfirmation}
                        onClick={() => requestItamaCommand('ITAMA AM/CM Not Authorised Confirmation', 'itama-not-authorised-confirmation')}
                      >
                        OK
                      </Win98HtmlButton>
                      <label htmlFor="door-request">Door Open/Close Request</label>
                      <ScadaDropdown
                        id="door-request"
                        onChange={requestDoorCommand}
                        options={['', 'Cycle Door', 'Confirm Closed/Locked', 'Authorize door isolation', 'Authorize movement', 'Withdraw from service']}
                        value={doorRequest}
                      />
                      <label htmlFor="brake-reset-request">Emergency Brake Reset Request</label>
                      <ScadaDropdown
                        id="brake-reset-request"
                        onChange={(value) => {
                          setBrakeResetRequest(value)
                          recordStatus('Emergency brake reset selected')
                        }}
                        options={['', 'Reset', 'Cancel reset']}
                        value={brakeResetRequest}
                      />
                    </div>
                  </div>
                </fieldset>
              </div>
            ) : null}

            {page === 'tag' ? (
              <div className="train-inspector-page train-inspector-page--tag">
                <p>No active tag applied for Train {trainNumber}.</p>
                <Win98HtmlButton onClick={() => recordStatus('Tag page selected')}>Tag</Win98HtmlButton>
              </div>
            ) : null}
          </div>
          <TrainInspectorScrollbar
            axis="vertical"
            contentSize={inspectorScroll.scrollHeight}
            onChange={(nextValue) => setInspectorScrollPosition('vertical', nextValue)}
            value={inspectorScroll.top}
            viewportSize={inspectorScroll.clientHeight}
          />
          <TrainInspectorScrollbar
            axis="horizontal"
            contentSize={inspectorScroll.scrollWidth}
            onChange={(nextValue) => setInspectorScrollPosition('horizontal', nextValue)}
            value={inspectorScroll.left}
            viewportSize={inspectorScroll.clientWidth}
          />
          <span className="train-inspector-scrollbar-corner" />
        </section>

        <fieldset className="train-inspector-status">
          <legend>Status</legend>
          <output className="train-inspector-status-field">{statusMessage}</output>
        </fieldset>

        <div className="train-inspector-actions">
          <Win98HtmlButton onClick={() => recordStatus('Help selected')}>Help</Win98HtmlButton>
          <span />
<Win98HtmlButton onClick={onOpenDetails}>Details...</Win98HtmlButton>
          <Win98HtmlButton onClick={onClose}>Close</Win98HtmlButton>
        </div>
      </div>

      {confirmationCommand ? (
        <div
          className="train-command-confirmation"
          onPointerDown={(event) => event.stopPropagation()}
          style={confirmationDrag.style}
        >
          <div className="train-command-confirmation__title" {...confirmationDrag.titleBarProps}>Command confirmation</div>
          <fieldset>
            <legend>Please confirm command...</legend>
            <div className="train-command-confirmation__grid">
              <label>Equipment</label>
              <div>{trainRef} Train {trainNumber}</div>
              <label>Attribute</label>
              <div>{confirmationCommand.attribute}</div>
              <label>Command</label>
              <div>{confirmationCommand.command}</div>
              <label>No wait</label>
              <input type="checkbox" />
            </div>
          </fieldset>
          <div className="train-command-confirmation__actions">
            <Win98HtmlButton onClick={() => recordStatus('Help selected')}>Help</Win98HtmlButton>
            <span />
            <Win98HtmlButton onClick={confirmCommand}>Confirm</Win98HtmlButton>
            <Win98HtmlButton onClick={cancelCommand}>Cancel</Win98HtmlButton>
          </div>
        </div>
      ) : null}

      {trainTimeDialogKind ? (
        <TrainTimeDialog
          initialSelection={arrivalTimeSelection}
          key={`${train.id}-${trainTimeDialogKind}`}
          kind={trainTimeDialogKind}
          onApply={(message, selection) => {
            setStatusMessage(message)

            if (selection.kind === 'arrival') {
              onConfirmArrivalTime(selection)
            }
          }}
          onConfirmDeparture={onConfirmDepartureTime}
          onClose={() => setTrainTimeDialogKind(null)}
          train={train}
        />
      ) : null}

      {changeEndsDialogOpen ? (
        <ChangeEndsDialog
          currentDirection={currentDirection}
          defaultStation={nearestPlatform.code}
          onApply={(message) => setStatusMessage(message)}
          onClose={() => setChangeEndsDialogOpen(false)}
          train={train}
        />
      ) : null}
    </div>
  )
}

const ARRIVAL_TIME_STATION_OPTIONS = [
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
  'NED',
] as const
const ARRIVAL_TIME_STATION_MENU_OPTIONS = ARRIVAL_TIME_STATION_OPTIONS
const ARRIVAL_TIME_STATION_VISIBLE_ROWS = 8
const ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT = 132
const PLATFORM_SIDING_VISIBLE_ROWS = 6
const PLATFORM_SIDING_SCROLL_TRACK_HEIGHT = 90
const NED_PLATFORM_SIDING_OPTIONS = [
  'W4',
  'W3',
  'W2',
  'W1',
  'UC',
  'TTW',
  'TTE',
  'TT1N',
  'TT1',
  'T820',
  'S9W',
  'S9E',
  'S8W',
  'S8E',
  'S7W',
  'S7E',
  'S6W',
  'S6E',
  'S5W',
  'S5E',
  'S4W',
  'S4E',
  'S3W',
  'S3E',
  'S2W',
  'S2E',
  'S1W',
  'S1E',
  '12W',
  'S12E',
  'S10W',
  'S10E',
  'RT3D',
  'RT2D',
  'RT1D',
  'H5',
  'H3',
] as const
type TrainTimeSelection = {
  command: string
  kind: 'arrival' | 'departure'
  platformSiding: string
  station: string
}

function getPlatformSidingMenuOptions(station: string, direction: 'NB' | 'SB'): readonly string[] {
  if (!station) {
    return [] as const
  }

  if (station === 'NED') {
    return NED_PLATFORM_SIDING_OPTIONS
  }

  return getChangeEndsPlatformSidingMenuOptions(station, direction)
}

function getTrainServiceDirectionLabel(train: Pick<TrainState, 'direction' | 'service'>): 'NB' | 'SB' {
  if (train.service === 'NB' || train.service === 'SB') {
    return train.service
  }

  return train.direction === 'left' ? 'SB' : 'NB'
}

function getChangeEndsPlatformSidingMenuOptions(station: string, direction: 'NB' | 'SB'): readonly string[] {
  if (!station) {
    return [] as const
  }

  const preferred = `${station}${direction === 'NB' ? 'N' : 'S'}`
  const alternate = `${station}${direction === 'NB' ? 'S' : 'N'}`

  return [preferred, alternate] as const
}

function isRt2DepotArrivalDestination(selection: TrainTimeSelection | undefined) {
  return selection?.kind === 'arrival'
    && selection.station === 'NED'
    && selection.platformSiding === 'RT2D'
}

function hasTrainMovementDestination(selection: TrainTimeSelection | undefined) {
  return selection?.kind === 'arrival'
    && selection.station.trim().length > 0
    && selection.platformSiding.trim().length > 0
}

function ScadaNumberSpinner({
  ariaLabel,
  className = '',
  max,
  min = 0,
  onChange,
  onStep,
  padLength = 0,
  value,
}: {
  ariaLabel: string
  className?: string
  max?: number
  min?: number
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onStep: (delta: -1 | 1) => void
  padLength?: number
  value: string
}) {
  const numericValue = Number.parseInt(value, 10)
  const safeValue = Number.isFinite(numericValue) ? numericValue : min
  const displayValue = padLength > 0 ? safeValue.toString().padStart(padLength, '0') : String(safeValue)
  const atMin = safeValue <= min
  const atMax = max !== undefined && safeValue >= max

  return (
    <span className={`arrival-time-dialog__spinner ${className}`}>
      <input
        aria-label={ariaLabel}
        className="arrival-time-dialog__control arrival-time-dialog__spinner-input"
        max={max}
        min={min}
        onChange={onChange}
        type="text"
        value={displayValue}
      />
      <span className="arrival-time-dialog__spinner-buttons">
        <button
          aria-label={`${ariaLabel} up`}
          disabled={atMax}
          onClick={() => onStep(1)}
          type="button"
        >
          <i className="arrival-time-dialog__spinner-arrow arrival-time-dialog__spinner-arrow--up" />
        </button>
        <button
          aria-label={`${ariaLabel} down`}
          disabled={atMin}
          onClick={() => onStep(-1)}
          type="button"
        >
          <i className="arrival-time-dialog__spinner-arrow arrival-time-dialog__spinner-arrow--down" />
        </button>
      </span>
    </span>
  )
}

function TrainTimeDialog({
  initialSelection,
  kind,
  onApply,
  onConfirmDeparture,
  onClose,
  train,
}: {
  initialSelection?: TrainTimeSelection
  kind: 'arrival' | 'departure'
  onApply: (message: string, selection: TrainTimeSelection) => void
  onConfirmDeparture?: () => void
  onClose: () => void
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const confirmationDrag = usePopupDrag()
  const trainNumber = train.id.padStart(3, '0')
  const trainRef = `EMU/${trainNumber}/TRN/XXXXXXXX`
  const timeLabel = kind === 'arrival' ? 'Arrival Time' : 'Departure Time'
  const commandLabel = kind === 'arrival' ? 'arrival' : 'departure'
  const [arrivalTime, setArrivalTime] = useState({
    hh: '00',
    mm: '00',
    ss: '00',
  })
  const [station, setStation] = useState(initialSelection?.station ?? '')
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [stationScrollIndex, setStationScrollIndex] = useState(0)
  const [stationScrollDrag, setStationScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [platformSiding, setPlatformSiding] = useState(initialSelection?.platformSiding ?? '')
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
  const [platformScrollIndex, setPlatformScrollIndex] = useState(0)
  const [platformScrollDrag, setPlatformScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [peakMode, setPeakMode] = useState<'peak' | 'not-peak'>('peak')
  const [threshold, setThreshold] = useState('0')
  const [status, setStatus] = useState('')
  const [timeConfirmationCommand, setTimeConfirmationCommand] = useState<string | null>(null)
  const serviceDirection = getTrainServiceDirectionLabel(train)
  const platformSidingMenuOptions = getPlatformSidingMenuOptions(station, serviceDirection)
  const stationScrollMax = Math.max(0, ARRIVAL_TIME_STATION_MENU_OPTIONS.length - ARRIVAL_TIME_STATION_VISIBLE_ROWS)
  const platformScrollMax = Math.max(0, platformSidingMenuOptions.length - PLATFORM_SIDING_VISIBLE_ROWS)
  const visibleStationOptions = ARRIVAL_TIME_STATION_MENU_OPTIONS.slice(
    stationScrollIndex,
    stationScrollIndex + ARRIVAL_TIME_STATION_VISIBLE_ROWS,
  )
  const visiblePlatformOptions = platformSidingMenuOptions.slice(
    platformScrollIndex,
    platformScrollIndex + PLATFORM_SIDING_VISIBLE_ROWS,
  )
  const stationThumbHeight = Math.max(
    28,
    Math.round((ARRIVAL_TIME_STATION_VISIBLE_ROWS / ARRIVAL_TIME_STATION_MENU_OPTIONS.length) * ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT),
  )
  const platformThumbHeight = Math.max(
    28,
    platformSidingMenuOptions.length > 0
      ? Math.round((Math.min(PLATFORM_SIDING_VISIBLE_ROWS, platformSidingMenuOptions.length) / platformSidingMenuOptions.length) * PLATFORM_SIDING_SCROLL_TRACK_HEIGHT)
      : PLATFORM_SIDING_SCROLL_TRACK_HEIGHT,
  )
  const stationThumbTop = stationScrollMax > 0
    ? Math.round((stationScrollIndex / stationScrollMax) * (ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT - stationThumbHeight))
    : 0
  const platformThumbTop = platformScrollMax > 0
    ? Math.round((platformScrollIndex / platformScrollMax) * (PLATFORM_SIDING_SCROLL_TRACK_HEIGHT - platformThumbHeight))
    : 0

  const setStationScroll = (nextIndex: number) => {
    setStationScrollIndex(Math.max(0, Math.min(stationScrollMax, nextIndex)))
  }

  const setPlatformScroll = (nextIndex: number) => {
    setPlatformScrollIndex(Math.max(0, Math.min(platformScrollMax, nextIndex)))
  }

  const selectStation = (nextStation: string) => {
    setStation(nextStation)
    setStationDropdownOpen(false)
    setPlatformDropdownOpen(false)
    setPlatformScrollIndex(0)

    setPlatformSiding(getPlatformSidingMenuOptions(nextStation, serviceDirection)[0] ?? '')
  }

  const selectPlatformSiding = (nextPlatformSiding: string) => {
    setPlatformSiding(nextPlatformSiding)
    setPlatformDropdownOpen(false)
  }

  const handleStationScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = ARRIVAL_TIME_STATION_VISIBLE_ROWS - 1

    setStationScroll(clickY < stationThumbTop ? stationScrollIndex - pageSize : stationScrollIndex + pageSize)
  }

  const handlePlatformScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = PLATFORM_SIDING_VISIBLE_ROWS - 1

    setPlatformScroll(clickY < platformThumbTop ? platformScrollIndex - pageSize : platformScrollIndex + pageSize)
  }

  const startStationThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setStationScrollDrag({
      startIndex: stationScrollIndex,
      startY: event.clientY,
    })
  }

  const startPlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setPlatformScrollDrag({
      startIndex: platformScrollIndex,
      startY: event.clientY,
    })
  }

  const handleStationThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!stationScrollDrag || stationScrollMax === 0) {
      return
    }

    const thumbTravel = ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT - stationThumbHeight
    const dragRatio = (event.clientY - stationScrollDrag.startY) / thumbTravel

    setStationScroll(stationScrollDrag.startIndex + Math.round(dragRatio * stationScrollMax))
  }

  const handlePlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!platformScrollDrag || platformScrollMax === 0) {
      return
    }

    const thumbTravel = PLATFORM_SIDING_SCROLL_TRACK_HEIGHT - platformThumbHeight
    const dragRatio = (event.clientY - platformScrollDrag.startY) / thumbTravel

    setPlatformScroll(platformScrollDrag.startIndex + Math.round(dragRatio * platformScrollMax))
  }

  const setTimeFieldValue = (field: 'hh' | 'mm' | 'ss', value: number, maxValue: number) => {
    const safeValue = Math.min(maxValue, Math.max(0, value))

    setArrivalTime((current) => ({
      ...current,
      [field]: safeValue.toString().padStart(2, '0'),
    }))
  }

  const updateArrivalTime = (field: 'hh' | 'mm' | 'ss', maxValue: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const parsedValue = Number.parseInt(event.currentTarget.value, 10)

    setTimeFieldValue(field, Number.isFinite(parsedValue) ? parsedValue : 0, maxValue)
  }

  const stepArrivalTime = (field: 'hh' | 'mm' | 'ss', maxValue: number, delta: -1 | 1) => {
    setTimeFieldValue(field, (Number.parseInt(arrivalTime[field], 10) || 0) + delta, maxValue)
  }

  const updateThreshold = (event: ChangeEvent<HTMLInputElement>) => {
    const parsedValue = Number.parseInt(event.currentTarget.value, 10)

    setThreshold(String(Math.max(0, Number.isFinite(parsedValue) ? parsedValue : 0)))
  }

  const stepThreshold = (delta: -1 | 1) => {
    setThreshold((current) => String(Math.max(0, (Number.parseInt(current, 10) || 0) + delta)))
  }

  const getArrivalTimeCommand = () => {
    const formattedTime = [arrivalTime.hh, arrivalTime.mm, arrivalTime.ss]
      .map((value) => Number.parseInt(value, 10) || 0)
      .join(':')
    const peakFlag = peakMode === 'peak' ? '1' : '0'
    const regulationHold = Math.max(0, Number.parseInt(threshold, 10) || 0)

    return `${platformSiding} - ${formattedTime} - ${peakFlag} - ${regulationHold}`
  }

  const applyArrivalTime = () => {
    setTimeConfirmationCommand(getArrivalTimeCommand())
  }

  const confirmArrivalTime = () => {
    const nextStatus = `Train ${commandLabel} time setting\nCommand successful`
    const selection: TrainTimeSelection = {
      command: timeConfirmationCommand ?? getArrivalTimeCommand(),
      kind,
      platformSiding,
      station,
    }

    setStatus(nextStatus)
    onApply(nextStatus, selection)
    setTimeConfirmationCommand(null)

    if (kind === 'departure') {
      onConfirmDeparture?.()
      onClose()
    }
  }

  return (
    <div
      className="arrival-time-dialog"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="arrival-time-dialog__title" {...popupDrag.titleBarProps}>SIG {timeLabel} for Train : {trainRef}</div>
      <div className="arrival-time-dialog__body">
        <fieldset className="arrival-time-dialog__fieldset arrival-time-dialog__fieldset--area">
          <legend>Area Selection</legend>
          <div className="arrival-time-dialog__area-grid">
            <label htmlFor="arrival-time-station">Station</label>
            <label htmlFor="arrival-time-platform">Platform / Siding</label>
            <div className="arrival-time-dialog__station-combo">
              <button
                aria-expanded={stationDropdownOpen}
                aria-haspopup="listbox"
                className="arrival-time-dialog__control arrival-time-dialog__station-trigger"
                id="arrival-time-station"
                onClick={() => setStationDropdownOpen((open) => !open)}
                type="button"
              >
                <span>{station}</span>
                <i aria-hidden="true" />
              </button>
              {stationDropdownOpen ? (
                <div
                  className="arrival-time-dialog__station-list"
                  onWheel={(event) => {
                    event.preventDefault()
                    setStationScroll(stationScrollIndex + (event.deltaY > 0 ? 1 : -1))
                  }}
                  role="listbox"
                >
                  <div className="arrival-time-dialog__station-options">
                    {visibleStationOptions.map((stationOption) => (
                      <button
                        aria-selected={station === stationOption}
                        className={station === stationOption ? 'is-selected' : undefined}
                        key={stationOption || 'blank'}
                        onClick={() => selectStation(stationOption)}
                        role="option"
                        type="button"
                      >
                        {stationOption || '\u00a0'}
                      </button>
                    ))}
                  </div>
                  <div className="arrival-time-dialog__station-scrollbar">
                    <button
                      disabled={stationScrollIndex === 0}
                      onClick={() => setStationScroll(stationScrollIndex - 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
                    </button>
                    <div
                      className="arrival-time-dialog__station-scroll-track"
                      onPointerDown={handleStationScrollTrackPointerDown}
                    >
                      <span
                        className="arrival-time-dialog__station-scroll-thumb"
                        onPointerCancel={() => setStationScrollDrag(null)}
                        onPointerDown={startStationThumbDrag}
                        onPointerMove={handleStationThumbDrag}
                        onPointerUp={() => setStationScrollDrag(null)}
                        style={{ height: stationThumbHeight, top: stationThumbTop }}
                      />
                    </div>
                    <button
                      disabled={stationScrollIndex === stationScrollMax}
                      onClick={() => setStationScroll(stationScrollIndex + 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="arrival-time-dialog__platform-combo">
              <button
                aria-expanded={platformDropdownOpen}
                aria-haspopup="listbox"
                className="arrival-time-dialog__control arrival-time-dialog__station-trigger arrival-time-dialog__platform-trigger"
                id="arrival-time-platform"
                onClick={() => setPlatformDropdownOpen((open) => !open)}
                type="button"
              >
                <span>{platformSiding}</span>
                <i aria-hidden="true" />
              </button>
              {platformDropdownOpen ? (
                <div
                  className="arrival-time-dialog__station-list arrival-time-dialog__platform-list"
                  onWheel={(event) => {
                    event.preventDefault()
                    setPlatformScroll(platformScrollIndex + (event.deltaY > 0 ? 1 : -1))
                  }}
                  role="listbox"
                >
                  <div className="arrival-time-dialog__station-options arrival-time-dialog__platform-options">
                    {visiblePlatformOptions.map((platformOption) => (
                      <button
                        aria-selected={platformSiding === platformOption}
                        className={platformSiding === platformOption ? 'is-selected' : undefined}
                        key={platformOption || 'blank-platform'}
                        onClick={() => selectPlatformSiding(platformOption)}
                        role="option"
                        type="button"
                      >
                        {platformOption || '\u00a0'}
                      </button>
                    ))}
                  </div>
                  <div className="arrival-time-dialog__station-scrollbar">
                    <button
                      disabled={platformScrollIndex === 0}
                      onClick={() => setPlatformScroll(platformScrollIndex - 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
                    </button>
                    <div
                      className="arrival-time-dialog__station-scroll-track"
                      onPointerDown={handlePlatformScrollTrackPointerDown}
                    >
                      <span
                        className="arrival-time-dialog__station-scroll-thumb"
                        onPointerCancel={() => setPlatformScrollDrag(null)}
                        onPointerDown={startPlatformThumbDrag}
                        onPointerMove={handlePlatformThumbDrag}
                        onPointerUp={() => setPlatformScrollDrag(null)}
                        style={{ height: platformThumbHeight, top: platformThumbTop }}
                      />
                    </div>
                    <button
                      disabled={platformScrollIndex === platformScrollMax}
                      onClick={() => setPlatformScroll(platformScrollIndex + 1)}
                      type="button"
                    >
                      <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </fieldset>

        <div className="arrival-time-dialog__settings">
          <fieldset className="arrival-time-dialog__fieldset">
            <legend>{timeLabel}</legend>
            <div className="arrival-time-dialog__time-labels" aria-hidden="true">
              <span>hh</span>
              <span>:</span>
              <span>mm</span>
              <span>:</span>
              <span>ss</span>
            </div>
            <div className="arrival-time-dialog__time-grid">
              <ScadaNumberSpinner
                ariaLabel="Hours"
                className="arrival-time-dialog__time-spinner"
                max={23}
                min={0}
                onChange={updateArrivalTime('hh', 23)}
                onStep={(delta) => stepArrivalTime('hh', 23, delta)}
                padLength={2}
                value={arrivalTime.hh}
              />
              <ScadaNumberSpinner
                ariaLabel="Minutes"
                className="arrival-time-dialog__time-spinner"
                max={59}
                min={0}
                onChange={updateArrivalTime('mm', 59)}
                onStep={(delta) => stepArrivalTime('mm', 59, delta)}
                padLength={2}
                value={arrivalTime.mm}
              />
              <ScadaNumberSpinner
                ariaLabel="Seconds"
                className="arrival-time-dialog__time-spinner"
                max={59}
                min={0}
                onChange={updateArrivalTime('ss', 59)}
                onStep={(delta) => stepArrivalTime('ss', 59, delta)}
                padLength={2}
                value={arrivalTime.ss}
              />
            </div>
          </fieldset>

          <fieldset className="arrival-time-dialog__fieldset">
            <legend>Peak / Off Peak</legend>
            <label className="arrival-time-dialog__radio">
              <input
                checked={peakMode === 'peak'}
                name="arrival-time-peak-mode"
                onChange={() => setPeakMode('peak')}
                type="radio"
              />
              <span>Peak</span>
            </label>
            <label className="arrival-time-dialog__radio">
              <input
                checked={peakMode === 'not-peak'}
                name="arrival-time-peak-mode"
                onChange={() => setPeakMode('not-peak')}
                type="radio"
              />
              <span>Not Peak</span>
            </label>
          </fieldset>

          <fieldset className="arrival-time-dialog__fieldset">
            <legend>Regulation Threshold</legend>
            <ScadaNumberSpinner
              ariaLabel="Regulation Threshold"
              className="arrival-time-dialog__threshold"
              min={0}
              onChange={updateThreshold}
              onStep={stepThreshold}
              value={threshold}
            />
          </fieldset>
        </div>

        <fieldset className="arrival-time-dialog__fieldset arrival-time-dialog__fieldset--status">
          <legend>Status</legend>
          <output>{status}</output>
        </fieldset>

        <div className="arrival-time-dialog__actions">
          <Win98HtmlButton onClick={() => setStatus('Help selected')}>Help</Win98HtmlButton>
          <span />
          <Win98HtmlButton onClick={applyArrivalTime}>Apply</Win98HtmlButton>
          <Win98HtmlButton onClick={onClose}>Close</Win98HtmlButton>
        </div>
      </div>

      {timeConfirmationCommand ? (
        <div
          className="train-command-confirmation arrival-time-command-confirmation"
          onPointerDown={(event) => event.stopPropagation()}
          style={confirmationDrag.style}
        >
          <div className="train-command-confirmation__title" {...confirmationDrag.titleBarProps}>Command confirmation</div>
          <fieldset>
            <legend>Please confirm command...</legend>
            <div className="train-command-confirmation__grid">
              <label>Equipment</label>
              <div>{trainRef} {'{'}Train {trainNumber}{'}'}</div>
              <label>Attribute</label>
              <div>Set {commandLabel} time</div>
              <label>Command</label>
              <div>{timeConfirmationCommand}</div>
              <label>No wait</label>
              <input type="checkbox" />
            </div>
          </fieldset>
          <div className="train-command-confirmation__actions">
            <Win98HtmlButton onClick={() => setStatus('Help selected')}>Help</Win98HtmlButton>
            <span />
            <Win98HtmlButton onClick={confirmArrivalTime}>Confirm</Win98HtmlButton>
            <Win98HtmlButton onClick={() => setTimeConfirmationCommand(null)}>Cancel</Win98HtmlButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ChangeEndsDialog({
  currentDirection,
  defaultStation,
  onApply,
  onClose,
  train,
}: {
  currentDirection: 'NB' | 'SB'
  defaultStation: string
  onApply: (message: string) => void
  onClose: () => void
  train: TrainState
}) {
  const popupDrag = usePopupDrag()
  const trainRef = `EMU/${train.id.padStart(3, '0')}/TRN/XXXXXXXX`
  const [station, setStation] = useState(defaultStation)
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [stationScrollIndex, setStationScrollIndex] = useState(0)
  const [stationScrollDrag, setStationScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [platformSiding, setPlatformSiding] = useState(() => {
    const options = getChangeEndsPlatformSidingMenuOptions(defaultStation, currentDirection)
    return options[0] ?? ''
  })
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
  const [platformScrollIndex, setPlatformScrollIndex] = useState(0)
  const [platformScrollDrag, setPlatformScrollDrag] = useState<{ startIndex: number; startY: number } | null>(null)
  const [status, setStatus] = useState('')
  const stationOptions = ARRIVAL_TIME_STATION_MENU_OPTIONS
  const platformOptions = getChangeEndsPlatformSidingMenuOptions(station, currentDirection)
  const stationScrollMax = Math.max(0, stationOptions.length - ARRIVAL_TIME_STATION_VISIBLE_ROWS)
  const platformScrollMax = Math.max(0, platformOptions.length - PLATFORM_SIDING_VISIBLE_ROWS)
  const visibleStationOptions = stationOptions.slice(stationScrollIndex, stationScrollIndex + ARRIVAL_TIME_STATION_VISIBLE_ROWS)
  const visiblePlatformOptions = platformOptions.slice(platformScrollIndex, platformScrollIndex + PLATFORM_SIDING_VISIBLE_ROWS)
  const stationThumbHeight = Math.max(
    28,
    Math.round((ARRIVAL_TIME_STATION_VISIBLE_ROWS / stationOptions.length) * ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT),
  )
  const platformThumbHeight = Math.max(
    28,
    platformOptions.length > 0
      ? Math.round((Math.min(PLATFORM_SIDING_VISIBLE_ROWS, platformOptions.length) / platformOptions.length) * PLATFORM_SIDING_SCROLL_TRACK_HEIGHT)
      : PLATFORM_SIDING_SCROLL_TRACK_HEIGHT,
  )
  const stationThumbTop = stationScrollMax > 0
    ? Math.round((stationScrollIndex / stationScrollMax) * (ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT - stationThumbHeight))
    : 0
  const platformThumbTop = platformScrollMax > 0
    ? Math.round((platformScrollIndex / platformScrollMax) * (PLATFORM_SIDING_SCROLL_TRACK_HEIGHT - platformThumbHeight))
    : 0

  useEffect(() => {
    setStation(defaultStation)
    setPlatformSiding(getChangeEndsPlatformSidingMenuOptions(defaultStation, currentDirection)[0] ?? '')
    setStationDropdownOpen(false)
    setPlatformDropdownOpen(false)
    setStationScrollIndex(0)
    setPlatformScrollIndex(0)
    setStatus('')
  }, [currentDirection, defaultStation, train.id])

  const setStationScroll = (nextIndex: number) => {
    setStationScrollIndex(Math.max(0, Math.min(stationScrollMax, nextIndex)))
  }

  const setPlatformScroll = (nextIndex: number) => {
    setPlatformScrollIndex(Math.max(0, Math.min(platformScrollMax, nextIndex)))
  }

  const selectStation = (nextStation: string) => {
    setStation(nextStation)
    setStationDropdownOpen(false)
    setPlatformDropdownOpen(false)
    setPlatformScrollIndex(0)
    setPlatformSiding(getChangeEndsPlatformSidingMenuOptions(nextStation, currentDirection)[0] ?? '')
  }

  const selectPlatformSiding = (nextPlatformSiding: string) => {
    setPlatformSiding(nextPlatformSiding)
    setPlatformDropdownOpen(false)
  }

  const handleStationScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = ARRIVAL_TIME_STATION_VISIBLE_ROWS - 1

    setStationScroll(clickY < stationThumbTop ? stationScrollIndex - pageSize : stationScrollIndex + pageSize)
  }

  const handlePlatformScrollTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    const trackTop = event.currentTarget.getBoundingClientRect().top
    const clickY = event.clientY - trackTop
    const pageSize = PLATFORM_SIDING_VISIBLE_ROWS - 1

    setPlatformScroll(clickY < platformThumbTop ? platformScrollIndex - pageSize : platformScrollIndex + pageSize)
  }

  const startStationThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setStationScrollDrag({
      startIndex: stationScrollIndex,
      startY: event.clientY,
    })
  }

  const startPlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setPlatformScrollDrag({
      startIndex: platformScrollIndex,
      startY: event.clientY,
    })
  }

  const handleStationThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!stationScrollDrag || stationScrollMax <= 0) {
      return
    }

    const dragRange = ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT - stationThumbHeight
    if (dragRange <= 0) {
      return
    }

    const dragRatio = (event.clientY - stationScrollDrag.startY) / dragRange
    setStationScroll(stationScrollDrag.startIndex + Math.round(dragRatio * stationScrollMax))
  }

  const handlePlatformThumbDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!platformScrollDrag || platformScrollMax <= 0) {
      return
    }

    const dragRange = PLATFORM_SIDING_SCROLL_TRACK_HEIGHT - platformThumbHeight
    if (dragRange <= 0) {
      return
    }

    const dragRatio = (event.clientY - platformScrollDrag.startY) / dragRange
    setPlatformScroll(platformScrollDrag.startIndex + Math.round(dragRatio * platformScrollMax))
  }

  const applyChangeEnds = () => {
    const nextStatus = `Change of ends request ${station} ${platformSiding}\nCommand successful`
    setStatus(nextStatus)
    onApply(nextStatus)
  }

  return (
    <div
      className="arrival-time-dialog change-ends-dialog"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      style={popupDrag.style}
    >
      <div className="arrival-time-dialog__title" {...popupDrag.titleBarProps}>SIG Change End Request for Train : {trainRef}</div>
      <div className="arrival-time-dialog__body change-ends-dialog__body">
        <div className="change-ends-dialog__top-row">
          <fieldset className="arrival-time-dialog__fieldset change-ends-dialog__fieldset">
            <legend>Area Selection</legend>
            <div className="arrival-time-dialog__area-grid">
              <label htmlFor="change-ends-station">Station</label>
              <label htmlFor="change-ends-platform">Platform</label>
              <div className="arrival-time-dialog__station-combo change-ends-dialog__station-combo">
                <button
                  aria-expanded={stationDropdownOpen}
                  aria-haspopup="listbox"
                  className="arrival-time-dialog__control arrival-time-dialog__station-trigger change-ends-dialog__station-trigger"
                  id="change-ends-station"
                  onClick={() => setStationDropdownOpen((open) => !open)}
                  type="button"
                >
                  <span>{station}</span>
                  <i aria-hidden="true" />
                </button>
                {stationDropdownOpen ? (
                  <div
                    className="arrival-time-dialog__station-list change-ends-dialog__station-list"
                    onWheel={(event) => {
                      event.preventDefault()
                      setStationScroll(stationScrollIndex + (event.deltaY > 0 ? 1 : -1))
                    }}
                    role="listbox"
                  >
                    <div className="arrival-time-dialog__station-options">
                      {visibleStationOptions.map((stationOption) => (
                        <button
                          aria-selected={station === stationOption}
                          className={station === stationOption ? 'is-selected' : undefined}
                          key={stationOption || 'blank'}
                          onClick={() => selectStation(stationOption)}
                          role="option"
                          type="button"
                        >
                          {stationOption || '\u00a0'}
                        </button>
                      ))}
                    </div>
                    <div className="arrival-time-dialog__station-scrollbar">
                      <button
                        disabled={stationScrollIndex === 0}
                        onClick={() => setStationScroll(stationScrollIndex - 1)}
                        type="button"
                      >
                        <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
                      </button>
                      <div
                        className="arrival-time-dialog__station-scroll-track"
                        onPointerDown={handleStationScrollTrackPointerDown}
                      >
                        <span
                          className="arrival-time-dialog__station-scroll-thumb"
                          onPointerCancel={() => setStationScrollDrag(null)}
                          onPointerDown={startStationThumbDrag}
                          onPointerMove={handleStationThumbDrag}
                          onPointerUp={() => setStationScrollDrag(null)}
                          style={{ height: stationThumbHeight, top: stationThumbTop }}
                        />
                      </div>
                      <button
                        disabled={stationScrollIndex === stationScrollMax}
                        onClick={() => setStationScroll(stationScrollIndex + 1)}
                        type="button"
                      >
                        <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="arrival-time-dialog__platform-combo">
                <button
                  aria-expanded={platformDropdownOpen}
                  aria-haspopup="listbox"
                  className="arrival-time-dialog__control arrival-time-dialog__station-trigger arrival-time-dialog__platform-trigger"
                  id="change-ends-platform"
                  onClick={() => setPlatformDropdownOpen((open) => !open)}
                  type="button"
                >
                  <span>{platformSiding}</span>
                  <i aria-hidden="true" />
                </button>
                {platformDropdownOpen ? (
                  <div
                    className="arrival-time-dialog__station-list arrival-time-dialog__platform-list change-ends-dialog__platform-list"
                    onWheel={(event) => {
                      event.preventDefault()
                      setPlatformScroll(platformScrollIndex + (event.deltaY > 0 ? 1 : -1))
                    }}
                    role="listbox"
                  >
                    <div className="arrival-time-dialog__station-options arrival-time-dialog__platform-options">
                      {visiblePlatformOptions.map((platformOption) => (
                        <button
                          aria-selected={platformSiding === platformOption}
                          className={platformSiding === platformOption ? 'is-selected' : undefined}
                          key={platformOption || 'blank-platform'}
                          onClick={() => selectPlatformSiding(platformOption)}
                          role="option"
                          type="button"
                        >
                          {platformOption || '\u00a0'}
                        </button>
                      ))}
                    </div>
                    <div className="arrival-time-dialog__station-scrollbar">
                      <button
                        disabled={platformScrollIndex === 0}
                        onClick={() => setPlatformScroll(platformScrollIndex - 1)}
                        type="button"
                      >
                        <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--up" />
                      </button>
                      <div
                        className="arrival-time-dialog__station-scroll-track"
                        onPointerDown={handlePlatformScrollTrackPointerDown}
                      >
                        <span
                          className="arrival-time-dialog__station-scroll-thumb"
                          onPointerCancel={() => setPlatformScrollDrag(null)}
                          onPointerDown={startPlatformThumbDrag}
                          onPointerMove={handlePlatformThumbDrag}
                          onPointerUp={() => setPlatformScrollDrag(null)}
                          style={{ height: platformThumbHeight, top: platformThumbTop }}
                        />
                      </div>
                      <button
                        disabled={platformScrollIndex === platformScrollMax}
                        onClick={() => setPlatformScroll(platformScrollIndex + 1)}
                        type="button"
                      >
                        <i className="arrival-time-dialog__station-scroll-arrow arrival-time-dialog__station-scroll-arrow--down" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </fieldset>

          <fieldset className="arrival-time-dialog__fieldset change-ends-dialog__direction-fieldset">
            <legend>Current train direction</legend>
            <label className="arrival-time-dialog__radio change-ends-dialog__radio">
              <input checked={currentDirection === 'NB'} name="change-ends-direction" readOnly type="radio" />
              <span>NB</span>
            </label>
            <label className="arrival-time-dialog__radio change-ends-dialog__radio">
              <input checked={currentDirection === 'SB'} name="change-ends-direction" readOnly type="radio" />
              <span>SB</span>
            </label>
          </fieldset>
        </div>

        <fieldset className="arrival-time-dialog__fieldset arrival-time-dialog__fieldset--status change-ends-dialog__status-fieldset">
          <legend>Status</legend>
          <output>{status}</output>
        </fieldset>

        <div className="arrival-time-dialog__actions change-ends-dialog__actions">
          <Win98HtmlButton onClick={() => setStatus('Help selected')}>Help</Win98HtmlButton>
          <span />
          <Win98HtmlButton onClick={applyChangeEnds}>Apply</Win98HtmlButton>
          <Win98HtmlButton onClick={onClose}>Close</Win98HtmlButton>
        </div>
      </div>
    </div>
  )
}

function Win98HtmlButton({
  children,
  disabled = false,
  onClick,
  pressed = false,
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  pressed?: boolean
}) {
  return (
    <button
      className={`train-inspector-button ${pressed ? 'is-toggle-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
function MonitorCanvas({
  onNavigate,
  session,
  updateSession,
}: {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}) {
  const [panX, setPanX] = useState<number>(DEFAULT_LINE_MAP_PAN)
  const [inspectorPanel, setInspectorPanel] = useState<{ page: InspectorPage; trainId: string } | null>(null)
  const [auxiliaryPanel, setAuxiliaryPanel] = useState<{ trainId: string; view: TrainAuxiliaryView } | null>(null)
  const [itamaTrainId, setItamaTrainId] = useState('')
  const [pendingCommand, setPendingCommand] = useState<TrainCommand | null>(null)
  const [defineRouteSignal, setDefineRouteSignal] = useState<LineMapSignalData | null>(null)
  const [signalMenu, setSignalMenu] = useState<SignalMenuState | null>(null)
  const [trainMenu, setTrainMenu] = useState<{ trainId: string; x: number; y: number } | null>(null)
  const [trainItamaStatusOverrides, setTrainItamaStatusOverrides] = useState<Record<string, 'GRANTED' | 'NOT_GRANTED'>>({})
  const [trainReadinessModeOverrides, setTrainReadinessModeOverrides] = useState<Record<string, TrainReadinessMode>>({})
  const [trainArrivalDestinations, setTrainArrivalDestinations] = useState<Record<string, TrainTimeSelection>>({})
  const [lineMapRouteSegmentOverrides, setLineMapRouteSegmentOverrides] = useState<LineMapRuntimeState['routeSegments']>({})
  const panAnimationRef = useRef<number | null>(null)
  const trainRouteAnimationRef = useRef<number | null>(null)
  const train314RouteStepIndexRef = useRef<number | null>(null)
  const panTargetRef = useRef<number>(DEFAULT_LINE_MAP_PAN)
  const panValueRef = useRef<number>(DEFAULT_LINE_MAP_PAN)
  const dragRef = useRef<{ startX: number; startPan: number } | null>(null)
  const sessionLineMap = normalizeLineMapRuntimeState(session.lineMap)
  const renderedTrains = session.trains.map((train) => {
    const itamaStatus = trainItamaStatusOverrides[train.id]
    const readinessMode = trainReadinessModeOverrides[train.id]
    const routeStep = getTrainRouteStepFromLineMap(sessionLineMap, train.id)
    const routePinnedTrain = routeStep
      ? {
          ...train,
          direction: 'left' as const,
          x: routeStep.point.x,
          y: routeStep.point.y,
        }
      : train

    return itamaStatus || readinessMode
      ? {
          ...routePinnedTrain,
          ...(itamaStatus
            ? {
                itamaGranted: itamaStatus === 'GRANTED',
                itamaStatus,
              }
            : {}),
          ...(readinessMode ? { readinessMode } : {}),
        }
      : routePinnedTrain
  })
  const selectedTrain = renderedTrains.find((train) => train.id === session.selectedTrainId)
  const inspectorTrain = inspectorPanel ? renderedTrains.find((train) => train.id === inspectorPanel.trainId) : undefined
  const auxiliaryTrain = auxiliaryPanel ? renderedTrains.find((train) => train.id === auxiliaryPanel.trainId) : undefined
  const itamaTrain = itamaTrainId ? renderedTrains.find((train) => train.id === itamaTrainId) : undefined
  const menuTrain = trainMenu ? renderedTrains.find((train) => train.id === trainMenu.trainId) : undefined
  const trainOccupancyRouteSegments = createTrainOccupancyRouteSegmentStates(renderedTrains, sessionLineMap)
  const renderedRouteSegments = {
    ...lineMapRouteSegmentOverrides,
    ...sessionLineMap.routeSegments,
    ...trainOccupancyRouteSegments,
  }

  const renderedLineMap: LineMapRuntimeState = {
    ...sessionLineMap,
    routeSegments: renderedRouteSegments,
  }

  useEffect(() => {
    const routeStepIndex = getTrainRouteStepIndexFromLineMap(session.lineMap, '314', TRAIN_314_S610_TO_RT2_ROUTE_STEPS)

    if (routeStepIndex !== undefined) {
      train314RouteStepIndexRef.current = routeStepIndex
    }
  }, [session.lineMap])

  useEffect(() => {
    updateSession((current) => {
      let changed = false
      const trains = current.trains.map((currentTrain) => {
        const currentRouteStep = getTrainRouteStepFromLineMap(current.lineMap, currentTrain.id)

        if (!currentRouteStep) {
          return currentTrain
        }

        if (
          currentTrain.x === currentRouteStep.point.x
          && currentTrain.y === currentRouteStep.point.y
          && currentTrain.direction === 'left'
        ) {
          return currentTrain
        }

        changed = true

        return {
          ...currentTrain,
          direction: 'left' as const,
          service: 'SB',
          x: currentRouteStep.point.x,
          y: currentRouteStep.point.y,
        }
      })

      return changed
        ? {
            ...current,
            trains,
          }
        : current
    })
  }, [session.lineMap, updateSession])
  const defineRouteSetLabels = defineRouteSignal
    ? getSignalRouteLabels(defineRouteSignal).filter((routeLabel) => (
      getSignalRuntimeRouteSegmentIdsForRoute(defineRouteSignal, routeLabel)
        .some((segmentId) => isSignalRouteCommandState(renderedLineMap.routeSegments[segmentId]))
    ))
    : []
  const defineRouteSet = defineRouteSetLabels.length > 0

  const cancelPanAnimation = useCallback(() => {
    if (panAnimationRef.current !== null) {
      window.cancelAnimationFrame(panAnimationRef.current)
      panAnimationRef.current = null
    }
  }, [])

  const cancelTrainRouteAnimation = useCallback(() => {
    if (trainRouteAnimationRef.current !== null) {
      window.clearTimeout(trainRouteAnimationRef.current)
      trainRouteAnimationRef.current = null
    }
  }, [])

  useEffect(() => {
    if (session.scenarioMode !== 'IDLE' || session.scenarioStep !== 0) {
      return
    }

    cancelTrainRouteAnimation()
    train314RouteStepIndexRef.current = null
    setTrainArrivalDestinations({})
    setLineMapRouteSegmentOverrides({})
  }, [cancelTrainRouteAnimation, session.scenarioMode, session.scenarioStep, session.sessionMeta.createdAt])

  const setPanImmediate = useCallback((value: number) => {
    const nextPan = clampPan(value)

    cancelPanAnimation()
    panTargetRef.current = nextPan
    panValueRef.current = nextPan
    setPanX(nextPan)
  }, [cancelPanAnimation])

  const panTo = useCallback((value: number) => {
    setPanImmediate(value)
  }, [setPanImmediate])

  const panBy = useCallback((distance: number) => {
    const currentPan = snapLineMapPan(panTargetRef.current)
    const currentIndex = LINE_VIEWPORT_PANS.indexOf(currentPan as (typeof LINE_VIEWPORT_PANS)[number])
    const nextIndex = Math.min(
      LINE_VIEWPORT_PANS.length - 1,
      Math.max(0, currentIndex + (distance >= 0 ? 1 : -1)),
    )

    setPanImmediate(LINE_VIEWPORT_PANS[nextIndex])
  }, [setPanImmediate])

  const toggleCycleMode = () => {
    updateSession((current) => ({
      ...current,
      cycleMode: current.cycleMode === 'NONE' ? 'AUTO' : 'NONE',
    }))
  }

  const showItamaForTrain = (trainId: string) => {
    setInspectorPanel(null)
    setAuxiliaryPanel(null)
    setTrainMenu(null)
    setItamaTrainId(trainId)
    submitBackendScenarioAction(session, updateSession, {
      detail: trainId === '317'
        ? 'Train 317 selected. Acknowledge alarm before route.'
        : `Train ${trainId} selected. Active drill target remains Train 317.`,
      source: 'Monitor 02 Line Map',
      trainId,
      type: 'SELECT_TRAIN',
    }, (current) => ({
      ...current,
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA opened',
          'info',
          `ITAMA status opened for Train ${trainId}.`,
        ),
      ),
      scenarioNotice: trainId === '317'
        ? { text: 'Train 317 ITAMA status opened on line map.', tone: 'info' }
        : { text: `ITAMA status opened for Train ${trainId}. Scenario target remains Train 317.`, tone: 'warning' },
      scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
      selectedTrainId: trainId,
    }))
  }

  const openTrainInspector = (trainId: string, page: InspectorPage) => {
    setTrainMenu(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setInspectorPanel({ trainId, page })
    updateSession((current) => ({
      ...current,
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          `Inspector ${page} opened`,
          'info',
          `Inspecting page opened for Train ${trainId}.`,
        ),
      ),
      scenarioNotice: trainId === '317'
        ? { text: `Train 317 inspector ${page} page opened.`, tone: 'info' }
        : { text: `Train ${trainId} inspector opened. Active drill target remains Train 317.`, tone: 'warning' },
      scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
      selectedTrainId: trainId,
    }))
  }

  const openTrainAuxiliary = (trainId: string, view: TrainAuxiliaryView) => {
    const meta: Record<TrainAuxiliaryView, {
      action: string
      message: string
      notice: string
      noticeTone: ScenarioNoticeTone
      summaryTone?: AlarmSummaryRow['tone']
      tone: MonitorAlarmRow['tone']
      value: string
    }> = {
      alarms: {
        action: 'Train alarm list opened',
        message: `Train ${trainId}: Active alarms opened`,
        notice: `Train ${trainId} active alarm list opened from line map.`,
        noticeTone: 'warning',
        summaryTone: 'red',
        tone: 'red',
        value: 'ALARM LIST',
      },
      cctv: {
        action: 'Restricted CCTV selected',
        message: `Train ${trainId}: Restricted CCTV request`,
        notice: `Restricted CCTV request opened for Train ${trainId}.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'CCTV',
      },
      details: {
        action: 'Train details opened',
        message: `Train ${trainId}: Details page opened`,
        notice: `Train ${trainId} details page opened.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'DETAILS',
      },
      'pec-reset': {
        action: 'PEC reset requested',
        message: `Train ${trainId}: PEC Reset All request`,
        notice: `PEC Reset All request prepared for Train ${trainId}. No reset applied in prototype.`,
        noticeTone: 'warning',
        summaryTone: 'yellow',
        tone: 'orange',
        value: 'PEC RESET',
      },
      pis: {
        action: 'Restricted PIS selected',
        message: `Train ${trainId}: Restricted PIS request`,
        notice: `Restricted PIS request opened for Train ${trainId}.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'PIS',
      },
      regulation: {
        action: 'Regulation parameters opened',
        message: `Train ${trainId}: Regulation parameters opened`,
        notice: `Train ${trainId} regulation parameters opened.`,
        noticeTone: 'info',
        tone: 'yellow',
        value: 'REG PARAM',
      },
    }
    const item = meta[view]

    setTrainMenu(null)
    setInspectorPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setAuxiliaryPanel({ trainId, view })
    updateSession((current) => {
      const event = createMonitorEvent(trainId, item.message, item.value, item.tone)

      return {
        ...current,
        alarmSummaryRows: item.summaryTone
          ? [createSummaryEvent(event, item.summaryTone), ...current.alarmSummaryRows].slice(0, 12)
          : current.alarmSummaryRows,
        eventRows: [event, ...current.eventRows].slice(0, 4),
        evidenceLog: appendScenarioEvidence(
          current.evidenceLog,
          createScenarioEvidence('Monitor 02 Line Map', item.action, 'info', item.notice),
        ),
        scenarioNotice: {
          text: item.notice,
          tone: item.noticeTone,
        },
        scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
        selectedTrainId: trainId,
      }
    })
  }

  const confirmInspectorItamaAuthorisedPreparation = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Authorised Preparation`,
      'OK',
      'yellow',
    )

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA authorised preparation',
          'accepted',
          `Train ${trainId} ITAMA authorised preparation confirmed.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA authorised preparation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: true,
              itamaNotAuthorisedPreparationConfirmed: false,
            }
          : train
      )),
    }))
  }

  const confirmInspectorItamaAuthorised = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Authorised Confirmation`,
      'GRANTED',
      'yellow',
    )

    setTrainItamaStatusOverrides((current) => ({
      ...current,
      [trainId]: 'GRANTED',
    }))

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA authorised confirmation',
          'accepted',
          `Train ${trainId} ITAMA status set to GRANTED.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA authorised confirmation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: false,
              itamaGranted: true,
              itamaNotAuthorisedPreparationConfirmed: false,
              itamaStatus: 'GRANTED',
            }
          : train
      )),
    }))
  }

  const confirmInspectorItamaNotAuthorisedPreparation = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Not Authorised Preparation`,
      'OK',
      'yellow',
    )

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA not authorised preparation',
          'accepted',
          `Train ${trainId} ITAMA not authorised preparation confirmed.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA not authorised preparation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: false,
              itamaNotAuthorisedPreparationConfirmed: true,
            }
          : train
      )),
    }))
  }

  const confirmInspectorItamaNotAuthorised = (trainId: string) => {
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ITAMA AM/CM Not Authorised Confirmation`,
      'NOT GRANTED',
      'yellow',
    )

    setTrainItamaStatusOverrides((current) => ({
      ...current,
      [trainId]: 'NOT_GRANTED',
    }))

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'ITAMA not authorised confirmation',
          'accepted',
          `Train ${trainId} ITAMA status set to NOT GRANTED.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ITAMA not authorised confirmation successful.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              itamaAuthorisedPreparationConfirmed: false,
              itamaGranted: false,
              itamaNotAuthorisedPreparationConfirmed: false,
              itamaStatus: 'NOT_GRANTED',
            }
          : train
      )),
    }))
  }

  const confirmInspectorReadiness = (trainId: string, command: string) => {
    const readinessMode = getTrainReadinessModeFromCommand(command)
    const eventRow: MonitorAlarmRow = {
      level: 'S',
      time: formatScenarioTime(),
      asset: `EMU/${trainId}/TRN/OCC`,
      message: `Train ${trainId}: Train Readiness Request`,
      value: command,
      tone: 'yellow',
    }

    setTrainReadinessModeOverrides((current) => ({
      ...current,
      [trainId]: readinessMode,
    }))

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          'Train readiness request confirmed',
          'accepted',
          `Train ${trainId} readiness request set to ${command}.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} readiness command successful: ${command}.`,
        tone: 'success',
      },
      selectedTrainId: trainId,
      trains: current.trains.map((train) => (
        train.id === trainId
          ? { ...train, readinessMode }
          : train
      )),
    }))
  }

  const confirmInspectorDoorCommand = (trainId: string, command: TrainDoorCommand) => {
    const doorFailureState = getTrainDoorStateAfterCommand(command)
    const commandLabel = getTrainDoorCommandLabel(command)
    const nextTrainStatus: TrainStatus = command === 'confirm-closed-locked' || command === 'authorize-move'
      ? 'RUN'
      : 'HOLD'
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: ${commandLabel}`,
      getTrainDoorSummaryStatus(doorFailureState),
      command === 'withdraw-service' ? 'red' : 'yellow',
    )

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [
        createSummaryEvent(eventRow, command === 'withdraw-service' ? 'red' : 'yellow'),
        ...current.alarmSummaryRows,
      ].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Monitor 02 Line Map',
          commandLabel,
          'accepted',
          `Train ${trainId} door failure state set to ${getTrainDoorSummaryStatus(doorFailureState)}.`,
        ),
      ),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} ${commandLabel.toLowerCase()} command successful.`,
        tone: command === 'withdraw-service' ? 'warning' : 'success',
      },
      selectedTrainId: trainId,
      timetableRows: upsertTimetableRow(current.timetableRows, trainId, nextTrainStatus === 'HOLD' ? 'H>' : '>'),
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              doorFailureState,
              status: nextTrainStatus,
            }
          : train
      )),
    }))
  }

  const animateTrainDepartureRoute = useCallback((trainId: string) => {
    const arrivalDestination = trainArrivalDestinations[trainId]
    const currentTrain = session.trains.find((train) => train.id === trainId)

    if (!hasTrainMovementDestination(arrivalDestination)) {
      updateSession((current) => ({
        ...current,
        scenarioNotice: {
          text: `Train ${trainId} departure rejected. Set Arrival Time Station and Platform / Siding first.`,
          tone: 'warning',
        },
        selectedTrainId: trainId,
      }))
      return
    }

    const isRt2DepotMove = isRt2DepotArrivalDestination(arrivalDestination)
    const rt2DepotStartIndex = getVisibleTrainRoutePointIndex(
      currentTrain,
      TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS.map((step) => step.point),
    )

    if (isRt2DepotMove && rt2DepotStartIndex !== 0) {
      updateSession((current) => ({
        ...current,
        scenarioNotice: {
          text: `Train ${trainId} must be waiting at S608 before it can move to NED / RT2D.`,
          tone: 'warning',
        },
        selectedTrainId: trainId,
      }))
      return
    }

    const routeSteps = isRt2DepotMove
      ? TRAIN_S608_TO_RT2_DEPOT_ROUTE_STEPS
      : trainId === '314'
        ? TRAIN_314_S610_TO_RT2_ROUTE_STEPS
        : trainId === '312'
          ? TRAIN_312_S1104_TO_S608_HOLD_ROUTE_STEPS
        : undefined
    const routeLabel = isRt2DepotMove
      ? 'Route R608_803'
      : trainId === '312'
        ? 'Route R1104_704 / R704_700 / R700_608'
        : 'Route R610_652'

    if (!routeSteps) {
      return
    }

    cancelTrainRouteAnimation()
    setLineMapRouteSegmentOverrides((current) => {
      const next = { ...current }

      routeSteps.forEach((step) => {
        delete next[step.segmentId]
      })

      if (isRt2DepotMove) {
        S608_R608_803_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
          delete next[segmentId]
        })
      } else {
        S610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
          delete next[segmentId]
        })
      }

      return withLineMapRouteSegmentExclusivity(next)
    })

    const routePoints = routeSteps.map((step) => step.point)
    const lastStepIndex = routeSteps.length - 1
    const visibleStepIndex = getVisibleTrainRoutePointIndex(currentTrain, routePoints)
    const currentStepIndex = visibleStepIndex
      ?? getTrainRouteStepIndexFromLineMap(session.lineMap, trainId, routeSteps)
      ?? (trainId === '314' ? train314RouteStepIndexRef.current : undefined)
      ?? getClosestTrainRoutePointIndex(currentTrain, routePoints)
    const currentPoint = routeSteps[currentStepIndex].point
    const eventRow = createMonitorEvent(
      trainId,
      `Train ${trainId}: Departure time set, stepping on ${routeLabel}`,
      'RUN',
      'yellow',
    )

    if (trainId === '314') {
      train314RouteStepIndexRef.current = currentStepIndex
    }

    updateSession((current) => ({
      ...current,
      alarmSummaryRows: [createSummaryEvent(eventRow), ...current.alarmSummaryRows].slice(0, 12),
      eventRows: [eventRow, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `Train ${trainId} departure confirmed. Stepping rail-by-rail on ${routeLabel}.`,
        tone: 'info',
      },
      lineMap: updateTrainRouteStepState(current.lineMap, trainId, routeSteps, currentStepIndex),
      selectedTrainId: trainId,
      timetableRows: upsertTimetableRow(current.timetableRows, trainId, '>'),
      trains: current.trains.map((train) => (
        train.id === trainId
          ? {
              ...train,
              direction: 'left',
              isMoving: currentStepIndex < lastStepIndex,
              service: 'SB',
              status: 'RUN',
              x: currentPoint.x,
              y: currentPoint.y,
            }
          : train
      )),
    }))

    const setTrainAtRouteStep = (stepIndex: number) => {
      const point = routeSteps[stepIndex].point

      if (trainId === '314') {
        train314RouteStepIndexRef.current = stepIndex
      }

      updateSession((current) => ({
        ...current,
        lineMap: updateTrainRouteStepState(current.lineMap, trainId, routeSteps, stepIndex),
        selectedTrainId: trainId,
        trains: current.trains.map((train) => (
          train.id === trainId
            ? {
                ...train,
                direction: 'left',
                isMoving: stepIndex < lastStepIndex,
                service: 'SB',
                status: 'RUN',
                x: point.x,
                y: point.y,
              }
            : train
        )),
      }))
    }

    const scheduleRouteStep = (stepIndex: number, delay: number) => {
      trainRouteAnimationRef.current = window.setTimeout(() => {
        if (stepIndex > lastStepIndex) {
          trainRouteAnimationRef.current = null
          if (trainId === '314') {
            train314RouteStepIndexRef.current = lastStepIndex
          }
          return
        }

        setTrainAtRouteStep(stepIndex)

        if (stepIndex < lastStepIndex) {
          scheduleRouteStep(stepIndex + 1, TRAIN_314_S610_TO_RT2_ROUTE_STEP_DURATION_MS)
        } else {
          trainRouteAnimationRef.current = null
          if (trainId === '314') {
            train314RouteStepIndexRef.current = lastStepIndex
          }
        }
      }, delay)
    }

    if (currentStepIndex < lastStepIndex) {
      scheduleRouteStep(currentStepIndex + 1, TRAIN_314_S610_TO_RT2_ROUTE_STEP_DURATION_MS)
    }
  }, [cancelTrainRouteAnimation, session.lineMap, session.trains, trainArrivalDestinations, updateSession])

  const openTrainContextMenu = (trainId: string, x: number, y: number) => {
    setInspectorPanel(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setDefineRouteSignal(null)
    setSignalMenu(null)
    setTrainMenu({ trainId, x, y })
    submitBackendScenarioAction(session, updateSession, {
      detail: trainId === '317'
        ? 'Train 317 selected. Select ITAMA, hold, route, or dispatch.'
        : `Train ${trainId} selected. Active drill target remains Train 317.`,
      source: 'Monitor 02 Line Map',
      trainId,
      type: 'SELECT_TRAIN',
    }, (current) => ({
      ...current,
      scenarioNotice: trainId === '317'
        ? { text: 'Train 317 command menu opened. Select ITAMA, hold, route, or dispatch.', tone: 'info' }
        : { text: `Train ${trainId} command menu opened. Active drill target remains Train 317.`, tone: 'warning' },
      scenarioTasks: trainId === '317' ? updateScenarioTask(current.scenarioTasks, 'selectTrain') : current.scenarioTasks,
      selectedTrainId: trainId,
    }))
  }

  const openSignalContextMenu = (signal: LineMapSignalData, x: number, y: number) => {
    setTrainMenu(null)
    setAuxiliaryPanel(null)
    setItamaTrainId('')
    setPendingCommand(null)
    setDefineRouteSignal(null)
    setSignalMenu({ signal, x, y })
    updateSession((current) => ({
      ...current,
      scenarioNotice: {
        text: `${getSignalEquipmentLabel(signal)} selected. Define Route is available from the signal menu.`,
        tone: 'info',
      },
    }))
  }

  const openSignalDefineRoute = (signal: LineMapSignalData) => {
    setSignalMenu(null)
    setDefineRouteSignal(signal)
    updateSession((current) => ({
      ...current,
      scenarioNotice: {
        text: `${getSignalEquipmentLabel(signal)} route definition opened.`,
        tone: 'info',
      },
    }))
  }

  const setRouteFromSignal = (signal: LineMapSignalData, routeLabel = getSignalRouteLabel(signal)) => {
    const visibleTargetTrain = getSignalRouteTargetTrain(session.trains, session.selectedTrainId)

    if (signal.label === 'S608' && visibleTargetTrain) {
      const routeSegmentIds = getSignalRuntimeRouteSegmentIdsForRoute(signal, routeLabel)

      setLineMapRouteSegmentOverrides((current) => withLineMapRouteSegmentExclusivity({
        ...current,
        ...createRouteCommandSegmentStates(routeSegmentIds, visibleTargetTrain, 'SET'),
      }, routeSegmentIds))
    }
    if (signal.label === 'S610' && visibleTargetTrain) {
      train314RouteStepIndexRef.current = null
      setLineMapRouteSegmentOverrides((current) => withLineMapRouteSegmentExclusivity({
        ...current,
        ...createRouteCommandSegmentStates(S610_REAL_ROUTE_SEGMENT_IDS, visibleTargetTrain, 'SET'),
      }, S610_REAL_ROUTE_SEGMENT_IDS))
    }
    if (signal.label === 'S700' && visibleTargetTrain) {
      setLineMapRouteSegmentOverrides((current) => withLineMapRouteSegmentExclusivity({
        ...current,
        ...createRouteCommandSegmentStates(S700_REAL_ROUTE_SEGMENT_IDS, visibleTargetTrain, 'SET'),
      }, S700_REAL_ROUTE_SEGMENT_IDS))
    }
    if (signal.label === 'S704' && visibleTargetTrain) {
      setLineMapRouteSegmentOverrides((current) => withLineMapRouteSegmentExclusivity({
        ...current,
        ...createRouteCommandSegmentStates(S704_REAL_ROUTE_SEGMENT_IDS, visibleTargetTrain, 'SET'),
      }, S704_REAL_ROUTE_SEGMENT_IDS))
    }
    if (signal.label === 'S1104' && visibleTargetTrain) {
      setLineMapRouteSegmentOverrides((current) => withLineMapRouteSegmentExclusivity({
        ...current,
        ...createRouteCommandSegmentStates(S1104_REAL_ROUTE_SEGMENT_IDS, visibleTargetTrain, 'SET'),
      }, S1104_REAL_ROUTE_SEGMENT_IDS))
    }

    updateSession((current) => {
      const targetTrain = getSignalRouteTargetTrain(current.trains, current.selectedTrainId)

      if (!targetTrain) {
        return current
      }

      const event = createMonitorEvent(
        targetTrain.id,
        `${routeLabel} set from ${signal.label}`,
        'SET',
        'yellow',
      )

      return {
        ...current,
        alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [event, ...current.eventRows].slice(0, 4),
        lineMap: updateLineMapSignalTrackState(
          current.lineMap,
          signal,
          targetTrain,
          'SET',
          routeLabel,
        ),
        scenarioNotice: {
          text: `${routeLabel} set from ${getSignalEquipmentLabel(signal)} for Train ${targetTrain.id}.`,
          tone: 'info',
        },
        selectedTrainId: targetTrain.id,
        timetableRows: upsertTimetableRow(current.timetableRows, targetTrain.id, 'R'),
      }
    })
  }

  const unsetRouteFromSignal = (signal: LineMapSignalData, routeLabel = getSignalRouteLabel(signal)) => {
    if (signal.label === 'S608') {
      setLineMapRouteSegmentOverrides((current) => {
        const next = { ...current }

        getSignalRuntimeRouteSegmentIdsForRoute(signal, routeLabel).forEach((segmentId) => {
          delete next[segmentId]
        })

        return withLineMapRouteSegmentExclusivity(next)
      })
    }
    if (signal.label === 'S610') {
      cancelTrainRouteAnimation()
      train314RouteStepIndexRef.current = null
      setLineMapRouteSegmentOverrides((current) => {
        const next = { ...current }

        S610_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
          delete next[segmentId]
        })

        return withLineMapRouteSegmentExclusivity(next)
      })
    }
    if (signal.label === 'S700') {
      setLineMapRouteSegmentOverrides((current) => {
        const next = { ...current }

        S700_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
          delete next[segmentId]
        })

        return withLineMapRouteSegmentExclusivity(next)
      })
    }
    if (signal.label === 'S704') {
      setLineMapRouteSegmentOverrides((current) => {
        const next = { ...current }

        S704_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
          delete next[segmentId]
        })

        return withLineMapRouteSegmentExclusivity(next)
      })
    }
    if (signal.label === 'S1104') {
      setLineMapRouteSegmentOverrides((current) => {
        const next = { ...current }

        S1104_REAL_ROUTE_SEGMENT_IDS.forEach((segmentId) => {
          delete next[segmentId]
        })

        return withLineMapRouteSegmentExclusivity(next)
      })
    }

    updateSession((current) => {
      const targetTrain = getSignalRouteTargetTrain(current.trains, current.selectedTrainId)

      if (!targetTrain) {
        return current
      }

      return {
        ...current,
        lineMap: clearLineMapSignalTrackState(clearLineMapRouteState(current.lineMap, targetTrain), signal),
        scenarioNotice: {
          text: `${routeLabel} unset from ${getSignalEquipmentLabel(signal)}.`,
          tone: 'info',
        },
      }
    })
  }

  const requestTrainCommand = (command: TrainCommand) => {
    setTrainMenu(null)
    setSignalMenu(null)
    setDefineRouteSignal(null)
    setAuxiliaryPanel(null)
    setPendingCommand(command)
    updateSession((current) => ({
      ...current,
      scenarioNotice: {
        text: `SCADA command request opened for Train ${current.selectedTrainId}: ${command}.`,
        tone: 'info',
      },
    }))
  }

  const applyTrainCommand = (command: TrainCommand) => {
    const targetTrain = session.trains.find((train) => train.id === session.selectedTrainId)

    if (!targetTrain) {
      return
    }

    const nextStatus: TrainStatus = command === 'DISPATCH' ? 'RUN' : command === 'HOLD' ? 'HOLD' : 'WAIT'
    const taskId: ScenarioTaskId = command === 'DISPATCH' ? 'dispatchTrain' : command === 'ROUTE' ? 'setRoute' : 'selectTrain'
    const backendAction: OccSessionAction['type'] = command === 'DISPATCH'
      ? 'DISPATCH_TRAIN'
      : command === 'ROUTE'
        ? 'SET_ROUTE'
        : 'SELECT_TRAIN'

    const message =
      command === 'DISPATCH'
        ? `Train ${targetTrain.id}: Dispatch command executed`
        : command === 'HOLD'
          ? `Train ${targetTrain.id}: Train Hold`
          : `Train ${targetTrain.id}: Route command selected`
    const tone = command === 'HOLD' ? 'orange' : 'yellow'
    const eventRow: MonitorAlarmRow = {
      level: 'S',
      time: formatScenarioTime(),
      asset: `EMU/${targetTrain.id}/TRN/OCC`,
      message,
      value: nextStatus,
      tone,
    }
    const summaryRow: AlarmSummaryRow = {
      ack: 'Y',
      avl: '',
      mms: 'S',
      timestamp: formatAlarmSummaryTimestamp(eventRow.time),
      asset: eventRow.asset,
      description: message,
      value: nextStatus,
      tone: tone === 'orange' ? 'yellow' : 'yellow',
    }

    // Line-map train commands are the main backend-scored operator actions.
    submitBackendScenarioAction(session, updateSession, {
      detail: `${message} accepted.`,
      source: 'Monitor 02 Line Map',
      trainId: targetTrain.id,
      type: backendAction,
    }, (current) => {
      const guard = completeScenarioTask(current, taskId, `${message} accepted.`, 'Monitor 02 Line Map')

      if (!guard.allowed) {
        return guard.next
      }

      const trainRouteSteps = TRAIN_ROUTE_STEP_SEQUENCES_BY_TRAIN_ID[targetTrain.id]
      const lineMap = command === 'DISPATCH' && trainRouteSteps
        ? updateTrainRouteStepState(current.lineMap, targetTrain.id, trainRouteSteps, 0)
        : updateLineMapRouteState(
          current.lineMap,
          targetTrain,
          command === 'DISPATCH' ? 'DISPATCHED' : command === 'HOLD' ? 'HELD' : 'SET',
        )

      return {
        ...guard.next,
        alarmSummaryRows: [summaryRow, ...current.alarmSummaryRows].slice(0, 12),
        eventRows: [eventRow, ...current.eventRows].slice(0, 4),
        lineMap,
        timetableRows: upsertTimetableRow(current.timetableRows, targetTrain.id, command === 'HOLD' ? 'H>' : command === 'DISPATCH' ? '>' : 'R'),
        trains: current.trains.map((train) => (
          train.id === targetTrain.id ? { ...train, status: nextStatus } : train
        )),
      }
    })
  }

  const getSvgUnitsPerPixel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()

    return MONITOR_WIDTH / bounds.width
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setTrainMenu(null)
    setSignalMenu(null)

    if (event.button !== 0) {
      return
    }

    cancelPanAnimation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startPan: panValueRef.current,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return
    }

    const unitsPerPixel = getSvgUnitsPerPixel(event)
    const delta = (event.clientX - dragRef.current.startX) * unitsPerPixel
    setPanImmediate(dragRef.current.startPan - delta)
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = null
  }

  useEffect(() => {
    panValueRef.current = panX
  }, [panX])

  useEffect(() => () => {
    cancelPanAnimation()
    cancelTrainRouteAnimation()
  }, [cancelPanAnimation, cancelTrainRouteAnimation])

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return
      }

      if (event.target.closest('.line-map-cascade, .line-map-signal-menu')) {
        return
      }

      setTrainMenu(null)
      setSignalMenu(null)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true)

    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        panBy(-MAP_PAN_STEP)
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        panBy(MAP_PAN_STEP)
      }

      if (event.key === 'Home') {
        event.preventDefault()
        panTo(0)
      }

      if (event.key === 'End') {
        event.preventDefault()
        panTo(MAP_PAN_MAX)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panBy, panTo])

  useEffect(() => {
    if (session.cycleMode === 'NONE') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      updateSession((current) => ({
        ...current,
        trains: current.trains.map((train) => (train.id === '314' ? train : advanceTrain(train))),
      }))
    }, 850)

    return () => window.clearInterval(intervalId)
  }, [session.cycleMode, updateSession])

  return (
    <div className="occ-monitor-canvas">
      <LineMapMonitorDom
        lineMap={renderedLineMap}
        onCommand={requestTrainCommand}
        onInspectTrain={(trainId) => openTrainInspector(trainId, 'information')}
        onNavigate={onNavigate}
        onOpenSignalMenu={openSignalContextMenu}
        onOpenTrainMenu={openTrainContextMenu}
        onPanBy={panBy}
        onPanTo={panTo}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onToggleCycle={toggleCycleMode}
        onWheel={(event) => {
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0

          if (delta !== 0) {
            event.preventDefault()
            panBy(delta > 0 ? MAP_PAN_STEP : -MAP_PAN_STEP)
          }
        }}
        panX={panX}
        selectedTrain={selectedTrain}
        selectedTrainId={session.selectedTrainId}
        trains={renderedTrains}
      >
        {trainMenu && menuTrain && (
          <TrainContextMenu
            onClose={() => setTrainMenu(null)}
            onOpenAuxiliary={(view) => openTrainAuxiliary(menuTrain.id, view)}
            onOpenInspector={(page) => openTrainInspector(menuTrain.id, page)}
            train={menuTrain}
            x={trainMenu.x}
            y={trainMenu.y}
          />
        )}
        {signalMenu && (
          <SignalContextMenu
            onClose={() => setSignalMenu(null)}
            onDefineRoute={() => openSignalDefineRoute(signalMenu.signal)}
            onOpenDetails={() => {
              setSignalMenu(null)
              if (selectedTrain) {
                openTrainAuxiliary(selectedTrain.id, 'details')
              }
            }}
            onOpenInspector={() => {
              setSignalMenu(null)
              if (selectedTrain) {
                openTrainInspector(selectedTrain.id, 'information')
              }
            }}
            signal={signalMenu.signal}
            x={signalMenu.x}
            y={signalMenu.y}
          />
        )}
        {defineRouteSignal && (
          <SignalRouteDefinitionWindow
            onClose={() => setDefineRouteSignal(null)}
            onSet={(routeLabel) => setRouteFromSignal(defineRouteSignal, routeLabel)}
            onUnset={(routeLabel) => unsetRouteFromSignal(defineRouteSignal, routeLabel)}
            routeSetLabels={defineRouteSetLabels}
            signal={defineRouteSignal}
            statusText={defineRouteSet ? 'Route set successful' : 'Route not set'}
          />
        )}
        {auxiliaryPanel && auxiliaryTrain && (
          <TrainAuxiliaryPanel
            onClose={() => setAuxiliaryPanel(null)}
            train={auxiliaryTrain}
            view={auxiliaryPanel.view}
          />
        )}
        {pendingCommand && (
          <ScadaCommandDialog
            command={pendingCommand}
            onApply={() => {
              const command = pendingCommand
              setPendingCommand(null)
              applyTrainCommand(command)
            }}
            onClose={() => setPendingCommand(null)}
            train={selectedTrain}
          />
        )}
        {itamaTrain && (
          <ItamaStatusPanel
            onAcknowledge={() => {
              const trainId = itamaTrain.id
              const event = createMonitorEvent(trainId, `Train ${trainId}: Train ITAMA Status`, 'ACK', 'yellow')

              updateSession((current) => ({
                ...current,
                alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
                evidenceLog: appendScenarioEvidence(
                  current.evidenceLog,
                  createScenarioEvidence(
                    'Monitor 02 Line Map',
                    'ITAMA acknowledged',
                    'accepted',
                    `ITAMA status acknowledged for Train ${trainId}.`,
                  ),
                ),
                eventRows: [event, ...current.eventRows].slice(0, 4),
                scenarioNotice: {
                  text: `ITAMA status acknowledged for Train ${trainId}.`,
                  tone: 'info',
                },
              }))
            }}
            onClose={() => setItamaTrainId('')}
            train={itamaTrain}
          />
        )}
      </LineMapMonitorDom>
      {inspectorPanel && inspectorTrain && (
        <TrainInspectorPanel
          arrivalTimeSelection={trainArrivalDestinations[inspectorTrain.id]}
          onClose={() => setInspectorPanel(null)}
          onConfirmItamaAuthorised={() => confirmInspectorItamaAuthorised(inspectorTrain.id)}
          onConfirmItamaAuthorisedPreparation={() => confirmInspectorItamaAuthorisedPreparation(inspectorTrain.id)}
          onConfirmItamaNotAuthorised={() => confirmInspectorItamaNotAuthorised(inspectorTrain.id)}
          onConfirmItamaNotAuthorisedPreparation={() => confirmInspectorItamaNotAuthorisedPreparation(inspectorTrain.id)}
          onConfirmArrivalTime={(selection) => {
            setTrainArrivalDestinations((current) => ({
              ...current,
              [inspectorTrain.id]: selection,
            }))
          }}
          onConfirmDepartureTime={() => animateTrainDepartureRoute(inspectorTrain.id)}
          onConfirmDoorCommand={(command) => confirmInspectorDoorCommand(inspectorTrain.id, command)}
          onConfirmReadiness={(command) => confirmInspectorReadiness(inspectorTrain.id, command)}
          onOpenDetails={() => showItamaForTrain(inspectorTrain.id)}
          onPageChange={(page) => setInspectorPanel({ ...inspectorPanel, page })}
          page={inspectorPanel.page}
          train={inspectorTrain}
        />
      )}
    </div>
  )
}

export default App
