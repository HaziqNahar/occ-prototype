import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'

type SidePanelProps = {
  // Buttons beside the title (e.g. Export, Print).
  actions?: ReactNode
  children: ReactNode
  className?: string
  onClose: () => void
  title: ReactNode
  wide?: boolean
}

// A panel that slides in from the right over the page, for a form or one
// record. Escape, the × or a click outside closes it.
function SidePanel({ actions, children, className, onClose, title, wide }: SidePanelProps) {
  const titleId = useId()

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className={`side-panel ${wide ? 'is-wide' : ''} ${className ?? ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="side-panel-head">
          <h2 id={titleId}>{title}</h2>
          {actions && <div className="side-panel-actions">{actions}</div>}
          <button type="button" className="side-panel-close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        {children}
      </aside>
    </div>
  )
}

export default SidePanel
