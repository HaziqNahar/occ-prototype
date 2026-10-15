import { useEffect } from 'react'

const TOAST_MS = 4000

// A short confirmation at the bottom right ("Backup made."), gone after a
// few seconds. Errors stay on the page instead.
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, TOAST_MS)

    return () => window.clearTimeout(timer)
  }, [message, onClose])

  return (
    <div className="toast" role="status">
      <span className="toast-tick" aria-hidden="true">✓</span>
      <span>{message}</span>
      <button type="button" aria-label="Dismiss" onClick={onClose}>×</button>
    </div>
  )
}

export default Toast
