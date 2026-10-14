import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { areTrainingAidsOn } from '../trainingAids'
import { coachMonitorLabels, getCoachState } from '../training-scenarios/hints'
import type { CoachMonitor } from '../training-scenarios/hints'
import type { OccSessionState } from '../types'

type TrainingCoachProps = {
  monitor: CoachMonitor
  session: OccSessionState
}

type Position = { left: number; top: number }

// Practice-mode next-step coach (docs/training-layer-plan.md, piece 2). It sits
// over the SCADA window and never changes it. Collapsed to one line until
// clicked; drag it by its title to move it (remembered per monitor).

const positionKey = (monitor: CoachMonitor) => `occ-coach-position-${monitor}`

function readPosition(monitor: CoachMonitor): Position | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(positionKey(monitor)) ?? 'null') as Position | null

    return stored && Number.isFinite(stored.left) && Number.isFinite(stored.top) ? stored : null
  } catch {
    return null
  }
}

function savePosition(monitor: CoachMonitor, position: Position) {
  try {
    window.localStorage.setItem(positionKey(monitor), JSON.stringify(position))
  } catch {
    // Position is a convenience; the coach still works where it is.
  }
}

function clampPosition(position: Position, width: number, height: number): Position {
  return {
    left: Math.min(Math.max(0, position.left), Math.max(0, window.innerWidth - width)),
    top: Math.min(Math.max(0, position.top), Math.max(0, window.innerHeight - height)),
  }
}

function TrainingCoach({ monitor, session }: TrainingCoachProps) {
  const [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState<Position | null>(() => readPosition(monitor))
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ moved: boolean; offsetX: number; offsetY: number; startX: number; startY: number } | null>(null)

  if (!areTrainingAidsOn(session)) {
    return null
  }

  const state = getCoachState(session)

  if (state.kind === 'idle' || state.kind === 'complete') {
    return null
  }

  const hint = state.kind === 'step' ? state.hint : null
  const here = hint ? hint.monitors.length === 0 || hint.monitors.includes(monitor) : true
  const elsewhere = hint && !here
    ? `Next step is on ${hint.monitors.map((item) => coachMonitorLabels[item]).join(' or ')}`
    : ''
  const summary = state.kind === 'paused'
    ? 'Paused by the trainer'
    : state.kind === 'done'
      ? 'All steps done. Wait for the trainer to complete the run.'
      : elsewhere || `Next: ${hint!.label}`

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = panelRef.current?.getBoundingClientRect()

    if (!rect || event.button !== 0) {
      return
    }

    dragRef.current = {
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    const rect = panelRef.current?.getBoundingClientRect()

    if (!drag || !rect) {
      return
    }

    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) {
      return
    }

    drag.moved = true
    setPosition(clampPosition({ left: event.clientX - drag.offsetX, top: event.clientY - drag.offsetY }, rect.width, rect.height))
  }

  const onPointerUp = () => {
    const drag = dragRef.current

    dragRef.current = null

    if (drag?.moved) {
      if (position) {
        savePosition(monitor, position)
      }

      return
    }

    setExpanded((value) => !value)
  }

  return (
    <aside
      aria-label="Practice coach"
      className={`training-coach ${expanded ? 'is-expanded' : ''} ${hint && !here ? 'is-elsewhere' : ''}`}
      data-testid="training-coach"
      ref={panelRef}
      style={position ? { left: position.left, right: 'auto', top: position.top } : undefined}
    >
      <button
        aria-expanded={expanded}
        className="training-coach-head"
        onPointerCancel={() => { dragRef.current = null }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setExpanded((value) => !value)
          }
        }}
        title="Click to open or close; drag to move"
        type="button"
      >
        <span className="training-coach-tag">Practice</span>
        <span className="training-coach-summary">{summary}</span>
        <i aria-hidden="true">{expanded ? '▴' : '▾'}</i>
      </button>
      {expanded && hint && state.kind === 'step' && (
        <div className="training-coach-body">
          <small>Step {state.stepNumber} of {state.totalSteps}</small>
          <strong>{hint.label}</strong>
          {here ? (
            <ol>
              {hint.how.map((line) => <li key={line}>{line}</li>)}
            </ol>
          ) : (
            <p>{elsewhere}.</p>
          )}
        </div>
      )}
    </aside>
  )
}

export default TrainingCoach
