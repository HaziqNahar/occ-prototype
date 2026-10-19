import type { ReactNode } from 'react'

const icons = {
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  people: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  runs: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 14l2 2 4-4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  session: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8.5v7l5.5-3.5z',
}

type EmptyStateProps = {
  action?: ReactNode
  icon: keyof typeof icons
  text: ReactNode
  title: string
}

// Nothing to show yet: an icon, one line on why, and what to do next.
function EmptyState({ action, icon, text, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg aria-hidden="true" className="empty-state-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} viewBox="0 0 24 24">
        <path d={icons[icon]} />
      </svg>
      <strong>{title}</strong>
      <span>{text}</span>
      {action}
    </div>
  )
}

export default EmptyState
