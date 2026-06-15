import { useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from 'react'
import ScadaFooter from '../../components/ScadaFooter'
import {
  MAP_PAN_MAX,
  MAP_PAN_STEP,
  LINE_SECTION_OFFSETS,
  MAP_WORLD_WIDTH,
  MONITOR_HEIGHT,
  MONITOR_WIDTH,
  atcData,
  branchData,
  commandData,
  cycleData,
  lowerSignals,
  lowerTrackPieces,
  mapArrowData,
  mapTitleData,
  platformData,
  pointLabels,
  routeSegmentData,
  schematicAnnotations,
  sectionDividers,
  shapedUpperTrackPieces,
  stationRibbonItems,
  staticTrackBoundaries,
  staticTrackLabels,
  staticTrackPaths,
  staticTrackPieces,
  translucentTrackGuides,
  upperTrackCrossingMasks,
  upperTrackEdgeStrips,
  upperSignals,
  upperTrackPieces,
  isTrainItamaGranted,
  lowerTrackEdgeStrips,
} from './model'
import type { LineMapSignalData } from './model'
import type { AppRoute, LineMapRuntimeState, RouteControlMode, TrainCommand, TrainState } from '../../types'

const BODY_TOP = 172
const MAIN_UPPER_TRACK_Y = 215
const MAIN_LOWER_TRACK_Y = 455
const LEFT_STRIP_OFFSET = 8.5
const LEFT_STRIP_WIDTH = 3
const TRACK_Y_BY_SECTION = [
  { start: LINE_SECTION_OFFSETS.line01, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
  { start: LINE_SECTION_OFFSETS.line02, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
  { start: LINE_SECTION_OFFSETS.line03, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
  { start: LINE_SECTION_OFFSETS.line04, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
] as const

const TRACK_GUIDE_RAIL_IDS: Record<string, readonly string[]> = {
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
  'line02-middle-turnback': 'rail-middle-turnback',
}

const S610_SIGNAL_ROUTE_RAIL_IDS = [
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

const S608_SIGNAL_ROUTE_RAIL_IDS = [
  'rail-618',
  'rail-616',
  'rail-614',
  'rail-P606',
  'rail-650',
  'rail-652',
] as const

const S700_SIGNAL_ROUTE_RAIL_IDS = [
  'rail-710',
  'rail-708',
  'rail-706',
  'rail-704',
  'rail-702',
  'rail-700',
  'rail-622',
  'rail-620',
] as const

const S704_SIGNAL_ROUTE_RAIL_IDS = [
  'rail-712',
  'rail-710',
] as const

const S1104_SIGNAL_ROUTE_RAIL_IDS = [
  'rail-1109',
  'rail-P1103',
  'rail-1115',
  'rail-P1100',
  'rail-1102',
  'rail-716',
  'rail-714',
] as const

const ROUTE_SEGMENT_RAIL_PART_IDS: Record<string, readonly string[]> = {
  'line02-middle-turnback': ['rail-314', 'rail-318', 'rail-320'],
  'bgk-rt1': ['rail-655', 'rail-653'],
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

type LineMapMonitorDomProps = {
  children?: ReactNode
  lineMap: LineMapRuntimeState
  onCommand: (command: TrainCommand) => void
  onInspectTrain: (trainId: string) => void
  onNavigate: (route: AppRoute) => void
  onOpenTrainMenu: (trainId: string, x: number, y: number) => void
  onOpenSignalMenu: (signal: LineMapSignalData, x: number, y: number) => void
  onPanBy: (distance: number) => void
  onPanTo: (value: number) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onToggleRouteControlMode: (panelCode: string) => void
  onToggleCycle: () => void
  onWheel: (event: ReactWheelEvent<HTMLDivElement>) => void
  panX: number
  routeControlModes: Record<string, RouteControlMode>
  selectedTrain?: TrainState
  selectedTrainId: string
  trains: TrainState[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getTrackY(x: number, line: 'lower' | 'upper') {
  const section = [...TRACK_Y_BY_SECTION].reverse().find((candidate) => x >= candidate.start) ?? TRACK_Y_BY_SECTION[0]

  return section[line]
}

type SchematicAnnotation = (typeof schematicAnnotations)[number]

const LINE02_PRE_JOIN_START = MONITOR_WIDTH
const LINE03_PRE_JOIN_START = LINE_SECTION_OFFSETS.line03 + 70

const seamRouteNumberOverlaps = [
  {
    label: '309',
    nextX: LINE_SECTION_OFFSETS.line02 + 14,
    nextStart: LINE02_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line02 - 80,
    y: 211,
  },
  {
    label: '311',
    nextX: LINE_SECTION_OFFSETS.line02 + 58,
    nextStart: LINE02_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line02 - 80,
    y: 211,
  },
  {
    label: '308',
    nextX: LINE_SECTION_OFFSETS.line02 + 14,
    nextStart: LINE02_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line02 - 80,
    y: 478,
  },
  {
    label: '310',
    nextX: LINE_SECTION_OFFSETS.line02 + 58,
    nextStart: LINE02_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line02 - 80,
    y: 478,
  },
  {
    label: '501',
    nextX: LINE_SECTION_OFFSETS.line03 + 2,
    nextStart: LINE03_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line03 - 80,
    y: 211,
  },
  {
    label: '503',
    nextX: LINE_SECTION_OFFSETS.line03 + 34,
    nextStart: LINE03_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line03 - 80,
    y: 211,
  },
  {
    label: '505',
    nextX: LINE_SECTION_OFFSETS.line03 + 82,
    nextStart: LINE03_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line03 - 80,
    y: 211,
  },
  {
    label: '500',
    nextX: LINE_SECTION_OFFSETS.line03 + 32,
    nextStart: LINE03_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line03 - 80,
    y: 478,
  },
  {
    label: '502',
    nextX: LINE_SECTION_OFFSETS.line03 + 76,
    nextStart: LINE03_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line03 - 80,
    y: 478,
  },
  {
    label: '504',
    nextX: LINE_SECTION_OFFSETS.line03 + 121,
    nextStart: LINE03_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line03 - 80,
    y: 478,
  },
  {
    label: '613',
    nextX: LINE_SECTION_OFFSETS.line04 + 42,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 300,
    y: 211,
  },
  {
    label: '615',
    nextX: LINE_SECTION_OFFSETS.line04 + 106,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 300,
    y: 211,
  },
  {
    label: '617',
    nextX: LINE_SECTION_OFFSETS.line04 + 176,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 300,
    y: 211,
  },
  {
    label: '619',
    nextX: LINE_SECTION_OFFSETS.line04 + 236,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 300,
    y: 211,
  },
  {
    label: '621',
    nextX: LINE_SECTION_OFFSETS.line04 + 304,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 300,
    y: 211,
  },
  {
    label: '614',
    nextX: LINE_SECTION_OFFSETS.line04 + 42,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 360,
    y: 478,
  },
  {
    label: '616',
    nextX: LINE_SECTION_OFFSETS.line04 + 116,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 360,
    y: 478,
  },
  {
    label: '618',
    nextX: LINE_SECTION_OFFSETS.line04 + 190,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 360,
    y: 478,
  },
  {
    label: '620',
    nextX: LINE_SECTION_OFFSETS.line04 + 246,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 360,
    y: 478,
  },
  {
    label: '622',
    nextX: LINE_SECTION_OFFSETS.line04 + 308,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 360,
    y: 478,
  },
] as const

const seamSignalOverlaps = [
  {
    labels: ['S309', 'S310'],
    nextFirstX: LINE_SECTION_OFFSETS.line02 + 30,
    nextStart: LINE02_PRE_JOIN_START,
    previousMinX: LINE_SECTION_OFFSETS.line02 - 80,
  },
  {
    labels: ['S617', 'S619'],
    nextFirstX: LINE_SECTION_OFFSETS.line04 + 126,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 220,
  },
  {
    labels: ['S608', 'S610'],
    nextFirstX: LINE_SECTION_OFFSETS.line04 + 176,
    nextStart: LINE_SECTION_OFFSETS.line04,
    previousMinX: LINE_SECTION_OFFSETS.line04 - 140,
  },
] as const

function isRouteNumberAnnotation(annotation: SchematicAnnotation) {
  return !('tone' in annotation) && !('rotate' in annotation) && (annotation.y === 211 || annotation.y === 478)
}

function shouldHideSeamRouteNumber(annotation: SchematicAnnotation, panX: number) {
  if (!isRouteNumberAnnotation(annotation)) {
    return false
  }

  const label = String(annotation.label)

  return seamRouteNumberOverlaps.some((overlap) => {
    if (annotation.y !== overlap.y || overlap.label !== label) {
      return false
    }

    const numberLabel = Number.parseInt(label, 10)
    const preferLeftSegment = Number.isFinite(numberLabel) && numberLabel >= 500

    if (overlap.nextStart === LINE02_PRE_JOIN_START) {
      return (
        Math.abs(annotation.x - overlap.nextX) > 0.5
        && annotation.x >= overlap.previousMinX
        && annotation.x < overlap.nextStart
      )
    }

    if (preferLeftSegment) {
      if (Math.abs(annotation.x - overlap.nextX) > 0.5) {
        return false
      }

      const previousLabel = schematicAnnotations.find((candidate) => (
        candidate !== annotation
        && isRouteNumberAnnotation(candidate)
        && String(candidate.label) === label
        && candidate.y === overlap.y
        && candidate.x >= overlap.previousMinX
        && candidate.x < overlap.nextStart
      ))

      return previousLabel ? panX < previousLabel.x + 17 : false
    }

    return (
      annotation.x >= overlap.previousMinX
      && annotation.x < overlap.nextStart
      && panX > overlap.nextX - MONITOR_WIDTH
    )
  })
}

function shouldHideSeamSignal(signal: LineMapSignalData, panX: number) {
  if ('seamVisible' in signal && signal.seamVisible) {
    return false
  }

  return seamSignalOverlaps.some((overlap) => (
    signal.x >= overlap.previousMinX
    && signal.x < overlap.nextStart
    && (overlap.labels as readonly string[]).includes(signal.label)
    && panX > overlap.nextFirstX - MONITOR_WIDTH
  ))
}

function getAnnotationTop(annotation: SchematicAnnotation) {
  if (!isRouteNumberAnnotation(annotation)) {
    return annotation.y
  }

  if (annotation.y === 211) {
    const top = getTrackY(annotation.x, 'upper') - 15

    return annotation.label === '605B' ? top - 9 : top
  }

  return getTrackY(annotation.x, 'lower') + 18
}

export default function LineMapMonitorDom({
  children,
  lineMap,
  onCommand,
  onInspectTrain,
  onNavigate,
  onOpenSignalMenu,
  onOpenTrainMenu,
  onPanBy,
  onPanTo,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onToggleRouteControlMode,
  onToggleCycle,
  onWheel,
  panX,
  routeControlModes,
  selectedTrain,
  selectedTrainId,
  trains,
}: LineMapMonitorDomProps) {
  const [scale, setScale] = useState(1)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current

    if (!root) {
      return undefined
    }

    const updateScale = () => setScale(root.clientWidth / MONITOR_WIDTH)
    const observer = new ResizeObserver(updateScale)

    updateScale()
    observer.observe(root)

    return () => observer.disconnect()
  }, [])

  const getMonitorPoint = (event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) => {
    const bounds = rootRef.current?.getBoundingClientRect()

    if (!bounds) {
      return { x: 0, y: 0 }
    }

    const unitsPerPixel = MONITOR_WIDTH / bounds.width

    return {
      x: (event.clientX - bounds.left) * unitsPerPixel,
      y: (event.clientY - bounds.top) * unitsPerPixel,
    }
  }

  const openTrainMenuAtPointer = (event: ReactPointerEvent<HTMLElement>, train: TrainState) => {
    const point = getMonitorPoint(event)

    onOpenTrainMenu(
      train.id,
      clamp(point.x + 8, 8, MONITOR_WIDTH - 540 - 8),
      clamp(point.y + 8, BODY_TOP + 4, MONITOR_HEIGHT - 196 - 8),
    )
  }

  const openSignalMenuAtPointer = (event: ReactMouseEvent<HTMLElement>, signal: LineMapSignalData) => {
    const point = getMonitorPoint(event)

    onOpenSignalMenu(
      signal,
      clamp(point.x + 8, 8, MONITOR_WIDTH - 380 - 8),
      clamp(point.y + 8, BODY_TOP + 4, MONITOR_HEIGHT - 220 - 8),
    )
  }

  const handleFooterToolSelect = (tool: string) => {
    if (tool === 'NAV LAYOUT LEFT') {
      onPanBy(-MAP_PAN_STEP)
    } else if (tool === 'NAV LAYOUT RIGHT') {
      onPanBy(MAP_PAN_STEP)
    } else if (tool === 'NAV WINDOW LEFT') {
      onPanTo(0)
    } else if (tool === 'NAV WINDOW RIGHT') {
      onPanTo(MAP_PAN_MAX)
    }
  }

  const surfaceStyle = {
    '--line-map-scale': String(scale),
    '--line-map-pan': `${Math.round(panX)}px`,
  } as CSSProperties
  const upperTrainReferenceTop = (trains.find((train) => train.id === '047')?.y ?? 205) - 44

  return (
    <div
      aria-label="OCC line map monitor"
      className="line-map-dom-root"
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      ref={rootRef}
      role="application"
      style={surfaceStyle}
      tabIndex={0}
    >
      <div className="line-map-coordinate-surface">
        <LineMapHeaderDom onNavigate={onNavigate} />

        <div className="line-map-body-viewport">
          <div className="line-map-body-world">
            <LineMapSchematicBase
              lineMap={lineMap}
              onCommand={onCommand}
              onOpenSignalMenu={openSignalMenuAtPointer}
              panX={panX}
              routeControlModes={routeControlModes}
              onToggleRouteControlMode={onToggleRouteControlMode}
              onToggleCycle={onToggleCycle}
            />
            {trains.map((train) => (
              <TrainHotspot
                key={train.id}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openTrainMenuAtPointer(event, train)
                }}
                onDoubleClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onInspectTrain(train.id)
                }}
                selected={train.id === selectedTrainId}
                train={train}
                upperTrainReferenceTop={upperTrainReferenceTop}
              />
            ))}
          </div>
        </div>

        <ScadaFooter
          active="TRAFFIC"
          leftMode="Train"
          onToolSelect={handleFooterToolSelect}
          status={selectedTrain ? `TRN ${selectedTrain.id} selected` : 'MNADZRULS'}
        />
        {children}
      </div>
    </div>
  )
}

function LineMapHeaderDom({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  const [activeSideTab, setActiveSideTab] = useState<'alarms' | 'calls'>('alarms')
  const rows = [
    ['S', '05/11 11:00:06', 'SIG/SKG/RT1/SIGN0655', 'Signal S655: Signal Lamp Filament Status', 'BURNT', 'orange'],
    ['S', '05/11 11:02:17', 'EMU/032/TRN/XXXXXXXX', 'Train 032: Action Needed (from operator for recovery)', 'YES', 'red'],
    ['S', '05/11 11:02:17', 'EMU/032/TRN/XXXXXXXX', 'Train 032:Train ITAMA Status', 'NOT GRANTED', 'yellow'],
    ['S', '05/11 11:02:21', 'EMU/049/TRN/XXXXXXXX', 'Train 049: Train Hold', 'APPLIED', 'yellow'],
  ] as const

  return (
    <header className="line-map-header-dom">
      <section className="line-map-alarm-strip" aria-label="Alarm summary">
        <div className="line-map-side-tabs" role="tablist" aria-label="Alarm summary tabs">
          <button
            aria-selected={activeSideTab === 'alarms'}
            className={`line-map-side-tab ${activeSideTab === 'alarms' ? 'line-map-side-tab--active' : ''}`}
            onClick={() => setActiveSideTab('alarms')}
            role="tab"
            type="button"
          >
            Alarms
          </button>
          <button
            aria-selected={activeSideTab === 'calls'}
            className={`line-map-side-tab line-map-side-tab--calls ${activeSideTab === 'calls' ? 'line-map-side-tab--active' : ''}`}
            onClick={() => setActiveSideTab('calls')}
            role="tab"
            type="button"
          >
            Calls
          </button>
        </div>
        <div className="line-map-alarm-counts">
          <label>Not Ack <output>3</output></label>
          <label>Total <output>70</output></label>
          <button className="line-map-alarm-clear" onClick={() => onNavigate('/screen/alarms')} type="button">×</button>
          <button className="line-map-alarm-display" onClick={() => onNavigate('/screen/alarms')} type="button">
            <i />
            Display
          </button>
        </div>
        <div className="line-map-alarm-table">
          {rows.map((row) => (
            <button
              className={`line-map-alarm-row line-map-alarm-row--${row[5]}`}
              key={`${row[1]}-${row[2]}-${row[4]}`}
              onClick={() => onNavigate('/screen/alarms')}
              type="button"
            >
              <span>{row[0]}</span>
              <span>{row[1]}</span>
              <span>{row[2]}</span>
              <span>{row[3]}</span>
              <span>{row[4]}</span>
            </button>
          ))}
        </div>
        <div className="line-map-alarm-scrollbar" aria-hidden="true">
          <span className="line-map-alarm-scrollbar-button line-map-alarm-scrollbar-button--up" />
          <span className="line-map-alarm-scrollbar-track" />
          <span className="line-map-alarm-scrollbar-button line-map-alarm-scrollbar-button--down" />
        </div>
      </section>
      <StationRibbon top={105} />
    </header>
  )
}

function StationRibbon({ top }: { top: number }) {
  return (
    <div className="line-map-station-ribbon" style={{ top }}>
      <div className="line-map-station-line" />
      {stationRibbonItems.map((station) => (
        <div className="line-map-station-node" key={station.label} style={{ left: station.x }}>
          <span>{station.label}</span>
          {station.label.includes('DEPOT') ? null : <i />}
        </div>
      ))}
      <strong>OVERALL</strong>
    </div>
  )
}

function LineMapSchematicBase({
  lineMap,
  onCommand,
  onOpenSignalMenu,
  panX,
  routeControlModes,
  onToggleRouteControlMode,
  onToggleCycle,
}: {
  lineMap: LineMapRuntimeState
  onCommand: (command: TrainCommand) => void
  onOpenSignalMenu: (event: ReactMouseEvent<HTMLElement>, signal: LineMapSignalData) => void
  panX: number
  routeControlModes: Record<string, RouteControlMode>
  onToggleRouteControlMode: (panelCode: string) => void
  onToggleCycle: () => void
}) {
  return (
    <div className="line-map-schematic-base">
      {sectionDividers.map((x) => <span className="line-map-section-divider" key={x} style={{ left: x }} />)}
      {mapTitleData.map((title) => <MapTitle key={`${title.x}-${title.y}`} title={title} />)}
      {branchData.map((x) => <BranchGuide key={x} x={x} />)}
      <TranslucentTrackGuides lineMap={lineMap} />
      {staticTrackPieces.map((piece) => (
        <StaticTrackPiece key={piece.id} piece={piece} />
      ))}
      <StaticTrackPaths />
      {staticTrackBoundaries.map((boundary) => (
        <StaticTrackBoundary boundary={boundary} key={boundary.id} />
      ))}
      {staticTrackLabels.map((label) => (
        <span
          className="line-map-annotation line-map-annotation--route-number line-map-static-track-label"
          key={`${label.x}-${label.y}-${label.label}`}
          style={{ left: label.x, top: label.y }}
        >
          {label.label}
        </span>
      ))}
      {routeSegmentData.filter((segment) => segment.id === 'bgk-p603').map((segment) => (
        <RouteSegmentBase bodyOnly key={segment.id} lineMap={lineMap} segment={segment} state={getRouteSegmentState(segment, lineMap)} />
      ))}
      {routeSegmentData.filter((segment) => (
        segment.id === 'line02-middle-turnback'
        || segment.id === 'wlh-turnback'
        || segment.id === 'bgk-rt1'
        || segment.id === 'bgk-651'
      )).map((segment) => (
        <RouteSegmentBase key={segment.id} lineMap={lineMap} segment={segment} state={getRouteSegmentState(segment, lineMap)} />
      ))}
      {upperTrackPieces.map((piece, index) => (
        <TrackPiece key={`upper-${index}`} lineMap={lineMap} piece={piece} track="upper" y={getTrackY(piece.x, 'upper')} />
      ))}
      <ShapedUpperTrackPieces />
      <UpperTrackCrossingMasks />
      <UpperTrackEdgeStrips />
      {lowerTrackPieces.map((piece, index) => (
        <TrackPiece key={`lower-${index}`} lineMap={lineMap} piece={piece} track="lower" y={getTrackY(piece.x, 'lower')} />
      ))}
      <LowerTrackEdgeStrips />
      <OverlayTrackGuides lineMap={lineMap} />
      {routeSegmentData.filter((segment) => (
        segment.id !== 'bgk-p603'
        && segment.id !== 'line02-middle-turnback'
        && segment.id !== 'wlh-turnback'
        && segment.id !== 'bgk-rt1'
        && segment.id !== 'bgk-651'
      )).map((segment) => (
        <RouteSegmentBase key={segment.id} lineMap={lineMap} segment={segment} state={getRouteSegmentState(segment, lineMap)} />
      ))}
      {atcData.map((atc) => <AtcPanel key={atc.label} atc={atc} />)}
      {cycleData.map((cycle) => (
        <CycleControl key={`${cycle.x}-${cycle.y}`} onToggleCycle={onToggleCycle} x={cycle.x} y={cycle.y} />
      ))}
      {platformData.map((platform) => <PlatformPanel key={platform.code} platform={platform} />)}
      {commandData.map((command) => (
        <CommandPanel
          key={`command-${command.code}`}
          onCommand={onCommand}
          onToggleRouteControlMode={onToggleRouteControlMode}
          panelCode={command.code}
          routeMode={routeControlModes[command.code] ?? 'OCCA'}
          x={command.x}
          y={command.y}
        />
      ))}
      <button
        className="line-map-gh-button"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        GH
      </button>
      {upperSignals.map((signal) => (
        shouldHideSeamSignal(signal, panX)
          ? null
          : <SignalMarker key={`u-${signal.x}-${signal.label}`} lineMap={lineMap} onOpenSignalMenu={onOpenSignalMenu} signal={signal} y={getSignalY(signal, 'upper')} />
      ))}
      {lowerSignals.map((signal) => (
        shouldHideSeamSignal(signal, panX)
          ? null
          : (
            <SignalMarker
              key={`l-${signal.x}-${signal.label}`}
              lineMap={lineMap}
              lower={getSignalTrack(signal, 'lower') === 'lower'}
              onOpenSignalMenu={onOpenSignalMenu}
              signal={signal}
              y={getSignalY(signal, 'lower')}
            />
          )
      ))}
      {pointLabels.map((point) => (
        <span
          className={[
            'line-map-point-label',
            'bold' in point && point.bold ? 'line-map-point-label--bold' : '',
          ].filter(Boolean).join(' ')}
          key={`${point.x}-${point.label}`}
          style={{
            left: point.x,
            top: point.y,
            ...('fontSize' in point ? {
              fontSize: `${point.fontSize}px`,
              lineHeight: `${point.fontSize}px`,
            } : {}),
          }}
        >
          {point.label}
        </span>
      ))}
      {schematicAnnotations.map((annotation) => {
        if (shouldHideSeamRouteNumber(annotation, panX)) {
          return null
        }

        const isRouteNumber = isRouteNumberAnnotation(annotation)

        return (
          <span
            className={[
              'line-map-annotation',
              isRouteNumber ? 'line-map-annotation--route-number' : '',
              'tone' in annotation && annotation.tone === 'green' ? 'line-map-annotation--green' : '',
              annotation.label.startsWith('RT') ? 'line-map-annotation--route-name' : '',
              annotation.label === 'NB' || annotation.label === 'SB' ? 'line-map-annotation--direction-label' : '',
            ].filter(Boolean).join(' ')}
            key={`${annotation.x}-${annotation.y}-${annotation.label}`}
                style={{
                  left: annotation.x,
                  top: getAnnotationTop(annotation),
                  ...('fontSize' in annotation ? {
                    fontSize: `${annotation.fontSize}px`,
                    lineHeight: `${annotation.fontSize}px`,
                  } : {}),
                  ...('italic' in annotation && annotation.italic ? { fontStyle: 'italic' } : {}),
                  transform: 'rotate' in annotation ? `rotate(${annotation.rotate}deg)` : undefined,
                }}
              >
            {annotation.label}
          </span>
        )
      })}
      {mapArrowData.map((arrow, index) => (
        <MapArrow
          direction={arrow.direction}
          key={`${arrow.direction}-${arrow.x}-${index}`}
          tone={arrow.tone}
          x={arrow.x}
          y={arrow.y}
        />
      ))}
    </div>
  )
}

function MapTitle({ title }: { title: (typeof mapTitleData)[number] }) {
  return (
    <div className="line-map-map-title" style={{ left: title.x, top: title.y }}>
      {title.lines.map((line) => <span key={line}>{line}</span>)}
    </div>
  )
}

function BranchGuide({ x }: { x: number }) {
  const railId = getBranchGuideRailId(x)

  return (
    <span
      className="line-map-branch-guide"
      data-rail-id={railId}
      data-testid={railId}
      id={railId}
      style={{ left: x }}
    >
      <i />
      <i />
    </span>
  )
}

function TranslucentTrackGuides({ lineMap }: { lineMap: LineMapRuntimeState }) {
  const guides = translucentTrackGuides.filter((guide) => !isOverlayTrackGuide(guide))

  return <TrackGuideSvg className="line-map-translucent-track-svg" guides={guides} lineMap={lineMap} />
}

function OverlayTrackGuides({ lineMap }: { lineMap: LineMapRuntimeState }) {
  const guides = translucentTrackGuides.filter(isOverlayTrackGuide)

  return <TrackGuideSvg className="line-map-track-overlay-svg" guides={guides} lineMap={lineMap} />
}

function TrackGuideSvg({
  className,
  guides,
  lineMap,
}: {
  className: string
  guides: readonly (typeof translucentTrackGuides)[number][]
  lineMap: LineMapRuntimeState
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {guides.map((guide) => {
        const guideId = guide.id

        if ('flatCaps' in guide && guide.flatCaps) {
          const isOverlay = isOverlayTrackGuide(guide)
          const segments = 'segments' in guide ? guide.segments : [{ from: guide.from, to: guide.to }]
          const branchGuideRailIds = segments.map((_, index) => getTrackGuideRailId(guideId, index))
          const renderInactiveBranchLines = branchGuideRailIds.length > 0
            && branchGuideRailIds.every((railId) => railId.startsWith('rail-P'))
            && branchGuideRailIds.every((railId) => !isTrackGuideRailActive(guide, railId, lineMap))

          return (
            <g data-guide-id={guideId} key={guideId} opacity={isOverlay ? undefined : 0.28}>
              {'overlayRects' in guide
                ? (guide.overlayRects as readonly { x: number; y: number; width: number; height: number }[]).map((rect) => (
                  <rect
                    fill={getTrackGuideBaseColor(guide)}
                    height={rect.height}
                    key={`${rect.x}-${rect.y}`}
                    width={rect.width}
                    x={rect.x}
                    y={rect.y}
                  />
                ))
                : null}
              {'segmentPolygons' in guide ? (
                renderInactiveBranchLines ? (
                  segments.map((segment, index) => {
                    const railId = getTrackGuideRailId(guideId, index)
                    const trackState = getTrackGuideRailState(railId, lineMap)
                    const trackColor = getTrackGuideRailColor(guide, railId, lineMap)
                    const trackOpacity = getTrackGuideRailOpacity(guide, railId, lineMap)

                    return (
                      <g
                        data-rail-id={railId}
                        data-status={trackState?.status ?? 'IDLE'}
                        data-train-id={trackState?.trainId ?? ''}
                        data-testid={railId}
                        id={railId}
                        key={`${segment.from[0]}-${segment.from[1]}-${segment.to[0]}-${segment.to[1]}`}
                      >
                        <polygon fill={trackColor} opacity={trackOpacity} points={getFlatTrackGuidePoints(segment.from, segment.to, 12)} />
                        <polygon
                          fill="#4f748b"
                          opacity={isOverlay ? 0.28 : undefined}
                          points={getFlatTrackGuidePoints(
                            [segment.from[0] - LEFT_STRIP_OFFSET, segment.from[1]],
                            [segment.to[0] - LEFT_STRIP_OFFSET, segment.to[1]],
                            LEFT_STRIP_WIDTH,
                          )}
                        />
                      </g>
                    )
                  })
                ) : guide.segmentPolygons.map((piece, index) => {
                  const railId = getTrackGuideRailId(guideId, index)
                  const trackState = getTrackGuideRailState(railId, lineMap)
                  const trackColor = getTrackGuideRailColor(guide, railId, lineMap)
                  const trackOpacity = getTrackGuideRailOpacity(guide, railId, lineMap)
                  const key = 'pathD' in piece ? piece.pathD : piece.polygonPoints.map((point) => point.join(',')).join(' ')
                  const edgeNode = 'edgePolygons' in piece && piece.edgePolygons ? (
                    piece.edgePolygons.map((edgePolygon) => (
                      <polygon
                        fill="#4f748b"
                        key={edgePolygon.map((point) => point.join(',')).join(' ')}
                        opacity={isOverlay ? 0.28 : undefined}
                        points={edgePolygon.map((point) => point.join(',')).join(' ')}
                        shapeRendering="geometricPrecision"
                      />
                    ))
                  ) : 'edgePathD' in piece ? (
                    <path
                      d={piece.edgePathD}
                      fill="#4f748b"
                      opacity={isOverlay ? 0.28 : undefined}
                      shapeRendering="geometricPrecision"
                    />
                  ) : 'edgePathPoints' in piece ? (
                    <path
                      d={getRouteSegmentPathD(piece.edgePathPoints as readonly (readonly [number, number])[])}
                      fill="none"
                      opacity={isOverlay ? 0.28 : undefined}
                      shapeRendering="geometricPrecision"
                      stroke="#4f748b"
                      strokeLinecap="butt"
                      strokeLinejoin="miter"
                      strokeWidth={LEFT_STRIP_WIDTH}
                    />
                  ) : 'edgePolygonPoints' in piece && piece.edgePolygonPoints ? (
                    <polygon
                      fill="#4f748b"
                      opacity={isOverlay ? 0.28 : undefined}
                      points={piece.edgePolygonPoints.map((point) => point.join(',')).join(' ')}
                      shapeRendering="geometricPrecision"
                    />
                  ) : null

                  const railNode = (
                    <g
                      data-rail-id={railId}
                      data-status={trackState?.status ?? 'IDLE'}
                      data-train-id={trackState?.trainId ?? ''}
                      data-testid={railId}
                      id={railId}
                      key={key}
                    >
                      {'pathD' in piece ? (
                        <path
                          d={piece.pathD}
                          fill={trackColor}
                          opacity={trackOpacity}
                          shapeRendering="geometricPrecision"
                        />
                      ) : (
                        <polygon
                          fill={trackColor}
                          opacity={trackOpacity}
                          points={getTrackGuidePiecePolygonPoints(piece, guide, railId, lineMap).map((point) => point.join(',')).join(' ')}
                          shapeRendering="geometricPrecision"
                        />
                      )}
                    </g>
                  )

                  return edgeNode ? [
                    <g aria-hidden="true" data-edge-for={railId} key={`${key}-edge`}>
                      {edgeNode}
                    </g>,
                    railNode,
                  ] : railNode
                })
              ) : (
                segments.map((segment, index) => {
                  const railId = getTrackGuideRailId(guideId, index)
                  const trackState = getTrackGuideRailState(railId, lineMap)
                  const trackColor = getTrackGuideRailColor(guide, railId, lineMap)
                  const trackOpacity = getTrackGuideRailOpacity(guide, railId, lineMap)

                  return (
                    <g
                      data-rail-id={railId}
                      data-status={trackState?.status ?? 'IDLE'}
                      data-train-id={trackState?.trainId ?? ''}
                      data-testid={railId}
                      id={railId}
                      key={`${segment.from[0]}-${segment.from[1]}-${segment.to[0]}-${segment.to[1]}`}
                    >
                      <polygon fill={trackColor} opacity={trackOpacity} points={getFlatTrackGuidePoints(segment.from, segment.to, 12)} />
                      <polygon
                        fill="#4f748b"
                        opacity={isOverlay ? 0.28 : undefined}
                        points={getFlatTrackGuidePoints(
                          [segment.from[0] - LEFT_STRIP_OFFSET, segment.from[1]],
                          [segment.to[0] - LEFT_STRIP_OFFSET, segment.to[1]],
                          LEFT_STRIP_WIDTH,
                        )}
                      />
                    </g>
                  )
                })
              )}
            </g>
          )
        }

        const railId = getTrackGuideRailId(guideId)
        const trackState = getTrackGuideRailState(railId, lineMap)
        const trackColor = getTrackGuideRailColor(guide, railId, lineMap)

        return (
          <g
            data-rail-id={railId}
            data-status={trackState?.status ?? 'IDLE'}
            data-train-id={trackState?.trainId ?? ''}
            data-testid={railId}
            id={railId}
            key={guideId}
            opacity="0.28"
          >
            <line
              stroke={trackColor}
              strokeLinecap="butt"
              strokeWidth="12"
              x1={guide.from[0]}
              x2={guide.to[0]}
              y1={guide.from[1]}
              y2={guide.to[1]}
            />
            <line
              stroke="#4f748b"
              strokeLinecap="butt"
              strokeWidth={LEFT_STRIP_WIDTH}
              x1={guide.from[0] - LEFT_STRIP_OFFSET}
              x2={guide.to[0] - LEFT_STRIP_OFFSET}
              y1={guide.from[1]}
              y2={guide.to[1]}
            />
          </g>
        )
      })}
    </svg>
  )
}

function getTrackGuidePiecePolygonPoints(
  piece: { polygonPoints: readonly (readonly [number, number])[], inactivePolygonPoints?: readonly (readonly [number, number])[] },
  guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
) {
  if (
    piece.inactivePolygonPoints
    && railId === 'rail-P608'
    && !isTrackGuideRailActive(guide, railId, lineMap)
  ) {
    return piece.inactivePolygonPoints
  }

  return piece.polygonPoints
}

function isTrackGuideRailActive(
  _guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
) {
  return Boolean(getTrackGuideRailState(railId, lineMap))
}

function getTrackGuideRailState(
  railId: string,
  lineMap: LineMapRuntimeState,
) {
  const routeRailId = TRACK_GUIDE_ROUTE_RAIL_IDS[railId] ?? railId

  return lineMap.routeSegments[routeRailId]
}

function isOverlayTrackGuide(guide: (typeof translucentTrackGuides)[number]) {
  const tone = 'tone' in guide ? String(guide.tone) : ''

  return tone === 'yellow' || tone === 'white' || tone === 'red' || tone === 'grey'
}

function getTrackGuideRailId(guideId: string, index?: number) {
  const mappedIds = TRACK_GUIDE_RAIL_IDS[guideId]

  if (typeof index === 'number') {
    return mappedIds?.[index] ?? `rail-${normalizeRailLabel(guideId)}-${index + 1}`
  }

  return mappedIds?.[0] ?? `rail-${normalizeRailLabel(guideId)}`
}

function getTrackGuideRailColor(
  _guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
) {
  const state = getTrackGuideRailState(railId, lineMap)

  if (state) {
    return getRouteSegmentPaint(state).color
  }

  return '#63869a'
}

function getTrackGuideRailOpacity(
  guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
) {
  const state = getTrackGuideRailState(railId, lineMap)

  if (state) {
    return getRouteSegmentPaint(state).opacity
  }

  if (isOverlayTrackGuide(guide)) {
    return 0.28
  }

  return undefined
}

function getTrackGuideBaseColor(guide: (typeof translucentTrackGuides)[number]) {
  const tone = 'tone' in guide ? String(guide.tone) : ''

  if (tone === 'yellow') {
    return '#eedc7f'
  }

  if (tone === 'white') {
    return '#ffffff'
  }

  if (tone === 'red') {
    return '#ff0000'
  }

  if (tone === 'grey') {
    return '#4f6f84'
  }

  return '#63869a'
}

function getFlatTrackGuidePoints(from: readonly [number, number], to: readonly [number, number], width: number) {
  const halfWidth = width / 2

  return [
    `${from[0] - halfWidth},${from[1]}`,
    `${from[0] + halfWidth},${from[1]}`,
    `${to[0] + halfWidth},${to[1]}`,
    `${to[0] - halfWidth},${to[1]}`,
  ].join(' ')
}

function TrackPiece({
  lineMap,
  piece,
  track,
  y,
}: {
  lineMap: LineMapRuntimeState
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number]
  track: 'lower' | 'upper'
  y: number
}) {
  const railId = getTrackPieceRailId(piece, track)
  const runtimeState = lineMap.routeSegments[railId]
  const runtimePaint = runtimeState ? getRouteSegmentPaint(runtimeState) : undefined
  const state = getRouteTrackPieceState(piece, lineMap, railId)
  const fallbackColor = state === 'set'
    ? getStaticTrackPieceColor(state)
    : ('color' in piece ? piece.color : undefined)
  const fallbackOpacity = state === 'set'
    ? 1
    : ('opacity' in piece ? piece.opacity : undefined)

  return (
    <span
      className={`line-map-track-piece line-map-track-piece--${state} line-map-track-piece--${track}`}
      data-rail-id={railId}
      data-status={runtimeState?.status ?? state.toUpperCase()}
      data-testid={railId}
      id={railId}
      style={{
        background: runtimePaint?.color ?? fallbackColor,
        left: piece.x,
        opacity: runtimePaint?.opacity ?? fallbackOpacity,
        top: y,
        width: piece.width,
      }}
    />
  )
}

function ShapedUpperTrackPieces() {
  return (
    <svg
      aria-hidden="true"
      className="line-map-shaped-track-svg"
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {shapedUpperTrackPieces.map((piece) => {
        const railId = getShapedTrackRailId(piece.id)
        const pieceOpacity = 'opacity' in piece && typeof piece.opacity === 'number'
          ? piece.opacity
          : undefined

        return (
          <polygon
            data-rail-id={railId}
            data-testid={railId}
            fill={getStaticTrackPieceColor(piece.state)}
            id={railId}
            key={piece.id}
            opacity={pieceOpacity}
            points={piece.points.map((point) => `${point[0]},${point[1]}`).join(' ')}
            shapeRendering="geometricPrecision"
          />
        )
      })}
    </svg>
  )
}

function UpperTrackCrossingMasks() {
  return (
    <svg
      aria-hidden="true"
      className="line-map-track-crossing-mask-svg"
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {upperTrackCrossingMasks.map((mask) => (
        <path
          d={getRouteSegmentPathD(mask.points)}
          fill="none"
          key={mask.id}
          shapeRendering="geometricPrecision"
          stroke="#405e75"
          strokeLinecap="butt"
          strokeWidth={mask.width}
        />
      ))}
    </svg>
  )
}

function UpperTrackEdgeStrips() {
  return (
    <svg
      aria-hidden="true"
      className="line-map-track-crossing-mask-svg"
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {upperTrackEdgeStrips.map((strip) => {
        return (
          <polygon
            data-testid={strip.id}
            fill="#4f748b"
            key={strip.id}
            opacity={0.28}
            points={strip.polygonPoints.map((point) => point.join(',')).join(' ')}
            shapeRendering="geometricPrecision"
          />
        )
      })}
    </svg>
  )
}

function LowerTrackEdgeStrips() {
  return (
    <svg
      aria-hidden="true"
      className="line-map-track-crossing-mask-svg"
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {lowerTrackEdgeStrips.map((strip) => {
        return (
          <polygon
            data-testid={strip.id}
            fill="#4f748b"
            key={strip.id}
            opacity={0.28}
            points={strip.polygonPoints.map((point) => point.join(',')).join(' ')}
            shapeRendering="geometricPrecision"
          />
        )
      })}
    </svg>
  )
}

function StaticTrackPiece({ piece }: { piece: (typeof staticTrackPieces)[number] }) {
  return (
    <LineSegment
      color={getStaticTrackPieceColor(piece.state)}
      from={piece.from}
      opacity={1}
      railId={getStaticTrackPieceRailId(piece.id)}
      rounded={false}
      to={piece.to}
      width={piece.width}
    />
  )
}

function StaticTrackPaths() {
  return (
    <svg
      aria-hidden="true"
      className="line-map-static-track-svg"
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {staticTrackPaths.map((path) => (
        (() => {
          const railId = getStaticTrackPathRailId(path.id)
          const polygonPoints = 'polygonPoints' in path ? path.polygonPoints : undefined

          if (polygonPoints !== undefined) {
            return (
              <g
                data-rail-id={railId}
                data-testid={railId}
                id={railId}
                key={path.id}
              >
                <polygon
                  fill={getStaticTrackPieceColor(path.state)}
                  points={polygonPoints.map((point) => point.join(',')).join(' ')}
                  shapeRendering="geometricPrecision"
                />
                {'edgePolygonPoints' in path && path.edgePolygonPoints ? (
                  <polygon
                    fill="#4f748b"
                    opacity={0.28}
                    points={path.edgePolygonPoints.map((point) => point.join(',')).join(' ')}
                    shapeRendering="geometricPrecision"
                  />
                ) : null}
              </g>
            )
          }

          return (
            <path
              data-rail-id={railId}
              data-testid={railId}
              d={getStaticTrackPathD(path.points)}
              fill="none"
              id={railId}
              key={path.id}
              stroke={getStaticTrackPieceColor(path.state)}
              strokeLinecap="butt"
              strokeLinejoin={getStaticTrackPathLineJoin(path)}
              strokeWidth={path.width}
              shapeRendering="geometricPrecision"
            />
          )
        })()
      ))}
    </svg>
  )
}

function getStaticTrackPathD(points: readonly (readonly [number, number])[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ')
}

function getStaticTrackPathLineJoin(path: (typeof staticTrackPaths)[number]) {
  return 'lineJoin' in path && path.lineJoin === 'miter' ? 'miter' : 'round'
}

function StaticTrackBoundary({ boundary }: { boundary: (typeof staticTrackBoundaries)[number] }) {
  return (
    <span
      className="line-map-track-boundary"
      style={{
        height: 'height' in boundary ? boundary.height : undefined,
        left: boundary.x,
        top: boundary.y,
        transform: `translate(-50%, -50%) rotate(${boundary.angle}deg)`,
        width: 'width' in boundary ? boundary.width : undefined,
      }}
    />
  )
}

function getStaticTrackPieceColor(state: 'condition' | 'default' | 'set' | 'unset') {
  if (state === 'condition') {
    return '#ffffff'
  }

  if (state === 'set') {
    return '#ffffff'
  }

  if (state === 'default') {
    return '#ffffff'
  }

  return '#ffffff'
}

function getSignalTrack(signal: LineMapSignalData, fallback: 'lower' | 'upper') {
  return 'track' in signal && (signal.track === 'lower' || signal.track === 'upper') ? signal.track : fallback
}

function getSignalY(signal: LineMapSignalData, fallback: 'lower' | 'upper') {
  if ('y' in signal && typeof signal.y === 'number') {
    return signal.y
  }

  return getTrackY(signal.x, getSignalTrack(signal, fallback))
}

function getSignalDomId(signal: LineMapSignalData) {
  const baseId = `signal-${normalizeRailLabel(signal.label)}`

  return isDuplicateSignalLabel(signal.label) ? `${baseId}-${getRailSection(signal.x).name}` : baseId
}

function isDuplicateSignalLabel(label: string) {
  return [...upperSignals, ...lowerSignals].filter((signal) => signal.label === label).length > 1
}

function isDefaultActiveStraightRailId(railId: string) {
  return /^rail-(?!P)([0-9]+[A-Z]?)$/i.test(railId)
}

function getRouteTrackPieceState(
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number],
  lineMap: LineMapRuntimeState,
  railId: string,
) {
  if (isRouteStateActive(lineMap.routeSegments[railId])) {
    return 'set'
  }

  if (isDefaultActiveStraightRailId(railId)) {
    return 'set'
  }

  if (piece.state !== 'unset') {
    return piece.state
  }

  return piece.state
}

function isRouteStateActive(state?: LineMapRuntimeState['routeSegments'][string]) {
  return Boolean(state && ['DISPATCHED', 'HELD', 'SET'].includes(state.status))
}

function isSignalRouteCommandState(state?: LineMapRuntimeState['routeSegments'][string]) {
  return Boolean(state && isRouteStateActive(state) && (state.trainId || state.updatedAt > 0))
}

function getSignalRouteStateIds(signal: LineMapSignalData) {
  const ids = [`track:${Math.round(signal.x)}`]

  if (signal.label === 'S610') {
    ids.push(...S610_SIGNAL_ROUTE_RAIL_IDS)
  }

  if (signal.label === 'S608') {
    ids.push(...S608_SIGNAL_ROUTE_RAIL_IDS)
  }

  if (signal.label === 'S700') {
    ids.push(...S700_SIGNAL_ROUTE_RAIL_IDS)
  }

  if (signal.label === 'S704') {
    ids.push(...S704_SIGNAL_ROUTE_RAIL_IDS)
  }

  if (signal.label === 'S1104') {
    ids.push(...S1104_SIGNAL_ROUTE_RAIL_IDS)
  }

  return ids
}

function getSignalLampTone(signal: LineMapSignalData, lineMap: LineMapRuntimeState): 'red' | 'white' {
  return getSignalRouteStateIds(signal).some((segmentId) => (
    isSignalRouteCommandState(lineMap.routeSegments[segmentId])
  ))
    ? 'white'
    : 'red'
}

function getTrackPieceRailId(
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number],
  track: 'lower' | 'upper',
) {
  const section = getRailSection(piece.x)
  const label = getTrackPieceLabel(piece, track, section.name)

  if (label) {
    return `rail-${normalizeRailLabel(label)}`
  }

  return `rail-unlabelled-${track}-${section.name}-${Math.round(piece.x - section.start)}-${Math.round(piece.width)}`
}

function getBranchGuideRailId(x: number) {
  const section = getRailSection(x)
  const relativeX = Math.round(x - section.start)

  return `rail-branch-${section.name}-${relativeX}`
}

function getRailSection(x: number) {
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

function getTrackPieceLabel(
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number],
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

function normalizeRailLabel(label: string) {
  return label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getRouteSegmentState(
  segment: (typeof routeSegmentData)[number],
  lineMap: LineMapRuntimeState,
) {
  const railId = getRouteSegmentRailId(segment.id)

  return lineMap.routeSegments[railId] ?? lineMap.routeSegments[segment.id]
}

function getRouteSegmentRailId(segmentId: string) {
  return ROUTE_SEGMENT_RAIL_IDS[segmentId] ?? `rail-${normalizeRailLabel(segmentId)}`
}

function getRouteSegmentRailPartId(segmentId: string, index: number) {
  const mappedIds = ROUTE_SEGMENT_RAIL_PART_IDS[segmentId]

  if (mappedIds?.[index]) {
    return mappedIds[index]
  }

  const railId = getRouteSegmentRailId(segmentId)

  return index === 0 ? railId : `${railId}-${index + 1}`
}

function getShapedTrackRailId(pieceId: string) {
  return SHAPED_TRACK_RAIL_IDS[pieceId] ?? `rail-${normalizeRailLabel(pieceId)}`
}

function getStaticTrackPieceRailId(pieceId: string) {
  return STATIC_TRACK_PIECE_RAIL_IDS[pieceId] ?? `rail-${normalizeRailLabel(pieceId)}`
}

function getStaticTrackPathRailId(pathId: string) {
  return STATIC_TRACK_PATH_RAIL_IDS[pathId] ?? `rail-${normalizeRailLabel(pathId)}`
}

function RouteSegmentBase({
  bodyOnly = false,
  lineMap,
  segment,
  state,
}: {
  bodyOnly?: boolean
  lineMap: LineMapRuntimeState
  segment: (typeof routeSegmentData)[number]
  state?: LineMapRuntimeState['routeSegments'][string]
}) {
  if (!state && 'hideWhenIdle' in segment && segment.hideWhenIdle) {
    return null
  }

  const idlePaint = 'idleColor' in segment && typeof segment.idleColor === 'string'
    ? {
        color: segment.idleColor,
        opacity: 'idleOpacity' in segment && typeof segment.idleOpacity === 'number' ? segment.idleOpacity : 1,
      }
    : undefined
  const paint = idlePaint
    ? state ? getRouteSegmentPaint(state) : idlePaint
    : 'color' in segment && typeof segment.color === 'string'
      ? { color: segment.color, opacity: 1 }
      : getRouteSegmentPaint(state)
  const opacity = idlePaint && !state
    ? idlePaint.opacity
    : 'opacity' in segment && typeof segment.opacity === 'number' ? segment.opacity : paint.opacity
  const rounded = !('rounded' in segment) || segment.rounded !== false
  const railId = getRouteSegmentRailId(segment.id)

  return (
    <div
      className="line-map-route-segment"
      data-rail-id={railId}
      data-status={state?.status ?? 'IDLE'}
      data-testid={`${railId}-container`}
      data-train-id={state?.trainId ?? ''}
      id={`${railId}-container`}
    >
      {'joined' in segment && segment.joined ? (
        <RouteSegmentPath bodyOnly={bodyOnly} color={paint.color} lineMap={lineMap} opacity={opacity} segment={segment} state={state} />
      ) : (
        segment.points.slice(1).map((point, index) => {
          const from = segment.points[index]

          return (
            <LineSegment
                color={paint.color}
                from={from}
                key={`${segment.id}-base-${index}`}
                opacity={opacity}
                railId={getRouteSegmentRailPartId(segment.id, index)}
                rounded={rounded}
              to={point}
              width={segment.width}
            />
          )
        })
      )}
      {'caps' in segment && segment.caps ? <RouteSegmentCaps color={paint.color} segment={segment} /> : null}
    </div>
  )
}

function RouteSegmentPath({
  bodyOnly = false,
  color,
  lineMap,
  opacity,
  segment,
  state,
}: {
  bodyOnly?: boolean
  color: string
  lineMap: LineMapRuntimeState
  opacity: number
  segment: (typeof routeSegmentData)[number]
  state?: LineMapRuntimeState['routeSegments'][string]
}) {
  return (
    <svg
      aria-hidden="true"
      className="line-map-route-path-svg"
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {'segmentPolygons' in segment ? (
        <>
          {segment.segmentPolygons.map((piece, index) => {
            const railId = getRouteSegmentRailPartId(segment.id, index)
            const segmentRailId = getRouteSegmentRailId(segment.id)
            const pieceState = railId === segmentRailId ? state : lineMap.routeSegments[railId] ?? state
            const piecePaint = pieceState ? getRouteSegmentPaint(pieceState) : { color, opacity }
            const key = 'pathD' in piece ? piece.pathD : piece.polygonPoints.map((point) => point.join(',')).join(' ')
            const edgeNode = bodyOnly ? null : 'edgePathD' in piece ? (
              <path
                d={piece.edgePathD}
                fill="#4f748b"
                opacity={0.28}
                shapeRendering="geometricPrecision"
              />
            ) : 'edgePathPoints' in piece ? (
              <path
                d={getRouteSegmentPathD(piece.edgePathPoints as readonly (readonly [number, number])[])}
                fill="none"
                opacity={0.28}
                shapeRendering="geometricPrecision"
                stroke="#4f748b"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeWidth={LEFT_STRIP_WIDTH}
              />
            ) : 'edgePolygonPoints' in piece && piece.edgePolygonPoints ? (
              <polygon
                fill="#4f748b"
                opacity={0.28}
                points={piece.edgePolygonPoints.map((point) => point.join(',')).join(' ')}
                shapeRendering="geometricPrecision"
              />
            ) : null

            const railNode = (
              <g
                data-rail-id={railId}
                data-testid={railId}
                id={railId}
                key={key}
              >
                {'pathD' in piece ? (
                  <path
                    d={piece.pathD}
                    fill={piecePaint.color}
                    opacity={piecePaint.opacity}
                    shapeRendering="geometricPrecision"
                  />
                ) : (
                  <polygon
                    fill={piecePaint.color}
                    opacity={piecePaint.opacity}
                    points={piece.polygonPoints.map((point) => point.join(',')).join(' ')}
                    shapeRendering="geometricPrecision"
                  />
                )}
              </g>
            )

            return edgeNode ? [
              <g aria-hidden="true" data-edge-for={railId} key={`${key}-edge`}>
                {edgeNode}
              </g>,
              railNode,
            ] : railNode
          })}
        </>
      ) : 'polygonPoints' in segment ? (
        <>
          {(() => {
            const railId = getRouteSegmentRailPartId(segment.id, 0)

            return (
          <polygon
            data-rail-id={railId}
            data-testid={railId}
            fill={color}
            id={railId}
            opacity={opacity}
            points={segment.polygonPoints.map((point) => point.join(',')).join(' ')}
            shapeRendering="geometricPrecision"
          />
            )
          })()}
          {'edgePolygonPoints' in segment && segment.edgePolygonPoints ? (
            <polygon
              fill="#4f748b"
              opacity={0.28}
              points={segment.edgePolygonPoints.map((point) => point.join(',')).join(' ')}
              shapeRendering="geometricPrecision"
            />
          ) : null}
        </>
      ) : (
        (() => {
          const railId = getRouteSegmentRailPartId(segment.id, 0)

          return (
            <path
              data-rail-id={railId}
              data-testid={railId}
              d={getRouteSegmentPathD(segment.points)}
              fill="none"
              id={railId}
              shapeRendering="geometricPrecision"
              stroke={color}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth={segment.width}
              opacity={opacity}
            />
          )
        })()
      )}
    </svg>
  )
}

function getRouteSegmentPathD(points: readonly (readonly [number, number])[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ')
}

function RouteSegmentCaps({
  color,
  segment,
}: {
  color: string
  segment: (typeof routeSegmentData)[number]
}) {
  const capColor = 'capColor' in segment && typeof segment.capColor === 'string' ? segment.capColor : color
  const capHeight = 'capHeight' in segment && typeof segment.capHeight === 'number' ? segment.capHeight : undefined
  const capWidth = 'capWidth' in segment && typeof segment.capWidth === 'number' ? segment.capWidth : undefined
  const caps = segment.points.slice(1).flatMap((point, index) => {
    const from = segment.points[index]

    if (Math.abs(point[1] - from[1]) > 1) {
      return []
    }

    return [
      { x: from[0], y: from[1] },
      { x: point[0], y: point[1] },
    ]
  })

  return (
    <>
      {caps.map((cap, index) => (
        <span
          className="line-map-route-cap"
          data-rail-id={`${getRouteSegmentRailId(segment.id)}-cap-${index + 1}`}
          data-testid={`${getRouteSegmentRailId(segment.id)}-cap-${index + 1}`}
          id={`${getRouteSegmentRailId(segment.id)}-cap-${index + 1}`}
          key={`${segment.id}-cap-${index}`}
          style={{
            background: capColor,
            height: capHeight,
            left: cap.x,
            marginTop: capHeight ? -(capHeight / 2) : undefined,
            top: cap.y,
            width: capWidth,
          }}
        />
      ))}
    </>
  )
}

function AtcPanel({ atc }: { atc: (typeof atcData)[number] }) {
  return (
    <div className="line-map-atc-panel" style={{ left: atc.x, top: atc.y }}>
      <b>{atc.label}</b>
      <button type="button">GGAMA</button>
      <button type="button">GGAMA</button>
      <button type="button">GTSR</button>
      <button type="button">GTSR</button>
    </div>
  )
}

function CycleControl({ onToggleCycle, x, y }: { onToggleCycle: () => void; x: number; y: number }) {
  return (
    <button
      className="line-map-cycle-control"
      onClick={(event) => {
        event.stopPropagation()
        onToggleCycle()
      }}
      type="button"
      style={{ left: x, top: y }}
    >
      <span>CYCLE</span>
      <span>NONE</span>
    </button>
  )
}

function PlatformPanel({ platform }: { platform: (typeof platformData)[number] }) {
  return (
      <div className="line-map-platform-panel" style={{ left: platform.x - 36, top: platform.y }}>
        <div className="line-map-platform-green" />
      <div className="line-map-platform-grid line-map-platform-grid--north">
        <span>PSD</span>
        <span>PH</span>
        <span>SPKS</span>
        <span>CD</span>
        <span>ESB</span>
        <span>ESP</span>
      </div>
      <strong>{platform.code}</strong>
      <div className="line-map-platform-grid line-map-platform-grid--south">
        <span>ESB</span>
        <span>ESP</span>
        <span>SPKS</span>
        <span>CD</span>
        <span>PSD</span>
        <span>PH</span>
      </div>
      <div className="line-map-platform-green" />
    </div>
  )
}

function CommandPanel({
  onCommand,
  onToggleRouteControlMode,
  panelCode,
  routeMode,
  x,
  y,
}: {
  onCommand: (command: TrainCommand) => void
  onToggleRouteControlMode: (panelCode: string) => void
  panelCode: string
  routeMode: RouteControlMode
  x: number
  y: number
}) {
  const commands: Array<{ command: TrainCommand; label: string }> = [
    { command: 'ROUTE', label: 'ROUTE' },
    { command: 'DISPATCH', label: 'DISPATCH' },
    { command: 'HOLD', label: 'HII' },
  ]

  return (
    <div
      className="line-map-command-panel"
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: x - 38, top: y }}
    >
      {commands.map((item) => (
        <button
          data-testid={`line-map-command-${item.command}-${Math.round(x)}`}
          className={item.command === 'ROUTE' && routeMode === 'OCCM' ? 'is-route-manual' : undefined}
          key={`${x}-${item.command}`}
          onClick={(event) => {
            event.stopPropagation()
            if (item.command === 'ROUTE') {
              onToggleRouteControlMode(panelCode)
              return
            }
            onCommand(item.command)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          <span>{item.label}</span>
          <strong>{item.command === 'HOLD' ? 'ISCS' : item.command === 'ROUTE' ? routeMode : 'OCCA'}</strong>
        </button>
      ))}
    </div>
  )
}

function SignalMarker({
  lineMap,
  lower = false,
  onOpenSignalMenu,
  signal,
  y,
}: {
  lineMap: LineMapRuntimeState
  lower?: boolean
  onOpenSignalMenu: (event: ReactMouseEvent<HTMLElement>, signal: LineMapSignalData) => void
  signal: LineMapSignalData
  y: number
}) {
  const track = getSignalTrack(signal, lower ? 'lower' : 'upper')
  const explicitSide = 'side' in signal && (signal.side === 'below' || signal.side === 'above') ? signal.side : undefined
  const side = explicitSide ?? (lower ? 'below' : 'above')
  const hideText = 'hideText' in signal && signal.hideText
  const labelPositionClass = 'labelPosition' in signal && signal.labelPosition === 'below-lamp' ? 'line-map-signal--label-below-lamp' : ''
  const layoutClass = 'layout' in signal && signal.layout === 'left-stem' ? 'line-map-signal--left-stem' : ''
  const orientationClass = signal.label === 'S653' || signal.label === 'S655' ? 'line-map-signal--s653-orientation' : ''
  const lineFlipClass = signal.label === 'S655' ? 'line-map-signal--s655-flipped-line' : ''
  const signalId = getSignalDomId(signal)
  const lampTone = getSignalLampTone(signal, lineMap)

  return (
    <button
      aria-label={`Open signal menu for signal ${signal.label}`}
      className={`line-map-signal line-map-signal--${side} line-map-signal--${track}-track line-map-signal--${lampTone} ${labelPositionClass} ${layoutClass} ${orientationClass} ${lineFlipClass} ${lower ? 'line-map-signal--lower' : ''}`}
      data-signal-id={signal.label}
      data-testid={signalId}
      id={signalId}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpenSignalMenu(event, signal)
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.button === 2) {
          event.preventDefault()
        }
      }}
      style={{ left: signal.x - 20, top: y }}
      type="button"
    >
      <span className={`line-map-signal-lamp line-map-signal-lamp--${lampTone}`} />
      {hideText ? null : <b>{signal.label}</b>}
    </button>
  )
}

function MapArrow({
  direction = 'right',
  tone,
  x,
  y,
}: {
  direction?: 'left' | 'right'
  tone: 'soft' | 'strong'
  x: number
  y: number
}) {
  const oppositeDirection = direction === 'right' ? 'left' : 'right'

  return (
    <span className="line-map-arrow-group" style={{ left: x, top: y }}>
      <span className={`line-map-arrow line-map-arrow--${oppositeDirection} line-map-arrow--soft`} />
      <span className={`line-map-arrow line-map-arrow--${direction} line-map-arrow--${tone}`} />
    </span>
  )
}

function LineSegment({
  color,
  from,
  opacity,
  railId,
  rounded = true,
  to,
  width,
}: {
  color: string
  from: readonly [number, number]
  opacity: number
  railId?: string
  rounded?: boolean
  to: readonly [number, number]
  width: number
}) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI

  return (
    <span
      className="line-map-route-line"
      data-rail-id={railId}
      data-testid={railId}
      id={railId}
      style={{
        background: color,
        borderRadius: rounded ? undefined : 0,
        height: width,
        left: from[0],
        opacity,
        top: from[1] - width / 2,
        transform: `rotate(${angle}deg)`,
        width: length,
      }}
    />
  )
}

function TrainHotspot({
  onContextMenu,
  onDoubleClick,
  selected,
  train,
  upperTrainReferenceTop,
}: {
  onContextMenu: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDoubleClick: (event: ReactPointerEvent<HTMLButtonElement>) => void
  selected: boolean
  train: TrainState
  upperTrainReferenceTop: number
}) {
  const isNotGranted = !isTrainItamaGranted(train)
  const markerDirection = train.direction === 'left' || train.service === 'SB' ? 'left' : 'right'
  const markerTop = train.service === 'NB' && train.id !== '314'
    ? upperTrainReferenceTop
    : train.y - 24
  const markerLeft = train.x - 24

  return (
    <>
      <span
        className={`line-map-train-marker line-map-train-marker--${markerDirection}${isNotGranted ? ' line-map-train-marker--not-granted' : ''}`}
        data-selected={selected ? 'true' : 'false'}
        style={{
          '--line-map-train-arrow-color': getTrainArrowColor(train),
          '--line-map-train-text-color': getTrainTextColor(train),
          left: markerLeft,
          top: markerTop,
        } as CSSProperties}
      >
        <i className="line-map-train-marker__arrow" />
        <b>{train.id}</b>
        <em />
        {isNotGranted ? <strong /> : null}
      </span>
      <button
        className="line-map-train-hotspot"
        data-itama={isNotGranted ? 'NOT_GRANTED' : 'GRANTED'}
        data-itama-granted={isNotGranted ? 'false' : 'true'}
        data-selected={selected ? 'true' : 'false'}
        data-status={train.status}
        data-testid={`train-hotspot-${train.id}-${Math.round(train.x)}-${Math.round(train.y)}`}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
        onPointerDown={(event) => {
          event.stopPropagation()
          if (event.button === 2) {
            event.preventDefault()
          }
        }}
        style={{ height: 34, left: markerLeft, top: markerTop, width: 48 }}
        title={`Train ${train.id} ${train.status}${isNotGranted ? ' ITAMA NOT GRANTED' : ''}`}
        type="button"
      />
    </>
  )
}

function getTrainArrowColor(train: TrainState) {
  if (train.isMoving) {
    return '#34ff4c'
  }

  return '#ff9a48'
}

function getTrainTextColor(train: TrainState) {
  if (train.isMoving) {
    return '#00ff00'
  }

  return '#ffffff'
}

function getRouteSegmentPaint(state?: LineMapRuntimeState['routeSegments'][string]) {
  if (state?.status === 'DISPATCHED') {
    return { color: '#ff0000', opacity: 1 }
  }

  if (state?.status === 'UNSET') {
    return { color: '#eedc7f', opacity: 1 }
  }

  if (state) {
    return { color: '#ffffff', opacity: 1 }
  }

  return { color: '#63869a', opacity: 0.28 }
}
