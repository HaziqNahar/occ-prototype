import type { MouseEvent as ReactMouseEvent } from 'react'

type ToolbarButtonProps = {
  x: number
  y: number
  w: number
  label: string
  onClick?: () => void
  selected?: boolean
}

export function ToolbarButton({ x, y, w, label, onClick, selected }: ToolbarButtonProps) {
  const handlePointerDown = (event: ReactMouseEvent<SVGGElement>) => {
    if (onClick) {
      event.stopPropagation()
    }
  }

  const handleClick = (event: ReactMouseEvent<SVGGElement>) => {
    if (onClick) {
      event.stopPropagation()
      onClick()
    }
  }

  return (
    <g
      className={onClick ? 'svg-clickable' : undefined}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      transform={`translate(${x} ${y})`}
    >
      <rect width={w} height="28" fill={selected ? '#fff58c' : '#c9c9c9'} stroke="#fff" strokeWidth="2" />
      <text className={`svg-button-text ${label.length > 9 ? 'svg-button-text--tight' : ''}`} x={w / 2} y="19" textAnchor="middle">{label}</text>
    </g>
  )
}
