import { useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from 'react'
import ScadaFooter from '../../components/ScadaFooter'
import Win98HtmlButton from '../../components/train-control/Win98HtmlButton'
import usePopupDrag from '../../components/train-control/usePopupDrag'
import {
  MAP_PAN_MAX,
  MAP_PAN_STEP,
  MAP_SECTION_OFFSETS,
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
import {
  getBranchGuideRailId,
  getRailSection,
  getRouteSegmentRailId,
  getRouteSegmentRailPartId,
  getShapedTrackRailId,
  getStaticTrackPathRailId,
  getStaticTrackPieceRailId,
  getTrackGuideRailId,
  getTrackGuideRouteRailId,
  getTrackPieceRailId,
  normalizeRailLabel,
} from './railIds'
import {
  DEFAULT_RAIL_VISUAL_PAINT,
  getBlockedStraightRailPaint,
  isRouteRailDisplaySuppressed,
  resolveRailVisualPaint,
  resolveRouteRailVisualPaint,
} from './railVisualState'
import { getLineMapBaseRailVisualState } from './lineMapBaseRailVisualState'
import { getSignalRouteLampTone } from './signalRouteState'
import type { AppRoute, LineMapRuntimeState, RouteControlMode, TrainCommand, TrainState } from '../../types'

const BODY_TOP = 172
const MAIN_UPPER_TRACK_Y = 215
const MAIN_LOWER_TRACK_Y = 455
const LEFT_STRIP_OFFSET = 8.5
const LEFT_STRIP_WIDTH = 3
const MAP_ARROW_TRAIN_DIRECTION_RADIUS = 120
const TRAIN_MARKER_SAME_RAIL_STACK_STEP_PX = 28
const TRACK_Y_BY_SECTION = [
  { start: MAP_SECTION_OFFSETS.section01, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
  { start: MAP_SECTION_OFFSETS.section02, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
  { start: MAP_SECTION_OFFSETS.section03, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
  { start: MAP_SECTION_OFFSETS.section04, upper: MAIN_UPPER_TRACK_Y, lower: MAIN_LOWER_TRACK_Y },
] as const
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
  onSetRouteControlMode: (panelCode: string, mode: RouteControlMode) => void
  onWheel: (event: ReactWheelEvent<HTMLDivElement>) => void
  panX: number
  routeAutomationStatus: string
  routeControlModes: Record<string, RouteControlMode>
  selectedTrain?: TrainState
  selectedTrainId: string
  trainOccupancyRouteSegments?: LineMapRuntimeState['routeSegments']
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

const section02_PRE_JOIN_START = MONITOR_WIDTH
const section03_PRE_JOIN_START = MAP_SECTION_OFFSETS.section03 + 70

const seamRouteNumberOverlaps = [
  {
    label: '309',
    nextX: MAP_SECTION_OFFSETS.section02 + 14,
    nextStart: section02_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section02 - 80,
    y: 211,
  },
  {
    label: '311',
    nextX: MAP_SECTION_OFFSETS.section02 + 58,
    nextStart: section02_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section02 - 80,
    y: 211,
  },
  {
    label: '308',
    nextX: MAP_SECTION_OFFSETS.section02 + 14,
    nextStart: section02_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section02 - 80,
    y: 478,
  },
  {
    label: '310',
    nextX: MAP_SECTION_OFFSETS.section02 + 58,
    nextStart: section02_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section02 - 80,
    y: 478,
  },
  {
    label: '501',
    nextX: MAP_SECTION_OFFSETS.section03 + 2,
    nextStart: section03_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section03 - 80,
    y: 211,
  },
  {
    label: '503',
    nextX: MAP_SECTION_OFFSETS.section03 + 34,
    nextStart: section03_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section03 - 80,
    y: 211,
  },
  {
    label: '505',
    nextX: MAP_SECTION_OFFSETS.section03 + 82,
    nextStart: section03_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section03 - 80,
    y: 211,
  },
  {
    label: '500',
    nextX: MAP_SECTION_OFFSETS.section03 + 32,
    nextStart: section03_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section03 - 80,
    y: 478,
  },
  {
    label: '502',
    nextX: MAP_SECTION_OFFSETS.section03 + 76,
    nextStart: section03_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section03 - 80,
    y: 478,
  },
  {
    label: '504',
    nextX: MAP_SECTION_OFFSETS.section03 + 121,
    nextStart: section03_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section03 - 80,
    y: 478,
  },
  {
    label: '613',
    nextX: MAP_SECTION_OFFSETS.section04 + 42,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 300,
    y: 211,
  },
  {
    label: '615',
    nextX: MAP_SECTION_OFFSETS.section04 + 106,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 300,
    y: 211,
  },
  {
    label: '617',
    nextX: MAP_SECTION_OFFSETS.section04 + 176,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 300,
    y: 211,
  },
  {
    label: '619',
    nextX: MAP_SECTION_OFFSETS.section04 + 236,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 300,
    y: 211,
  },
  {
    label: '621',
    nextX: MAP_SECTION_OFFSETS.section04 + 304,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 300,
    y: 211,
  },
  {
    label: '614',
    nextX: MAP_SECTION_OFFSETS.section04 + 42,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 360,
    y: 478,
  },
  {
    label: '616',
    nextX: MAP_SECTION_OFFSETS.section04 + 116,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 360,
    y: 478,
  },
  {
    label: '618',
    nextX: MAP_SECTION_OFFSETS.section04 + 190,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 360,
    y: 478,
  },
  {
    label: '620',
    nextX: MAP_SECTION_OFFSETS.section04 + 246,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 360,
    y: 478,
  },
  {
    label: '622',
    nextX: MAP_SECTION_OFFSETS.section04 + 308,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 360,
    y: 478,
  },
] as const

const seamSignalOverlaps = [
  {
    labels: ['S309', 'S310'],
    nextFirstX: MAP_SECTION_OFFSETS.section02 + 30,
    nextStart: section02_PRE_JOIN_START,
    previousMinX: MAP_SECTION_OFFSETS.section02 - 80,
  },
  {
    labels: ['S617', 'S619'],
    nextFirstX: MAP_SECTION_OFFSETS.section04 + 126,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 220,
  },
  {
    labels: ['S608', 'S610'],
    nextFirstX: MAP_SECTION_OFFSETS.section04 + 176,
    nextStart: MAP_SECTION_OFFSETS.section04,
    previousMinX: MAP_SECTION_OFFSETS.section04 - 140,
  },
] as const

function isRouteNumberAnnotation(annotation: SchematicAnnotation) {
  return annotation.railLabel
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

    if (overlap.nextStart === section02_PRE_JOIN_START) {
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

  if ('routeNumber' in annotation && annotation.routeNumber) {
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
  onSetRouteControlMode,
  onWheel,
  panX,
  routeAutomationStatus,
  routeControlModes,
  selectedTrain,
  selectedTrainId,
  trainOccupancyRouteSegments = {},
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
  const visibleTrains = trains.filter((train) => train.lineMapVisible !== false)
  const trainMarkerOffsets = createTrainMarkerOffsets(visibleTrains)
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
              trainOccupancyRouteSegments={trainOccupancyRouteSegments}
              onSetRouteControlMode={onSetRouteControlMode}
              trains={visibleTrains}
            />
            <div className="line-map-route-automation-status">{routeAutomationStatus}</div>
            {visibleTrains.map((train) => (
              <TrainHotspot
                key={train.id}
                markerOffset={trainMarkerOffsets.get(train.id)}
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
  trainOccupancyRouteSegments,
  onSetRouteControlMode,
  trains,
}: {
  lineMap: LineMapRuntimeState
  onCommand: (command: TrainCommand) => void
  onOpenSignalMenu: (event: ReactMouseEvent<HTMLElement>, signal: LineMapSignalData) => void
  panX: number
  routeControlModes: Record<string, RouteControlMode>
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
  onSetRouteControlMode: (panelCode: string, mode: RouteControlMode) => void
  trains: readonly TrainState[]
}) {
  const [routeModeMenu, setRouteModeMenu] = useState<{
    panelCode: string
    x: number
    y: number
  } | null>(null)
  const [routeModeConfirmation, setRouteModeConfirmation] = useState<{
    mode: RouteControlMode
    panelCode: string
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return
      }

      if (event.target.closest('.line-map-command-cascade, .line-map-route-mode-confirmation')) {
        return
      }

      setRouteModeMenu(null)
      setRouteModeConfirmation(null)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true)

    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  }, [])

  const openRouteModeMenu = (panelCode: string, x: number, y: number) => {
    setRouteModeConfirmation(null)
    setRouteModeMenu((current) => (
      current?.panelCode === panelCode
        ? null
        : {
            panelCode,
            x,
            y,
          }
    ))
  }

  const requestRouteModeChange = (panelCode: string, mode: RouteControlMode, x: number, y: number) => {
    setRouteModeMenu(null)
    setRouteModeConfirmation({ mode, panelCode, x, y })
  }

  const closeRouteModeOverlays = () => {
    setRouteModeMenu(null)
    setRouteModeConfirmation(null)
  }

  const confirmRouteModeChange = () => {
    if (!routeModeConfirmation) {
      return
    }

    onSetRouteControlMode(routeModeConfirmation.panelCode, routeModeConfirmation.mode)
    setRouteModeConfirmation(null)
  }

  return (
    <div className="line-map-schematic-base">
      {sectionDividers.map((x) => <span className="line-map-section-divider" key={x} style={{ left: x }} />)}
      {mapTitleData.map((title) => <MapTitle key={`${title.x}-${title.y}`} title={title} />)}
      {branchData.map((x) => <BranchGuide key={x} x={x} />)}
      <TranslucentTrackGuides lineMap={lineMap} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
      {staticTrackPieces.map((piece) => (
        <StaticTrackPiece key={piece.id} piece={piece} />
      ))}
      <StaticTrackPaths />
      {staticTrackBoundaries.map((boundary) => (
        <StaticTrackBoundary boundary={boundary} key={boundary.id} />
      ))}
      {routeSegmentData.filter((segment) => segment.id === 'bgk-p603').map((segment) => (
        <RouteSegmentBase bodyOnly key={segment.id} lineMap={lineMap} segment={segment} state={getRouteSegmentState(segment, lineMap)} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
      ))}
      {routeSegmentData.filter((segment) => (
        segment.id === 'section02-middle-turnback'
        || segment.id === 'wlh-turnback'
        || segment.id === 'bgk-rt1'
        || segment.id === 'bgk-651'
      )).map((segment) => (
        <RouteSegmentBase key={segment.id} lineMap={lineMap} segment={segment} state={getRouteSegmentState(segment, lineMap)} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
      ))}
      {upperTrackPieces.map((piece, index) => (
        <TrackPiece key={`upper-${index}`} lineMap={lineMap} piece={piece} track="upper" trainOccupancyRouteSegments={trainOccupancyRouteSegments} y={getTrackY(piece.x, 'upper')} />
      ))}
      <ShapedUpperTrackPieces lineMap={lineMap} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
      <UpperTrackCrossingMasks />
      <UpperTrackEdgeStrips />
      {lowerTrackPieces.map((piece, index) => (
        <TrackPiece key={`lower-${index}`} lineMap={lineMap} piece={piece} track="lower" trainOccupancyRouteSegments={trainOccupancyRouteSegments} y={getTrackY(piece.x, 'lower')} />
      ))}
      <LowerTrackEdgeStrips />
      <OverlayTrackGuides lineMap={lineMap} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
      {routeSegmentData.filter((segment) => (
        segment.id !== 'bgk-p603'
        && segment.id !== 'section02-middle-turnback'
        && segment.id !== 'wlh-turnback'
        && segment.id !== 'bgk-rt1'
        && segment.id !== 'bgk-651'
      )).map((segment) => (
        <RouteSegmentBase key={segment.id} lineMap={lineMap} segment={segment} state={getRouteSegmentState(segment, lineMap)} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
      ))}
      {atcData.map((atc) => <AtcPanel key={atc.label} atc={atc} />)}
      {cycleData.map((cycle) => (
        <CycleControl key={`${cycle.x}-${cycle.y}`} x={cycle.x} y={cycle.y} />
      ))}
      {platformData.map((platform) => <PlatformPanel key={platform.code} lineMap={lineMap} platform={platform} />)}
      {commandData.map((command) => (
        <CommandPanel
          key={`command-${command.code}`}
          onCommand={onCommand}
          onOpenRouteModeMenu={openRouteModeMenu}
          panelCode={command.code}
          routeMode={routeControlModes[command.code] ?? 'OCCA'}
          x={command.x}
          y={command.y}
        />
      ))}
      {routeModeMenu ? (
        <RouteModeCascadeMenu
          onClose={closeRouteModeOverlays}
          onSelectMode={(mode) => requestRouteModeChange(routeModeMenu.panelCode, mode, routeModeMenu.x, routeModeMenu.y)}
          panelCode={routeModeMenu.panelCode}
          x={routeModeMenu.x}
          y={routeModeMenu.y}
        />
      ) : null}
      {routeModeConfirmation ? (
        <RouteModeConfirmationDialog
          mode={routeModeConfirmation.mode}
          onCancel={() => setRouteModeConfirmation(null)}
          onConfirm={confirmRouteModeChange}
          panelCode={routeModeConfirmation.panelCode}
          x={routeModeConfirmation.x}
          y={routeModeConfirmation.y}
        />
      ) : null}
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
      {mapArrowData.map((arrow, index) => {
        const arrowVisual = getMapArrowVisual(arrow, trains)

        return (
          <MapArrow
            direction={arrowVisual.direction}
            key={`${arrow.direction}-${arrow.x}-${index}`}
            tone={arrowVisual.tone}
            x={arrow.x}
            y={arrow.y}
          />
        )
      })}
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

function TranslucentTrackGuides({
  lineMap,
  trainOccupancyRouteSegments,
}: {
  lineMap: LineMapRuntimeState
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
}) {
  const guides = translucentTrackGuides.filter((guide) => !isOverlayTrackGuide(guide))

  return <TrackGuideSvg className="line-map-translucent-track-svg" guides={guides} lineMap={lineMap} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
}

function OverlayTrackGuides({
  lineMap,
  trainOccupancyRouteSegments,
}: {
  lineMap: LineMapRuntimeState
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
}) {
  const guides = translucentTrackGuides.filter(isOverlayTrackGuide)

  return <TrackGuideSvg className="line-map-track-overlay-svg" guides={guides} lineMap={lineMap} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
}

function TrackGuideSvg({
  className,
  guides,
  lineMap,
  trainOccupancyRouteSegments,
}: {
  className: string
  guides: readonly (typeof translucentTrackGuides)[number][]
  lineMap: LineMapRuntimeState
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
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
          const branchGuideRailIds = segments.map((_, index) => getTrackGuideRailId(guide, index))
          const renderInactiveBranchLines = branchGuideRailIds.length > 0
            && branchGuideRailIds.every((railId) => railId.startsWith('rail-P'))
            && branchGuideRailIds.every((railId) => !isTrackGuideRailActive(guide, railId, lineMap, trainOccupancyRouteSegments))

          return (
            <g data-guide-id={guideId} key={guideId} opacity={isOverlay ? undefined : 0.28}>
              {'overlayRects' in guide
                ? (guide.overlayRects as readonly { x: number; y: number; width: number; height: number }[]).map((rect) => (
                  <rect
                    fill={getTrackGuideBaseColor()}
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
                    const railId = getTrackGuideRailId(guide, index)
                    const trackState = getTrackGuideRailState(guide, railId, lineMap, trainOccupancyRouteSegments)
                    const trackColor = getTrackGuideRailColor(guide, railId, lineMap, trainOccupancyRouteSegments)
                    const trackOpacity = getTrackGuideRailOpacity(guide, railId, lineMap, trainOccupancyRouteSegments)

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
                  const railId = getTrackGuideRailId(guide, index)
                  const trackState = getTrackGuideRailState(guide, railId, lineMap, trainOccupancyRouteSegments)
                  const trackColor = getTrackGuideRailColor(guide, railId, lineMap, trainOccupancyRouteSegments)
                  const trackOpacity = getTrackGuideRailOpacity(guide, railId, lineMap, trainOccupancyRouteSegments)
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
                          points={getTrackGuidePiecePolygonPoints(piece, guide, railId, lineMap, trainOccupancyRouteSegments).map((point) => point.join(',')).join(' ')}
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
                  const railId = getTrackGuideRailId(guide, index)
                  const trackState = getTrackGuideRailState(guide, railId, lineMap, trainOccupancyRouteSegments)
                  const trackColor = getTrackGuideRailColor(guide, railId, lineMap, trainOccupancyRouteSegments)
                  const trackOpacity = getTrackGuideRailOpacity(guide, railId, lineMap, trainOccupancyRouteSegments)

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

        const railId = getTrackGuideRailId(guide)
        const trackState = getTrackGuideRailState(guide, railId, lineMap, trainOccupancyRouteSegments)
        const trackColor = getTrackGuideRailColor(guide, railId, lineMap, trainOccupancyRouteSegments)

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
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments'],
) {
  if (
    piece.inactivePolygonPoints
    && railId === 'rail-P608'
    && !isTrackGuideRailActive(guide, railId, lineMap, trainOccupancyRouteSegments)
  ) {
    return piece.inactivePolygonPoints
  }

  return piece.polygonPoints
}

function isTrackGuideRailActive(
  guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments'],
) {
  return Boolean(getTrackGuideRailState(guide, railId, lineMap, trainOccupancyRouteSegments))
}

function getTrackGuideRailState(
  guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments'],
) {
  return getTrackGuideRailVisualPaint(
    guide,
    railId,
    lineMap,
    trainOccupancyRouteSegments,
  ).displayState
}

function isOverlayTrackGuide(guide: (typeof translucentTrackGuides)[number]) {
  const tone = 'tone' in guide ? String(guide.tone) : ''

  return tone === 'yellow' || tone === 'white' || tone === 'red' || tone === 'grey'
}

function getTrackGuideRailColor(
  guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments'],
) {
  return getTrackGuideRailVisualPaint(guide, railId, lineMap, trainOccupancyRouteSegments).color
}

function getTrackGuideRailOpacity(
  guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments'],
) {
  return getTrackGuideRailVisualPaint(guide, railId, lineMap, trainOccupancyRouteSegments).opacity
}

function getTrackGuideRailVisualPaint(
  guide: (typeof translucentTrackGuides)[number],
  railId: string,
  lineMap: LineMapRuntimeState,
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments'],
) {
  const routeRailId = getTrackGuideRouteRailId(railId, guide)
  const modelPaint = {
    color: DEFAULT_RAIL_VISUAL_PAINT.color,
    opacity: isOverlayTrackGuide(guide) ? DEFAULT_RAIL_VISUAL_PAINT.opacity : undefined,
  }

  return resolveRailVisualPaint({
    lineMap,
    railId: routeRailId,
    modelPaint,
    baseState: getLineMapBaseRailVisualState(routeRailId),
    occupancyState: trainOccupancyRouteSegments[routeRailId] ?? trainOccupancyRouteSegments[railId],
    routeState: lineMap.routeSegments[routeRailId],
  })
}

function getTrackGuideBaseColor() {
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
  trainOccupancyRouteSegments,
  y,
}: {
  lineMap: LineMapRuntimeState
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number]
  track: 'lower' | 'upper'
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
  y: number
}) {
  const railId = getTrackPieceRailId(piece, track)
  const isBlockedBySlantedRoute = isRouteRailDisplaySuppressed(lineMap, railId)
  const state = isBlockedBySlantedRoute ? 'unset' : getRouteTrackPieceState(piece, lineMap, railId)
  const fallbackColor = state === 'set'
    ? getStaticTrackPieceColor(state)
    : ('color' in piece ? piece.color : undefined)
  const fallbackOpacity = state === 'set'
    ? 1
    : ('opacity' in piece ? piece.opacity : undefined)
  const visualPaint = resolveRailVisualPaint({
    lineMap,
    railId,
    modelPaint: {
      color: fallbackColor,
      opacity: fallbackOpacity,
    },
    baseState: getLineMapBaseRailVisualState(railId),
    occupancyState: trainOccupancyRouteSegments[railId],
    routeState: lineMap.routeSegments[railId],
    suppressedPaint: getBlockedStraightRailPaint(piece),
  })

  return (
    <span
      className={`line-map-track-piece line-map-track-piece--${state} line-map-track-piece--${track}`}
      data-rail-id={railId}
      data-status={visualPaint.suppressed ? 'IDLE' : visualPaint.displayState?.status ?? state.toUpperCase()}
      data-testid={railId}
      id={railId}
      style={{
        background: visualPaint.color,
        left: piece.x,
        opacity: visualPaint.opacity,
        top: y,
        width: piece.width,
        ...('clipPath' in piece ? { clipPath: piece.clipPath } : {}),
      }}
    />
  )
}

function ShapedUpperTrackPieces({
  lineMap,
  trainOccupancyRouteSegments,
}: {
  lineMap: LineMapRuntimeState
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
}) {
  return (
    <svg
      aria-hidden="true"
      className="line-map-shaped-track-svg"
      height="755"
      viewBox={`0 0 ${MAP_WORLD_WIDTH} 755`}
      width={MAP_WORLD_WIDTH}
    >
      {shapedUpperTrackPieces.map((piece) => {
        const railId = getShapedTrackRailId(piece)
        const pieceOpacity = 'opacity' in piece && typeof piece.opacity === 'number'
          ? piece.opacity
          : undefined
        const visualPaint = resolveRailVisualPaint({
          lineMap,
          railId,
          modelPaint: {
            color: getStaticTrackPieceColor(piece.state),
            opacity: pieceOpacity,
          },
          baseState: getLineMapBaseRailVisualState(railId),
          occupancyState: trainOccupancyRouteSegments[railId],
          routeState: lineMap.routeSegments[railId],
          suppressedPaint: DEFAULT_RAIL_VISUAL_PAINT,
        })

        return (
          <polygon
            data-rail-id={railId}
            data-status={visualPaint.suppressed ? 'IDLE' : visualPaint.displayState?.status ?? piece.state.toUpperCase()}
            data-testid={railId}
            fill={visualPaint.color}
            id={railId}
            key={piece.id}
            opacity={visualPaint.opacity}
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
      railId={getStaticTrackPieceRailId(piece)}
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
          const railId = getStaticTrackPathRailId(path)
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

function getSignalStemX(signal: LineMapSignalData, side: 'above' | 'below') {
  if ('layout' in signal && signal.layout === 'left-stem') {
    return 22
  }

  return side === 'below' ? 33 : 7
}

function getSignalLeft(signal: LineMapSignalData, side: 'above' | 'below') {
  const isLeftStem = 'layout' in signal && signal.layout === 'left-stem'

  if ('stemAnchored' in signal && signal.stemAnchored && !isLeftStem) {
    return signal.x - getSignalStemX(signal, side)
  }

  return signal.x - 10
}

function getRouteTrackPieceState(
  piece: (typeof upperTrackPieces)[number] | (typeof lowerTrackPieces)[number],
  lineMap: LineMapRuntimeState,
  railId: string,
) {
  if (isRouteStateActive(lineMap.routeSegments[railId])) {
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

function getRouteSegmentState(
  segment: (typeof routeSegmentData)[number],
  lineMap: LineMapRuntimeState,
) {
  const railId = getRouteSegmentRailId(segment)

  if (isRouteRailDisplaySuppressed(lineMap, railId)) {
    return undefined
  }

  return lineMap.routeSegments[railId] ?? lineMap.routeSegments[segment.id]
}

function RouteSegmentBase({
  bodyOnly = false,
  lineMap,
  segment,
  state,
  trainOccupancyRouteSegments,
}: {
  bodyOnly?: boolean
  lineMap: LineMapRuntimeState
  segment: (typeof routeSegmentData)[number]
  state?: LineMapRuntimeState['routeSegments'][string]
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
}) {
  const railId = getRouteSegmentRailId(segment)
  const idlePaint = 'idleColor' in segment && typeof segment.idleColor === 'string'
    ? {
        color: segment.idleColor,
        opacity: 'idleOpacity' in segment && typeof segment.idleOpacity === 'number' ? segment.idleOpacity : 1,
      }
    : undefined
  const modelPaint = idlePaint
    ?? ('color' in segment && typeof segment.color === 'string'
      ? {
          color: segment.color,
          opacity: 'opacity' in segment && typeof segment.opacity === 'number' ? segment.opacity : 1,
        }
      : DEFAULT_RAIL_VISUAL_PAINT)
  const visualPaint = resolveRouteRailVisualPaint({
    fallbackRouteState: state,
    lineMap,
    modelPaint,
    railId,
    segmentRailId: railId,
    trainOccupancyRouteSegments,
  })
  const displayState = visualPaint.displayState
  const color = visualPaint.color ?? DEFAULT_RAIL_VISUAL_PAINT.color
  const opacity = visualPaint.opacity ?? DEFAULT_RAIL_VISUAL_PAINT.opacity

  if (!displayState && 'hideWhenIdle' in segment && segment.hideWhenIdle) {
    return null
  }

  const rounded = !('rounded' in segment) || segment.rounded !== false

  return (
    <div
      className="line-map-route-segment"
      data-rail-id={railId}
      data-status={displayState?.status ?? 'IDLE'}
      data-testid={`${railId}-container`}
      data-train-id={displayState?.trainId ?? ''}
      id={`${railId}-container`}
    >
      {'joined' in segment && segment.joined ? (
        <RouteSegmentPath bodyOnly={bodyOnly} color={color} lineMap={lineMap} opacity={opacity} segment={segment} state={state} trainOccupancyRouteSegments={trainOccupancyRouteSegments} />
      ) : (
        segment.points.slice(1).map((point, index) => {
          const from = segment.points[index]
          const partRailId = getRouteSegmentRailPartId(segment, index)
          const segmentPaint = resolveRouteRailVisualPaint({
            fallbackRouteState: state,
            lineMap,
            modelPaint: {
              color,
              opacity,
            },
            railId: partRailId,
            segmentRailId: railId,
            trainOccupancyRouteSegments,
          })

          return (
            <LineSegment
                color={segmentPaint.color ?? color}
                from={from}
                key={`${segment.id}-base-${index}`}
                opacity={segmentPaint.opacity ?? opacity}
                railId={partRailId}
                rounded={rounded}
              to={point}
              width={segment.width}
            />
          )
        })
      )}
      {'caps' in segment && segment.caps ? <RouteSegmentCaps color={color} segment={segment} /> : null}
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
  trainOccupancyRouteSegments,
}: {
  bodyOnly?: boolean
  color: string
  lineMap: LineMapRuntimeState
  opacity: number
  segment: (typeof routeSegmentData)[number]
  state?: LineMapRuntimeState['routeSegments'][string]
  trainOccupancyRouteSegments: LineMapRuntimeState['routeSegments']
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
            const railId = getRouteSegmentRailPartId(segment, index)
            const segmentRailId = getRouteSegmentRailId(segment)
            const piecePaint = resolveRouteRailVisualPaint({
              fallbackRouteState: state,
              lineMap,
              modelPaint: { color, opacity },
              railId,
              segmentRailId,
              trainOccupancyRouteSegments,
            })
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
                    fill={piecePaint.color ?? color}
                    opacity={piecePaint.opacity ?? opacity}
                    shapeRendering="geometricPrecision"
                  />
                ) : (
                  <polygon
                    fill={piecePaint.color ?? color}
                    opacity={piecePaint.opacity ?? opacity}
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
            const railId = getRouteSegmentRailPartId(segment, 0)
            const piecePaint = resolveRouteRailVisualPaint({
              fallbackRouteState: state,
              lineMap,
              modelPaint: { color, opacity },
              railId,
              segmentRailId: getRouteSegmentRailId(segment),
              trainOccupancyRouteSegments,
            })

            return (
          <polygon
            data-rail-id={railId}
            data-testid={railId}
            fill={piecePaint.color ?? color}
            id={railId}
            opacity={piecePaint.opacity ?? opacity}
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
          const railId = getRouteSegmentRailPartId(segment, 0)
          const piecePaint = resolveRouteRailVisualPaint({
            fallbackRouteState: state,
            lineMap,
            modelPaint: { color, opacity },
            railId,
            segmentRailId: getRouteSegmentRailId(segment),
            trainOccupancyRouteSegments,
          })

          return (
            <path
              data-rail-id={railId}
              data-testid={railId}
              d={getRouteSegmentPathD(segment.points)}
              fill="none"
              id={railId}
              shapeRendering="geometricPrecision"
              stroke={piecePaint.color ?? color}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth={segment.width}
              opacity={piecePaint.opacity ?? opacity}
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
          data-rail-id={`${getRouteSegmentRailId(segment)}-cap-${index + 1}`}
          data-testid={`${getRouteSegmentRailId(segment)}-cap-${index + 1}`}
          id={`${getRouteSegmentRailId(segment)}-cap-${index + 1}`}
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

function CycleControl({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="line-map-cycle-control"
      style={{ left: x, top: y }}
    >
      <span>CYCLE</span>
      <span>NONE</span>
    </div>
  )
}

function getPlatformGreenClassName(status?: LineMapRuntimeState['platformDoorStates'][string]['status']) {
  return [
    'line-map-platform-green',
    status === 'UNKNOWN' ? 'line-map-platform-green--unknown' : '',
    status === 'CYCLING' ? 'line-map-platform-green--cycling' : '',
  ].filter(Boolean).join(' ')
}

function PlatformPanel({
  lineMap,
  platform,
}: {
  lineMap: LineMapRuntimeState
  platform: (typeof platformData)[number]
}) {
  const northDoorStatus = lineMap.platformDoorStates[`${platform.code}-NB`]?.status
  const southDoorStatus = lineMap.platformDoorStates[`${platform.code}-SB`]?.status

  return (
    <div className="line-map-platform-panel" style={{ left: platform.x - 36, top: platform.y }}>
      <div className={getPlatformGreenClassName(northDoorStatus)} />
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
      <div className={getPlatformGreenClassName(southDoorStatus)} />
    </div>
  )
}

function CommandPanel({
  onCommand,
  onOpenRouteModeMenu,
  panelCode,
  routeMode,
  x,
  y,
}: {
  onCommand: (command: TrainCommand) => void
  onOpenRouteModeMenu: (panelCode: string, x: number, y: number) => void
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
              onOpenRouteModeMenu(panelCode, x - 24, y - 42)
              return
            }
            onCommand(item.command)
          }}
          onContextMenu={(event) => {
            if (item.command !== 'ROUTE') {
              return
            }

            event.preventDefault()
            event.stopPropagation()
            onOpenRouteModeMenu(panelCode, x - 24, y - 42)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          title={item.command === 'ROUTE'
            ? `${panelCode} route mode: ${routeMode === 'OCCA' ? 'automatic timetable running' : 'manual route control'}`
            : undefined}
          type="button"
        >
          <span>{item.label}</span>
          <strong>{item.command === 'HOLD' ? 'ISCS' : item.command === 'ROUTE' ? routeMode : 'OCCA'}</strong>
        </button>
      ))}
    </div>
  )
}

function RouteModeCascadeMenu({
  onClose,
  onSelectMode,
  panelCode,
  x,
  y,
}: {
  onClose: () => void
  onSelectMode: (mode: RouteControlMode) => void
  panelCode: string
  x: number
  y: number
}) {
  const [activeSubmenu, setActiveSubmenu] = useState<'route' | null>(null)

  return (
    <div
      className="line-map-cascade line-map-command-cascade"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerLeave={() => setActiveSubmenu(null)}
      style={{ left: x, top: y }}
    >
      <div className="line-map-cascade-menu line-map-cascade-menu--command-main">
        <div className="line-map-command-cascade-title">{panelCode}_TRAS_0001</div>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          onPointerEnter={() => setActiveSubmenu(null)}
          type="button"
        >
          <span>Open inspector...</span>
          <span>&gt;</span>
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          onPointerEnter={() => setActiveSubmenu(null)}
          type="button"
        >
          <span>Open details...</span>
          <span>&gt;</span>
        </button>
        <button
          className={activeSubmenu === 'route' ? 'is-active' : undefined}
          onClick={(event) => {
            event.stopPropagation()
            setActiveSubmenu((current) => current === 'route' ? null : 'route')
          }}
          onPointerEnter={() => setActiveSubmenu('route')}
          type="button"
        >
          <span>Routing mode</span>
          <span>&gt;</span>
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          onPointerEnter={() => setActiveSubmenu(null)}
          type="button"
        >
          <span>Dispatching mode</span>
          <span>&gt;</span>
        </button>
        <button
          className="has-divider"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          onPointerEnter={() => setActiveSubmenu(null)}
          type="button"
        >
          _Work request
        </button>
      </div>
      {activeSubmenu === 'route' ? (
        <div className="line-map-cascade-menu line-map-cascade-menu--command-sub">
          <button
            onClick={(event) => {
              event.stopPropagation()
              onSelectMode('OCCA')
            }}
            type="button"
          >
            <span>Central AUTO</span>
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              onSelectMode('OCCM')
            }}
            type="button"
          >
            <span>Central MANUAL</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

function RouteModeConfirmationDialog({
  mode,
  onCancel,
  onConfirm,
  panelCode,
  x,
  y,
}: {
  mode: RouteControlMode
  onCancel: () => void
  onConfirm: () => void
  panelCode: string
  x: number
  y: number
}) {
  const confirmationDrag = usePopupDrag()
  const command = mode === 'OCCA' ? 'AUTO' : 'MANUAL'

  return (
    <div
      className="train-command-confirmation line-map-route-mode-confirmation"
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        left: Math.max(40, x - 60),
        top: Math.max(150, y - 150),
        ...confirmationDrag.style,
      }}
    >
      <div className="train-command-confirmation__title" {...confirmationDrag.titleBarProps}>Command confirmation</div>
      <fieldset>
        <legend>Please confirm command...</legend>
        <div className="train-command-confirmation__grid">
          <label>Equipment</label>
          <div>{panelCode}_TRAS_0001 {'{'}{panelCode} Station Traffic Subtree{'}'}</div>
          <label>Attribute</label>
          <div>Routing Mode</div>
          <label>Command</label>
          <div>{command}</div>
          <label>No wait</label>
          <input type="checkbox" />
        </div>
      </fieldset>
      <div className="train-command-confirmation__actions">
        <Win98HtmlButton>Help</Win98HtmlButton>
        <span />
        <Win98HtmlButton onClick={onConfirm}>Confirm</Win98HtmlButton>
        <Win98HtmlButton onClick={onCancel}>Cancel</Win98HtmlButton>
      </div>
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
  const lampTone = getSignalRouteLampTone(signal, lineMap)
  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onOpenSignalMenu(event, signal)
  }
  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation()
    if (event.button === 2) {
      event.preventDefault()
    }
  }

  return (
    <button
      aria-label={`Open signal menu for signal ${signal.label}`}
      className={`line-map-signal line-map-signal--${side} line-map-signal--${track}-track line-map-signal--${lampTone} ${labelPositionClass} ${layoutClass} ${orientationClass} ${lineFlipClass} ${lower ? 'line-map-signal--lower' : ''}`}
      data-signal-id={signal.label}
      data-testid={signalId}
      id={signalId}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      style={{ left: getSignalLeft(signal, side), top: y }}
      type="button"
    >
      <span
        aria-hidden="true"
        className="line-map-signal-hitbox"
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
      />
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

function getMapArrowVisual(
  arrow: (typeof mapArrowData)[number],
  trains: readonly TrainState[],
) {
  const nearbyTrain = findNearbyTrainForMapArrow(arrow, trains)

  return {
    direction: nearbyTrain?.direction ?? arrow.direction,
    tone: nearbyTrain ? 'strong' as const : arrow.tone,
  }
}

function findNearbyTrainForMapArrow(
  arrow: (typeof mapArrowData)[number],
  trains: readonly TrainState[],
) {
  const arrowCenterX = arrow.x + 22.5
  const arrowLane = getMapArrowLane(arrow.y)

  return trains.reduce<TrainState | undefined>((nearestTrain, train) => {
    if (train.lineMapVisible === false || !train.isMoving || getTrainMapArrowLane(train) !== arrowLane) {
      return nearestTrain
    }

    const distance = Math.abs(train.x - arrowCenterX)
    if (distance > MAP_ARROW_TRAIN_DIRECTION_RADIUS) {
      return nearestTrain
    }

    if (!nearestTrain) {
      return train
    }

    const nearestDistance = Math.abs(nearestTrain.x - arrowCenterX)

    return distance < nearestDistance ? train : nearestTrain
  }, undefined)
}

function getMapArrowLane(y: number) {
  return y < (MAIN_UPPER_TRACK_Y + MAIN_LOWER_TRACK_Y) / 2 ? 'upper' : 'lower'
}

function getTrainMapArrowLane(train: TrainState) {
  return train.y < (MAIN_UPPER_TRACK_Y + MAIN_LOWER_TRACK_Y) / 2 ? 'upper' : 'lower'
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
  markerOffset,
  onContextMenu,
  onDoubleClick,
  selected,
  train,
}: {
  markerOffset?: { x: number; y: number }
  onContextMenu: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDoubleClick: (event: ReactPointerEvent<HTMLButtonElement>) => void
  selected: boolean
  train: TrainState
}) {
  const isNotGranted = !isTrainItamaGranted(train)
  const markerDirection = train.direction
  const markerTop = getTrainMarkerTop(train) + (markerOffset?.y ?? 0)
  const markerLeft = getTrainMarkerLeft(train) + (markerOffset?.x ?? 0)

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

function createTrainMarkerOffsets(trains: readonly TrainState[]) {
  const trainsByOccupiedRail = new Map<string, TrainState[]>()
  const offsets = new Map<string, { x: number; y: number }>()

  trains.forEach((train) => {
    if (!train.occupancySegmentId) {
      return
    }

    trainsByOccupiedRail.set(train.occupancySegmentId, [
      ...(trainsByOccupiedRail.get(train.occupancySegmentId) ?? []),
      train,
    ])
  })

  trainsByOccupiedRail.forEach((railTrains) => {
    if (railTrains.length <= 1) {
      return
    }

    const sortedGroup = [...railTrains].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }))
    const stackDirection = getTrainMarkerTop(sortedGroup[0]) < MAIN_LOWER_TRACK_Y ? -1 : 1

    sortedGroup.forEach((train, index) => {
      offsets.set(train.id, {
        x: 0,
        y: index * TRAIN_MARKER_SAME_RAIL_STACK_STEP_PX * stackDirection,
      })
    })
  })

  return offsets
}

function getTrainMarkerTop(train: TrainState) {
  const isLowerLaneTrain = train.y > (MAIN_UPPER_TRACK_Y + MAIN_LOWER_TRACK_Y) / 2

  return isLowerLaneTrain
    ? MAIN_LOWER_TRACK_Y + 36
    : train.y - 44
}

function getTrainMarkerLeft(train: TrainState) {
  return train.x - 24
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
