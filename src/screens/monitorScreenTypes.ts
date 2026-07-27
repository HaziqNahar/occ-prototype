import type { AppRoute, OccSessionState } from '../types'

export interface MonitorScreenProps {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}
