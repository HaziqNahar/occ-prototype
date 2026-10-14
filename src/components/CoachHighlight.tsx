import { useEffect, useRef, useState } from 'react'

type CoachHighlightProps = {
  find: () => HTMLElement | null
  onDone: (found: boolean) => void
  variant: 'outline' | 'ring'
}

type Box = { height: number; left: number; top: number; width: number }

const SHOW_FOR_MS = 6000
// How long to look for the target (the Line Map may still be panning).
const LOOK_FOR_MS = 800

// Show me / Locate (docs/training-layer-plan.md, piece 3): an outline or a
// pulsing ring drawn over the target. It follows the element while it shows,
// so a moving train keeps its ring, and never takes clicks.
function CoachHighlight({ find, onDone, variant }: CoachHighlightProps) {
  const [box, setBox] = useState<Box | null>(null)
  const findRef = useRef(find)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    findRef.current = find
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const startedAt = performance.now()
    let frame = 0
    let found = false
    let last = ''

    const tick = (now: number) => {
      const rect = findRef.current()?.getBoundingClientRect()
      const onScreen = rect && rect.width > 0 && rect.bottom > 0 && rect.right > 0
        && rect.top < window.innerHeight && rect.left < window.innerWidth

      if (onScreen) {
        found = true
      }

      const next = onScreen ? `${rect.left}|${rect.top}|${rect.width}|${rect.height}` : ''

      if (next !== last) {
        last = next
        setBox(onScreen ? { height: rect.height, left: rect.left, top: rect.top, width: rect.width } : null)
      }

      if (now - startedAt > (found ? SHOW_FOR_MS : LOOK_FOR_MS)) {
        onDoneRef.current(found)
        return
      }

      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)

    return () => window.cancelAnimationFrame(frame)
  }, [])

  if (!box) {
    return null
  }

  const pad = variant === 'ring' ? 14 : 4

  return (
    <div
      aria-hidden="true"
      className={`coach-highlight coach-highlight--${variant}`}
      data-testid="coach-highlight"
      style={{
        height: box.height + pad * 2,
        left: box.left - pad,
        top: box.top - pad,
        width: box.width + pad * 2,
      }}
    />
  )
}

export default CoachHighlight
