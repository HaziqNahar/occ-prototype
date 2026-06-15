import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

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

export default usePopupDrag
