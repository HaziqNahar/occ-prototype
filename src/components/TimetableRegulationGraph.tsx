import type { TimetableRow } from '../types'

// Mirrors the GWS train regulation graph above the Traffic current time table:
// one strip per direction, one slot per train, deviation from timetable.
const SLOT_COUNT = 25
const GRAPH_LEFT = 445
const GRAPH_WIDTH = 828
const AXIS_WIDTH = 32
const SLOT_WIDTH = (GRAPH_WIDTH - AXIS_WIDTH) / SLOT_COUNT
const STRIP_HEIGHT = 150

// The graph is a static copy of the GWS display: the first trains of each
// direction in the loaded timetable, all on time. It does not follow the
// clock or held trains.
function getStaticTrainIds(rows: readonly TimetableRow[], run: 'NB' | 'SB') {
  const trainIds = [...new Set(rows.filter((row) => row.run === run).map((row) => row.train))].slice(0, SLOT_COUNT)

  return [...trainIds, ...Array.from({ length: SLOT_COUNT - trainIds.length }, () => '0')]
}

function RegulationStrip({ top, trainIds }: { top: number; trainIds: string[] }) {
  const plotTop = top + 18
  const plotBottom = top + STRIP_HEIGHT - 18
  const zeroY = (plotTop + plotBottom) / 2

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
      {trainIds.map((trainId, index) => {
        const x = AXIS_WIDTH + (index * SLOT_WIDTH)

        return (
          <g key={`${trainId}-${index}`}>
            <text className="regulation-train" x={x + (SLOT_WIDTH / 2)} y={top + 11}>{trainId}</text>
            <line className="regulation-zero" x1={x + 6} x2={x + SLOT_WIDTH - 6} y1={zeroY} y2={zeroY} />
            <text className="regulation-deviation" x={x + (SLOT_WIDTH / 2)} y={plotBottom + 11}>00:00</text>
          </g>
        )
      })}
    </g>
  )
}

export default function TimetableRegulationGraph({ rows }: { rows: readonly TimetableRow[] }) {
  return (
    <svg
      aria-label="Train regulation graph"
      className="timetable-regulation-graph"
      height={366}
      style={{ left: GRAPH_LEFT }}
      viewBox={`0 0 ${GRAPH_WIDTH} 366`}
      width={GRAPH_WIDTH}
    >
      <RegulationStrip top={4} trainIds={getStaticTrainIds(rows, 'NB')} />
      <text className="regulation-direction" x={GRAPH_WIDTH - 4} y={190}>SOUTH BOUND DIRECTION</text>
      <path className="regulation-direction-arrow" d={`M ${GRAPH_WIDTH - 200} 186 h 34 M ${GRAPH_WIDTH - 200} 186 l 7 -4 M ${GRAPH_WIDTH - 200} 186 l 7 4`} />
      <RegulationStrip top={206} trainIds={getStaticTrainIds(rows, 'SB')} />
    </svg>
  )
}
