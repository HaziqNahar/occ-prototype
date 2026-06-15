import { useEffect, useState } from 'react'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatScadaDateTime(date: Date) {
  return {
    date: `${WEEKDAY_LABELS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  }
}

export default function LiveScadaClock({
  height = 38,
  width = 146,
  x,
  y,
}: {
  height?: number
  width?: number
  x: number
  y: number
}) {
  const [now, setNow] = useState(() => new Date())
  const display = formatScadaDateTime(now)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <g pointerEvents="none" transform={`translate(${x} ${y})`}>
      <title>{`Current workstation time: ${display.time} ${display.date}`}</title>
      <rect width={width} height={height} fill="#b7bed2" />
      <line x1="0" y1="0" x2={width} y2="0" stroke="#404040" />
      <line x1="0" y1="0" x2="0" y2={height} stroke="#404040" />
      <line x1="1" y1="1" x2={width - 2} y2="1" stroke="#ffffff" />
      <line x1="1" y1="1" x2="1" y2={height - 2} stroke="#ffffff" />
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="#ffffff" />
      <line x1={width - 1} y1="0" x2={width - 1} y2={height} stroke="#ffffff" />
      <line x1="2" y1={height - 3} x2={width - 3} y2={height - 3} stroke="#808080" />
      <line x1={width - 3} y1="2" x2={width - 3} y2={height - 3} stroke="#808080" />
      <text className="svg-live-clock-text" x={width / 2} y="15" textAnchor="middle">
        {display.time}
      </text>
      <text className="svg-live-clock-text" x={width / 2} y="30" textAnchor="middle">
        {display.date}
      </text>
    </g>
  )
}
