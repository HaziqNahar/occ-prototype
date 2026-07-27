import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MONITOR_HEIGHT, MONITOR_WIDTH } from '../screens/line-map/model'

export default function ScadaDomSurface({
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
