import { useState } from 'react'

export type SelectFieldOption<T extends string> = {
  label: string
  value: T
}

type SelectFieldProps<T extends string> = {
  ariaLabel: string
  onChange: (value: T) => void
  options: Array<SelectFieldOption<T>>
  value: T
}

function SelectField<T extends string>({ ariaLabel, onChange, options, value }: SelectFieldProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === value)

  return (
    <div
      className="select-field"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget as Node | null
        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false)
        }
      }}
    >
      <button
        type="button"
        className="select-field-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedOption?.label ?? value}</span>
        <span aria-hidden="true">v</span>
      </button>

      {isOpen ? (
        <div className="select-field-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? 'is-active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              key={option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default SelectField
