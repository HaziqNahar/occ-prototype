import { useEffect, useRef } from 'react'

export type ConfirmRequest = {
  confirmLabel: string
  onConfirm: () => void
  text: string
  title: string
}

// Asks before an action that ends a run. Cancel has the focus, so Enter does
// nothing harmful; Escape or a click outside cancels.
function ConfirmDialog({ onCancel, request }: { onCancel: () => void; request: ConfirmRequest }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  // The latest onCancel, so a page that re-renders every second neither
  // re-adds the listener nor moves the focus back.
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    cancelRef.current?.focus()

    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current()
    }

    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        aria-describedby="confirm-text"
        aria-labelledby="confirm-title"
        aria-modal="true"
        className="confirm-dialog"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <h2 id="confirm-title">{request.title}</h2>
        <p id="confirm-text">{request.text}</p>
        <div className="confirm-actions">
          <button type="button" ref={cancelRef} onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="is-danger"
            onClick={() => {
              onCancel()
              request.onConfirm()
            }}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
