import { parseTimetableSeconds } from '../screens/line-map/timetableServiceState'
import type { TimetableRow } from '../types'

// Mirrors the GWS train regulation graph above the Traffic current time table:
// one strip per direction, one slot per in-service train, deviation from timetable.
const SLOT_COUNT = 25
const GRAPH_LEFT = 445
const GRAPH_WIDTH = 828
const AXIS_WIDTH = 32
const SLOT_WIDTH = (GRAPH_WIDTH - AXIS_WIDTH) / SLOT_COUNT
const STRIP_HEIGHT = 150
const MAX_DEVIATION_SECONDS = 60

type RegulationSlot = {
  deviationSeconds: number
  trainId: string
}

function getInServiceSlots(rows: readonly TimetableRow[], run: 'NB' | 'SB', nowSeconds: number): RegulationSlot[] {
  const inService = rows
    .filter((row) => row.run === run)
    .map((row) => ({
      end: parseTimetableSeconds(row.destinationTime),
      row,
      start: parseTimetableSeconds(row.originTime),
    }))
    .filter((item): item is { end: number; row: TimetableRow; start: number } => (
      item.start !== undefined && item.end !== undefined
    ))
    // After-midnight trips are timed past 24:00, so test both clock readings.
    .filter(({ end, start }) => [nowSeconds, nowSeconds + 86400].some((now) => start <= now && now <= end))
    .sort((left, right) => right.start - left.start)

  const slots = inService.slice(0, SLOT_COUNT).map(({ row }) => ({
    // Timetable playback keeps trains on schedule, so deviation is zero until
    // a scenario introduces delays.
    deviationSeconds: 0,
    trainId: row.train,
  }))

  return [...slots, ...Array.from({ length: SLOT_COUNT - slots.length }, () => ({ deviationSeconds: 0, trainId: '0' }))]
}

function formatDeviation(seconds: number) {
  const sign = seconds < 0 ? '-' : ''
  const absolute = Math.abs(seconds)

  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

function RegulationStrip({ slots, top }: { slots: RegulationSlot[]; top: number }) {
  const plotTop = top + 18
  const plotBottom = top + STRIP_HEIGHT - 18
  const zeroY = (plotTop + plotBottom) / 2
  const halfHeight = (plotBottom - plotTop) / 2

  return (
    <g>
      <text className="regulation-axis-label" x={4} y={plotTop - 2}>MAX.</text>
      <text className="regulation-axis-label" x={4} y={plotTop + 10}>1:00</text>
      <text className="regulation-axis-label" x={18} y={zeroY + 4}>0</text>
      <text className="regulation-axis-label" x={4} y={plotBottom - 2}>MIN.</text>
      <text className="regulation-axis-label" x={4} y={plotBottom + 10}>1:00</text>
      <line className="regulation-axis" x1={AXIS_WIDTH} x2={AXIS_WIDTH} y1={plotTop} y2={plotBottom} />
      <line className="regulation-limit" x1={AXIS_WIDTH - 4} x2={AXIS_WIDTH + 4} y1={plotTop} y2={plotTop} />
      <line className="regulation-limit" x1={AXIS_WIDTH - 4} x2={AXIS_WIDTH + 4} y1={plotBottom} y2={plotBottom} />
      {slots.map((slot, index) => {
        const x = AXIS_WIDTH + (index * SLOT_WIDTH)
        const clamped = Math.max(-MAX_DEVIATION_SECONDS, Math.min(MAX_DEVIATION_SECONDS, slot.deviationSeconds))
        const barHeight = (Math.abs(clamped) / MAX_DEVIATION_SECONDS) * halfHeight

        return (
          <g key={`${slot.trainId}-${index}`}>
            <text className="regulation-train" x={x + (SLOT_WIDTH / 2)} y={top + 11}>{slot.trainId}</text>
            {barHeight > 0 ? (
              <rect
                className={clamped > 0 ? 'regulation-bar is-late' : 'regulation-bar is-early'}
                height={barHeight}
                width={SLOT_WIDTH - 8}
                x={x + 4}
                y={clamped > 0 ? zeroY - barHeight : zeroY}
              />
            ) : (
              <line className="regulation-zero" x1={x + 6} x2={x + SLOT_WIDTH - 6} y1={zeroY} y2={zeroY} />
            )}
            <text className="regulation-deviation" x={x + (SLOT_WIDTH / 2)} y={plotBottom + 11}>
              {formatDeviation(slot.deviationSeconds)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export default function TimetableRegulationGraph({ now, rows }: { now: Date; rows: readonly TimetableRow[] }) {
  const nowSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds()

  return (
    <svg
      aria-label="Train regulation graph"
      className="timetable-regulation-graph"
      height={366}
      style={{ left: GRAPH_LEFT }}
      viewBox={`0 0 ${GRAPH_WIDTH} 366`}
      width={GRAPH_WIDTH}
    >
      <RegulationStrip slots={getInServiceSlots(rows, 'NB', nowSeconds)} top={4} />
      <text className="regulation-direction" x={GRAPH_WIDTH - 4} y={190}>SOUTH BOUND DIRECTION</text>
      <path className="regulation-direction-arrow" d={`M ${GRAPH_WIDTH - 200} 186 h 34 M ${GRAPH_WIDTH - 200} 186 l 7 -4 M ${GRAPH_WIDTH - 200} 186 l 7 4`} />
      <RegulationStrip slots={getInServiceSlots(rows, 'SB', nowSeconds)} top={206} />
    </svg>
  )
}
