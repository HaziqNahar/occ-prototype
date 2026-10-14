import type { ReactNode } from 'react'
import type { PublicUser } from '../accounts'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import type { AppRoute } from '../types'

export type AppShellSection = 'console' | 'history' | 'progress' | 'people' | 'session'

type AppShellProps = {
  // Buttons on the right of the page title.
  actions?: ReactNode
  active: AppShellSection
  children: ReactNode
  onNavigate: (route: AppRoute) => void
  onSignOut?: () => void
  // The page's own class, for its styles (print rules use history-page).
  pageClassName?: string
  subtitle?: ReactNode
  title: string
  // Null without accounts (no training server).
  user: PublicUser | null
}

type NavItem = { route: AppRoute; section: AppShellSection; label: string }

// The frame around every trainer page (and a trainee's own runs and
// progress): a sidebar to move between pages, and the page's title and main
// actions. The SCADA monitors never use it.
function AppShell({ actions, active, children, onNavigate, onSignOut, pageClassName, subtitle, title, user }: AppShellProps) {
  const isTrainer = !user || user.role === 'trainer'
  const items: NavItem[] = isTrainer
    ? [
        { label: 'Console', route: '/ios/modules', section: 'console' },
        ...(user ? [
          { label: 'History', route: '/history', section: 'history' } as NavItem,
          { label: 'Progress', route: '/progress', section: 'progress' } as NavItem,
        ] : []),
        ...(user?.admin ? [{ label: 'People', route: '/admin', section: 'people' } as NavItem] : []),
      ]
    : [
        { label: 'My session', route: '/session/join', section: 'session' },
        { label: 'My runs', route: '/history', section: 'history' },
        { label: 'My progress', route: '/progress', section: 'progress' },
      ]
  const initials = (user?.name ?? 'Trainer').split(/[\s_]+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <aside className="app-shell-sidebar">
        <div className="app-shell-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <span>OCC Training Simulator</span>
        </div>
        <nav aria-label="Pages">
          {items.map((item) => (
            <button
              aria-current={item.section === active ? 'page' : undefined}
              className={item.section === active ? 'is-active' : undefined}
              key={item.section}
              onClick={() => onNavigate(item.route)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-shell-user">
          <span className="app-shell-avatar" aria-hidden="true">{initials}</span>
          <span className="app-shell-user-name">{user?.name ?? 'Local session'}</span>
          {user && onSignOut
            ? <button type="button" onClick={onSignOut}>Sign out</button>
            : <button type="button" onClick={() => onNavigate('/')}>Exit</button>}
        </div>
      </aside>
      <main className={`app-shell-main ${pageClassName ?? ''}`}>
        <header className="app-shell-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="app-shell-actions">{actions}</div>}
        </header>
        {children}
      </main>
    </div>
  )
}

export default AppShell
