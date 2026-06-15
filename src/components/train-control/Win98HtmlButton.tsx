import type { ReactNode } from 'react'

type Win98HtmlButtonProps = {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  pressed?: boolean
}

function Win98HtmlButton({
  children,
  disabled = false,
  onClick,
  pressed = false,
}: Win98HtmlButtonProps) {
  return (
    <button
      className={`train-inspector-button ${pressed ? 'is-toggle-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

export default Win98HtmlButton
